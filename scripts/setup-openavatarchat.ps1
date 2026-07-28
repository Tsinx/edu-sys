[CmdletBinding()]
param(
    [ValidateSet("lam", "liteavatar", "both")]
    [string]$Profile = "both",

    [switch]$SkipModels
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ComponentRoot = Join-Path $RepoRoot "components\openavatarchat"
$VenvRoot = Join-Path $ComponentRoot ".venv"
$PythonExe = Join-Path $VenvRoot "Scripts\python.exe"
$VenvScripts = Join-Path $VenvRoot "Scripts"
$RuntimeBin = Join-Path $RepoRoot ".runtime\openavatarchat\bin"

function Assert-LastExitCode {
    param([string]$Action)

    if ($LASTEXITCODE -ne 0) {
        throw "$Action failed with exit code $LASTEXITCODE."
    }
}

function Assert-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found."
    }
}

function Install-LamModels {
    $ModelsRoot = Join-Path $ComponentRoot "models"
    $Wav2VecRoot = Join-Path $ModelsRoot "wav2vec2-base-960h"
    $Wav2VecWeight = Join-Path $Wav2VecRoot "pytorch_model.bin"
    $LamRoot = Join-Path $ModelsRoot "LAM_audio2exp"
    $LamWeight = Join-Path $LamRoot "pretrained_models\lam_audio2exp_streaming.tar"

    New-Item -ItemType Directory -Force -Path $ModelsRoot | Out-Null

    if (-not (Test-Path -LiteralPath $Wav2VecWeight)) {
        if (-not (Test-Path -LiteralPath $Wav2VecRoot)) {
            $PreviousCloneProtection = $env:GIT_CLONE_PROTECTION_ACTIVE
            try {
                $env:GIT_CLONE_PROTECTION_ACTIVE = "false"
                & git clone --depth 1 `
                    "https://www.modelscope.cn/AI-ModelScope/wav2vec2-base-960h.git" `
                    $Wav2VecRoot
                Assert-LastExitCode "Cloning wav2vec2-base-960h"
            }
            finally {
                $env:GIT_CLONE_PROTECTION_ACTIVE = $PreviousCloneProtection
            }
        }

        & git -C $Wav2VecRoot lfs pull
        Assert-LastExitCode "Downloading wav2vec2 LFS objects"

        if (-not (Test-Path -LiteralPath $Wav2VecWeight)) {
            & git -C $Wav2VecRoot restore --source=HEAD ":/"
            Assert-LastExitCode "Restoring wav2vec2 checkout"
        }
    }

    if (-not (Test-Path -LiteralPath $LamWeight)) {
        New-Item -ItemType Directory -Force -Path $LamRoot | Out-Null
        $Archive = Join-Path $LamRoot "LAM_audio2exp_streaming.tar"
        $LamUrl = "https://virutalbuy-public.oss-cn-hangzhou.aliyuncs.com/share/aigc3d/data/LAM/LAM_audio2exp_streaming.tar"

        & curl.exe --fail --location --retry 3 --continue-at - --output $Archive $LamUrl
        Assert-LastExitCode "Downloading LAM weights"

        & tar.exe -tf $Archive | Out-Null
        Assert-LastExitCode "Validating LAM archive"
        & tar.exe -xf $Archive -C $LamRoot
        Assert-LastExitCode "Extracting LAM archive"

        Remove-Item -LiteralPath $Archive
    }
}

function Install-SenseVoiceModel {
    $ModelRoot = Join-Path $ComponentRoot "models\iic\SenseVoiceSmall"
    $ModelWeight = Join-Path $ModelRoot "model.pt"
    if (Test-Path -LiteralPath $ModelWeight) {
        return
    }

    $ModelScopeExe = Join-Path $VenvScripts "modelscope.exe"
    & $ModelScopeExe download --model "iic/SenseVoiceSmall" --local_dir $ModelRoot
    Assert-LastExitCode "Downloading SenseVoiceSmall"
}

