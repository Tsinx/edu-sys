[CmdletBinding()]
param([switch]$NoBrowser, [ValidateRange(1024, 65535)][int]$Port = 8766)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$PythonExe = Join-Path $RepoRoot 'components\openavatarchat\.venv\Scripts\python.exe'
$ServerScript = Join-Path $RepoRoot 'tools\kws-training\serve_collector.py'
$RuntimePath = Join-Path $RepoRoot '.runtime\kws-collector'
$Url = "http://127.0.0.1:$Port"
$UvExe = (Get-Command uv.exe -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath $PythonExe)) {
    throw '项目已有的 uv Python 环境不存在，请先配置 OpenAvatarChat 环境。录音服务本身仅依赖 Python 标准库。'
}
New-Item -ItemType Directory -Force -Path $RuntimePath | Out-Null
$Existing = $null
try { $Existing = Invoke-RestMethod "$Url/api/state" -TimeoutSec 2 } catch { }
if ($Existing) {
    if (-not ($Existing.PSObject.Properties.Name -contains 'storagePath') -or
        $Existing.storagePath -ne (Join-Path $RepoRoot '.runtime\kws-recordings')) {
        throw "端口 $Port 已被另一个服务使用，请指定其他 -Port。"
    }
    Write-Output "录音服务已就绪：$Url"
} else {
    # uv selects the existing interpreter; no dependency sync, torch import, or GPU work.
    $Process = Start-Process -FilePath $UvExe -ArgumentList @(
        'run', '--no-project', '--python', "`"$PythonExe`"", "`"$ServerScript`"", '--port', "$Port"
    ) -WorkingDirectory $RepoRoot -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $RuntimePath 'stdout.log') `
      -RedirectStandardError (Join-Path $RuntimePath 'stderr.log')
    $Ready = $false
    $Deadline = [DateTime]::UtcNow.AddSeconds(60)
    while ([DateTime]::UtcNow -lt $Deadline) {
        try {
            $Status = Invoke-RestMethod "$Url/api/state" -TimeoutSec 2
            if ($Status.storagePath -eq (Join-Path $RepoRoot '.runtime\kws-recordings')) { $Ready = $true; break }
        } catch { }
        if ($Process.HasExited) { throw "录音服务退出，请查看 $RuntimePath\stderr.log" }
        Start-Sleep -Milliseconds 400
    }
    if (-not $Ready) { throw "录音服务尚未就绪，请查看 $RuntimePath\stderr.log" }
    @{ pid = $Process.Id; url = $Url; startedAt = [DateTime]::UtcNow.ToString('o') } |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $RuntimePath 'service.json') -Encoding utf8
    Write-Output "录音服务已就绪：$Url"
}
Write-Output "录音目录：$(Join-Path $RepoRoot '.runtime\kws-recordings')"
Write-Output '只采集录音；未启动模型或训练。'
if (-not $NoBrowser) { Start-Process $Url }
