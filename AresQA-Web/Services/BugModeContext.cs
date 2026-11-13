namespace AresQA.Services;

/// <summary>Immutable for the lifetime of one request, including its Identity store.</summary>
public sealed class BugModeContext
{
    public bool Available { get; private set; }
    public bool Enabled { get; private set; }
    public string Revision { get; private set; } = "";
    public string ConnectionString { get; private set; } = "";
    public bool CredentialsVerified { get; set; }
    public bool IsEnabled(int id) => Enabled && id is >= 1 and <= 20;

    public void Initialize(BugModeStore store, bool? enabled = null)
    {
        Available = store.Available;
        Enabled = Available && (enabled ?? store.Enabled);
        Revision = store.Revision;
        ConnectionString = Enabled ? store.BugsConnection : store.NormalConnection;
    }
}
