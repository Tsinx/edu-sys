import {useEffect,useRef} from 'react';
import type {useEnterprise} from './useEnterprise';
export function EnterpriseRecoveryNotice({runtime,onExport,navigate}:{runtime:ReturnType<typeof useEnterprise>;onExport:()=>Promise<void>;navigate:(id:string)=>void}){
  const box=useRef<HTMLElement>(null),needed=runtime.conflict||runtime.workerFailed;
  useEffect(()=>{if(!needed)return;const previous=document.activeElement as HTMLElement|null;box.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[needed,runtime.conflict]);
  if(!needed)return null;
  const run=(action:()=>Promise<unknown>)=>{void action().then(()=>navigate('overview')).catch(e=>runtime.setError((e as Error).message));};
  return <div className="enterprise-runtime-recovery"><section ref={box} role="alertdialog" aria-modal="true" aria-labelledby="enterprise-recovery-title" onKeyDown={e=>{
    if(e.key!=='Tab')return;const buttons=[...box.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];if(!buttons.length){e.preventDefault();return;}
    e.preventDefault();e.stopPropagation();const index=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length]!.focus();
  }}><h2 id="enterprise-recovery-title">{runtime.conflict?'这份进度已在另一窗口更新':'本机计算需要恢复'}</h2><p>{runtime.conflict?'本窗口已暂停写入。可以恢复较新的进度，也可以保留本窗口的港口，另存为个人练习副本。':'最后确认的经营记录仍然保留。恢复计算后，可以继续原场次。'}</p>
    {runtime.conflict?<><button disabled={runtime.busy} onClick={()=>run(runtime.reloadLatest)}>恢复较新进度</button><button disabled={runtime.busy} onClick={()=>run(runtime.keepConflictCopy)}>另存为个人练习</button></>:<button disabled={runtime.busy} onClick={()=>run(runtime.recover)}>恢复本机计算</button>}
    <button disabled={runtime.busy||!runtime.currentSave} onClick={()=>void onExport()}>先导出本窗口记录</button>
    {runtime.error&&<p role="status">{runtime.error}</p>}
  </section></div>;
}
