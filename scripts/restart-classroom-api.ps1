[CmdletBinding()]
param()

# User-run recovery entry. Never resets, deletes, or replaces classroom data.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$restartRepo = Split-Path -Parent $PSScriptRoot
$restartState = Join-Path $restartRepo '.runtime\platform-api\state.json'
$restartLogs = Join-Path $restartRepo '.runtime\launcher'
$restartLauncher = Join-Path $PSScriptRoot 'start-classroom.ps1'
$restartStamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$restartUtf8 = New-Object System.Text.UTF8Encoding($false)

function Read-Field($Object, [string]$Name) {
    $property = $Object.PSObject.Properties[$Name]
    if ($null -ne $property) { return $property.Value }
    return $null
}

try {
    $restartBefore = [IO.File]::ReadAllText($restartState) | ConvertFrom-Json
    $restartBackupDir = Join-Path $restartRepo '.runtime\platform-api\backups'
    New-Item -ItemType Directory -Force -Path $restartBackupDir | Out-Null
    $restartBackup = Join-Path $restartBackupDir "before-user-api-restart-$restartStamp.json"
    Copy-Item -LiteralPath $restartState -Destination $restartBackup
    Write-Host "Backup saved: $restartBackup" -ForegroundColor Green

    $restartListener = Get-NetTCPConnection -State Listen -LocalPort 4300 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $restartListener) {
        $restartOwner = Get-CimInstance Win32_Process -Filter "ProcessId=$($restartListener.OwningProcess)"
        $restartParent = Get-CimInstance Win32_Process -Filter "ProcessId=$($restartOwner.ParentProcessId)"
        if ($restartOwner.CommandLine -notmatch '--import tsx src/server.ts' -or
            $null -eq $restartParent -or
            $restartParent.CommandLine -notlike "*$restartLauncher*" -or
            $restartParent.CommandLine -notmatch '-Service\s+api') {
            throw 'Port 4300 is not owned by this project launcher. No process was stopped.'
        }
        Write-Host "Restarting only this project's API process $($restartOwner.ProcessId)..."
        Stop-Process -Id $restartOwner.ProcessId -Force
        for ($restartWait = 0; $restartWait -lt 20; $restartWait++) {
            if (-not (Get-NetTCPConnection -State Listen -LocalPort 4300 -ErrorAction SilentlyContinue)) { break }
            Start-Sleep -Milliseconds 200
        }
    }

    $restartOut = Join-Path $restartLogs "api-$restartStamp.stdout.log"
    $restartErr = Join-Path $restartLogs "api-$restartStamp.stderr.log"
    $restartShell = (Get-Process -Id $PID).Path
    $restartArguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Service api' -f $restartLauncher
    $restartWorker = Start-Process -FilePath $restartShell -ArgumentList $restartArguments -WorkingDirectory $restartRepo -WindowStyle Hidden -RedirectStandardOutput $restartOut -RedirectStandardError $restartErr -PassThru
    $restartRecord = @{service='api';processId=$restartWorker.Id;startedAt=$restartWorker.StartTime.ToUniversalTime().ToString('o');stdout=$restartOut;stderr=$restartErr}
    [IO.File]::WriteAllText((Join-Path $restartLogs 'api.json'), ($restartRecord | ConvertTo-Json), $restartUtf8)

    $restartReady = $false
    for ($restartAttempt = 0; $restartAttempt -lt 60; $restartAttempt++) {
        try {
            $restartHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:4300/api/health' -TimeoutSec 1
            if ($restartHealth.status -eq 'ok' -and $restartHealth.service -eq 'edu-platform-api') { $restartReady = $true; break }
        } catch { }
        $restartWorker.Refresh()
        if ($restartWorker.HasExited) { throw "API exited. See $restartErr" }
        Start-Sleep -Milliseconds 500
    }
    if (-not $restartReady) { throw "API is not ready. See $restartErr" }

    $restartAfter = [IO.File]::ReadAllText($restartState) | ConvertFrom-Json
    $restartIds = @($restartAfter.classSessions | ForEach-Object { $_.id })
    foreach ($restartSession in $restartBefore.classSessions) {
        if ($restartIds -notcontains $restartSession.id) { throw 'An original classroom record is missing. Backup retained.' }
        if ($restartSession.courseId -ne 'course-economic-mathematics') { continue }
        $restartOldRuntime = Read-Field $restartBefore.classroomRuntimes $restartSession.id
        $restartNewRuntime = Read-Field $restartAfter.classroomRuntimes $restartSession.id
        foreach ($restartField in @('deckId','deckVersion','slideIndex','slideKey','slideInteractions')) {
            $restartOldValue = Read-Field $restartOldRuntime $restartField
            $restartNewValue = Read-Field $restartNewRuntime $restartField
            if (($restartOldValue | ConvertTo-Json -Depth 100 -Compress) -ne ($restartNewValue | ConvertTo-Json -Depth 100 -Compress)) {
                throw "Historical classroom field changed: $restartField. Backup retained: $restartBackup"
            }
        }
    }
    $restartReceipt = @{status='ok';originalClassrooms=@($restartBefore.classSessions).Count;preserved=$true;backup=$restartBackup;stdout=$restartOut;stderr=$restartErr}
    [IO.File]::WriteAllText((Join-Path $restartLogs 'last-api-restart.json'), ($restartReceipt | ConvertTo-Json), $restartUtf8)
    Write-Host 'API is ready. Original classroom records, versions, page positions and saved interactions are retained.' -ForegroundColor Green
    Write-Host 'Reload the classroom page and choose: Start a new classroom using the current release.'
    Start-Process 'http://127.0.0.1:5173/courses/course-economic-mathematics' -WindowStyle Hidden
    exit 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'No classroom data was reset. Keep the backup for recovery.'
    exit 1
}
