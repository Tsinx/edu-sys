$ErrorActionPreference='Stop'
$courseDirectory=$PSScriptRoot
$portFile=Join-Path $courseDirectory '.server-port'
$coursePort=$null
if(Test-Path -LiteralPath $portFile){
  $candidate=Get-Content -LiteralPath $portFile -Raw
  if($candidate -match '^\d+$'){
    try{$check=Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$candidate/__health" -TimeoutSec 2;if($check.Content -eq 'international-mathematics-offline'){$coursePort=$candidate}}catch{}
  }
}
if(-not $coursePort){
  $nodePath=Join-Path $courseDirectory 'runtime\node.exe'
  $serverPath=Join-Path $courseDirectory 'server.mjs'
  if(-not(Test-Path -LiteralPath $nodePath)){throw 'Bundled Node runtime is missing. Extract the complete ZIP first.'}
  $courseServer=Start-Process -FilePath $nodePath -ArgumentList ('"'+$serverPath+'"') -WorkingDirectory $courseDirectory -WindowStyle Hidden -PassThru
  for($attempt=0;$attempt -lt 60;$attempt++){
    Start-Sleep -Milliseconds 200
    if(Test-Path -LiteralPath $portFile){$candidate=Get-Content -LiteralPath $portFile -Raw;try{$check=Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$candidate/__health" -TimeoutSec 1;if($check.Content -eq 'international-mathematics-offline'){$coursePort=$candidate;break}}catch{}}
    if($courseServer.HasExited){throw 'The local course server stopped unexpectedly.'}
  }
  if(-not $coursePort){throw 'The local course server did not become ready.'}
}
Start-Process "http://127.0.0.1:$coursePort/"
