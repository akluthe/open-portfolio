using Npgsql;

public interface IResumeDbService
{
    Task<string?> GetResumeJsonBySlugAsync(string slug);
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
}
