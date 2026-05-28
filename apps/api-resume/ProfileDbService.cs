using Npgsql;

public interface IProfileDbService
{
    Task<string?> GetProfileJsonBySlugAsync(string slug);
    Task<string> ListProfilesJsonAsync();
    Task UpsertProfileAsync(string slug, string json);
    Task DeleteProfileAsync(string slug);
}

public class ProfileDbService : IProfileDbService
{
    private readonly string _connString;

    public ProfileDbService(string connString)
    {
        _connString = connString;
    }

    public async Task<string?> GetProfileJsonBySlugAsync(string slug)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "SELECT doc FROM profiles WHERE slug = @slug LIMIT 1",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return reader.GetString(0);
        }
        return null;
    }

    public async Task<string> ListProfilesJsonAsync()
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        // Build the JSON array in SQL to keep the passthrough style. Each element
        // is { slug, name, baseSlug } projected from the overlay doc.
        await using var cmd = new NpgsqlCommand(
            @"SELECT COALESCE(
                (SELECT json_agg(row_to_json(t))
                 FROM (
                   SELECT slug,
                          doc->>'name' AS name,
                          doc->>'baseSlug' AS ""baseSlug""
                   FROM profiles
                   ORDER BY slug
                 ) t),
                '[]'::json
              )::text",
            conn
        );
        var result = await cmd.ExecuteScalarAsync();
        return result as string ?? "[]";
    }

    public async Task UpsertProfileAsync(string slug, string json)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            @"INSERT INTO profiles(slug, doc, last_mod_tsp)
              VALUES (@slug, @doc::jsonb, NOW())
              ON CONFLICT (slug) DO UPDATE
              SET doc = @doc::jsonb, last_mod_tsp = NOW()",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        cmd.Parameters.AddWithValue("doc", json);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task DeleteProfileAsync(string slug)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "DELETE FROM profiles WHERE slug = @slug",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        await cmd.ExecuteNonQueryAsync();
    }
}
