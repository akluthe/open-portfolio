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
app.MapGet("/resumes/{slug}", async (string slug, IResumeDbService db) =>
{
    var json = await db.GetResumeJsonBySlugAsync(slug);
    return json is not null
        ? Results.Content(json, "application/json")
        : Results.NotFound();
});

app.Run();
