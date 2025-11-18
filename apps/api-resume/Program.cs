var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddOpenApi();

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

// GET /resumes/{slug} using service
app.MapGet(
    "/resumes/{slug}",
    async (string slug, IResumeDbService db) =>
    {
        var json = await db.GetResumeJsonBySlugAsync(slug);
        return json is not null ? Results.Content(json, "application/json") : Results.NotFound();
    }
);

// PUT /resumes/{slug} using service
app.MapPut(
    "/resumes/{slug}",
    async (string slug, HttpRequest request, IResumeDbService db) =>
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
