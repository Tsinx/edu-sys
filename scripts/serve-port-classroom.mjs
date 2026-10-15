import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=await realpath(resolve('apps/teacher-web/dist')),port=Number(process.env.PORT_CLASSROOM_PORT??5174);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.mp3':'audio/mpeg','.wav':'audio/wav','.vtt':'text/vtt; charset=utf-8','.woff':'font/woff','.woff2':'font/woff2','.wasm':'application/wasm','.pdf':'application/pdf','.zip':'application/zip'};
const server=http.createServer(async(req,res)=>{try{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname==='/'?'/port-classroom.html':url.pathname),candidate=resolve(root,'.'+name);
 if(!candidate.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 const path=await realpath(candidate),extension=extname(path).toLowerCase();if(!path.startsWith(root+sep)||!types[extension]){res.writeHead(404);res.end();return;}
 const info=await stat(path);if(!info.isFile()){res.writeHead(404);res.end();return;}
 const headers={'Content-Type':types[extension],'Accept-Ranges':'bytes','Cache-Control':extension==='.html'?'no-store':'public,max-age=3600','X-Content-Type-Options':'nosniff'};
 let start=0,end=info.size-1,status=200;if(req.headers.range){const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;}
 res.writeHead(status,{...headers,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else createReadStream(path,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }catch{res.writeHead(404);res.end('Page not found');}});
server.listen(port,'0.0.0.0',()=>console.log(`Port classroom: http://127.0.0.1:${port}/port-classroom.html`));
