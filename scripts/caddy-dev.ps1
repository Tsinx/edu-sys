[CmdletBinding()]
param(
    [ValidateSet('start', 'reload', 'stop', 'status', 'validate', 'install')]
    [string]$Action = 'start'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$RuntimeRoot = Join-Path $RepoRoot '.runtime\caddy'
$ConfigPath = Join-Path $RepoRoot 'deploy\local\Caddyfile'
$BinaryRoot = Join-Path $RepoRoot '.runtime\toolchain\caddy'
$Caddy = Join-Path $BinaryRoot 'caddy.exe'
$RecordPath = Join-Path $RuntimeRoot 'process.json'
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$Version = '2.11.4'
$ArchiveHash = '1708333f79e274c7697285afe6d592ab39314e0b131e9ec6bea08ad27df62ebf'
$AdminAddress = '127.0.0.1:2020'

function Install-Caddy {
    if (Test-Path -LiteralPath $Caddy) {
        $installed = & $Caddy version
        if ($LASTEXITCODE -eq 0 -and $installed -like "v$Version *") { return }
        throw "Unexpected Caddy version at $Caddy. Move that binary aside before reinstalling."
    }
    if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') { throw 'This installer requires Windows x64.' }
    New-Item -ItemType Directory -Force -Path $BinaryRoot | Out-Null
    $archiveName = "caddy_${Version}_windows_amd64.zip"
    $archive = Join-Path $BinaryRoot $archiveName
    $url = "https://github.com/caddyserver/caddy/releases/download/v$Version/$archiveName"
    if (-not (Test-Path -LiteralPath $archive)) {
        Write-Host "Downloading Caddy $Version from its official release..."
        Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $archive -TimeoutSec 120
    }
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $ArchiveHash) {
        throw "Caddy archive SHA256 mismatch: $archive"
    }
    Expand-Archive -LiteralPath $archive -DestinationPath $BinaryRoot -Force
    & $Caddy version
    if ($LASTEXITCODE -ne 0) { throw 'Caddy could not run.' }
    [IO.File]::WriteAllText((Join-Path $BinaryRoot 'install.json'), (@{
        version = $Version; source = $url; sha256 = $ArchiveHash
    } | ConvertTo-Json), $Utf8)
}

function Get-OwnedCaddy {
    if (-not (Test-Path -LiteralPath $RecordPath)) { return $null }
    try {
        $record = Get-Content -Raw -LiteralPath $RecordPath | ConvertFrom-Json
        $process = Get-Process -Id $record.processId -ErrorAction Stop
        if ($process.Path -ne $Caddy -or $process.StartTime.ToUniversalTime().Ticks -ne ([DateTime]$record.startedAt).ToUniversalTime().Ticks) { return $null }
        $details = Get-CimInstance Win32_Process -Filter "ProcessId=$($process.Id)"
        if (-not $details.CommandLine.Contains($ConfigPath)) { return $null }
        return $process
    } catch { return $null }
}

function Assert-OwnedAdmin($Process) {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort 2020 -ErrorAction SilentlyContinue)
    if (-not ($listeners | Where-Object { $_.OwningProcess -eq $Process.Id -and $_.LocalAddress -eq '127.0.0.1' })) {
        throw 'The project Caddy process does not own its admin port; no control request was sent.'
    }
}

