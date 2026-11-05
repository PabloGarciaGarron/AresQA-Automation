$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$env:ASPNETCORE_ENVIRONMENT = "Development"

Write-Host "Ares disponible en la red local: http://192.168.0.100:5080"
Write-Host "La regla de Firewall de Windows para TCP 5080 debe estar habilitada en redes privadas."

dotnet run --project AresQA.csproj --no-launch-profile --urls "http://0.0.0.0:5080"
