[CmdletBinding()]
param(
    [ValidateSet('api', 'web', 'lam')][string]$Service,
    [switch]$NoBrowser,
    [ValidateRange(10, 1800)][int]$TimeoutSeconds = 600
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LauncherPath = $PSCommandPath
$ShellExe = (Get-Process -Id $PID).Path
$RuntimeRoot = Join-Path $RepoRoot '.runtime\launcher'
$WebUrl = 'http://127.0.0.1:5173/'
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-NodePath {
    $command = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $candidate = Join-Path $env:ProgramFiles 'nodejs\node.exe'
    if (Test-Path -LiteralPath $candidate) { return $candidate }
    throw '未找到 Node.js，请先安装 Node.js 22 或更新版本。'
}

# Refresh an existing user-level credential without writing it into scripts or logs.
if (-not $env:DASHSCOPE_API_KEY) {
    $env:DASHSCOPE_API_KEY = [Environment]::GetEnvironmentVariable('DASHSCOPE_API_KEY', 'User')
}

if ($Service) {
    try {
        $env:EDU_ENV_FILE = Join-Path $RepoRoot '.env'
        $env:EDU_API_HOST = '127.0.0.1'
        $env:EDU_API_PORT = '4300'
        $env:EDU_WEB_PORT = '5173'
        $env:EDU_API_PROXY_URL = 'http://127.0.0.1:4300'
        $env:OPENAVATARCHAT_URL = 'http://127.0.0.1:8282'
        $env:OPENAVATARCHAT_PUBLIC_URL = 'http://127.0.0.1:8282'
        $env:EDU_DEPLOYMENT_PROFILE = 'development'
        $env:NODE_ENV = 'development'
        switch ($Service) {
            'api' {
                Set-Location -LiteralPath (Join-Path $RepoRoot 'apps\platform-api')
                & (Get-NodePath) --import tsx src/server.ts
            }
            'web' {
                Set-Location -LiteralPath (Join-Path $RepoRoot 'apps\teacher-web')
                & (Get-NodePath) node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort
            }
            'lam' {
                & (Join-Path $PSScriptRoot 'start-openavatarchat.ps1') -Profile lam -BindAddress 127.0.0.1 -Port 8282 -LogLevel WARNING
            }
        }
        exit $LASTEXITCODE
    } catch {
        Write-Error $_
        exit 1
    }
}

function Read-JsonUrl([string]$Url) {
    try { return Invoke-RestMethod -Uri $Url -TimeoutSec 2 } catch { return $null }
}

function Test-ServiceReady([string]$Name) {
    switch ($Name) {
        'api' {
            $health = Read-JsonUrl 'http://127.0.0.1:4300/api/health'
            return ($null -ne $health -and $health.service -eq 'edu-platform-api' -and $health.status -eq 'ok')
        }
        'web' {
            try {
                $page = Invoke-WebRequest -UseBasicParsing -Uri $WebUrl -TimeoutSec 2
                return ($page.StatusCode -eq 200 -and $page.Content -match '/src/main\.tsx')
            } catch { return $false }
        }
        'lam' {
            try {
                $health = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8282/readiness' -TimeoutSec 2
                $config = Read-JsonUrl 'http://127.0.0.1:8282/openavatarchat/initconfig'
                return ($health.StatusCode -eq 200 -and $null -ne $config -and $config.chat_mode -eq 'ws' -and $config.avatar_config.avatar_type -eq 'lam')
            } catch { return $false }
        }
    }
}

function Test-PortListening([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $attempt = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $attempt.AsyncWaitHandle.WaitOne(400)) { return $false }
        $client.EndConnect($attempt)
        return $true
    } catch { return $false } finally { $client.Dispose() }
}

