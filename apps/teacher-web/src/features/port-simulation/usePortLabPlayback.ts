import { useCallback, useEffect, useRef, useState } from 'react';
import { portLabFinished, type PortClassLab } from '@edu/port-simulation-core';

export const PORT_LAB_SPEEDS = [1, 5, 10, 30, 60, 120] as const;
type StopReason = 'idle'|'manual'|'hidden'|'target'|'checkpoint'|'finished'|'error';
interface Playback {playing:boolean;targetSecond:number|null;fromSecond:number;reason:StopReason;generation:number}

/** Owns playback scheduling only. All work and inventory remain in the existing kernel. */
export function usePortLabPlayback(read:()=>PortClassLab, tick:(seconds:number)=>PortClassLab|undefined) {
  const callbacks = useRef({read,tick});callbacks.current={read,tick};
  const [speed,setSpeedState]=useState<number>(30), speedRef=useRef(speed);
  const [state,setState]=useState<Playback>({playing:false,targetSecond:null,fromSecond:0,reason:'idle',generation:0});
  const current=useRef(state);
  const update=useCallback((next:Playback)=>{current.current=next;setState(next);},[]);
  const pause=useCallback((reason:StopReason='manual')=>update({...current.current,playing:false,reason}),[update]);
  const reset=useCallback(()=>update({playing:false,targetSecond:null,fromSecond:0,reason:'idle',generation:current.current.generation+1}),[update]);
  const setSpeed=useCallback((value:number)=>{if(PORT_LAB_SPEEDS.includes(value as typeof PORT_LAB_SPEEDS[number])){speedRef.current=value;setSpeedState(value);}},[]);
  const start=useCallback((targetSecond:number)=>{
    const run=callbacks.current.read(),second=run.simulation!.second;
    const target=Math.min(run.endpoint*60,run.pendingTask?.completesAt??targetSecond,targetSecond);
    if(portLabFinished(run)||!Number.isInteger(target)||target<=second)return;
    update({playing:true,targetSecond:target,fromSecond:second,reason:'idle',generation:current.current.generation+1});
  },[update]);
  const resume=useCallback(()=>{
    const run=callbacks.current.read(),second=run.simulation!.second;
    const target=current.current.targetSecond;
    start(run.pendingTask?.completesAt??(target!==null&&target>second&&['manual','hidden'].includes(current.current.reason)?target:Math.min(run.endpoint*60,(Math.floor(second/600)+1)*600)));
  },[start]);
  useEffect(()=>{
    if(!state.playing)return;
    const generation=state.generation;let last=performance.now(),carry=0;
    const timer=window.setInterval(()=>{
      if(!current.current.playing||current.current.generation!==generation)return;
      const now=performance.now(),elapsed=Math.min(.25,Math.max(0,(now-last)/1000));last=now;
      // Never catch up a background suspension by skipping the visible process.
      if(document.hidden){pause('hidden');return;}
      carry+=elapsed*speedRef.current;
      const run=callbacks.current.read(),second=run.simulation!.second,target=current.current.targetSecond!;
      const seconds=Math.min(Math.floor(carry),target-second);
      if(seconds<=0)return;
      carry-=seconds;
      const next=callbacks.current.tick(seconds);
      if(!next){pause('error');return;}
      if(portLabFinished(next))pause('finished');
      else if(next.feedback.includes('已暂停推进'))pause('checkpoint');
      else if(next.simulation!.second>=target)pause('target');
      else if(next.simulation!.second<=second)pause('error');
    },50);
    return()=>window.clearInterval(timer);
  },[state.playing,state.generation,pause]);
  return {...state,speed,setSpeed,start,resume,pause,reset};
}
