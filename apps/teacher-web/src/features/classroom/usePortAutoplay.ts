import {useCallback,useEffect,useRef} from 'react';

export const PORT_AUTOPLAY_DELAY_MS=2000;

/** One entry timer per mounted page; manual playback controls take ownership. */
export function usePortAutoplay(enabled:boolean,start:()=>void){
 const latest=useRef(start);latest.current=start;
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const cancel=useCallback(()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;},[]);
 useEffect(()=>{
  if(!enabled)return;
  timer.current=setTimeout(()=>{timer.current=null;latest.current();},PORT_AUTOPLAY_DELAY_MS);
  return cancel;
 },[enabled,cancel]);
 return cancel;
}
