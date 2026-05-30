using Npgsql;

public interface IResumeDbService
{
    Task<string?> GetResumeJsonBySlugAsync(string slug);
    Task UpsertResumeAsync(string slug, string json, string? actor = null, string? changeSummary = null);
    Task<string> ListVersionsAsync(string slug);
    Task<string?> GetVersionJsonAsync(string slug, int version);
    Task<string?> RestoreVersionAsync(string slug, int version, string? actor = null);
}

public class ResumeDbService : IResumeDbService
{
    private readonly string _connString;

    public ResumeDbService(string connString)
    {
        _connString = connString;
    }

    public async Task<string?> GetResumeJsonBySlugAsync(string slug)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "SELECT doc FROM resumes WHERE slug = @slug LIMIT 1",
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

    // Writes the live row and appends an immutable snapshot to resume_versions in a
    // single transaction, so the history can never drift from the current doc.
    public async Task UpsertResumeAsync(string slug, string json, string? actor = null, string? changeSummary = null)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        await using (var upsert = new NpgsqlCommand(
            @"INSERT INTO resumes(slug, doc, last_mod_tsp)
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

    // Version metadata only (no doc bodies), newest first. Field names match the
    // shared resumeVersionMetaSchema consumed by the web tier.
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
                   FROM resume_versions
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
            "SELECT doc FROM resume_versions WHERE slug = @slug AND version_number = @version LIMIT 1",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        cmd.Parameters.AddWithValue("version", version);
        var result = await cmd.ExecuteScalarAsync();
        return result as string;
    }

    // Linear/append-only restore: re-applies the chosen version's doc as the live row
    // and appends it as a NEW version. Returns null if the version doesn't exist.
    public async Task<string?> RestoreVersionAsync(string slug, int version, string? actor = null)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        string doc;
        await using (var read = new NpgsqlCommand(
            "SELECT doc FROM resume_versions WHERE slug = @slug AND version_number = @version LIMIT 1",
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
            @"INSERT INTO resumes(slug, doc, last_mod_tsp)
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

    // Appends doc as the next version_number for slug within the given transaction.
    private static async Task AppendVersionAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx,
        string slug, string json, string? actor, string? changeSummary)
    {
        await using var cmd = new NpgsqlCommand(
            @"INSERT INTO resume_versions (slug, version_number, doc, created_by, change_summary)
              VALUES (
                @slug,
                (SELECT COALESCE(MAX(version_number), 0) + 1 FROM resume_versions WHERE slug = @slug),
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
