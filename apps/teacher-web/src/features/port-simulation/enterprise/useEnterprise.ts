import {useCallback,useEffect,useRef,useState} from 'react';
import {ENTERPRISE_VERSION,quarterIndex,type EnterpriseConfig,type EnterpriseCommand,type EnterpriseRecord,type EnterprisePackage} from '@edu/port-simulation-core';
import {listEnterpriseSaves,saveEnterprise,EnterpriseSaveConflict,type EnterpriseSave} from './enterprise-storage';
import {ENTERPRISE_TEACHING_VERSION,newEnterpriseTeaching,restartEnterpriseTeaching,type EnterpriseTeaching} from './enterprise-teaching';
import {EnterpriseChannel,type EnterpriseRequest,type EnterpriseResponse} from './enterprise-channel';
type Activation={save:EnterpriseSave;clearConflict:boolean;write:boolean};
const defaultConfig:EnterpriseConfig={seed:20261025,years:3,scenario:'balanced',mode:'practice'};
export function useEnterprise(scope:string){
  const [view,setView]=useState<EnterpriseResponse['view']>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [storageError,setStorageError]=useState(''),[savedAt,setSavedAt]=useState(''),[saves,setSaves]=useState<EnterpriseSave[]>([]),[replaying,setReplaying]=useState(false),[progress,setProgress]=useState('');
  const [listError,setListError]=useState('');
  const [conflict,setConflict]=useState(false),[workerFailed,setWorkerFailed]=useState(false),[generation,setGeneration]=useState(0);
  const [,renderMetadata]=useState(0),channel=useRef<EnterpriseChannel<Activation>|null>(null),meta=useRef<EnterpriseSave|null>(null);
  const queue=useRef(Promise.resolve()),revisions=useRef(new Map<string,number>()),issues=useRef(new Map<string,Error>()),conflicts=useRef(new Set<string>());
  const broadcast=useRef<BroadcastChannel|null>(null),resume=useRef<EnterpriseSave|null>(null);
  const persist=useCallback((save:EnterpriseSave)=>{
    const job=queue.current.then(async()=>{
      try{
        if(conflicts.current.has(save.id))throw new EnterpriseSaveConflict();
        const stored=await saveEnterprise({...save,revision:revisions.current.get(save.id)??save.revision??0});
        revisions.current.set(save.id,stored.revision!);issues.current.delete(save.id);
        if(meta.current?.id===save.id){meta.current={...meta.current,revision:stored.revision};setSavedAt(save.savedAt);setStorageError('');}
        broadcast.current?.postMessage({scope,id:save.id,revision:stored.revision});
        try{setSaves(await listEnterpriseSaves(scope));setListError('');}catch{setListError('本机存档列表暂时无法读取，已有记录保留。请重试读取。');}
      }catch(reason){
        const e=reason instanceof Error?reason:Error(String(reason));issues.current.set(save.id,e);
        if(e instanceof EnterpriseSaveConflict)conflicts.current.add(save.id);
        if(meta.current?.id===save.id){setConflict(conflicts.current.has(save.id));setStorageError(e instanceof EnterpriseSaveConflict?e.message:'进度尚未写入本机数据库：'+e.message+' 请导出存档。');}
        throw e;
      }
    });
    queue.current=job.catch(()=>{});return job;
  },[scope]);
  const waitForSave=useCallback(async()=>{
    let observed:Promise<void>;do{observed=queue.current;await observed;}while(observed!==queue.current);
    const id=meta.current?.id,issue=id?issues.current.get(id):undefined;if(issue)throw issue;
  },[]);
  const send=useCallback((request:EnterpriseRequest)=>{
    const c=channel.current;if(c?.busy)return Promise.reject(Error('正在完成上一项操作，请稍候；本次点击未重复执行。'));
    if((request.type==='command'||request.type==='package')&&meta.current&&conflicts.current.has(meta.current.id))return Promise.reject(new EnterpriseSaveConflict());
    if(request.type==='record'&&meta.current)return Promise.resolve({id:0,type:'record',record:meta.current.record} as EnterpriseResponse);
    if(!c)return Promise.reject(Error('本机仿真线程尚未就绪。'));
    setError('');return c.request(request);
  },[]);
  const activate=useCallback(async(save?:EnterpriseSave,config=defaultConfig,teaching?:EnterpriseTeaching,allowUnsaved=false)=>{
    if(channel.current?.busy)throw Error('正在完成上一项操作，请稍候；本次切换未执行。');
    await queue.current;
    if(!allowUnsaved&&meta.current&&issues.current.has(meta.current.id))throw Error('当前进度尚未保存。请先导出存档，或选择冲突恢复方式。');
    const latest=save?(await listEnterpriseSaves(scope)).find(s=>s.id===save.id&&s.scope===scope):undefined;
    const next:EnterpriseSave=latest??save??{id:crypto.randomUUID(),scope,title:(teaching?'教学路线 · ':'东湾港 · ')+new Date().toLocaleString('zh-CN'),schema:ENTERPRISE_VERSION,savedAt:'',record:{schema:ENTERPRISE_VERSION,rules:{} as EnterpriseRecord['rules'],config,commands:[]},checkpoints:[],...(teaching?{teaching}:{})};
    if(next.scope!==scope)throw Error('该记录不属于当前个人空间。');
    if(!channel.current)throw Error('本机仿真线程尚未就绪。');
    await channel.current.request(save?{type:'restore',record:next.record}:{type:'create',config},{save:next,clearConflict:true,write:!latest});
    return next.id;
  },[scope]);
  useEffect(()=>{
    let live=true;
    let w:Worker;
    try{w=new Worker(new URL('./enterprise.worker.ts',import.meta.url),{type:'module'});}catch(e){setWorkerFailed(true);setError('本机计算未能启动：'+(e as Error).message);return;}
    const c=new EnterpriseChannel<Activation>(w,{
      busy:value=>{if(live){setBusy(value);if(!value)setProgress('');}},
      progress:m=>{if(live)setProgress('本机正在计算至第'+Math.floor((m.hour??0)/24)+'个生产日…');},
      failure:e=>{if(live){setWorkerFailed(true);setError(e.message);}},
      state:(m,activation)=>{
        if(!live)return;
        if(m.view){
          setView(m.view);setReplaying(!!m.replaying);setError('');
          if(m.persist&&m.record){
            const base=activation?.save??meta.current;
            if(base){
              if(activation?.clearConflict){conflicts.current.delete(base.id);issues.current.delete(base.id);revisions.current.set(base.id,base.revision??0);setConflict(false);setStorageError('');}
              const checkpoints=[...base.checkpoints],last=checkpoints.at(-1);
              if(!last||quarterIndex(last.hour)!==quarterIndex(m.view.hour)||m.record.commands.length-last.position>=25||m.view.sealed)checkpoints.push({hour:m.view.hour,position:m.record.commands.length,record:m.record});
              const write=!activation||activation.write;
              const saved={...base,revision:revisions.current.get(base.id)??base.revision??0,record:m.record,savedAt:write?new Date().toISOString():base.savedAt,checkpoints:checkpoints.slice(-8)};
              if(activation)try{window.sessionStorage.setItem('edu-enterprise-active-run:'+scope,base.id);}catch{/* The record itself remains in IndexedDB and can be exported. */}
              meta.current=saved;if(write)void persist(saved).catch(()=>{});else setSavedAt(saved.savedAt);
            }
          }
        }
      }
    });
    channel.current=c;setWorkerFailed(false);
    w.onmessage=event=>{if(live)c.receive(event.data as EnterpriseResponse);};
    w.onerror=event=>{if(live)c.fail(Error('本机仿真线程失败：'+(event.message||'计算模块未能加载，请确认本机程序仍在运行。')));};
    let bc:BroadcastChannel|undefined;
    if(typeof BroadcastChannel!=='undefined'){
      try{bc=new BroadcastChannel('edu-port-enterprise-saves');broadcast.current=bc;}catch{/* Atomic database revisions still protect writes when notifications are unavailable. */}
      if(bc)
      bc.onmessage=event=>{
        const m=event.data,s=meta.current;
        if(!live||!s||m?.scope!==scope||m.id!==s.id||!Number.isSafeInteger(m.revision)||m.revision<=(revisions.current.get(s.id)??s.revision??0))return;
        conflicts.current.add(s.id);const issue=new EnterpriseSaveConflict();issues.current.set(s.id,issue);setConflict(true);setStorageError(issue.message);
      };
    }
    void(async()=>{
      const recovery=resume.current;resume.current=null;
      if(recovery){try{await c.request({type:'restore',record:recovery.record},{save:recovery,clearConflict:false,write:false});}catch(e){if(live)setError((e as Error).message);}return;}
      let entries:EnterpriseSave[];
      try{entries=await listEnterpriseSaves(scope);}catch{if(live)setListError('本机存档暂时无法读取，原有记录未改动。请重试读取，或另建练习。');return;}
      if(!live)return;setSaves(entries);setListError('');let preferred:string|null=null;
      try{preferred=window.sessionStorage.getItem('edu-enterprise-active-run:'+scope);}catch{/* Open the most recently saved record if tab storage is unavailable. */}
      try{await activate(entries.find(s=>s.id===preferred)??entries[0]);}catch(e){if(live)setError((e as Error).message);}
    })();
    return()=>{live=false;c.close();if(channel.current===c)channel.current=null;bc?.close();if(broadcast.current===bc)broadcast.current=null;};
  },[scope,activate,persist,generation]);
  const command=useCallback((command:EnterpriseCommand)=>send({type:'command',command}),[send]);
  const create=useCallback((config:EnterpriseConfig)=>activate(undefined,config),[activate]);
  const createTeaching=useCallback(()=>activate(undefined,defaultConfig,newEnterpriseTeaching()),[activate]);
  const load=useCallback((save:EnterpriseSave)=>activate(save),[activate]);
  const importRecord=useCallback((record:EnterpriseRecord)=>activate({id:crypto.randomUUID(),scope,title:'导入 · '+new Date().toLocaleString('zh-CN'),schema:ENTERPRISE_VERSION,savedAt:'',record,checkpoints:[]}),[activate,scope]);
  const retryTeaching=useCallback(async(stepId:string,position:number)=>{
    const save=meta.current;if(!save?.teaching||save.attemptId||save.record.config.mode!=='practice')throw Error('本节重试仅用于独立教学练习。');
    return activate({...save,id:crypto.randomUUID(),revision:0,title:'本节重试 · '+new Date().toLocaleString('zh-CN'),record:{...save.record,commands:save.record.commands.slice(0,Math.max(0,position)).filter(c=>c.kind!=='seal')},checkpoints:[],teaching:restartEnterpriseTeaching(save.teaching,stepId,position)});
  },[activate]);
  const bindAttempt=useCallback((attemptId:string,taskId:string,expectedSaveId?:string)=>{
    const save=meta.current;if(!save||expectedSaveId&&expectedSaveId!==save.id)throw Error('当前场次已改变，请返回正式任务后重试。');
    if(save.record.config.mode!=='exam')throw Error('请先建立与任务一致的考核场次，个人练习不能直接变成正式场次。');
    if(channel.current?.busy)throw Error('上一项操作尚未完成。');if(conflicts.current.has(save.id))throw new EnterpriseSaveConflict();
    if(save.attemptId&&save.attemptId!==attemptId)throw Error('本机记录已属于其他正式场次，不能覆盖。');
    meta.current={...save,attemptId,taskId};renderMetadata(n=>n+1);void persist(meta.current).catch(()=>{});
  },[persist]);
  const updateTeaching=useCallback((update:(previous:EnterpriseTeaching)=>EnterpriseTeaching)=>{
    const save=meta.current;if(!save?.teaching||save.teaching.schema!==ENTERPRISE_TEACHING_VERSION||save.attemptId||save.record.config.mode==='exam'||conflicts.current.has(save.id))return;
    meta.current={...save,teaching:update(save.teaching),savedAt:new Date().toISOString()};renderMetadata(n=>n+1);void persist(meta.current).catch(()=>{});
  },[persist]);
  const savePending=useCallback(async(requestId:string,pkg:EnterprisePackage,expectedSaveId?:string)=>{
    await waitForSave();const save=meta.current;if(!save||expectedSaveId&&save.id!==expectedSaveId)throw Error('当前场次已改变，请返回原正式场次提交。');
    if(channel.current?.busy)throw Error('上一项操作尚未完成。');
    meta.current={...save,pending:{requestId,package:pkg}};renderMetadata(n=>n+1);await persist(meta.current);
    if(meta.current?.id!==save.id)throw Error('封存包已保留在原场次，请返回该场次后重试提交。');
  },[persist,waitForSave]);
  const reloadLatest=useCallback(async()=>{const save=meta.current;if(!save)throw Error('尚无个人记录。');return activate(save,defaultConfig,undefined,true);},[activate]);
  const keepConflictCopy=useCallback(async()=>{
    const save=meta.current;if(!save)throw Error('尚无个人记录。');
    return activate({...save,id:crypto.randomUUID(),revision:0,title:'进度恢复副本 · '+new Date().toLocaleString('zh-CN'),attemptId:undefined,taskId:undefined,pending:undefined,checkpoints:[],record:{...save.record,config:{...save.record.config,mode:'practice'},commands:save.record.commands.filter(c=>c.kind!=='seal')}},defaultConfig,undefined,true);
  },[activate]);
  const recover=useCallback(async()=>{await queue.current;resume.current=meta.current;setGeneration(n=>n+1);},[]);
  const retryStorage=useCallback(async()=>{
    let entries:EnterpriseSave[];
    try{entries=await listEnterpriseSaves(scope);}catch{setListError('本机存档暂时无法读取，原有记录未改动。请稍后重试。');throw Error('本机存档读取尚未恢复，原有记录保留。');}
    setSaves(entries);setListError('');setError('');
    if(!meta.current){let preferred:string|null=null;try{preferred=window.sessionStorage.getItem('edu-enterprise-active-run:'+scope);}catch{}
      await activate(entries.find(s=>s.id===preferred)??entries[0]);}
  },[activate,scope]);
  const saveNow=useCallback(async()=>{
    await queue.current;const save=meta.current;if(!save)throw Error('尚无个人记录。');
    if(channel.current?.busy)throw Error('正在完成上一项操作，请稍候。');
    if(conflicts.current.has(save.id))throw new EnterpriseSaveConflict();
    if(!issues.current.has(save.id))return;
    meta.current={...save,savedAt:new Date().toISOString()};renderMetadata(n=>n+1);await persist(meta.current);setError('');
  },[persist]);
  return {view,busy,error,setError,storageError,listError,savedAt,saves,replaying,progress,send,command,create,createTeaching,retryTeaching,updateTeaching,load,importRecord,bindAttempt,savePending,currentSave:meta.current,waitForSave,saveNow,retryStorage,conflict,workerFailed,recover,reloadLatest,keepConflictCopy};
}
