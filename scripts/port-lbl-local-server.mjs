import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'web');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
const server=http.createServer((request,response)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1:8198').pathname);}catch{response.writeHead(400).end();return;}
  if(pathname==='/__health'){response.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({app:'port-lbl-classroom',pages:106,pid:process.pid}));return;}
  if(pathname==='/__stop'&&request.method==='POST'){
    if(request.headers.origin&&!['http://127.0.0.1:8198','http://localhost:8198'].includes(request.headers.origin)){response.writeHead(403).end();return;}
    response.writeHead(200).end('Stopped');server.close();return;
  }
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405).end();return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/port-lbl-preview.html':pathname));
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile()){response.writeHead(404).end('Not found');return;}
    response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(request.method==='HEAD')response.end();else fs.createReadStream(file).pipe(response);
  });
});
server.listen(8198,'127.0.0.1',()=>console.log('Port LBL: http://127.0.0.1:8198/port-lbl-preview.html'));