function Get-OwnedProcess([string]$Name) {
    $recordPath = Join-Path $RuntimeRoot "$Name.json"
    if (-not (Test-Path -LiteralPath $recordPath)) { return $null }
    try {
        $record = Get-Content -Raw -Encoding UTF8 -LiteralPath $recordPath | ConvertFrom-Json
        $process = Get-Process -Id $record.processId -ErrorAction Stop
        if ($process.StartTime.ToUniversalTime().Ticks -ne ([DateTime]$record.startedAt).ToUniversalTime().Ticks) { return $null }
        $details = Get-CimInstance Win32_Process -Filter "ProcessId=$($record.processId)"
        if (-not $details.CommandLine.Contains($LauncherPath)) { return $null }
        return $process
    } catch { return $null }
}

$mutex = $null
$ownsMutex = $false
try {
    $hash = [System.Security.Cryptography.SHA256]::Create()
    try { $key = ([BitConverter]::ToString($hash.ComputeHash($Utf8.GetBytes($RepoRoot.ToLowerInvariant())))).Replace('-', '').Substring(0, 16) } finally { $hash.Dispose() }
    $mutex = New-Object System.Threading.Mutex($false, "Local\EduSysLauncher-$key")
    try { $ownsMutex = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) { Write-Host '教学系统正在启动，请等待已有启动窗口完成。'; exit 0 }
    New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null
    Set-Location -LiteralPath $RepoRoot
    Write-Host '教学系统一键启动：前端 / 平台 API / LAM / 本地语音检测' -ForegroundColor Cyan
    Write-Host "项目：$RepoRoot"
    Write-Host "日志：$RuntimeRoot"
    $node = Get-NodePath
    $version = & $node --version
    if ($LASTEXITCODE -ne 0) { throw '无法运行 Node.js。' }
    $major = [int]($version.Trim().TrimStart('v').Split('.')[0])
    if ($major -lt 22) { throw '需要 Node.js 22 或更新版本。' }
    foreach ($relative in @('apps\teacher-web\node_modules\vite\bin\vite.js', 'apps\platform-api\node_modules\tsx\package.json', 'components\openavatarchat\.venv\Scripts\python.exe')) {
        if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot $relative))) { throw "运行依赖缺失：$relative。请按 README 完成依赖安装。" }
    }
    $hasKey = [bool]$env:DASHSCOPE_API_KEY
    $envFile = Join-Path $RepoRoot '.env'
    if (Test-Path -LiteralPath $envFile) {
        foreach ($line in Get-Content -LiteralPath $envFile) {
            if ($line -match '^\s*DASHSCOPE_API_KEY\s*=\s*(.*)$') {
                $hasKey = [bool]$Matches[1].Trim().Trim('"').Trim("'")
            }
        }
    }
    if (-not $hasKey) { throw '未配置 DASHSCOPE_API_KEY。请在项目 .env 或 Windows 用户环境变量中配置，供语音识别及 LAM 语音使用。' }

    Write-Host '[1/3] 校验本地语音检测模型；缺失时自动下载并校验…'
    & $node (Join-Path $PSScriptRoot 'setup-local-kws.mjs')
    if ($LASTEXITCODE -ne 0) { throw '本地语音检测模型准备失败。' }

    Write-Host '[2/3] 启动服务（复用已运行的服务）…'
    $ports = @{ api = 4300; web = 5173; lam = 8282 }
    $workers = @{}
    $ready = @{}
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    foreach ($name in @('api', 'web', 'lam')) {
        $ready[$name] = Test-ServiceReady $name
        if ($ready[$name]) { Write-Host "  $name 已就绪，复用现有服务。"; continue }
        $existing = Get-OwnedProcess $name
        if ($null -ne $existing) { $workers[$name] = $existing; Write-Host "  $name 正在预热，继续等待。"; continue }
        if (Test-PortListening $ports[$name]) { throw "端口 $($ports[$name]) 已被非预期服务占用，未启动重复进程。请检查该端口。" }
        $stdout = Join-Path $RuntimeRoot "$name-$stamp.stdout.log"
        $stderr = Join-Path $RuntimeRoot "$name-$stamp.stderr.log"
        $arguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Service {1}' -f $LauncherPath, $name
        $process = Start-Process -FilePath $ShellExe -ArgumentList $arguments -WorkingDirectory $RepoRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
        $workers[$name] = $process
        $record = @{ service = $name; processId = $process.Id; startedAt = $process.StartTime.ToUniversalTime().ToString('o'); stdout = $stdout; stderr = $stderr }
        [IO.File]::WriteAllText((Join-Path $RuntimeRoot "$name.json"), ($record | ConvertTo-Json), $Utf8)
        Write-Host "  $name 已启动，正在等待就绪。"
    }

    $timer = [Diagnostics.Stopwatch]::StartNew()
    $lastProgress = -15
    while ($true) {
        foreach ($name in @('api', 'web', 'lam')) {
            if (-not $ready[$name]) {
                $ready[$name] = Test-ServiceReady $name
                if ($ready[$name]) { Write-Host "  $name 就绪。" -ForegroundColor Green }
                elseif ($workers.ContainsKey($name)) {
                    $workers[$name].Refresh()
                    if ($workers[$name].HasExited) { throw "$name 启动进程已退出。请查看 $RuntimeRoot 中的 $name 日志。" }
                }
            }
        }
        if ($ready.api -and $ready.web -and $ready.lam) { break }
        if ($timer.Elapsed.TotalSeconds -gt $TimeoutSeconds) { throw '等待服务就绪超时。已启动的进程仍保留；可查看日志后再次运行启动器。' }
        if ($timer.Elapsed.TotalSeconds - $lastProgress -ge 15) {
            Write-Host ('  等待 {0}；已用 {1} 秒。LAM 首次启动需要加载模型。' -f ((@('api','web','lam') | Where-Object { -not $ready[$_] }) -join ' / '), [int]$timer.Elapsed.TotalSeconds)
            $lastProgress = $timer.Elapsed.TotalSeconds
        }
        Start-Sleep -Seconds 2
    }
    Write-Host '[3/3] 检查前端代理、语音配置和模型入口…'
    $config = Read-JsonUrl ($WebUrl + 'api/runtime/config')
    if ($null -eq $config -or $config.avatar -ne 'lam' -or -not $config.speech.asr -or -not $config.speech.tts) {
        throw '前端连接的 API 尚未配置 LAM / ASR / TTS；请检查运行配置和密钥。'
    }
    $lamProxy = Read-JsonUrl ($WebUrl + 'openavatarchat-runtime/openavatarchat/initconfig')
    if ($null -eq $lamProxy -or $lamProxy.avatar_config.avatar_type -ne 'lam') { throw '前端 LAM 代理未就绪。' }
    foreach ($asset in @('audio/classroom-keywords.js', 'audio/classroom-microphone.js', 'vendor/local-kws/tokens.txt')) {
        $response = Invoke-WebRequest -UseBasicParsing -Uri ($WebUrl + $asset) -TimeoutSec 10
        if ($response.StatusCode -ne 200 -or $response.Content -match '<!doctype html>') { throw "语音检测资源不可用：$asset" }
    }
    $status = @{ checkedAt = (Get-Date).ToString('o'); web = $WebUrl; api = 'ready'; lam = 'ready'; speechConfigured = $true; keywordAssets = 'verified' }
    [IO.File]::WriteAllText((Join-Path $RuntimeRoot 'ready.json'), ($status | ConvertTo-Json), $Utf8)
    Write-Host "启动完成：$WebUrl" -ForegroundColor Green
    Write-Host '进入课堂后选择“检测输入”，点击“开启语音唤醒”即可开始收音。'
    Write-Host '关闭启动窗口不会关闭后台服务。重复启动会复用现有服务。'
    if (-not $NoBrowser) { Start-Process -FilePath $WebUrl -WindowStyle Hidden }
    exit 0
} catch {
    Write-Host ('启动未完成：' + $_.Exception.Message) -ForegroundColor Red
    Write-Host "诊断日志：$RuntimeRoot"
    exit 1
} finally {
    if ($ownsMutex) { $mutex.ReleaseMutex() }
    if ($null -ne $mutex) { $mutex.Dispose() }
}
