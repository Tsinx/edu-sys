export interface LocalRecord { key:string; value:string; revision:number; deviceId:string; dirty:boolean; conflict?:boolean; updatedAt:string; pending?:{ requestId:string; value:string; expectedRevision:number; releaseId:string } }
let database:Promise<IDBDatabase>|undefined;
export function openLocalDatabase() {
  database ??= new Promise<IDBDatabase>((resolve,reject)=> {
    const request=indexedDB.open("edu-campus-v1",1);
    request.onupgradeneeded=()=>{request.result.createObjectStore("meta"); request.result.createObjectStore("records",{keyPath:"id"});};
    request.onsuccess=()=>{ request.result.onversionchange=()=>request.result.close(); resolve(request.result); };
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error("请关闭其他旧版本教学页面后重试。"));
  }).catch(error=>{database=undefined;throw error;});
  return database;
}
export async function localGet<T>(key:string):Promise<T|undefined> {
  const db=await openLocalDatabase();
  return new Promise((resolve,reject)=>{const r=db.transaction("meta").objectStore("meta").get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
export async function localSet(key:string,value:unknown) {
  const db=await openLocalDatabase();
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction("meta","readwrite");tx.objectStore("meta").put(value,key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});
}
export async function localDelete(key:string) {
  const db=await openLocalDatabase();
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction("meta","readwrite");tx.objectStore("meta").delete(key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});
}
export async function getRecords(actorId:string):Promise<LocalRecord[]> {
  const db=await openLocalDatabase();
  return new Promise((resolve,reject)=>{const r=db.transaction("records").objectStore("records").getAll();r.onsuccess=()=>resolve(r.result.filter((item:{actorId:string})=>item.actorId===actorId));r.onerror=()=>reject(r.error);});
}
export async function changeRecord(actorId:string,key:string,change:(record:LocalRecord|undefined)=>LocalRecord) {
  const db=await openLocalDatabase();
  await new Promise<void>((resolve,reject)=> {
    const tx=db.transaction("records","readwrite"); const store=tx.objectStore("records");
    const id=`${actorId}\0${key}`;const read=store.get(id);
    read.onsuccess=()=>{try {store.put({...change(read.result),id,actorId});} catch(error){tx.abort();reject(error);}};
    tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error ?? new Error("本机存档未能保存"));
  });
  window.dispatchEvent(new Event("edu-storage-change"));
}
export async function deviceId() {
  const id=await localGet<string>("deviceId");if(id)return id;
  const created=crypto.randomUUID();await localSet("deviceId",created);return created;
}
