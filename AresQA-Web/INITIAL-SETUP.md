# Initial account setup

When the application initializes a database that does not yet contain its demonstration accounts, set the `ARESQA_INITIAL_PASSWORD` environment variable before starting the app. The value must satisfy ASP.NET Identity's password policy.

For PowerShell:

```powershell
$env:ARESQA_INITIAL_PASSWORD = "<choose-a-strong-password>"
.\start.ps1
```

The variable is only required when the application creates the initial accounts. Existing accounts are not changed.
