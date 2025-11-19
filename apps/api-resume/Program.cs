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
        // Extract the frontend API URL from the publishable key format: pk_test_xxxxx
        // The JWKS endpoint is: https://{your-clerk-domain}/.well-known/jwks.json
        var keyParts = clerkPublishableKey?.Split('_');
        if (keyParts != null && keyParts.Length >= 2)
        {
            var clerkDomain = keyParts[1]; // e.g., "test" or "live"
            options.Authority = $"https://{clerkDomain}.clerk.accounts.dev";
        }
        else
        {
            throw new InvalidOperationException("Invalid CLERK_PUBLISHABLE_KEY format. Expected format: pk_test_xxxxx or pk_live_xxxxx");
        }
        
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false, // Clerk doesn't use audience validation by default
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.Zero
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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Use authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

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
    [Microsoft.AspNetCore.Authorization.Authorize] async (string slug, HttpRequest request, IResumeDbService db) =>
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

            // Upsert the resume
            await db.UpsertResumeAsync(slug, json);

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

app.Run();
