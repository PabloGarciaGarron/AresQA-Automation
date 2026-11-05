# Detener la aplicación antes de ejecutar. Solo afecta las bases de este laboratorio.
$ErrorActionPreference = 'Stop'
$labRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$dbPaths = @(
    [IO.Path]::GetFullPath((Join-Path $labRoot 'Data\aresqa.db')),
    [IO.Path]::GetFullPath((Join-Path $labRoot 'Data\aresqa-bugs.db'))
)
foreach ($dbPath in $dbPaths) {
    if (-not $dbPath.StartsWith($labRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Ruta fuera del laboratorio.'
    }
}
if ($dbPaths[0] -eq $dbPaths[1]) { throw 'Las rutas de las bases normal y de bugs deben ser diferentes.' }
if (Get-NetTCPConnection -LocalPort 5080 -State Listen -ErrorAction SilentlyContinue) { throw 'Detén Ares QA (puerto 5080) antes de restaurar los datos.' }

$backupPath = Join-Path $labRoot ('work\backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
$backedUp = $false
foreach ($dbPath in $dbPaths) {
    if (Test-Path -LiteralPath $dbPath) {
        if (-not $backedUp) {
            New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
            $backedUp = $true
        }
        $databaseName = [IO.Path]::GetFileName($dbPath)
        foreach ($suffix in @('', '-wal', '-shm')) {
            $sourcePath = $dbPath + $suffix
            if (Test-Path -LiteralPath $sourcePath) {
                Move-Item -LiteralPath $sourcePath -Destination (Join-Path $backupPath ($databaseName + $suffix))
            }
        }
    }
}
if ($backedUp) {
    Write-Host "Base anterior guardada en $backupPath"
}
Write-Host 'Bases normal y de bugs restauradas al próximo arranque: 25 personas, 5 empresas, 2 usuarios y ninguna solicitud.'
Write-Host 'El estado ON/OFF del modo de bugs no cambia.'

