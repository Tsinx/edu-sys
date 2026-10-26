import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const root=fileURLToPath(new URL('..',import.meta.url)),destination=resolve(process.argv[2]??join(root,'output/port-enterprise-offline-'+Date.now()));
await mkdir(destination,{recursive:false});await mkdir(join(destination,'web'));await mkdir(join(destination,'runtime'));
const require=createRequire(join(root,'apps/teacher-web/package.json')),ts=require('typescript-api');
const privateFields=new Set(['teachingCue','assistantCue','teacherGuide','storyBeat','voyageStage','openQuestion']);
const plugin={name:'enterprise-portable-resources',setup(builder){
  builder.onLoad({filter:/useEnterprise\.ts$/},async({path})=>({contents:(await readFile(path,'utf8')).replace("new URL('./enterprise.worker.ts', import.meta.url)","new URL('./enterprise.worker.js', import.meta.url)"),loader:'ts'}));
  builder.onLoad({filter:/packages[\\/]course-content[\\/]src[\\/].*\.ts$/},async({path})=>{
    const source=await readFile(path,'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
    const result=ts.transform(ast,[context=>node=>{const visit=n=>ts.isPropertyAssignment(n)&&(ts.isIdentifier(n.name)||ts.isStringLiteral(n.name))&&privateFields.has(n.name.text)?ts.factory.updatePropertyAssignment(n,n.name,ts.factory.createStringLiteral('')):ts.visitEachChild(n,visit,context);return ts.visitNode(node,visit);}]);
    const contents=ts.createPrinter({removeComments:true}).printFile(result.transformed[0]);result.dispose();return{contents,loader:'ts'};
  });
}};
const common={absWorkingDir:root,bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,metafile:true,define:{'import.meta.env':JSON.stringify({DEV:false,PROD:true,BASE_URL:'/',VITE_EDU_RELEASE_ID:'port-enterprise-offline-1'})},plugins:[plugin],logLevel:'warning'};
const app=await build({...common,entryPoints:['apps/teacher-web/src/port-enterprise.tsx'],outfile:join(destination,'web/enterprise.js')});
const worker=await build({...common,entryPoints:['apps/teacher-web/src/features/port-simulation/enterprise/enterprise.worker.ts'],outfile:join(destination,'web/enterprise.worker.js')});
await writeFile(join(destination,'web/index.html'),'<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#163e46"><title>东湾港 · 港口长期独立经营</title><link rel="stylesheet" href="./enterprise.css"></head><body style="margin:0"><div id="port-enterprise-root"></div><script>window.__PORT_ENTERPRISE_OFFLINE__=true;</script><script type="module" src="./enterprise.js"></script></body></html>');
await copyFile(process.execPath,join(destination,'runtime/node.exe'));
const licenseCandidates=[join(dirname(process.execPath),'LICENSE'),join(dirname(process.execPath),'../LICENSE'),join(dirname(process.execPath),'../share/doc/node/LICENSE')];
let nodeLicense='';for(const path of licenseCandidates){try{nodeLicense=await readFile(path,'utf8');break;}catch{}}
if(!nodeLicense){const response=await fetch('https://raw.githubusercontent.com/nodejs/node/'+process.version+'/LICENSE',{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Node.js许可证下载失败。');nodeLicense=await response.text();}
await writeFile(join(destination,'runtime/NODE-LICENSE.txt'),nodeLicense);
const inputs=[...Object.keys(app.metafile.inputs),...Object.keys(worker.metafile.inputs)],seen=new Set(),notices=[];
for(const input of inputs){if(!input.replaceAll('\\','/').includes('node_modules/'))continue;let directory=dirname(resolve(root,input));while(directory!==dirname(directory)){
  try{const pkg=JSON.parse(await readFile(join(directory,'package.json'),'utf8'));if(pkg.name&&!seen.has(pkg.name)){seen.add(pkg.name);let license='';for(const filename of ['LICENSE','LICENSE.txt','LICENSE.md','license','LICENSE-MIT'])try{license=await readFile(join(directory,filename),'utf8');break;}catch{}notices.push(pkg.name+' '+(pkg.version??'')+'\n'+(license||'License: '+(pkg.license??'see package source')));}break;}catch{directory=dirname(directory);}
}}
await writeFile(join(destination,'THIRD-PARTY-NOTICES.txt'),notices.join('\n\n----------------------------------------\n\n'));
await writeFile(join(destination,'runtime/server.mjs'),[
  "import http from 'node:http';import {readFile,stat} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {resolve,join,sep} from 'node:path';import {createHash} from 'node:crypto';",
  "const root=fileURLToPath(new URL('../web/',import.meta.url)),instance=createHash('sha256').update(fileURLToPath(new URL('..',import.meta.url)).toLowerCase()).digest('hex').slice(0,12),port=Number(process.argv[2]??8217);",
  "http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');if(u.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({app:'port-enterprise',instance,version:'port-enterprise/1.0',pid:process.pid}));return;}if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}const name=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname),path=resolve(root,'.'+name);if(!path.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return;}const data=await readFile(path);res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port));",
].join('\n'));
const start=String.raw`param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$runtimeDirectory=Join-Path $PSScriptRoot 'runtime'
$executable=Join-Path $runtimeDirectory 'node.exe'
if(-not(Test-Path -LiteralPath $executable)){throw 'The bundled local runtime is missing. Extract the complete ZIP first.'}
$digest=[System.Security.Cryptography.SHA256]::Create()
$bytes=[System.Text.Encoding]::UTF8.GetBytes(($PSScriptRoot.TrimEnd('\')+'\').ToLowerInvariant())
$instance=([System.BitConverter]::ToString($digest.ComputeHash($bytes))).Replace('-','').Substring(0,12).ToLowerInvariant()
$statePath=Join-Path $env:TEMP ('EduPortEnterprise-'+$instance+'.json')
$port=8217
if(Test-Path -LiteralPath $statePath){try{$prior=Get-Content -LiteralPath $statePath -Raw|ConvertFrom-Json;$port=[int]$prior.port}catch{}}
for($attempt=0;$attempt -lt 30;$attempt++){
  $url='http://127.0.0.1:'+$port
  try{$health=Invoke-RestMethod -Uri ($url+'/health') -TimeoutSec 1;if($health.app -eq 'port-enterprise' -and $health.instance -eq $instance){if(-not $NoBrowser){Start-Process $url};Write-Output $url;exit 0}}catch{}
  $listener=$null
  try{$listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$port);$listener.Start();$listener.Stop()}catch{if($listener){$listener.Stop()};$port++;continue}
  $process=Start-Process -FilePath $executable -WorkingDirectory $runtimeDirectory -ArgumentList @('server.mjs',[string]$port) -WindowStyle Hidden -PassThru
  for($n=0;$n -lt 40;$n++){Start-Sleep -Milliseconds 100;try{$health=Invoke-RestMethod -Uri ($url+'/health') -TimeoutSec 1;if($health.instance -eq $instance){@{port=$port;pid=$process.Id;instance=$instance}|ConvertTo-Json|Set-Content -LiteralPath $statePath -Encoding UTF8;if(-not $NoBrowser){Start-Process $url};Write-Output $url;exit 0}}catch{}}
  if($process.HasExited){$port++;continue}
  throw 'The local file service did not become ready. Your browser saves are unchanged.'
}
throw 'No free local port is available.'
`;
await writeFile(join(destination,'Start-PortEnterprise.ps1'),'\ufeff'+start);
await writeFile(join(destination,'Start-PortEnterprise.cmd'),'@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-PortEnterprise.ps1"\r\n');
const stop=String.raw`param()
$ErrorActionPreference='Stop'
$digest=[System.Security.Cryptography.SHA256]::Create()
$bytes=[System.Text.Encoding]::UTF8.GetBytes(($PSScriptRoot.TrimEnd('\')+'\').ToLowerInvariant())
$instance=([System.BitConverter]::ToString($digest.ComputeHash($bytes))).Replace('-','').Substring(0,12).ToLowerInvariant()
$statePath=Join-Path $env:TEMP ('EduPortEnterprise-'+$instance+'.json')
if(-not(Test-Path -LiteralPath $statePath)){Write-Output 'This package has no active local service.';exit 0}
$prior=Get-Content -LiteralPath $statePath -Raw|ConvertFrom-Json
try{$health=Invoke-RestMethod -Uri ('http://127.0.0.1:'+[int]$prior.port+'/health') -TimeoutSec 2}catch{Write-Output 'The local service is already stopped. Browser saves are preserved.';exit 0}
if($health.app -ne 'port-enterprise' -or $health.instance -ne $instance -or [int]$health.pid -ne [int]$prior.pid){throw 'This address belongs to another service. Nothing was stopped.'}
$serviceProcess=Get-Process -Id ([int]$health.pid) -ErrorAction Stop
$expectedExecutable=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'runtime/node.exe'))
if([System.IO.Path]::GetFullPath($serviceProcess.Path) -ne $expectedExecutable){throw 'The service executable does not belong to this package. Nothing was stopped.'}
Stop-Process -Id $serviceProcess.Id
Write-Output 'Local file service stopped. Browser saves and exported records are preserved.'
`;
await writeFile(join(destination,'Stop-PortEnterprise.ps1'),'\ufeff'+stop);
await writeFile(join(destination,'Stop-PortEnterprise.cmd'),'@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop-PortEnterprise.ps1"\r\npause\r\n');
await writeFile(join(destination,'使用说明.txt'),'东湾港 · 港口长期独立经营\r\n\r\n1. 完整解压ZIP到普通文件夹，双击 Start-PortEnterprise.cmd。\r\n2. 浏览器在本机打开。无需安装Node、数据库或下载素材；程序包内已包含运行文件。运行平台为64位Windows，浏览器使用近期Edge或Chrome。\r\n3. 全部业务计算在浏览器工作线程运行；本机文件服务只提供程序文件。\r\n4. 自由练习支持1、3、5年。点击“教学模式”可另开三年、八章40步的个人教学路线，提供参考答案、原因、实际控件定位与真实证据；原记录保留。经营手册列明参数边界。\r\n5. 自动保存使用当前浏览器的本机数据库。关闭页面不会继续推进经营时间。\r\n6. 在清理浏览器数据、更换浏览器、电脑或地址前，使用“导出存档”。导入会另建记录并保留原存档。请固定解压目录与浏览器，重复启动保持同一地址；若地址改变，可导入之前导出的记录。\r\n7. 离线包用于个人经营、实验、导出和回放。正式任务领取与提交请使用教学平台上的“港口长期独立经营”入口；正式场次与自由练习分别保存。\r\n8. 重复启动会复用相同文件夹的本机文件服务；双击 Stop-PortEnterprise.cmd 安全结束本包的文件服务，存档继续保留。\r\n9. 引擎、目录、需求、财务与指标规则随存档保存。不兼容文件会明确提示并保留原件；旧课堂实验保持原入口与原规则。\r\n\r\n虚构教学港口，货批级小时离散模型。规格维度、成本、交期、风险、需求与监管时长为版本化教学设定，不作为现实港口生产或监管依据。\r\n');
const files=['web/index.html','web/enterprise.js','web/enterprise.css','web/enterprise.worker.js','runtime/node.exe','runtime/server.mjs','runtime/NODE-LICENSE.txt','Start-PortEnterprise.ps1','Start-PortEnterprise.cmd','Stop-PortEnterprise.ps1','Stop-PortEnterprise.cmd','THIRD-PARTY-NOTICES.txt','使用说明.txt'];
const manifest=[];for(const name of files){const bytes=await readFile(join(destination,name));manifest.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(join(destination,'package-verification.json'),JSON.stringify({schema:'port-enterprise-offline/1',createdAt:new Date().toISOString(),nodeVersion:process.version,rules:'port-enterprise/1.0',teaching:'port-enterprise-teaching/1',files:manifest},null,2));
console.log(JSON.stringify({destination,files:files.length,totalBytes:manifest.reduce((n,f)=>n+f.bytes,0)}));