function Trust-LocalCertificate {
    $rootPath = Join-Path $RuntimeRoot 'data\pki\authorities\local\root.crt'
    $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($rootPath)
    # Use the Windows store directly; the Cert: provider is not loaded in every
    # PowerShell host (for example a 5.1 child launched from a portable PS 7).
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root', 'CurrentUser')
    try {
        $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
        $matches = $store.Certificates.Find([System.Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint, $certificate.Thumbprint, $false)
        if ($matches.Count -eq 0) {
            Write-Host 'Installing the project CA in CurrentUser Root. Windows may show a certificate trust prompt.'
            & (Join-Path $env:SystemRoot 'System32\certutil.exe') -user -addstore -f Root $rootPath | Out-Null
            if ($LASTEXITCODE -ne 0) { throw 'Windows did not import the development CA.' }
            Write-Host 'Trusted the project development CA for the current Windows user.'
        }
    } finally {
        $store.Close()
        $certificate.Dispose()
    }
}

$mutex = $null
$ownsMutex = $false
$previousStorage = $env:EDU_CADDY_STORAGE
try {
    $mutex = New-Object System.Threading.Mutex($false, 'Local\EduSysLocalCaddy-2020')
    try { $ownsMutex = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) { throw 'Another local Caddy command is running. Try again after it finishes.' }
    $env:EDU_CADDY_STORAGE = (Join-Path $RuntimeRoot 'data').Replace('\', '/')
    $owned = Get-OwnedCaddy
    if ($Action -eq 'status') {
        if ($null -eq $owned) { Write-Host 'Project Caddy is stopped.'; exit 0 }
        Assert-OwnedAdmin $owned
        $health = Invoke-RestMethod -Uri 'https://localhost/api/health' -TimeoutSec 5
        if ($health.service -ne 'edu-platform-api' -or $health.status -ne 'ok') { throw 'API health check failed.' }
        Write-Host "Project Caddy is running (PID $($owned.Id)): https://localhost"
        exit 0
    }
    if ($Action -eq 'stop') {
        if ($null -eq $owned) { Write-Host 'Project Caddy is already stopped.'; exit 0 }
        Assert-OwnedAdmin $owned
        & $Caddy stop --address $AdminAddress
        if ($LASTEXITCODE -ne 0) { throw 'Caddy stop failed.' }
        if (-not $owned.WaitForExit(10000)) { throw 'Caddy did not stop within 10 seconds.' }
        Remove-Item -LiteralPath $RecordPath -ErrorAction SilentlyContinue
        Write-Host 'Project Caddy stopped. API and Vite remain running.'
        exit 0
    }
    Install-Caddy
    if ($Action -eq 'install') { Write-Host "Caddy is installed: $Caddy"; exit 0 }
    New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null
    & $Caddy validate --config $ConfigPath --adapter caddyfile
    if ($LASTEXITCODE -ne 0) { throw 'Caddy configuration validation failed.' }
    if ($Action -eq 'validate') { exit 0 }
    if ($Action -eq 'reload' -and $null -eq $owned) { throw 'Project Caddy is stopped. Run the start action first.' }
    if ($null -ne $owned) {
        Assert-OwnedAdmin $owned
        & $Caddy reload --config $ConfigPath --adapter caddyfile --address $AdminAddress
        if ($LASTEXITCODE -ne 0) { throw 'Caddy reload failed.' }
        Write-Host "Reused project Caddy (PID $($owned.Id))."
    } else {
        $busy = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {
            $_.LocalPort -in @(80, 443, 2020) -and $_.LocalAddress -in @('0.0.0.0', '::', '127.0.0.1', '::1')
        })
        if ($busy.Count) { throw ('Caddy ports are occupied: ' + (($busy | ForEach-Object { "$($_.LocalAddress):$($_.LocalPort) (PID $($_.OwningProcess))" }) -join ', ')) }
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
        $stdout = Join-Path $RuntimeRoot "$stamp.stdout.log"
        $stderr = Join-Path $RuntimeRoot "$stamp.stderr.log"
        $arguments = 'run --config "{0}" --adapter caddyfile' -f $ConfigPath
        $owned = Start-Process -FilePath $Caddy -ArgumentList $arguments -WorkingDirectory $RepoRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
        [IO.File]::WriteAllText($RecordPath, (@{
            processId = $owned.Id; startedAt = $owned.StartTime.ToUniversalTime().ToString('o')
            stdout = $stdout; stderr = $stderr; config = $ConfigPath
        } | ConvertTo-Json), $Utf8)
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            $owned.Refresh()
            if ($owned.HasExited) { throw "Caddy exited. See $stderr" }
            try {
                $null = Invoke-RestMethod -Uri "http://$AdminAddress/config/" -TimeoutSec 1
                Assert-OwnedAdmin $owned
                $ready = $true
                break
            } catch { Start-Sleep -Milliseconds 500 }
        }
        if (-not $ready) { throw "Caddy did not become ready. See $stderr" }
    }
    Trust-LocalCertificate
    # Certificate validation stays enabled, including for this readiness check.
    $health = Invoke-RestMethod -Uri 'https://localhost/api/health' -TimeoutSec 10
    if ($health.service -ne 'edu-platform-api' -or $health.status -ne 'ok') { throw 'HTTPS API health check failed.' }
    $page = Invoke-WebRequest -UseBasicParsing -Uri 'https://localhost/' -TimeoutSec 10
    if ($page.StatusCode -ne 200 -or $page.Content -notmatch '/src/main\.tsx') { throw 'HTTPS Vite page check failed.' }
    Write-Host 'HTTPS development entry is ready: https://localhost' -ForegroundColor Green
    Write-Host "Caddy logs: $RuntimeRoot"
} catch {
    Write-Host ('Caddy command failed: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
} finally {
    $env:EDU_CADDY_STORAGE = $previousStorage
    if ($ownsMutex) { $mutex.ReleaseMutex() }
    if ($null -ne $mutex) { $mutex.Dispose() }
}
