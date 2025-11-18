using Npgsql;
using Testcontainers.PostgreSql;

namespace api_resume.tests;

public sealed class PostgresResumeFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container;

    public PostgresResumeFixture()
    {
        _container = new PostgreSqlBuilder()
            .WithImage("postgres:16")
            .WithDatabase("resume")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();
    }

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        const string schemaSql = @"
            CREATE EXTENSION IF NOT EXISTS ""uuid-ossp"";
            CREATE TABLE IF NOT EXISTS resumes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                slug TEXT UNIQUE NOT NULL,
                doc JSONB NOT NULL,
                created_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_mod_tsp TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        ";

        await EnsureSchemaAsync(schemaSql);
    }

    public async Task DisposeAsync()
    {
        await _container.DisposeAsync();
    }

    public async Task ResetAsync()
    {
        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand("TRUNCATE TABLE resumes;", conn);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task EnsureSchemaAsync(string schemaSql)
    {
        const int maxAttempts = 5;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await using var conn = new NpgsqlConnection(ConnectionString);
                await conn.OpenAsync();
                await using var cmd = new NpgsqlCommand(schemaSql, conn);
                await cmd.ExecuteNonQueryAsync();
                return;
            }
            catch (NpgsqlException) when (attempt < maxAttempts)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(200 * attempt));
            }
        }

        throw new InvalidOperationException("Unable to initialize Postgres container schema.");
    }
}
