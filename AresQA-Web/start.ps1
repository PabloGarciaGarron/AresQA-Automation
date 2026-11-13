$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
dotnet run --project "$PSScriptRoot\AresQA.csproj" --launch-profile AresQA

