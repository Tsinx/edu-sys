import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=path.resolve('output/port-lbl-classroom');
await fs.mkdir(root,{recursive:true});
const dist=path.resolve('apps/teacher-web/dist');
// Prune only stale, generated bundle files in this package's known assets directory.
const packageAssets=path.join(root,'web','assets');
const currentAssets=new Set(await fs.readdir(path.join(dist,'assets')));
for(const entry of await fs.readdir(packageAssets,{withFileTypes:true}).catch(()=>[])){
  const stale=path.resolve(packageAssets,entry.name);
  if(entry.isFile()&&!currentAssets.has(entry.name)&&stale.startsWith(root+path.sep))await fs.unlink(stale);
}
for(const entry of ['assets','globe-assets','port-lbl-preview.html'])await fs.cp(path.join(dist,entry),path.join(root,'web',entry),{recursive:true});
await fs.cp(path.join(dist,'course-assets/port-management/lbl'),path.join(root,'web/course-assets/port-management/lbl'),{recursive:true});
await fs.mkdir(path.join(root,'runtime'),{recursive:true});
if(!await fs.stat(path.join(root,'runtime/node.exe')).catch(()=>undefined))await fs.copyFile(process.execPath,path.join(root,'runtime/node.exe'));
const nodeLicense=path.join(path.dirname(process.execPath),'LICENSE');
if(await fs.stat(nodeLicense).catch(()=>undefined))await fs.copyFile(nodeLicense,path.join(root,'runtime/LICENSE'));
await fs.copyFile('scripts/port-lbl-local-server.mjs',path.join(root,'serve.mjs'));
await fs.copyFile('docs/course/港口管理-双讲授课说明.md',path.join(root,'授课说明.md'));
await fs.mkdir(path.join(root,'资料'),{recursive:true});
for(const name of ['港口管理-第二讲-LBL-v3-52页.pdf','港口管理-第三讲-LBL-v3-54页.pdf']){
  const source=path.join('output/pdf',name);
  if(await fs.stat(source).catch(()=>undefined))await fs.copyFile(source,path.join(root,'资料',name));
}
for(const [source,name] of [
  ['docs/design/port-lbl-source-review.md','来源与教学边界.md'],
  ['docs/design/port-lbl-image-provenance.json','图像来源记录.json'],
  ['docs/design/port-lbl-geography-provenance.json','地理底图来源记录.json'],
  ['output/pdf/port-lbl-pdf-check.json','PDF校验记录.json'],
  ['docs/design/port-lbl-final-qa.md','验收记录.md']
])if(await fs.stat(source).catch(()=>undefined))await fs.copyFile(source,path.join(root,'资料',name));
await fs.writeFile(path.join(root,'启动课件.cmd'),'@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"\r\n');
await fs.writeFile(path.join(root,'停止课件.cmd'),'@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-RestMethod http://127.0.0.1:8198/__health; if($r.app -eq \'port-lbl-classroom\') {Invoke-RestMethod -Method Post http://127.0.0.1:8198/__stop | Out-Null} } catch {}"\r\n');
await fs.writeFile(path.join(root,'start.ps1'),'\uFEFF'+String.raw`param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$courseRoot = $PSScriptRoot
$ready = $false
try { $status = Invoke-RestMethod 'http://127.0.0.1:8198/__health' -TimeoutSec 2; $ready = $status.app -eq 'port-lbl-classroom' } catch {}
if (-not $ready) {
  Start-Process -FilePath (Join-Path $courseRoot 'runtime/node.exe') -ArgumentList ('"' + (Join-Path $courseRoot 'serve.mjs') + '"') -WorkingDirectory $courseRoot -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 300
    try { $status = Invoke-RestMethod 'http://127.0.0.1:8198/__health' -TimeoutSec 2; if ($status.app -eq 'port-lbl-classroom') { $ready = $true; break } } catch {}
  }
}
if ($ready) { if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:8198/port-lbl-preview.html?page=0' } }
else { Write-Host '课件服务未启动，请检查 8198 端口。'; Read-Host '按回车退出' }
`,'utf8');
const files=[];
async function inventory(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const p=path.join(directory,entry.name);if(entry.isDirectory())await inventory(p);else if(entry.name!=='package-manifest.json'){const bytes=await fs.readFile(p);files.push({path:path.relative(root,p).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await inventory(root);
await fs.writeFile(path.join(root,'package-manifest.json'),JSON.stringify({title:'港口管理第二、三讲',lessonPages:[52,54],canvas:[1600,1000],files},null,2));
console.log(JSON.stringify({root,files:files.length,bytes:files.reduce((sum,file)=>sum+file.bytes,0)}));
