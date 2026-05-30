using System.Text.Json;
using Npgsql;

namespace api_resume.tests;

public class ProfileDbServiceTests : IClassFixture<PostgresResumeFixture>
{
    private readonly PostgresResumeFixture _fixture;

    public ProfileDbServiceTests(PostgresResumeFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task GetProfileJsonBySlugAsync_returns_payload_when_slug_exists()
    {
        await _fixture.ResetAsync();
        var slug = CreateSlug();
        var profileJson = CreateProfileJson("Databank — Sr Eng Mgr", "main");
        await InsertProfileAsync(slug, profileJson);

        var result = await CreateSut().GetProfileJsonBySlugAsync(slug);

        Assert.NotNull(result);
        AssertJsonEqual(profileJson, result);
    }

    [Fact]
    public async Task GetProfileJsonBySlugAsync_returns_null_when_slug_missing()
    {
        await _fixture.ResetAsync();
        var result = await CreateSut().GetProfileJsonBySlugAsync(CreateSlug());

        Assert.Null(result);
    }

    [Fact]
    public async Task ListProfilesJsonAsync_returns_empty_array_when_none()
    {
        await _fixture.ResetAsync();

        var result = await CreateSut().ListProfilesJsonAsync();

        using var doc = JsonDocument.Parse(result);
        Assert.Equal(JsonValueKind.Array, doc.RootElement.ValueKind);
        Assert.Equal(0, doc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task ListProfilesJsonAsync_projects_slug_name_baseSlug_ordered_by_slug()
    {
        await _fixture.ResetAsync();
        await InsertProfileAsync("zebra", CreateProfileJson("Zebra Role", "main"));
        await InsertProfileAsync("alpha", CreateProfileJson("Alpha Role", "other"));

        var result = await CreateSut().ListProfilesJsonAsync();

        using var doc = JsonDocument.Parse(result);
        var items = doc.RootElement;
        Assert.Equal(2, items.GetArrayLength());

        var first = items[0];
        Assert.Equal("alpha", first.GetProperty("slug").GetString());
        Assert.Equal("Alpha Role", first.GetProperty("name").GetString());
        Assert.Equal("other", first.GetProperty("baseSlug").GetString());

        var second = items[1];
        Assert.Equal("zebra", second.GetProperty("slug").GetString());
    }

    [Fact]
    public async Task UpsertProfileAsync_creates_then_updates()
    {
        await _fixture.ResetAsync();
        var slug = CreateSlug();

        var original = CreateProfileJson("Original", "main");
        await CreateSut().UpsertProfileAsync(slug, original);
        AssertJsonEqual(original, await CreateSut().GetProfileJsonBySlugAsync(slug));

        var updated = CreateProfileJson("Updated", "main");
        await CreateSut().UpsertProfileAsync(slug, updated);
        AssertJsonEqual(updated, await CreateSut().GetProfileJsonBySlugAsync(slug));
    }

    [Fact]
    public async Task DeleteProfileAsync_removes_the_row()
    {
        await _fixture.ResetAsync();
        var slug = CreateSlug();
        await InsertProfileAsync(slug, CreateProfileJson("Doomed", "main"));

        await CreateSut().DeleteProfileAsync(slug);

        Assert.Null(await CreateSut().GetProfileJsonBySlugAsync(slug));
    }

    [Fact]
    public async Task UpsertProfileAsync_appends_version_and_increments_on_each_save()
    {
        await _fixture.ResetAsync();
        var slug = CreateSlug();
        var sut = CreateSut();

        await sut.UpsertProfileAsync(slug, CreateProfileJson("V1", "main"), actor: "user_123");
        await sut.UpsertProfileAsync(slug, CreateProfileJson("V2", "main"));

        using var doc = JsonDocument.Parse(await sut.ListVersionsAsync(slug));
        var versions = doc.RootElement;
        Assert.Equal(2, versions.GetArrayLength());
        Assert.Equal(2, versions[0].GetProperty("version").GetInt32());
        Assert.Equal(1, versions[1].GetProperty("version").GetInt32());
        Assert.Equal("user_123", versions[1].GetProperty("createdBy").GetString());
    }

    [Fact]
    public async Task GetVersionJsonAsync_returns_doc_for_version_and_null_when_missing()
    {
        await _fixture.ResetAsync();
        var slug = CreateSlug();
        var sut = CreateSut();
        var v1Json = CreateProfileJson("Overlay V1", "main");

        await sut.UpsertProfileAsync(slug, v1Json);
        await sut.UpsertProfileAsync(slug, CreateProfileJson("Overlay V2", "main"));

        AssertJsonEqual(v1Json, await sut.GetVersionJsonAsync(slug, 1));
        Assert.Null(await sut.GetVersionJsonAsync(slug, 99));
    }

    [Fact]
    public async Task RestoreVersionAsync_reapplies_old_content_and_grows_history()
    {
        await _fixture.ResetAsync();
        var slug = CreateSlug();
        var sut = CreateSut();
        var v1Json = CreateProfileJson("Original Overlay", "main");

        await sut.UpsertProfileAsync(slug, v1Json);
        await sut.UpsertProfileAsync(slug, CreateProfileJson("Changed Overlay", "main"));

        var restored = await sut.RestoreVersionAsync(slug, 1, actor: "user_admin");

        AssertJsonEqual(v1Json, restored);
        AssertJsonEqual(v1Json, await sut.GetProfileJsonBySlugAsync(slug));

        using var doc = JsonDocument.Parse(await sut.ListVersionsAsync(slug));
        Assert.Equal(3, doc.RootElement.GetArrayLength());
        Assert.Equal("Restored from version 1", doc.RootElement[0].GetProperty("changeSummary").GetString());
    }

    [Fact]
    public async Task DeleteProfileAsync_cascades_version_history()
    {
        await _fixture.ResetAsync();
        var slug = CreateSlug();
        var sut = CreateSut();
        await sut.UpsertProfileAsync(slug, CreateProfileJson("Doomed", "main"));

        await sut.DeleteProfileAsync(slug);

        using var doc = JsonDocument.Parse(await sut.ListVersionsAsync(slug));
        Assert.Equal(0, doc.RootElement.GetArrayLength());
    }

    private ProfileDbService CreateSut() => new(_fixture.ConnectionString);

    private static string CreateSlug() => $"profile-{Guid.NewGuid():N}";

    private static string CreateProfileJson(string name, string baseSlug) => JsonSerializer.Serialize(new
    {
        name,
        baseSlug,
        experience = Array.Empty<object>(),
        skills = new { order = Array.Empty<int>(), hidden = Array.Empty<int>() },
        hiddenSections = Array.Empty<string>()
    });

    private async Task InsertProfileAsync(string slug, string json)
    {
        await using var conn = new NpgsqlConnection(_fixture.ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "INSERT INTO profiles(slug, doc) VALUES (@slug, @doc::jsonb)",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        cmd.Parameters.AddWithValue("doc", json);
        await cmd.ExecuteNonQueryAsync();
    }

    private static void AssertJsonEqual(string expectedJson, string? actualJson)
    {
        Assert.NotNull(actualJson);
        using var expected = JsonDocument.Parse(expectedJson);
        using var actual = JsonDocument.Parse(actualJson);
        Assert.True(JsonElement.DeepEquals(actual.RootElement, expected.RootElement), "JSON payloads differ");
    }
}
