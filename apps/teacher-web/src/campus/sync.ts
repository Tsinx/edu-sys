import { changeRecord, deviceId, getRecords, localGet, localSet, type LocalRecord } from "./storage";
import type { ClassroomIdentitySession } from "@edu/contracts";

export const releaseId=import.meta.env?.VITE_EDU_RELEASE_ID ?? "development";
let currentSync:Promise<void>|undefined;
export let syncNotice="本机存档就绪";
function notice(value:string){syncNotice=value;window.dispatchEvent(new Event("edu-sync-change"));}

export async function applyRequestedRecovery(actorId:string) {
  const raw=sessionStorage.getItem("edu-campus-recovery");if(!raw)return;
  const recovery=JSON.parse(raw) as {actorId:string;record:LocalRecord};
  if(recovery.actorId!==actorId)throw new Error("存档恢复账号不一致，请使用原账号重新登录。");
  await changeRecord(actorId,recovery.record.key,()=>({...recovery.record,dirty:false,conflict:false,pending:undefined}));
  sessionStorage.removeItem("edu-campus-recovery");
}

export async function synchronize(actorId:string) {
  if(currentSync)return currentSync;
  notice("正在同步存档…");
  currentSync=(async()=>{
    const identity=await fetch("/api/identity/session",{credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(10000)});
    if(!identity.ok) {notice("请重新登录后同步；本机存档仍保留");return;}
    const session=await identity.json() as ClassroomIdentitySession;
    if(session.actor.actorId!==actorId){notice("当前账号已改变，请重新打开页面");return;}
    await localSet("identity",session);
    const id=await deviceId();
    const records=await getRecords(actorId);
    for(const record of records) {
      if(!record.dirty || record.conflict)continue;
      const pending=record.pending ?? {requestId:crypto.randomUUID(),value:record.value,expectedRevision:record.revision,releaseId};
      await changeRecord(actorId,record.key,current=>({...current!,pending}));
      const response=await fetch("/api/edge/records",{method:"POST",credentials:"same-origin",signal:AbortSignal.timeout(15000),headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...pending,key:record.key,deviceId:id})});
      if(response.status===409) {
        await changeRecord(actorId,record.key,current=>({...current!,conflict:true}));
        notice("发现另一台设备的更新；两份存档已保留，请在离线与同步面板选择版本");continue;
      }
      if(!response.ok){notice(response.status===401?"登录已过期，记录待同步":"服务器暂未接收存档，稍后自动重试");return;}
      const receipt=await response.json() as {revision:number};
      await changeRecord(actorId,record.key,current=>({...current!,revision:receipt.revision,pending:undefined,dirty:current!.value!==pending.value}));
    }
    const remaining=await getRecords(actorId);
    notice(remaining.some(item=>item.conflict)?"存档存在冲突，请选择恢复版本":remaining.some(item=>item.dirty)?"新进度已保存在本机，等待下次同步":"服务器已接收存档");
  })().catch(()=>notice("连接中断，记录已保存在本机，等待补传")).finally(()=>{currentSync=undefined;});
  return currentSync;
}

export async function restoreCloudRecords(actorId:string) {
  const response=await fetch("/api/edge/records",{credentials:"same-origin",signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error("请联网并登录后读取服务器存档");
  const cloud=(await response.json()) as {actorId:string;records:Array<LocalRecord>};
  if(cloud.actorId!==actorId)throw new Error("账号已改变，请重新登录后恢复存档。");
  const local=new Map((await getRecords(actorId)).map(item=>[item.key,item]));
  for(const record of cloud.records) {
    // Never overwrite a local branch during automatic hydration.
    if(!local.has(record.key))await changeRecord(actorId,record.key,()=>({...record,dirty:false}));
  }
  return cloud.records;
}

export class IndexedSimulationStorage implements Storage {
  private values=new Map<string,string>();
  private pending=Promise.resolve();
  private constructor(readonly actorId:string,private readonly id:string) {}
  static async create(actorId:string,scope:string) {
    const storage=new IndexedSimulationStorage(actorId,await deviceId());
    for(const item of await getRecords(actorId))storage.values.set(item.key,item.value);
    // One-way migration retains the original browser save until a verified
    // backup exists. Only keys belonging to the current actor/scope are read.
    try {for(let index=0;index<localStorage.length;index++) {
      const key=localStorage.key(index)!;
      if(key.startsWith(`edu-port-simulation-local:v1:${scope}:`) && !storage.values.has(key)) storage.setItem(key,localStorage.getItem(key)!);
    }} catch { /* IndexedDB remains the primary store. */ }
    await storage.flush();return storage;
  }
  get length(){return this.values.size;}
  key(index:number){return [...this.values.keys()][index] ?? null;}
  getItem(key:string){return this.values.get(key) ?? null;}
  setItem(key:string,value:string){
    if(this.values.get(key)===value)return;
    this.values.set(key,value);
    const write=()=>changeRecord(this.actorId,key,previous=>({key,value,deviceId:this.id,revision:previous?.revision??0,dirty:true,conflict:previous?.conflict,pending:previous?.pending,updatedAt:new Date().toISOString()}));
    this.pending=this.pending.then(write,write);
    void this.pending.catch(()=>notice("本机存档写入失败，请立即导出当前实验"));
  }
  removeItem(){throw new Error("请通过存档面板管理记录，避免删除未同步进度。");}
  clear(){throw new Error("未同步记录不能批量清除。");}
  flush(){return this.pending;}
}

export async function cachedIdentity():Promise<ClassroomIdentitySession|undefined> {
  const identity=await localGet<ClassroomIdentitySession>("identity");
  if(identity?.expiresAt && Date.parse(identity.expiresAt)>Date.now())return identity;
  return undefined;
}
