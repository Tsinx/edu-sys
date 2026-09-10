[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $repoRoot 'start-classroom.bat'
if (-not (Test-Path -LiteralPath $target)) { throw "启动器不存在：$target" }
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop '教学系统一键启动.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
if ((Test-Path -LiteralPath $shortcutPath) -and $shortcut.TargetPath -ne $target) {
    throw "桌面已存在同名的其他快捷方式，未覆盖：$shortcutPath"
}
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $repoRoot
$shortcut.Description = '启动教学前后端、LAM数字人，准备本地语音检测，并打开教学页面'
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,137"
$shortcut.WindowStyle = 1
$shortcut.Save()
Write-Host "桌面快捷方式已创建：$shortcutPath"
