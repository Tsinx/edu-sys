[CmdletBinding()]
param([switch]$Check)
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Runtime = Join-Path $RepoRoot '.runtime/rhubarb'
$Executable = Join-Path $Runtime 'Rhubarb-Lip-Sync-1.14.0-Windows/rhubarb.exe'
if (Test-Path -LiteralPath $Executable) { & $Executable --version; exit $LASTEXITCODE }
if ($Check) { throw 'Rhubarb runtime missing. Run scripts/setup-rhubarb.ps1 or set EDU_RHUBARB_PATH.' }
New-Item -ItemType Directory -Force -Path $Runtime | Out-Null
$Archive = Join-Path $Runtime 'release.zip'
Invoke-WebRequest 'https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.14.0/Rhubarb-Lip-Sync-1.14.0-Windows.zip' -OutFile $Archive
$Expected = '62FA416A8D5E382A3828EE4BEF358CE520D0B4CABDEAEA75A7AC266D098D1FE3'
if ((Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash -ne $Expected) { throw 'Rhubarb archive checksum mismatch' }
Expand-Archive -LiteralPath $Archive -DestinationPath $Runtime -Force
& $Executable --version
exit $LASTEXITCODE
