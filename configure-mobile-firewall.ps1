$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Abre PowerShell como administrador y vuelve a ejecutar este script."
}

$displayName = "Ares Mobile TCP 5080"
$existing = Get-NetFirewallRule -DisplayName $displayName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "La regla '$displayName' ya existe."
    exit 0
}

New-NetFirewallRule `
    -DisplayName $displayName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort 5080 `
    -Profile Private `
    -RemoteAddress LocalSubnet | Out-Null

Write-Host "Regla creada: TCP 5080, perfil Private, origen LocalSubnet."
