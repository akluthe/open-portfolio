var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddOpenApi();

// Get Clerk configuration
var clerkPublishableKey = builder.Configuration["CLERK_PUBLISHABLE_KEY"];
var clerkSecretKey = builder.Configuration["CLERK_SECRET_KEY"];

// For development, you can use a simple secret if Clerk isn't configured yet
// In production, always use Clerk JWKS validation
var useClerk = !string.IsNullOrWhiteSpace(clerkPublishableKey) && !string.IsNullOrWhiteSpace(clerkSecretKey);

if (useClerk)
{
    // Configure JWT Authentication with Clerk
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        // Clerk uses JWKS (JSON Web Key Set) for token validation
        // The JWKS endpoint format is: https://{instance-id}.clerk.accounts.dev/.well-known/jwks.json
        // The instance ID can be found in your Clerk dashboard
        var clerkInstanceId = builder.Configuration["CLERK_INSTANCE_ID"];
        
        if (string.IsNullOrWhiteSpace(clerkInstanceId))
        {
            // Try to extract from the publishable key (base64 encoded data after pk_test_)
            // This is a fallback - it's better to set CLERK_INSTANCE_ID explicitly
            if (!string.IsNullOrWhiteSpace(clerkPublishableKey) && clerkPublishableKey.StartsWith("pk_"))
            {
                try
                {
                    // The publishable key format is: pk_test_<base64-encoded-instance-info>
                    // We can try to decode it, but it's more reliable to set CLERK_INSTANCE_ID
                    // For now, we'll require it to be set explicitly
                }
                catch
                {
                    // Ignore decode errors
                }
            }
            
            throw new InvalidOperationException(
                "CLERK_INSTANCE_ID must be set in configuration. " +
                "You can find your instance ID in the Clerk dashboard: " +
                "1. Go to your Clerk dashboard, 2. Navigate to API Keys, 3. The instance ID is shown there. " +
                "Alternatively, check the issuer claim in a JWT token from Clerk - it will be: https://{instance-id}.clerk.accounts.dev"
            );
        }
        
        // Clerk's OIDC issuer. Setting Authority lets JwtBearer auto-discover the
        // OpenID configuration at {Authority}/.well-known/openid-configuration and,
        // from there, the JWKS signing keys. Do NOT set MetadataAddress to the JWKS
        // URL directly — the metadata retriever expects the discovery document, not
        // the raw key set, so pointing it at jwks.json loads no signing keys and
        // every token fails signature validation (401 on all authenticated routes).
        var clerkAuthority = $"https://{clerkInstanceId}.clerk.accounts.dev";
        options.Authority = clerkAuthority;

        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            // Clerk issuer format: https://{instance-id}.clerk.accounts.dev
            ValidIssuer = clerkAuthority,
            ValidateAudience = false, // Clerk doesn't use audience validation by default
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(5) // Allow some clock skew
        };

        // Surface why a token was rejected (e.g. IDX10501 signature, IDX10223 lifetime).
        // Logs only the exception type/message — never the token or its claims.
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.Error.WriteLine(
                    $"[JwtBearer] authentication failed: {context.Exception.GetType().Name}: {context.Exception.Message}");
                return Task.CompletedTask;
            }
        };
    });
}
else
{
    // Fallback to simple secret validation for development
    var jwtSecret = builder.Configuration["JWT_SECRET"] 
        ?? builder.Configuration["AUTH_SECRET"]
        ?? throw new InvalidOperationException("Either Clerk keys (CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY) or JWT_SECRET/AUTH_SECRET must be configured.");
    
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(jwtSecret)
            ),
            ClockSkew = TimeSpan.Zero
        };
    });
}

builder.Services.AddAuthorization();

// Add DB connection string from config
builder.Services.AddSingleton<string>(sp =>
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.")
);

// Register ResumeDbService for DI
builder.Services.AddScoped<IResumeDbService>(sp =>
{
    var connString = sp.GetRequiredService<string>();
    return new ResumeDbService(connString);
});

// Register ProfileDbService for DI (tailoring overlays)
builder.Services.AddScoped<IProfileDbService>(sp =>
{
    var connString = sp.GetRequiredService<string>();
    return new ProfileDbService(connString);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Use authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// GET /health - unauthenticated liveness probe for container orchestration.
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// GET /resumes/{slug} using service
app.MapGet(
    "/resumes/{slug}",
    async (string slug, IResumeDbService db) =>
    {
        var json = await db.GetResumeJsonBySlugAsync(slug);
        return json is not null ? Results.Content(json, "application/json") : Results.NotFound();
    }
);

// PUT /resumes/{slug} using service - requires authentication
app.MapPut(
    "/resumes/{slug}",
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, HttpRequest request, System.Security.Claims.ClaimsPrincipal user, IResumeDbService db) =>
    {

        try
        {
            // Read JSON body
            using var reader = new StreamReader(request.Body);
            var json = await reader.ReadToEndAsync();

            if (string.IsNullOrWhiteSpace(json))
            {
                return Results.BadRequest(new { error = "Request body is required" });
            }

            // Basic validation: check for required fields
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (
                !root.TryGetProperty("basics", out var basics)
                || !basics.TryGetProperty("name", out var name)
                || name.GetString() is null or { Length: 0 }
                || !basics.TryGetProperty("title", out var title)
                || title.GetString() is null or { Length: 0 }
            )
            {
                return Results.BadRequest(
                    new { error = "Resume must have basics.name and basics.title" }
                );
            }

            // Upsert the resume and append a version (actor + optional note for the audit trail)
            await db.UpsertResumeAsync(slug, json, ActorOf(user), ChangeSummaryOf(request));

            // Return the updated document
            return Results.Content(json, "application/json");
        }
        catch (System.Text.Json.JsonException)
        {
            return Results.BadRequest(new { error = "Invalid JSON format" });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: 500,
                title: "Internal server error"
            );
        }
    }
);

