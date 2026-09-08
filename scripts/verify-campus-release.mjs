import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp,mkdir,readFile,writeFile,readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve,join } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { DatabaseSync } from "node:sqlite";
const release=resolve(process.argv[2] ?? "");assert.ok(process.argv[2],"Pass the standalone release directory");
const temp=await mkdtemp(join(tmpdir(),"edu-release-qa-"));
const data=join(temp,"data");await mkdir(data);
const probe=createServer();await new Promise(resolve=>probe.listen(0,"127.0.0.1",resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const env={...process.env,NODE_ENV:"production",EDU_ENV_FILE:join(temp,"unused.env"),EDU_DEPLOYMENT_PROFILE:"campus",EDU_PUBLIC_ORIGIN:"https://release.test",EDU_API_HOST:"127.0.0.1",EDU_API_PORT:String(port),EDU_DATA_FILE:join(data,"state.json"),EDU_PORT_SIMULATION_DB:join(data,"port-simulation.sqlite"),EDU_STATIC_ROOT:join(release,"web"),EDU_ALLOW_DEVELOPMENT_IDENTITY:"false",DASHSCOPE_API_KEY:"",EDU_ASSISTANT_API_KEY:"",EDU_SELFSTUDY_TTS_VOICE_ID:""};
async function command(executable,args,input) {
  return new Promise((resolve,reject)=>{const child=spawn(executable,args,{cwd:release,env,windowsHide:true,stdio:["pipe","pipe","pipe"],shell:executable.endsWith(".cmd")});let output="";
    child.stdout.on("data",chunk=>output+=chunk);child.stderr.on("data",chunk=>output+=chunk);child.on("error",reject);child.on("close",code=>code===0?resolve(output):reject(new Error(`Command failed (${code}): ${output}`)));child.stdin.end(input);
  });
}
await command(process.platform==="win32"?"npm.cmd":"npm",["ci","--omit=dev","--ignore-scripts","--no-audit","--no-fund"]);
const password=randomUUID();
await command(process.execPath,["admin.mjs","create"],JSON.stringify({username:"release-teacher",displayName:"独立包验收教师",role:"teacher",password}));
let server;let serverLog="";
try {
  server=spawn(process.execPath,["server.mjs"],{cwd:release,env,windowsHide:true,stdio:["ignore","pipe","pipe"]});
  server.stdout.on("data",chunk=>serverLog+=chunk);server.stderr.on("data",chunk=>serverLog+=chunk);
  const address=`http://127.0.0.1:${port}`;
  for(let attempt=0;;attempt++) {
    try {const response=await fetch(address+"/api/health");assert.equal(response.status,200);break;}
    catch(error){if(attempt>150 || server.exitCode!==null)throw new Error(`Standalone startup failed: ${serverLog}`);await new Promise(resolve=>setTimeout(resolve,100));}
  }
  assert.equal((await fetch(address)).status,200);
  assert.equal((await fetch(address+"/api/me")).status,401);
  assert.equal((await fetch(address+"/api/runtime/config").then(r=>r.json())).avatar,"browser");
  for(const path of ["/.env","/data/state.json","/server.mjs","/assets/missing.js"])assert.ok((await fetch(address+path)).status>=400,path);
  const response=await fetch(address+"/api/identity/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"release-teacher",password})});assert.equal(response.status,200);
  const setCookie=response.headers.get("set-cookie");assert.match(setCookie,/Secure/);assert.match(setCookie,/HttpOnly/);const cookie=setCookie.split(";")[0];
  const teacher=await fetch(address+"/api/me",{headers:{cookie}}).then(r=>r.json());assert.equal(teacher.name,"独立包验收教师");
  const room=await fetch(address+"/api/courses/course-port-management-intro/class-sessions",{method:"POST",headers:{cookie}});assert.equal(room.status,201);
  const manifest=await fetch(address+"/offline-manifest.json").then(r=>r.json());assert.ok(manifest.files.length>40);
  assert.equal((await fetch(address+"/api/identity/development/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:"teacher"})})).status,403);
  server.kill();await new Promise(resolve=>server.once("close",resolve));server=undefined;
  const backup=join(temp,"backup");await command(process.execPath,["admin.mjs","backup",backup]);
  const files=(await readdir(backup)).filter(name=>name.endsWith(".sqlite"));assert.ok(files.length>=5);
  for(const file of files){const db=new DatabaseSync(join(backup,file),{readOnly:true});assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check,"ok");db.close();}
  const report={checkedAt:new Date().toISOString(),release,productionInstall:true,standaloneStartup:true,sourceAndGpuSubmodulesRequired:false,accountCreation:true,secureCookie:true,failClosed:true,staticRootIsolation:true,backupIntegrity:true,backupDatabases:files.length,node:process.version,scope:"Local HTTP connection to HTTPS-proxy upstream; school TLS, campus routing and real cloud AI are not exercised."};
  await writeFile(join(release,"verification.json"),JSON.stringify(report,null,2));await writeFile(resolve("output/campus-deployment-review/release.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally {if(server){server.kill();await new Promise(resolve=>server.once("close",resolve));}}
