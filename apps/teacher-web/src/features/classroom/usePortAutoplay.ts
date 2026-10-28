import {useCallback,useEffect,useRef} from 'react';

export const PORT_AUTOPLAY_DELAY_MS=2000;

/** One entry timer per mounted page; manual playback controls take ownership. */
export function usePortAutoplay(enabled:boolean,start:()=>void){
 const latest=useRef(start);latest.current=start;
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),cancelled=useRef(false);
 const cancel=useCallback(()=>{cancelled.current=true;if(timer.current!==null)clearTimeout(timer.current);timer.current=null;},[]);
 useEffect(()=>{
  if(!enabled)return;
  cancelled.current=false;let started=false;
  const clear=()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=null;};
  const arm=()=>{clear();if(cancelled.current||started||document.hidden)return;timer.current=setTimeout(()=>{timer.current=null;started=true;latest.current();},PORT_AUTOPLAY_DELAY_MS);};
  const visibility=()=>{if(document.hidden)clear();else arm();};arm();document.addEventListener('visibilitychange',visibility);
  return()=>{clear();document.removeEventListener('visibilitychange',visibility);};
 },[enabled,cancel]);
 return cancel;
}
