# Script para limpiar usuarios de prueba en la base de datos de AresQA
# Conserva unicamente admin@aresqa.local y operador@aresqa.local

$ErrorActionPreference = 'Stop'
$labRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$dbPath = [IO.Path]::GetFullPath((Join-Path $labRoot 'Data\aresqa.db'))

if (-not (Test-Path -LiteralPath $dbPath)) {
    throw "No se encontro la base de datos en: $dbPath"
}

# 1. Localizar sqlite3 ejecutable
$sqliteCmd = Get-Command sqlite3 -ErrorAction SilentlyContinue
if ($sqliteCmd) {
    $sqliteExe = $sqliteCmd.Source
} else {
    $fallbackPaths = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\sqlite3.exe",
        "C:\Users\Prestamos\AppData\Local\Android\Sdk\platform-tools\sqlite3.exe"
    )
    $found = $fallbackPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($found) {
        $sqliteExe = $found
    } else {
        throw "No se encontro sqlite3.exe. Asegurate de tenerlo en PATH."
    }
}

# 2. Crear respaldo de seguridad antes de modificar
$backupDir = Join-Path $labRoot ('work\backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item -LiteralPath $dbPath -Destination (Join-Path $backupDir 'aresqa-before-cleanup.db') -Force
Write-Host "Respaldo creado en: $backupDir" -ForegroundColor Cyan

# 3. Consulta de conteo previo
$prevCount = & $sqliteExe $dbPath "SELECT COUNT(*) FROM AspNetUsers;"
Write-Host "Usuarios actuales en la base de datos: $prevCount" -ForegroundColor Yellow

# 4. Sentencias SQL para limpieza segura
$cleanSql = @"
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- Eliminar referencias de usuarios que no sean admin ni operador
DELETE FROM UserCodes WHERE UserId IN (
    SELECT Id FROM AspNetUsers WHERE Email NOT IN ('admin@aresqa.local', 'operador@aresqa.local')
);
DELETE FROM AspNetUserRoles WHERE UserId IN (
    SELECT Id FROM AspNetUsers WHERE Email NOT IN ('admin@aresqa.local', 'operador@aresqa.local')
);
DELETE FROM AspNetUserClaims WHERE UserId IN (
    SELECT Id FROM AspNetUsers WHERE Email NOT IN ('admin@aresqa.local', 'operador@aresqa.local')
);
DELETE FROM AspNetUserLogins WHERE UserId IN (
    SELECT Id FROM AspNetUsers WHERE Email NOT IN ('admin@aresqa.local', 'operador@aresqa.local')
);
DELETE FROM AspNetUserTokens WHERE UserId IN (
    SELECT Id FROM AspNetUsers WHERE Email NOT IN ('admin@aresqa.local', 'operador@aresqa.local')
);

-- Eliminar usuarios excepto los dos iniciales
DELETE FROM AspNetUsers WHERE Email NOT IN ('admin@aresqa.local', 'operador@aresqa.local');

-- Resetear secuencia autoincremental de UserCodes para que el siguiente sea USU-0003
UPDATE sqlite_sequence SET seq = 2 WHERE name = 'UserCodes';

COMMIT;
PRAGMA foreign_keys = ON;
"@

# 5. Ejecutar la limpieza
$cleanSql | & $sqliteExe $dbPath

# 6. Comprobar resultado
$newCount = & $sqliteExe $dbPath "SELECT COUNT(*) FROM AspNetUsers;"
Write-Host "`nLimpieza completada con exito." -ForegroundColor Green
Write-Host "Usuarios restantes ($newCount):" -ForegroundColor Green

& $sqliteExe $dbPath "SELECT printf('USU-%04d', uc.Id) AS Codigo, u.Email FROM UserCodes uc JOIN AspNetUsers u ON uc.UserId = u.Id;"