// --- Resume version history (admin-only; history can hold content removed from the
// public resume, so these are all authenticated unlike the public GET /resumes/{slug}). ---

// GET /resumes/{slug}/versions - metadata list, newest first.
app.MapGet(
    "/resumes/{slug}/versions",
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, IResumeDbService db) =>
        Results.Content(await db.ListVersionsAsync(slug), "application/json")
);

// GET /resumes/{slug}/versions/{version} - full doc for one version.
app.MapGet(
    "/resumes/{slug}/versions/{version:int}",
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, int version, IResumeDbService db) =>
    {
        var json = await db.GetVersionJsonAsync(slug, version);
        return json is not null ? Results.Content(json, "application/json") : Results.NotFound();
    }
);

// POST /resumes/{slug}/versions/{version}/restore - re-apply a version as the new latest.
app.MapPost(
    "/resumes/{slug}/versions/{version:int}/restore",
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, int version, System.Security.Claims.ClaimsPrincipal user, IResumeDbService db) =>
    {
        var json = await db.RestoreVersionAsync(slug, version, ActorOf(user));
        return json is not null ? Results.Content(json, "application/json") : Results.NotFound();
    }
);

// GET /profiles - list tailoring overlays ({ slug, name, baseSlug }[]). Public.
app.MapGet(
    "/profiles",
    async (IProfileDbService db) =>
        Results.Content(await db.ListProfilesJsonAsync(), "application/json")
);

// GET /profiles/{slug} - overlay doc. Public.
app.MapGet(
    "/profiles/{slug}",
    async (string slug, IProfileDbService db) =>
    {
        var json = await db.GetProfileJsonBySlugAsync(slug);
        return json is not null ? Results.Content(json, "application/json") : Results.NotFound();
    }
);

// PUT /profiles/{slug} - upsert overlay. Requires authentication.
// Light structural check only (name + baseSlug); authoritative validation is the
// Zod tailoringProfileSchema in the web tier before this is called.
app.MapPut(
    "/profiles/{slug}",
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, HttpRequest request, System.Security.Claims.ClaimsPrincipal user, IProfileDbService db) =>
    {
        try
        {
            using var reader = new StreamReader(request.Body);
            var json = await reader.ReadToEndAsync();

            if (string.IsNullOrWhiteSpace(json))
            {
                return Results.BadRequest(new { error = "Request body is required" });
            }

            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (
                !root.TryGetProperty("name", out var name)
                || name.GetString() is null or { Length: 0 }
                || !root.TryGetProperty("baseSlug", out var baseSlug)
                || baseSlug.GetString() is null or { Length: 0 }
            )
            {
                return Results.BadRequest(
                    new { error = "Tailoring profile must have name and baseSlug" }
                );
            }

            await db.UpsertProfileAsync(slug, json, ActorOf(user), ChangeSummaryOf(request));

            return Results.Content(json, "application/json");
        }
        catch (System.Text.Json.JsonException)
        {
            return Results.BadRequest(new { error = "Invalid JSON format" });
        }
        catch (Exception)
        {
            // Avoid leaking internal details (e.g. Npgsql connection errors) to clients.
            return Results.Problem(
                detail: "An unexpected error occurred",
                statusCode: 500,
                title: "Internal server error"
            );
        }
    }
);

// DELETE /profiles/{slug} - remove overlay. Requires authentication.
app.MapDelete(
    "/profiles/{slug}",
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, IProfileDbService db) =>
    {
        await db.DeleteProfileAsync(slug);
        return Results.NoContent();
    }
);

// --- Tailoring-profile version history (admin-only, mirrors the resume endpoints). ---

app.MapGet(
    "/profiles/{slug}/versions",
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, IProfileDbService db) =>
        Results.Content(await db.ListVersionsAsync(slug), "application/json")
);

app.MapGet(
    "/profiles/{slug}/versions/{version:int}",
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, int version, IProfileDbService db) =>
    {
        var json = await db.GetVersionJsonAsync(slug, version);
        return json is not null ? Results.Content(json, "application/json") : Results.NotFound();
    }
);

app.MapPost(
    "/profiles/{slug}/versions/{version:int}/restore",
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, int version, System.Security.Claims.ClaimsPrincipal user, IProfileDbService db) =>
    {
        var json = await db.RestoreVersionAsync(slug, version, ActorOf(user));
        return json is not null ? Results.Content(json, "application/json") : Results.NotFound();
    }
);

app.Run();

// Audit-trail helpers: who saved (Clerk subject claim) and an optional human note
// (X-Change-Summary header forwarded by the web tier). Both are best-effort/nullable.
static string? ActorOf(System.Security.Claims.ClaimsPrincipal user) =>
    user.FindFirst("sub")?.Value
    ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

static string? ChangeSummaryOf(HttpRequest request)
{
    var value = request.Headers["X-Change-Summary"].ToString();
    return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
