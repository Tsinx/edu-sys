[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'classroom-launcher-checks.ps1')
$script:checks = 0
function Assert-Check([bool]$Condition, [string]$Description) {
    if (-not $Condition) { throw "FAILED: $Description" }
    $script:checks++
}
function Assert-Failure([scriptblock]$Action, [string]$Pattern) {
    $failed = $false
    try { & $Action | Out-Null } catch {
        if ($_.Exception.Message -notmatch $Pattern) { throw }
        $failed = $true
    }
    Assert-Check $failed "expected diagnostic: $Pattern"
}

$ownHtml = '<title>教学中枢 · 教师工作台</title><script src="/src/main.tsx"></script>'
$otherHtml = '<title>免疫小队 · 身体小镇</title><script src="/src/main.tsx"></script>'
Assert-Check (Test-ClassroomWebPage 200 $ownHtml) 'project frontend is recognized'
Assert-Check (-not (Test-ClassroomWebPage 200 $otherHtml)) 'another Vite app is not reused'
Assert-Check (-not (Test-ClassroomWebPage 503 $ownHtml)) 'failed frontend is not ready'
$rawStream = New-Object System.IO.MemoryStream
try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($ownHtml)
    $rawStream.Write($bytes, 0, $bytes.Length)
    $rawResponse = [pscustomobject]@{RawContentStream=$rawStream;Content='incorrectly decoded text'}
    Assert-Check ((Get-ClassroomResponseText $rawResponse) -eq $ownHtml) 'UTF-8 bytes take precedence over a misdecoded Content property'
    Assert-Check (Test-ClassroomWebPage 200 (Get-ClassroomResponseText $rawResponse)) 'Chinese project title is recognized in both shells'
} finally { $rawStream.Dispose() }
Assert-Check ((Get-ClassroomResponseText ([pscustomobject]@{Content=$ownHtml})) -eq $ownHtml) 'text-only response fallback remains supported'
Assert-Check ($null -eq (ConvertFrom-ClassroomJsonResponse 'text/html' $otherHtml)) 'HTML 200 is not runtime configuration'
Assert-Check ($null -eq (ConvertFrom-ClassroomJsonResponse 'application/json' $otherHtml)) 'mislabelled HTML is rejected'
Assert-Check ($null -eq (ConvertFrom-ClassroomJsonResponse 'application/json' '[{"profile":"development"}]')) 'root arrays are rejected'
Assert-Check ($null -eq (ConvertFrom-ClassroomJsonResponse 'application/json' '{broken')) 'malformed JSON is rejected'
Assert-Check ($null -eq (Get-ClassroomProperty ([pscustomobject]@{}) 'profile')) 'missing properties are safe under StrictMode'
Assert-Check ($null -eq (Get-ClassroomProperty '<html>' 'profile')) 'string responses do not cause PropertyNotFound'
Assert-Check ($null -eq (Get-ClassroomProperty $null 'profile')) 'null responses are safe'

$configText = '{"profile":"development","identity":"development","speech":{"asr":true,"tts":true}}'
$config = ConvertFrom-ClassroomJsonResponse 'application/json; charset=utf-8' $configText
$health = [pscustomobject]@{service='edu-platform-api';status='ok';developmentIdentityEnabled=$true}
Assert-Check ((Get-ClassroomProperty $config 'profile') -eq 'development') 'valid JSON configuration is parsed'
Assert-Check (Test-ClassroomApiHealth $health) 'expected API health is ready'
Assert-Check (-not (Test-ClassroomApiHealth ([pscustomobject]@{status='ok'}))) 'incomplete health is not ready'
Assert-Check (-not (Test-ClassroomApiHealth ([pscustomobject]@{service='other-app';status='ok'}))) 'foreign API is not ready'
Assert-ClassroomDevelopmentRuntime $config $health
Assert-Check $true 'valid development runtime passes'
Assert-Failure { Assert-ClassroomDevelopmentRuntime $null $health } 'JSON'
Assert-Failure { Assert-ClassroomDevelopmentRuntime ([pscustomobject]@{identity='development'}) $health } 'profile'
Assert-Failure { Assert-ClassroomDevelopmentRuntime $config ([pscustomobject]@{service='other-app';status='ok'}) } 'API'
$campus = $configText.Replace('"profile":"development"','"profile":"campus"') | ConvertFrom-Json
Assert-Failure { Assert-ClassroomDevelopmentRuntime $campus $health } '开发身份'
$noIdentity = [pscustomobject]@{service='edu-platform-api';status='ok'}
Assert-Failure { Assert-ClassroomDevelopmentRuntime $config $noIdentity } '开发身份'
$noAsr = $configText.Replace('"asr":true','"asr":false') | ConvertFrom-Json
Assert-Failure { Assert-ClassroomDevelopmentRuntime $noAsr $health } '语音密钥'
$noTts = $configText.Replace('"tts":true','"tts":false') | ConvertFrom-Json
Assert-Failure { Assert-ClassroomDevelopmentRuntime $noTts $health } '音色'

$selected = Select-ClassroomWebPort -Candidates @(5173,5174,5175) -IsReady {param($p) $false} -IsListening {param($p) $p -eq 5173}
Assert-Check ($selected -eq 5174) 'foreign 5173 is left alone and free 5174 is selected'
$selected = Select-ClassroomWebPort -Candidates @(5173,5174,5175) -IsReady {param($p) $p -eq 5174} -IsListening {param($p) $p -eq 5174}
Assert-Check ($selected -eq 5174) 'existing project frontend is preferred over a new process'
$selected = Select-ClassroomWebPort -Candidates @(5173,5174) -IsReady {param($p) $false} -IsListening {param($p) $false} -IsWarming {param($p) $p -eq 5174}
Assert-Check ($selected -eq 5174) 'owned warming frontend is reused'
Assert-Failure { Select-ClassroomWebPort -Candidates @(5173,5174) -IsReady {param($p) $false} -IsListening {param($p) $true} } 'WebPort'
Write-Host ("PASS: {0} launcher checks (PowerShell {1})" -f $script:checks, $PSVersionTable.PSVersion)
