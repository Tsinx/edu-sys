param([string]$SourceRoot = (Join-Path $PSScriptRoot '..\output\management-principles\source-phase3'))
$ErrorActionPreference = 'Stop'
$resolvedSource = (Resolve-Path -LiteralPath $SourceRoot).Path
$manifest = Get-Content -LiteralPath (Join-Path $resolvedSource 'manifest.json') -Raw | ConvertFrom-Json
$powerpoint = New-Object -ComObject PowerPoint.Application
$hadOtherPresentations = $powerpoint.Presentations.Count -gt 0
$results = @()
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
      $order = @()
      for ($page = 1; $page -le $presentation.Slides.Count; $page++) {
        $slide = $presentation.Slides.Item($page)
        $slide.Export((Join-Path $renderFolder ('{0:D3}.png' -f $page)), 'PNG', $renderWidth, $renderHeight)
        $order += @{page=$page;slideId=$slide.SlideID;name=$slide.Name;hidden=[bool]$slide.SlideShowTransition.Hidden}
      }
      if ([IO.Path]::GetExtension($sourceFile) -eq '.ppt') {
        $parsedFolder = Join-Path $resolvedSource 'parsed'
        New-Item -ItemType Directory -Path $parsedFolder -Force | Out-Null
        $parsedPath = Join-Path $parsedFolder "$($deck.id).pptx"
        $presentation.SaveCopyAs($parsedPath, 24)
      }
      $results += @{id=$deck.id;pages=$presentation.Slides.Count;width=$renderWidth;height=$renderHeight;order=$order}
      Write-Output "Rendered $($deck.id): $($presentation.Slides.Count) original pages"
    } finally { $presentation.Close() }
    if ([IO.Path]::GetExtension($sourceFile) -eq '.ppt') {
      $parsedPresentation = $powerpoint.Presentations.Open($parsedPath, -1, 0, 0)
      try {
        if ($parsedPresentation.Slides.Count -ne $deck.pages) {throw "Conversion count mismatch: $($deck.id)"}
        $parsedRenders = Join-Path $resolvedSource "parsed-renders/$($deck.id)"
        New-Item -ItemType Directory -Path $parsedRenders -Force | Out-Null
        for ($page=1; $page -le $parsedPresentation.Slides.Count; $page++) {
          $parsedPresentation.Slides.Item($page).Export((Join-Path $parsedRenders ('{0:D3}.png' -f $page)), 'PNG', $renderWidth, $renderHeight)
        }
      } finally { $parsedPresentation.Close() }
      Write-Output "Rendered $($deck.id): private parsing copy"
    }
  }
  @{renderedAt=(Get-Date -Format o);decks=$results} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $resolvedSource 'powerpoint-order.json') -Encoding utf8
} finally {
  if (-not $hadOtherPresentations -and $powerpoint.Presentations.Count -eq 0) { $powerpoint.Quit() }
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerpoint) | Out-Null
}
