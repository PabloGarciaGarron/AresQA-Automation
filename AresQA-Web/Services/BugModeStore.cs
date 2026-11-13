using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace AresQA.Services;

/// <summary>One global mode per process. A file lock prevents competing Ares instances.</summary>
public sealed class BugModeStore : IDisposable
{
    private readonly string statePath;
    private readonly FileStream instanceLock;
    public bool Available { get; }
    public bool Enabled { get; private set; }
    public string Revision { get; private set; } = Guid.NewGuid().ToString("N");
    public string NormalConnection { get; }
    public string BugsConnection { get; }
    public string BugsPath { get; }
    public string NormalPath { get; }

    public BugModeStore(IConfiguration config, IWebHostEnvironment environment)
    {
        Available = environment.IsDevelopment() || environment.IsEnvironment("Testing");
        (NormalConnection, NormalPath) = Resolve(config.GetConnectionString("DefaultConnection")
            ?? "Data Source=Data/aresqa.db", environment.ContentRootPath);
        (BugsConnection, BugsPath) = Resolve(config.GetConnectionString("BugsConnection")
            ?? $"Data Source={Path.Combine(Path.GetDirectoryName(NormalPath)!, "aresqa-bugs.db")}", environment.ContentRootPath);
        statePath = Path.GetFullPath(config["BugLab:StateFile"]
            ?? Path.Combine(Path.GetDirectoryName(NormalPath)!, "bugs-mode.json"), environment.ContentRootPath);
        if (string.Equals(NormalPath, BugsPath, StringComparison.OrdinalIgnoreCase)
            || string.Equals(statePath, NormalPath, StringComparison.OrdinalIgnoreCase)
            || string.Equals(statePath, BugsPath, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("La base normal, la base de bugs y el estado deben usar archivos diferentes.");
        Directory.CreateDirectory(Path.GetDirectoryName(NormalPath)!);
        Directory.CreateDirectory(Path.GetDirectoryName(BugsPath)!);
        Directory.CreateDirectory(Path.GetDirectoryName(statePath)!);
        // The lock is tied to the normal DB, not to an overridable state file.
        instanceLock = new FileStream(NormalPath + ".instance.lock", FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        if (Available && File.Exists(statePath))
        {
            var state = JsonSerializer.Deserialize<PersistedMode>(File.ReadAllText(statePath))
                ?? throw new InvalidOperationException("El archivo de modo de laboratorio no es válido.");
            Enabled = state.Enabled;
        }
        // Fresh revision on restart also invalidates pre-restart or pre-upgrade cookies.
        if (Available) Persist(Enabled, Revision);
    }

    private static (string Connection, string Path) Resolve(string value, string root)
    {
        var builder = new SqliteConnectionStringBuilder(value);
        if (string.IsNullOrWhiteSpace(builder.DataSource) || builder.DataSource == ":memory:"
            || builder.Mode == SqliteOpenMode.Memory || builder.DataSource.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("El laboratorio requiere archivos SQLite locales separados.");
        builder.DataSource = Path.GetFullPath(builder.DataSource, root);
        return (builder.ToString(), builder.DataSource);
    }

    public void SetEnabled(bool enabled)
    {
        if (!Available) throw new InvalidOperationException("El laboratorio solo está disponible en Development o Testing.");
        if (Enabled == enabled) return;
        var revision = Guid.NewGuid().ToString("N");
        Persist(enabled, revision); // Publish only after an atomic, successful file replacement.
        Enabled = enabled;
        Revision = revision;
    }

    private void Persist(bool enabled, string revision)
    {
        var temporary = statePath + ".tmp";
        File.WriteAllText(temporary, JsonSerializer.Serialize(new PersistedMode(enabled, revision), new JsonSerializerOptions { WriteIndented = true }));
        File.Move(temporary, statePath, overwrite: true);
    }
    public void Dispose() => instanceLock.Dispose();
    private sealed record PersistedMode(bool Enabled, string Revision);
}
