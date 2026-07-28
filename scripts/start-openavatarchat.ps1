[CmdletBinding()]
param(
    [ValidateSet("lam", "liteavatar")]
    [string]$Profile = "lam",

    [string]$BindAddress = "127.0.0.1",

    [ValidateRange(1, 65535)]
    [int]$Port = 8282
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ComponentRoot = Join-Path $RepoRoot "components\openavatarchat"
$VenvRoot = Join-Path $ComponentRoot ".venv"
$PythonExe = Join-Path $VenvRoot "Scripts\python.exe"
$RuntimeBin = Join-Path $RepoRoot ".runtime\openavatarchat\bin"
$EnvFile = Join-Path $RepoRoot ".env"

function Import-DotEnv {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    foreach ($Line in Get-Content -LiteralPath $Path) {
        $Trimmed = $Line.Trim()
        if (-not $Trimmed -or $Trimmed.StartsWith("#")) {
            continue
        }

        $Pair = $Trimmed.Split("=", 2)
        if ($Pair.Count -ne 2) {
            continue
        }

        $Name = $Pair[0].Trim()
        $Value = $Pair[1].Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
    }
}

if (-not (Test-Path -LiteralPath $PythonExe)) {
    throw "OpenAvatarChat environment was not found. Run .\scripts\setup-openavatarchat.ps1 first."
}

Import-DotEnv $EnvFile
if (-not $env:DASHSCOPE_API_KEY) {
    throw "DASHSCOPE_API_KEY is missing. Copy .env.example to .env and add the key."
}

$AvLibraries = Join-Path $VenvRoot "Lib\site-packages\av.libs"
$OpusAlias = Join-Path $RuntimeBin "opus.dll"
if (-not (Test-Path -LiteralPath $OpusAlias)) {
    $OpusSource = Get-ChildItem -LiteralPath $AvLibraries -Filter "libopus*.dll" |
        Select-Object -First 1
    if ($OpusSource) {
        New-Item -ItemType Directory -Force -Path $RuntimeBin | Out-Null
        Copy-Item -LiteralPath $OpusSource.FullName -Destination $OpusAlias -Force
    }
}

$env:Path = "$RuntimeBin;$AvLibraries;$env:Path"

$Config = switch ($Profile) {
    "lam" { "config/chat_with_lam.yaml" }
    "liteavatar" { "config/chat_with_openai_compatible_bailian_cosyvoice.yaml" }
}

Write-Host "Starting OpenAvatarChat ($Profile) at http://${BindAddress}:$Port/"
Write-Host "The first cold start can take several minutes while Python imports and GPU models warm up."

Push-Location $ComponentRoot
try {
    & $PythonExe "src/demo.py" `
        --config $Config `
        --host $BindAddress `
        --port $Port
    if ($LASTEXITCODE -ne 0) {
        throw "OpenAvatarChat exited with code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
