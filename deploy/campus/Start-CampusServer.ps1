#requires -Version 7.0
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.env')) { throw '请先复制 campus.env.example 为 .env，并填写域名和 API 配置。' }
$env:EDU_ENV_FILE = Join-Path $PSScriptRoot '.env'
& node (Join-Path $PSScriptRoot 'server.mjs')
exit $LASTEXITCODE
