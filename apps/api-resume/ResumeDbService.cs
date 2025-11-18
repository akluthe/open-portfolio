using Npgsql;

public interface IResumeDbService
{
    Task<string?> GetResumeJsonBySlugAsync(string slug);
    Task UpsertResumeAsync(string slug, string json);
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

    public async Task UpsertResumeAsync(string slug, string json)
    {
        await using var conn = new NpgsqlConnection(_connString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            @"INSERT INTO resumes(slug, doc, last_mod_tsp) 
              VALUES (@slug, @doc::jsonb, NOW())
              ON CONFLICT (slug) DO UPDATE 
              SET doc = @doc::jsonb, last_mod_tsp = NOW()",
            conn
        );
        cmd.Parameters.AddWithValue("slug", slug);
        cmd.Parameters.AddWithValue("doc", json);
        await cmd.ExecuteNonQueryAsync();
    }
}
