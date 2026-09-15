param([string]$SourceRoot = (Join-Path $PSScriptRoot '..\output\management-principles\source'))
$ErrorActionPreference = 'Stop'
$resolvedSource = (Resolve-Path -LiteralPath $SourceRoot).Path
$manifest = Get-Content -LiteralPath (Join-Path $resolvedSource 'manifest.json') -Raw | ConvertFrom-Json
$powerpoint = New-Object -ComObject PowerPoint.Application
$hadOtherPresentations = $powerpoint.Presentations.Count -gt 0
try {
  foreach ($deck in $manifest.decks) {
    $sourceFile = Join-Path $resolvedSource (Join-Path 'originals' $deck.file)
    $renderFolder = Join-Path $resolvedSource (Join-Path 'renders' $deck.id)
    New-Item -ItemType Directory -Path $renderFolder -Force | Out-Null
    $presentation = $powerpoint.Presentations.Open($sourceFile, -1, 0, 0)
    try {
      if ($presentation.Slides.Count -ne $deck.pages) { throw "Slide count mismatch: $($deck.file)" }
      $renderWidth = 1600
      $renderHeight = [int][Math]::Round($renderWidth * $presentation.PageSetup.SlideHeight / $presentation.PageSetup.SlideWidth)
      for ($page = 1; $page -le $presentation.Slides.Count; $page++) {
        $destination = Join-Path $renderFolder ('{0:D3}.png' -f $page)
        $presentation.Slides.Item($page).Export($destination, 'PNG', $renderWidth, $renderHeight)
      }
      Write-Output "Rendered $($deck.id): $($presentation.Slides.Count) pages at ${renderWidth}x${renderHeight}"
    } finally { $presentation.Close() }
  }
} finally {
  if (-not $hadOtherPresentations -and $powerpoint.Presentations.Count -eq 0) { $powerpoint.Quit() }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerpoint) | Out-Null
}
