# Shared, side-effect-free checks. Keep compatible with Windows PowerShell 5.1.
function Get-ClassroomProperty($Value, [string]$Name) {
    if ($null -eq $Value) { return $null }
    if ($Value -is [System.Collections.IDictionary]) {
        if ($Value.Contains($Name)) { return $Value[$Name] }
        return $null
    }
    $property = $Value.PSObject.Properties[$Name]
    if ($null -ne $property) { return $property.Value }
    return $null
}

function Get-ClassroomResponseText($Response) {
    # Windows PowerShell 5.1 misdecodes UTF-8 HTML when charset is omitted.
    $stream = Get-ClassroomProperty $Response 'RawContentStream'
    if ($stream -is [System.IO.MemoryStream]) {
        return [System.Text.Encoding]::UTF8.GetString($stream.ToArray())
    }
    return [string](Get-ClassroomProperty $Response 'Content')
}

function ConvertFrom-ClassroomJsonResponse([string]$ContentType, [string]$Content) {
    # Vite's SPA fallback can return HTML with HTTP 200 for an /api URL.
    if ($ContentType -notmatch '^application/(?:[\w.+-]+\+)?json(?:\s*;|\s*$)') { return $null }
    if (-not $Content.TrimStart().StartsWith('{')) { return $null }
    try { return ConvertFrom-Json -InputObject $Content -ErrorAction Stop } catch { return $null }
}

function Test-ClassroomApiHealth($Health) {
    return ((Get-ClassroomProperty $Health 'service') -eq 'edu-platform-api' -and
        (Get-ClassroomProperty $Health 'status') -eq 'ok')
}

function Test-ClassroomWebPage([int]$StatusCode, [string]$Html) {
    return ($StatusCode -eq 200 -and $Html -match '/src/main\.tsx' -and
        $Html -match '<title>\s*教学中枢\s*·\s*教师工作台\s*</title>')
}

function Select-ClassroomWebPort {
    param(
        [int[]]$Candidates,
        [scriptblock]$IsReady,
        [scriptblock]$IsListening,
        [scriptblock]$IsWarming = { param($Port) return $false }
    )
    # Prefer an existing project frontend, even if the preferred port is free.
    foreach ($candidate in $Candidates) {
        if ((& $IsReady $candidate) -or (& $IsWarming $candidate)) { return $candidate }
    }
    foreach ($candidate in $Candidates) {
        if (-not (& $IsListening $candidate)) { return $candidate }
    }
    throw '候选网页端口均已被占用。未关闭任何进程；请使用 -WebPort 指定其他起始端口。'
}

function Assert-ClassroomDevelopmentRuntime($Config, $Health) {
    if ($null -eq $Config) {
        throw '前端代理未返回有效的 JSON 运行配置；请检查网页端口是否属于教学系统，以及 API 代理连接。'
    }
    $profile = Get-ClassroomProperty $Config 'profile'
    $identity = Get-ClassroomProperty $Config 'identity'
    $speech = Get-ClassroomProperty $Config 'speech'
    $asr = Get-ClassroomProperty $speech 'asr'
    $tts = Get-ClassroomProperty $speech 'tts'
    if ($null -eq $profile -or $null -eq $identity -or $asr -isnot [bool] -or $tts -isnot [bool]) {
        throw '运行配置缺少 profile、identity 或 speech 字段；当前端口可能连接了其他应用或不兼容的 API。'
    }
    if (-not (Test-ClassroomApiHealth $Health)) {
        throw '前端代理的健康响应不属于教学平台 API；请检查当前网页端口及代理目标。'
    }
    $developmentIdentity = Get-ClassroomProperty $Health 'developmentIdentityEnabled'
    if ($profile -ne 'development' -or $identity -ne 'development' -or
        $developmentIdentity -isnot [bool] -or -not $developmentIdentity) {
        throw '当前服务未启用本地开发身份，无法使用免密码本地登录。请检查部署配置后重新启动。'
    }
    if (-not $asr) {
        throw '运行中的 API 尚未加载语音密钥。请确认该进程继承了 DASHSCOPE_API_KEY，并重启 API；这不表示已保存的密钥被删除。'
    }
    if (-not $tts) {
        throw 'ASR 密钥已加载，但 TTS 音色未配置。请检查项目根目录 .env 中的 EDU_SELFSTUDY_TTS_VOICE_ID，并重启 API 以加载配置。'
    }
}
