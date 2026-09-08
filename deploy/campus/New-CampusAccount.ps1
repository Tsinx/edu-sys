#requires -Version 7.0
param([ValidateSet('teacher','student')][string]$Role = 'student', [switch]$ResetPassword)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:EDU_ENV_FILE = Join-Path $PSScriptRoot '.env'
$accountName = Read-Host '账号（字母、数字、_.@-）'
$displayName = if ($ResetPassword) { '' } else { Read-Host '显示姓名' }
$securePassword = Read-Host '密码（至少12位）' -AsSecureString
$plainPassword = ConvertFrom-SecureString -SecureString $securePassword -AsPlainText
try {
    $inputJson = @{username=$accountName;displayName=$displayName;role=$Role;password=$plainPassword} | ConvertTo-Json -Compress
    $action = if ($ResetPassword) { 'reset-password' } else { 'create' }
    $inputJson | & node (Join-Path $PSScriptRoot 'admin.mjs') $action
    if ($LASTEXITCODE -ne 0) { throw '账号操作失败。' }
} finally { $plainPassword = $null; $inputJson = $null; $securePassword.Dispose() }
