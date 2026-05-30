using Npgsql;

public interface IProfileDbService
{
    Task<string?> GetProfileJsonBySlugAsync(string slug);
    Task<string> ListProfilesJsonAsync();
    Task UpsertProfileAsync(string slug, string json, string? actor = null, string? changeSummary = null);
    Task DeleteProfileAsync(string slug);
    Task<string> ListVersionsAsync(string slug);
    Task<string?> GetVersionJsonAsync(string slug, int version);
    Task<string?> RestoreVersionAsync(string slug, int version, string? actor = null);
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

    // Writes the live overlay row and appends an immutable snapshot to
    // profile_versions in a single transaction. Mirrors ResumeDbService.
    public async Task UpsertProfileAsync(string slug, string json, string? actor = null, string? changeSummary = null)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        await using (var upsert = new NpgsqlCommand(
            @"INSERT INTO profiles(slug, doc, last_mod_tsp)
              VALUES (@slug, @doc::jsonb, NOW())
              ON CONFLICT (slug) DO UPDATE
              SET doc = @doc::jsonb, last_mod_tsp = NOW()",
            conn, tx))
        {
            upsert.Parameters.AddWithValue("slug", slug);
            upsert.Parameters.AddWithValue("doc", json);
            await upsert.ExecuteNonQueryAsync();
        }

        await AppendVersionAsync(conn, tx, slug, json, actor, changeSummary);
        await tx.CommitAsync();
    }

    public async Task DeleteProfileAsync(string slug)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        // profile_versions rows cascade via the slug FK.
        await using var cmd = new NpgsqlCommand(
            "DELETE FROM profiles WHERE slug = @slug",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<string> ListVersionsAsync(string slug)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            @"SELECT COALESCE(
                (SELECT json_agg(row_to_json(t))
                 FROM (
                   SELECT version_number AS version,
                          created_tsp AS ""createdAt"",
                          created_by AS ""createdBy"",
                          change_summary AS ""changeSummary""
                   FROM profile_versions
                   WHERE slug = @slug
                   ORDER BY version_number DESC
                 ) t),
                '[]'::json
              )::text",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        var result = await cmd.ExecuteScalarAsync();
        return result as string ?? "[]";
    }

    public async Task<string?> GetVersionJsonAsync(string slug, int version)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "SELECT doc FROM profile_versions WHERE slug = @slug AND version_number = @version LIMIT 1",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        cmd.Parameters.AddWithValue("version", version);
        var result = await cmd.ExecuteScalarAsync();
        return result as string;
    }

    public async Task<string?> RestoreVersionAsync(string slug, int version, string? actor = null)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        string doc;
        await using (var read = new NpgsqlCommand(
            "SELECT doc FROM profile_versions WHERE slug = @slug AND version_number = @version LIMIT 1",
            conn, tx))
        {
            read.Parameters.AddWithValue("slug", slug);
            read.Parameters.AddWithValue("version", version);
            if (await read.ExecuteScalarAsync() is not string existing)
            {
                await tx.RollbackAsync();
                return null;
            }
            doc = existing;
        }

        await using (var upsert = new NpgsqlCommand(
            @"INSERT INTO profiles(slug, doc, last_mod_tsp)
              VALUES (@slug, @doc::jsonb, NOW())
              ON CONFLICT (slug) DO UPDATE
              SET doc = @doc::jsonb, last_mod_tsp = NOW()",
            conn, tx))
        {
            upsert.Parameters.AddWithValue("slug", slug);
            upsert.Parameters.AddWithValue("doc", doc);
            await upsert.ExecuteNonQueryAsync();
        }

        await AppendVersionAsync(conn, tx, slug, doc, actor, $"Restored from version {version}");
        await tx.CommitAsync();
        return doc;
    }

    private static async Task AppendVersionAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx,
        string slug, string json, string? actor, string? changeSummary)
    {
        await using var cmd = new NpgsqlCommand(
            @"INSERT INTO profile_versions (slug, version_number, doc, created_by, change_summary)
              VALUES (
                @slug,
                (SELECT COALESCE(MAX(version_number), 0) + 1 FROM profile_versions WHERE slug = @slug),
                @doc::jsonb,
                @actor,
                @summary
              )",
            conn, tx);
        cmd.Parameters.AddWithValue("slug", slug);
        cmd.Parameters.AddWithValue("doc", json);
        cmd.Parameters.AddWithValue("actor", (object?)actor ?? DBNull.Value);
        cmd.Parameters.AddWithValue("summary", (object?)changeSummary ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }
}