function Install-LiteAvatarModels {
    Push-Location $ComponentRoot
    try {
        & $PythonExe "scripts\download_models.py" `
            --handler liteavatar `
            --source modelscope
        Assert-LastExitCode "Downloading LiteAvatar weights"

        & $PythonExe "scripts\download_avatar_model.py" `
            --model "20250408/sample_data" `
            --no-musetalk-compat
        Assert-LastExitCode "Downloading the LiteAvatar sample avatar"
    }
    finally {
        Pop-Location
    }
}

function Initialize-OpusRuntime {
    $AvLibraries = Join-Path $VenvRoot "Lib\site-packages\av.libs"
    $OpusSource = Get-ChildItem -LiteralPath $AvLibraries -Filter "libopus*.dll" |
        Select-Object -First 1

    if (-not $OpusSource) {
        throw "PyAV's bundled Opus DLL was not found in $AvLibraries."
    }

    New-Item -ItemType Directory -Force -Path $RuntimeBin | Out-Null
    Copy-Item -LiteralPath $OpusSource.FullName `
        -Destination (Join-Path $RuntimeBin "opus.dll") `
        -Force
}

foreach ($Command in @("git", "git-lfs", "uv", "curl.exe", "tar.exe")) {
    Assert-Command $Command
}

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot ".git"))) {
    throw "$RepoRoot is not an initialized Git repository."
}

& git -C $RepoRoot submodule sync --recursive
Assert-LastExitCode "Synchronizing Git submodules"
& git -C $RepoRoot submodule update --init --recursive --depth 1
Assert-LastExitCode "Updating Git submodules"
& git -C $ComponentRoot lfs install --local
Assert-LastExitCode "Initializing Git LFS"
& git -C $ComponentRoot lfs pull
Assert-LastExitCode "Downloading OpenAvatarChat LFS objects"
& git -C $ComponentRoot submodule foreach --recursive "git lfs pull"
Assert-LastExitCode "Downloading recursive submodule LFS objects"

Push-Location $ComponentRoot
try {
    if (-not (Test-Path -LiteralPath $PythonExe)) {
        & uv venv --python 3.11.13 .venv
        Assert-LastExitCode "Creating the Python 3.11 environment"
    }
    else {
        $PythonVersion = & $PythonExe -c "import sys; print('.'.join(map(str, sys.version_info[:2])))"
        Assert-LastExitCode "Checking the Python environment"
        if ($PythonVersion.Trim() -ne "3.11") {
            throw "Existing environment uses Python $PythonVersion; OpenAvatarChat requires Python 3.11."
        }
    }

    $env:Path = "$VenvScripts;$env:Path"
    $env:UV_LINK_MODE = "copy"

    $InstallArguments = @("run", "install.py")
    if ($Profile -in @("lam", "both")) {
        $InstallArguments += @("--config", "config/chat_with_lam.yaml")
    }
    if ($Profile -in @("liteavatar", "both")) {
        $InstallArguments += @(
            "--config",
            "config/chat_with_openai_compatible_bailian_cosyvoice.yaml"
        )
    }

    & uv @InstallArguments
    Assert-LastExitCode "Installing OpenAvatarChat dependencies"
}
finally {
    Pop-Location
}

$env:Path = "$VenvScripts;$env:Path"
Initialize-OpusRuntime

if (-not $SkipModels) {
    Install-SenseVoiceModel
    if ($Profile -in @("lam", "both")) {
        Install-LamModels
    }
    if ($Profile -in @("liteavatar", "both")) {
        Install-LiteAvatarModels
    }
}

& (Join-Path $PSScriptRoot "test-openavatarchat-gpu.ps1") -Profile $Profile
Assert-LastExitCode "OpenAvatarChat GPU verification"

Write-Host ""
Write-Host "OpenAvatarChat setup completed for profile: $Profile"
Write-Host "Add DASHSCOPE_API_KEY to '$RepoRoot\.env', then run:"
Write-Host "  .\scripts\start-openavatarchat.ps1 -Profile lam"
