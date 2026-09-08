import type { ClassroomIdentitySession, StudySession } from "@edu/contracts";
import { cachedIdentity } from "./sync";
import { localDelete, localGet, localSet } from "./storage";

const progressLocks=new Map<string,Promise<unknown>>();
async function serializeProgress<T>(path:string,operation:()=>Promise<T>):Promise<T> {
  const previous=progressLocks.get(path) ?? Promise.resolve();
  const next=previous.catch(()=>undefined).then(operation);progressLocks.set(path,next);
  try{return await next;}finally{if(progressLocks.get(path)===next)progressLocks.delete(path);}
}
export function cachedRequest(path:string,init:RequestInit,send:()=>Promise<Response>) {
  return init.method==="PATCH" && path.endsWith("/progress")
    ? serializeProgress(path,()=>performCachedRequest(path,init,send)) : performCachedRequest(path,init,send);
}
async function performCachedRequest(path:string,init:RequestInit,send:()=>Promise<Response>) {
  const method=init.method ?? "GET";
  let identity=await localGet<ClassroomIdentitySession>("identity").catch(()=>undefined);
  const cacheable=method==="GET" && /^\/api\/(identity\/session|courses(?:\/[^/]+)?|class-sessions(?:\/[^/]+(?:\/snapshot)?)?|study-sessions\/[^/]+)$/.test(path);
  const studyCreate=method==="POST" && path==="/api/study-sessions";
  const key=`api:${identity?.actor.actorId ?? "identity"}:${path}${studyCreate?`:${init.body}`:""}`;
  let response:Response;
  try {response=await send();} catch(error) {
    if(!await cachedIdentity())throw error;
    if(path==="/api/identity/session")return Response.json(await cachedIdentity());
    if(cacheable || studyCreate) {
      const saved=await localGet(key);if(saved)return Response.json(saved);
    }
    if(method==="PATCH" && /^\/api\/study-sessions\/[^/]+\/progress$/.test(path)) {
      const sessionPath=path.replace(/\/progress$/,"");
      const sessionKey=`api:${identity!.actor.actorId}:${sessionPath}`;
      const session=await localGet<StudySession>(sessionKey);
      if(session){
        const patch=JSON.parse(String(init.body)) as Partial<StudySession>;
        const next={...session,...patch};
        await localSet(sessionKey,next);
        await localSet(`progress:${identity!.actor.actorId}:${session.id}`,{path,body:init.body});
        return Response.json(next);
      }
    }
    throw error;
  }
  if(response.status===401) {
    await localDelete("identity").catch(()=>undefined);
    window.dispatchEvent(new Event("edu-auth-expired"));
  }
  if(response.ok) {
    if(path==="/api/identity/session" || path==="/api/identity/login" || path==="/api/identity/development/session") {
      identity=await response.clone().json() as ClassroomIdentitySession;
      await localSet("identity",identity).catch(()=>undefined);
    }
    if(cacheable || studyCreate) {
      const value=await response.clone().json();await localSet(key,value).catch(()=>undefined);
      if(studyCreate)await localSet(`api:${identity?.actor.actorId}:/api/study-sessions/${value.id}`,value).catch(()=>undefined);
    }
    if(method==="PATCH" && path.endsWith("/progress")) {
      const value=await response.clone().json() as StudySession;
      await localSet(`api:${identity?.actor.actorId}:/api/study-sessions/${value.id}`,value).catch(()=>undefined);
      await localDelete(`progress:${identity?.actor.actorId}:${value.id}`).catch(()=>undefined);
    }
    if(path==="/api/identity/logout")await localDelete("identity");
  }
  return response;
}

export async function flushStudyProgress(actorId:string) {
  // Progress is idempotent; only the most recent local location per study
  // session is retained. Scores and classroom control never use this queue.
  const db=await (await import("./storage")).openLocalDatabase();
  const keys=await new Promise<IDBValidKey[]>((resolve,reject)=>{const r=db.transaction("meta").objectStore("meta").getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  for(const key of keys) {
    if(typeof key!=="string" || !key.startsWith(`progress:${actorId}:`))continue;
    const initial=await localGet<{path:string;body:string}>(key);if(!initial)continue;
    await serializeProgress(initial.path,async()=>{
      const item=await localGet<{path:string;body:string}>(key);if(!item)return;
      const response=await fetch(item.path,{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:item.body,signal:AbortSignal.timeout(10000)});
      if(response.ok && JSON.stringify(await localGet(key))===JSON.stringify(item))await localDelete(key);
    });
  }
}
