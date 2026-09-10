/* Campus assets only. Authentication and private API data never enter CacheStorage. */
const RELEASE="__EDU_RELEASE_ID__";
const PREFIX=`edu-campus-${RELEASE}-`;
const manifestUrl="/offline-manifest.json";
let downloading=false;
async function manifest() {
  const cache=await caches.open(`${PREFIX}metadata`);
  try {
    const response=await fetch(manifestUrl,{cache:"no-store"});
    if(!response.ok)throw new Error("资源清单不可用");
    const value=await response.clone().json();
    if(value.releaseId!==RELEASE)throw new Error("服务器版本已更新，请关闭旧页面后重新打开");
    await cache.put(manifestUrl,response);return value;
  } catch(error) {
    const cached=await cache.match(manifestUrl);if(cached)return cached.json();throw error;
  }
}
async function download(group,progress=()=>{}) {
  const data=await manifest();
  const files=data.files.filter(file=>file.group===group);
  if(!files.length)throw new Error("资源分组不存在");
  const cache=await caches.open(`${PREFIX}${group}`);
  let done=0;const total=files.reduce((n,file)=>n+file.bytes,0);
  for(const file of files) {
    let response=await cache.match(file.url);
    if(!response) {
      response=await fetch(file.url,{cache:"no-store"});
      if(!response.ok || response.type==="opaque")throw new Error(`资源未下载完成：${file.url}`);
      const content=await response.clone().arrayBuffer();
      const digest=[...new Uint8Array(await crypto.subtle.digest("SHA-256",content))].map(n=>n.toString(16).padStart(2,"0")).join("");
      if(content.byteLength!==file.bytes || digest!==file.sha256)throw new Error(`资源校验失败：${file.url}`);
      await cache.put(file.url,response);
    }
    done+=file.bytes;progress({done,total});
  }
  await cache.put("/__edu_ready__",Response.json({releaseId:RELEASE,group,bytes:total}));
}
self.addEventListener("install",event=>event.waitUntil(download("shell")));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("message",event=>{
  const port=event.ports[0];if(!port)return;
  event.waitUntil((async()=>{
    try {
      if(event.data.type==="download") {
        if(downloading)throw new Error("已有下载正在进行，请等待完成。");
        downloading=true;
        try {await download(event.data.group,value=>port.postMessage({progress:value}));}
        finally {downloading=false;}
      }
      const data=await manifest();const ready=[];
      for(const group of data.groups) {
        const cache=await caches.open(`${PREFIX}${group.id}`);
        if(await cache.match("/__edu_ready__")) {
          const complete=(await Promise.all(data.files.filter(file=>file.group===group.id).map(file=>cache.match(file.url)))).every(Boolean);
          if(complete)ready.push(group.id);
        }
      }
      port.postMessage({result:{...data,ready}});
    } catch(error) {port.postMessage({error:error.message});}
  })());
});
async function findCached(request) {
  for(const group of ["shell","port","economic","avatar","runtime","metadata"]) {
    const cache=await caches.open(`${PREFIX}${group}`);
    const value=await cache.match(request,{ignoreVary:true});if(value)return value;
  }
}
async function rangeResponse(response,range) {
  const match=/^bytes=(\d+)-(\d*)$/.exec(range);
  if(!match)return response;
  const bytes=await response.arrayBuffer();const start=Number(match[1]);const end=Math.min(bytes.byteLength-1,match[2]?Number(match[2]):bytes.byteLength-1);
  if(start>end)return new Response(null,{status:416,headers:{"Content-Range":`bytes */${bytes.byteLength}`}});
  const headers=new Headers(response.headers);headers.set("Content-Range",`bytes ${start}-${end}/${bytes.byteLength}`);headers.set("Content-Length",String(end-start+1));headers.set("Accept-Ranges","bytes");
  return new Response(bytes.slice(start,end+1),{status:206,headers});
}
self.addEventListener("fetch",event=>{
  const request=event.request;const url=new URL(request.url);
  if(request.method!=="GET" || url.origin!==self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/openavatarchat-runtime"))return;
  event.respondWith((async()=>{
    if(request.mode==="navigate") {
      const shell=await findCached("/index.html");
      // A cached application stays on one build until its service worker is
      // replaced after all old tabs close. It may still edit course content.
      if(shell && !url.pathname.endsWith(".html"))return shell;
    }
    const cached=await findCached(url.pathname);
    if(cached)return request.headers.has("Range")?rangeResponse(cached,request.headers.get("Range")):cached;
    try {
      const response=await fetch(request);
      if(response.ok && response.status===200 && /\.(js|css|webp|png|svg|json|moc3|woff2?)$/.test(url.pathname) && url.pathname!==manifestUrl) {
        const cache=await caches.open(`${PREFIX}runtime`);await cache.put(url.pathname,response.clone());
      }
      return response;
    } catch(error) {
      if(request.mode==="navigate"){const shell=await findCached("/index.html");if(shell)return shell;}
      throw error;
    }
  })());
});
