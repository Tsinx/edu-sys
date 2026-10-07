$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$archiveRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot 'archive/courseware/economic-mathematics/v1-2026-10-02'))
if (-not $archiveRoot.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Archive target escaped repository' }
if (Test-Path -LiteralPath (Join-Path $archiveRoot 'manifest.json')) { throw 'An existing archive must not be overwritten' }
$coursePaths = @(
  'packages/course-content/src/economic-mathematics',
  'apps/teacher-web/src/features/economic-mathematics',
  'apps/teacher-web/public/course-assets/economic-mathematics',
  'docs/course/economic-mathematics-course-design-v1.md',
  'docs/course/economic-mathematics-assets-v1.md',
  'scripts/export-economic-mathematics-pdf.mjs',
  'scripts/economic-mathematics-pdf'
)
$sharedPaths = @(
  'packages/course-content/src/deck-registry.ts',
  'apps/teacher-web/src/features/classroom/TeachingSlides.tsx',
  'apps/platform-api/src/store.ts',
  'apps/platform-api/src/assistant/prompts.ts',
  'apps/platform-api/src/seed.ts',
  'apps/platform-api/src/app.ts'
)
$pdfPaths = @(Get-ChildItem -LiteralPath (Join-Path $repoRoot 'output/pdf') -File -ErrorAction SilentlyContinue | Where-Object { $_.Name.StartsWith('economic-mathematics') } | ForEach-Object { [IO.Path]::GetRelativePath($repoRoot,$_.FullName) })
$entries = @()
foreach ($relativePath in @($coursePaths + $pdfPaths + $sharedPaths)) {
  $source = Join-Path $repoRoot $relativePath
  if (-not (Test-Path -LiteralPath $source)) { continue }
  $referenceOnly = $sharedPaths -contains $relativePath
  $destination = Join-Path $archiveRoot ($(if ($referenceOnly) {'integration-reference'} else {'snapshot'}) + '/' + $relativePath)
  New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $destination -Recurse
  $files = if ((Get-Item -LiteralPath $source).PSIsContainer) { Get-ChildItem -LiteralPath $source -Recurse -File } else { Get-Item -LiteralPath $source }
  foreach ($file in $files) {
    $original = [IO.Path]::GetRelativePath($repoRoot,$file.FullName).Replace('\','/')
    $archived = ($(if ($referenceOnly) {'integration-reference/'} else {'snapshot/'}) + $original)
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    if ((Get-FileHash -LiteralPath (Join-Path $archiveRoot $archived) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash) { throw "Hash mismatch: $original" }
    $entries += [ordered]@{original=$original;archived=$archived;sha256=$hash;bytes=$file.Length;referenceOnly=$referenceOnly}
  }
}
$commit = (& git -C $repoRoot rev-parse HEAD).Trim()
[ordered]@{createdUtc=[DateTime]::UtcNow.ToString('o');baseCommit=$commit;deckId='deck-economic-mathematics-2026';versionId='release-economic-mathematics-v1';slideCount=1460;entries=$entries} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $archiveRoot 'manifest.json') -Encoding utf8
@'
# 经济数学 V1 归档

snapshot 保存旧版课程专属源代码、图片、课程说明、导出工具和已有 PDF。
manifest.json 记录原位置、归档位置、字节数和 SHA-256，复制完成后已逐文件比对。
integration-reference 是归档时共享接入文件的参考快照，包含其他工作的现有修改。

恢复时先验证 manifest 中的哈希，将 snapshot 中选定的课程专属文件复制回原位置。
共享注册、课堂分发、提示词及服务端文件必须合并经济数学相关片段，禁止整文件回滚。
将当前课程注册切回旧 deckId/versionId 后，重新运行课件、上下文、同步与构建检查。
历史课堂状态不包含在本归档中，由平台原存储保留。新版不能用旧页码重新解释这些记录。
'@ | Set-Content -LiteralPath (Join-Path $archiveRoot 'RESTORE.md') -Encoding utf8
Write-Output ("Archived and verified {0} files at {1}" -f $entries.Count,$archiveRoot)
