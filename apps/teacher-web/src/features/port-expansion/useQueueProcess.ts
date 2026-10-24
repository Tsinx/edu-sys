import {useCallback,useEffect,useRef,useState} from 'react';
import {clampQueueTime,queueEventPosition,type QueueProcessIndex} from './queue-process-model';

type Checkpoint={identity:string;time:number;speed:number;selected:string|null};
const speeds=[.25,.5,1,2,10,60];
function checkpoint(key:string,identity:string,end:number,fallback:number):Checkpoint{
 if(typeof window==='undefined')return {identity,time:clampQueueTime(fallback,end),speed:.5,selected:null};
 try{
  const value=JSON.parse(localStorage.getItem(key)??'null') as Partial<Checkpoint>|null;
  if(value?.identity===identity)return {identity,time:clampQueueTime(Number(value.time),end),speed:speeds.includes(Number(value.speed))?Number(value.speed):.5,selected:typeof value.selected==='string'?value.selected:null};
 }catch{/* A missing or damaged checkpoint must not prevent a new run. */}
 return {identity,time:clampQueueTime(fallback,end),speed:.5,selected:null};
}
export function useQueueProcess(index:QueueProcessIndex,storageKey:string,identity:string,fallbackTime=0){
 const [initial]=useState(()=>checkpoint(storageKey,identity,index.end,fallbackTime));
 const [time,setTime]=useState(initial.time),[speed,setSpeed]=useState(initial.speed),[selected,setSelected]=useState<string|null>(initial.selected),[playing,setPlaying]=useState(false),[saved,setSaved]=useState(true);
 const current=useRef<Checkpoint>({...initial});
 current.current={identity,time,speed,selected};
 const persist=useCallback(()=>{try{localStorage.setItem(storageKey,JSON.stringify(current.current));setSaved(true);}catch{setSaved(false);}},[storageKey]);
 useEffect(()=>{
  window.addEventListener('pagehide',persist);
  return ()=>{window.removeEventListener('pagehide',persist);try{localStorage.setItem(storageKey,JSON.stringify(current.current));}catch{/* The visible storage warning and record export remain available. */}};
 },[storageKey,persist]);
 useEffect(()=>{if(!playing)persist();},[time,speed,selected,playing,persist]);
 useEffect(()=>{
  if(!playing)return;
  let frame=0,previous:number|null=null;
  const tick=(now:number)=>{
   if(previous!==null){const delta=Math.min((now-previous)/1000,.25)*speed;setTime(t=>Math.min(index.end,t+delta));}
   previous=now;frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  const visibility=()=>{if(document.hidden)setPlaying(false);};
  document.addEventListener('visibilitychange',visibility);
  return ()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);};
 },[playing,speed,index.end]);
 useEffect(()=>{if(time>=index.end&&playing)setPlaying(false);},[time,index.end,playing]);
 const seek=(value:number)=>{setPlaying(false);setTime(clampQueueTime(value,index.end));};
 const track=(id:string)=>{const record=index.byId.get(id);if(!record)return false;setSelected(id);seek(record.ready);return true;};
 const next=()=>{const event=index.events[queueEventPosition(index.events,time)];if(event)seek(event.time);};
 const toggle=()=>{if(!playing&&time>=index.end)setTime(0);setPlaying(value=>!value);};
 return {time,speed,selected,playing,saved,seek,track,next,toggle,setSpeed,setSelected,restart:()=>seek(0)};
}
