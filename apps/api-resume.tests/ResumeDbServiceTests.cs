using System.Text.Json;
using Npgsql;

namespace api_resume.tests;

public class ResumeDbServiceTests : IClassFixture<PostgresResumeFixture>
{
    private readonly PostgresResumeFixture _fixture;

    public ResumeDbServiceTests(PostgresResumeFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task GetResumeJsonBySlugAsync_returns_payload_when_slug_exists()
    {
        await _fixture.ResetAsync();
        var slug = CreateSlug();
        var resumeJson = CreateResumeJson("Test User", "Engineer");
        await InsertResumeAsync(slug, resumeJson);

        var result = await CreateSut().GetResumeJsonBySlugAsync(slug);

        Assert.NotNull(result);
        AssertJsonEqual(resumeJson, result);
    }

    [Fact]
    public async Task GetResumeJsonBySlugAsync_returns_null_when_slug_missing()
    {
        await _fixture.ResetAsync();
        var result = await CreateSut().GetResumeJsonBySlugAsync(CreateSlug());

        Assert.Null(result);
    }

    [Fact]
    public async Task GetResumeJsonBySlugAsync_does_not_leak_other_records()
    {
        await _fixture.ResetAsync();
        var targetSlug = CreateSlug();
        var otherSlug = CreateSlug();
        var targetJson = CreateResumeJson("Target User", "Staff Engineer");
        await InsertResumeAsync(otherSlug, CreateResumeJson("Other User", "Manager"));
        await InsertResumeAsync(targetSlug, targetJson);

        var result = await CreateSut().GetResumeJsonBySlugAsync(targetSlug);

        Assert.NotNull(result);
        AssertJsonEqual(targetJson, result);
    }

    private ResumeDbService CreateSut() => new(_fixture.ConnectionString);

    private static string CreateSlug() => $"slug-{Guid.NewGuid():N}";

    private static string CreateResumeJson(string name, string title) => JsonSerializer.Serialize(new
    {
        basics = new
        {
            name,
            title
        }
    });

    private async Task InsertResumeAsync(string slug, string json)
    {
        await using var conn = new NpgsqlConnection(_fixture.ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "INSERT INTO resumes(slug, doc) VALUES (@slug, @doc::jsonb)",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        cmd.Parameters.AddWithValue("doc", json);
        await cmd.ExecuteNonQueryAsync();
    }

    private static void AssertJsonEqual(string expectedJson, string actualJson)
    {
        using var expected = JsonDocument.Parse(expectedJson);
        using var actual = JsonDocument.Parse(actualJson);
        Assert.True(JsonElement.DeepEquals(actual.RootElement, expected.RootElement), "JSON payloads differ");
    }
}
