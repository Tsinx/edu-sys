import { useEffect, useState } from "react";
import { changeRecord, getRecords, type LocalRecord } from "./storage";
import { restoreCloudRecords, synchronize, syncNotice } from "./sync";
import { flushStudyProgress } from "./offline-api";

interface Manifest {releaseId:string;groups:Array<{id:string;label:string}>;files:Array<{group:string;bytes:number}>;ready:string[]}
const size=(bytes:number)=>`${(bytes/1024/1024).toFixed(1)} MB`;
async function message(type:string,group?:string,onProgress?:(progress:{done:number;total:number})=>void):Promise<Manifest> {
  if(!("serviceWorker" in navigator) || !window.isSecureContext)throw new Error("离线下载需要可信 HTTPS 或本机开发地址。");
  const registration=await navigator.serviceWorker.ready;
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel();
    const timer=setTimeout(()=>{channel.port1.close();reject(new Error("下载等待超时，请检查连接后重试。"));},15*60_000);
    channel.port1.onmessage=event=> {
      if(event.data.progress){onProgress?.(event.data.progress);return;}
      clearTimeout(timer);channel.port1.close();
      if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.result);
    };
    registration.active!.postMessage({type,group},[channel.port2]);
  });
}
function exportData(name:string,value:unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
  const anchor=document.createElement("a");anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function OfflinePanel({actorId}:{actorId:string}) {
  const [open,setOpen]=useState(false);const [manifest,setManifest]=useState<Manifest>();
  const [records,setRecords]=useState<LocalRecord[]>([]);const [cloud,setCloud]=useState<LocalRecord[]>([]);
  const [notice,setNotice]=useState(syncNotice);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState({done:0,total:0});
  useEffect(()=>{
    if("serviceWorker" in navigator && window.isSecureContext)void navigator.serviceWorker.register("/service-worker.js").then(()=>message("status")).then(setManifest).catch(reason=>setError(reason.message));
    const update=()=>{setNotice(syncNotice);void getRecords(actorId).then(setRecords).catch(reason=>setError(reason.message));};
    const sync=()=>{void synchronize(actorId).then(()=>flushStudyProgress(actorId)).catch(()=>undefined);};
    window.addEventListener("edu-sync-change",update);window.addEventListener("edu-storage-change",update);window.addEventListener("online",sync);
    const timer=setInterval(sync,30_000+Math.random()*5_000);update();sync();
    return()=>{clearInterval(timer);window.removeEventListener("edu-sync-change",update);window.removeEventListener("edu-storage-change",update);window.removeEventListener("online",sync);};
  },[actorId]);
  const download=async(group:string)=>{setBusy(true);setError("");try{setManifest(await message("download",group,setProgress));}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}};
  const importRecords=async(file:File)=>{
    if(file.size>35_000_000)throw new Error("存档文件过大。");
    const data=JSON.parse(await file.text()) as {schema?:string;records?:LocalRecord[]};
    if(data.schema!=="edu.local-backup/1" || !Array.isArray(data.records) || data.records.length>120)throw new Error("不是教学平台存档包。");
    for(const item of data.records) {
      if(typeof item.key!=="string" || item.key.length>400 || typeof item.value!=="string" || item.value.length>2_000_000 || !item.key.startsWith("edu-port-simulation-local:v1:"))throw new Error("存档记录格式不正确。");
    }
    for(const item of data.records)await changeRecord(actorId,item.key,existing=>existing??{...item,revision:0,dirty:true,conflict:false,pending:undefined});
    setNotice("已导入尚未存在的存档；原有本机版本已保留。重新打开实验以读取。");
  };
  return <><button className="campus-offline-toggle" onClick={()=>setOpen(!open)}>离线与同步{records.some(item=>item.dirty)?" · 待同步":""}</button>
    {open&&<aside className="campus-offline-panel" aria-label="离线资源与存档同步"><h2>课程随身带</h2><p role="status">{notice}</p>
      <p>先下载基础程序与对应课程；需要角色动作时，再下载数字人素材。</p>
      {manifest?.groups.map(group=><article key={group.id}><strong>{group.label}</strong><p>{size(manifest.files.filter(file=>file.group===group.id).reduce((n,file)=>n+file.bytes,0))} · {manifest.ready.includes(group.id)?"已校验，可离线使用":"尚未完整下载"}</p>
        <button disabled={busy} onClick={()=>void download(group.id)}>下载并校验</button></article>)}
      {busy&&<><progress value={progress.done} max={progress.total||1}/><p>{size(progress.done)} / {size(progress.total)}</p></>}
      <div className="campus-offline-actions"><button onClick={()=>void synchronize(actorId)}>立即同步存档</button><button onClick={()=>exportData("教学平台本机存档.json",{schema:"edu.local-backup/1",records})}>导出本机存档</button>
        <button onClick={()=>void restoreCloudRecords(actorId).then(items=>{setCloud(items);setNotice("服务器存档已读取；仅自动恢复本机尚无的记录。重新打开实验以读取。");}).catch(reason=>setError(reason.message))}>读取服务器存档</button>
        <button onClick={()=>void navigator.storage.persist().then(granted=>setNotice(granted?"已获准持久存储；请仍定期导出备份":"浏览器未批准持久存储，请定期同步或导出"))}>申请持久存储</button></div>
      <label>导入已导出的存档<input type="file" accept="application/json,.json" onChange={event=>{const file=event.target.files?.[0];if(file)void importRecords(file).catch(reason=>setError(reason.message));}}/></label>
      {records.filter(item=>item.conflict).map(item=><article key={item.key}><strong>存在存档分叉</strong><p>{item.key}</p><button onClick={()=>exportData("本机分叉存档.json",{schema:"edu.local-backup/1",records:[item]})}>导出本机分支</button>
        {cloud.find(remote=>remote.key===item.key)&&<button onClick={()=>{
          const remote=cloud.find(value=>value.key===item.key)!;
          exportData("替换前本机存档.json",{schema:"edu.local-backup/1",records:[item]});
          // Apply after reload, before the simulation mounts. The old runner's
          // pagehide checkpoint must not overwrite the chosen cloud branch.
          try {sessionStorage.setItem("edu-campus-recovery",JSON.stringify({actorId,record:remote}));window.location.reload();}
          catch(reason){setError(`暂时无法恢复，请保留导出的备份：${(reason as Error).message}`);}
        }}>备份本机后采用服务器版本</button>}</article>)}
      {!!cloud.length&&<button onClick={()=>exportData("服务器存档.json",{schema:"edu.local-backup/1",records:cloud})}>导出服务器版本</button>}
      {error&&<p role="alert">{error}</p>}<p>本机模拟分数用于练习诊断，存档同步不等于正式成绩认证。</p>
    </aside>}</>;
}
