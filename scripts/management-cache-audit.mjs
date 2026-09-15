import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const out=resolve('output/management-principles/qa-phase2/cache');await mkdir(out,{recursive:true});
const versions=[resolve('output/management-campus-20260914-final/web'),resolve(process.argv[2]||'output/campus-management-phase2-20260915-delivery-final','web')];
const manifests=await Promise.all(versions.map(v=>readFile(resolve(v,'offline-manifest.json'),'utf8').then(JSON.parse)));
const build=JSON.parse(await readFile('packages/course-content/src/management-principles/manifest.json','utf8'));
assert.notEqual(manifests[0].releaseId,manifests[1].releaseId);
let active=0;
const proxyAbort=new AbortController();const sockets=new Set();
const server=createServer(async(req,res)=>{
 try {
  if(req.url.startsWith('/api/')){
   const buffers=[];for await(const b of req)buffers.push(b);
   const headers={...req.headers};delete headers.host;delete headers['content-length'];
   const r=await fetch(`http://127.0.0.1:4314${req.url}`,{method:req.method,headers,signal:proxyAbort.signal,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(buffers)})});
   const responseHeaders=Object.fromEntries(r.headers);delete responseHeaders['content-encoding'];delete responseHeaders['content-length'];delete responseHeaders['transfer-encoding'];
   res.writeHead(r.status,responseHeaders);res.end(Buffer.from(await r.arrayBuffer()));return;
  }
  const root=versions[active];let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  if(!(await stat(file).catch(()=>null))?.isFile()){
   if(extname(file)){res.writeHead(404);res.end();return;}
   file=resolve(root,'index.html');
  }
  const content=await readFile(file);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(content);
 }catch(e){if(proxyAbort.signal.aborted||res.destroyed)return;if(!res.headersSent)res.writeHead(404);res.end(String(e));}
});
server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const profile=await mkdtemp(resolve(out,'browser-profile-'));
const launch=()=>chromium.launchPersistentContext(profile,{headless:true,viewport:{width:1600,height:1100}});
let context=await launch();let page=context.pages()[0]||await context.newPage();
const report={checkedAt:new Date().toISOString(),versions:manifests.map(m=>m.releaseId),downloads:[],errors:[]};
async function waitForProbe(probe,timeout=180000){const started=Date.now();while(Date.now()-started<timeout){if(await probe())return;await new Promise(resolve=>setTimeout(resolve,250));}throw new Error('Service worker state timed out');}
const status=()=>page.evaluate(async()=>{const reg=await navigator.serviceWorker.ready;return new Promise((resolve,reject)=>{const c=new MessageChannel();c.port1.onmessage=e=>{if(e.data.error)reject(new Error(e.data.error));else if(e.data.result)resolve(e.data.result);};reg.active.postMessage({type:'status'},[c.port2]);});});
async function downloadCurrent(index){
 await page.getByRole('button',{name:/离线与同步/}).click();
 const article=page.locator('.campus-offline-panel article').filter({has:page.getByText(/管理学/,{exact:false})});await article.waitFor({timeout:120000});assert.equal(await article.count(),1);
 await article.getByRole('button',{name:'下载并校验'}).click();await article.getByText(/已校验，可离线使用/).waitFor({timeout:180000});
 const s=await status();assert.equal(s.releaseId,manifests[index].releaseId);assert.ok(s.ready.includes('management'));
 const expected=manifests[index].files.filter(f=>f.group==='management');report.downloads.push({version:s.releaseId,files:expected.length,bytes:expected.reduce((n,f)=>n+f.bytes,0),ready:s.ready});
 await page.screenshot({path:resolve(out,`version-${index+1}.png`),fullPage:true});
}
try{
 assert.equal((await context.request.post(base+'/api/identity/development/session',{data:{role:'teacher'}})).status(),201);
 await page.goto(base+'/courses/management-principles');await downloadCurrent(0);
 active=1;
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await waitForProbe(()=>page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting)));
 assert.equal((await status()).releaseId,manifests[0].releaseId);report.oldTabKeepsVersion=true;
 await context.close();context=await launch();page=context.pages()[0]||await context.newPage();
 await page.goto(base+'/courses/management-principles');
 await waitForProbe(async()=>(await status()).releaseId===manifests[1].releaseId,120000);
 await page.locator('.mg-course-overview').waitFor({timeout:30000});
 assert.equal(await page.locator('.mg-course-overview button').count(),build.lessons.length);report.browserRestartActivatesNewVersion=true;
 await downloadCurrent(1);await context.setOffline(true);
 const hashes=await page.evaluate(async files=>{
  const result=[];for(const f of files){const r=await fetch(f.url);const bytes=await r.arrayBuffer();const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');result.push({url:f.url,status:r.status,bytes:bytes.byteLength,sha256});}return result;
 },manifests[1].files.filter(f=>f.group==='management'));
 for(const r of hashes){const f=manifests[1].files.find(f=>f.url===r.url);assert.equal(r.status,200);assert.equal(r.bytes,f.bytes);assert.equal(r.sha256,f.sha256);}
 report.offlineVerifiedFiles=hashes.length;report.offlineHashes=hashes;
 const privateCached=await page.evaluate(async()=>{const found=[];for(const name of await caches.keys()){for(const request of await(await caches.open(name)).keys()){if(new URL(request.url).pathname.startsWith('/api/'))found.push(request.url);}}return found;});assert.deepEqual(privateCached,[]);report.privateApiNotCached=true;
 await context.setOffline(false);await page.getByRole('button',{name:/离线与同步/}).click();await page.locator('.mg-course-overview button').last().click();await page.waitForURL('**/classroom/**');const id=page.url().split('/').at(-1);
 const lastPage=JSON.parse(await readFile('packages/course-content/src/management-principles/pages.json','utf8')).at(-1);
 assert.equal((await context.request.post(`${base}/api/class-sessions/${id}/events`,{data:{type:'set_slide',index:build.webPageCount}})).status(),201);
 // This HTTP-only version fixture does not forward classroom WebSockets; refresh verifies persisted position.
 await page.reload();
 await page.locator(`[data-management-page="${lastPage.slideKey}"]`).waitFor();assert.equal(await page.getByRole('button',{name:'下一页',exact:true}).isDisabled(),true);report.eighthLectureEndBoundaryAfterRefresh=true;
 await context.request.post(`${base}/api/class-sessions/${id}/end`);
 await writeFile(resolve(out,'audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,offlineHashes:hashes.length}));
}catch(e){report.errors.push(String(e));await writeFile(resolve(out,'failure.json'),JSON.stringify(report,null,2));await page.screenshot({path:resolve(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{proxyAbort.abort();for(const socket of sockets)socket.destroy();await context.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
