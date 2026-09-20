import {useCallback,useEffect,useRef,useState} from 'react';
import {LESSON_SIX_AUDIO,lessonSixFilmElapsed,lessonSixShotDuration,type LessonSixFilm,type LessonSixFilmState} from '@edu/course-content';
const cache=new Map<string,Promise<ArrayBuffer>>();
export function useLessonSixNarration(film:LessonSixFilm,state:LessonSixFilmState,initialMuted:boolean,onError:()=>void,forceMuted=false){
 const context=useRef<AudioContext|null>(null),gain=useRef<GainNode|null>(null),buffers=useRef(new Map<string,AudioBuffer>()),sources=useRef<AudioBufferSourceNode[]>([]),version=useRef(0),errorCallback=useRef(onError);errorCallback.current=onError;
 const [muted,setMuted]=useState(initialMuted),[volume,setVolume]=useState(.85),[error,setError]=useState<string|null>(null),[unlocked,setUnlocked]=useState(false);
 const stop=useCallback(()=>{version.current++;for(const source of sources.current){try{source.stop();}catch{}source.disconnect();}sources.current=[];},[]);
 const prepare=useCallback(async()=>{
  try{if(!context.current){const c=new AudioContext();context.current=c;gain.current=c.createGain();gain.current.connect(c.destination);}await context.current.resume();
   if(context.current.state!=='running')throw Error('请点击启用旁白');
   await Promise.all(film.shots.map(async shot=>{const record=LESSON_SIX_AUDIO[shot.id];if(!record)throw Error('旁白文件尚未生成');if(buffers.current.has(record.src))return;
    if(!cache.has(record.src))cache.set(record.src,fetch(record.src).then(r=>{if(!r.ok)throw Error('旁白加载失败');return r.arrayBuffer();}).catch(e=>{cache.delete(record.src);throw e;}));
    buffers.current.set(record.src,await context.current!.decodeAudioData((await cache.get(record.src)!).slice(0)));
   }));setError(null);setUnlocked(true);return true;
  }catch{stop();setError('旁白暂时无法播放');errorCallback.current();return false;}
 },[film.id,stop]);
 useEffect(()=>{if(gain.current)gain.current.gain.value=muted?0:volume*3;},[muted,volume,unlocked]);
 useEffect(()=>{
  stop();if(state.status!=='playing'||!unlocked||muted)return;
  const c=context.current;if(!c||c.state!=='running'){setUnlocked(false);return;}
  const revision=version.current;
  void prepare().then(ok=>{if(!ok||revision!==version.current)return;const elapsed=lessonSixFilmElapsed(film,state),origin=c.currentTime+.025;let start=0;
   for(const shot of film.shots){const record=LESSON_SIX_AUDIO[shot.id]!,buffer=buffers.current.get(record.src)!;const audioStart=start+200,offset=Math.max(0,(elapsed-audioStart)/1000),when=origin+Math.max(0,(audioStart-elapsed)/1000);
    if(offset<buffer.duration){const source=c.createBufferSource();source.buffer=buffer;source.connect(gain.current!);source.start(when,offset);sources.current.push(source);}start+=lessonSixShotDuration(shot);
   }
  });return stop;
 },[film.id,state.status,state.startedAt,state.elapsedMs,state.runId,unlocked,muted,prepare,stop]);
 useEffect(()=>()=>{stop();void context.current?.close();context.current=null;},[stop]);
 useEffect(()=>{if(forceMuted){stop();setMuted(true);}},[forceMuted,stop]);
 const toggle=async()=>{if(muted||!unlocked){if(await prepare())setMuted(false);}else setMuted(true);};
 return{muted,volume,error,unlocked,prepare,toggle,setVolume,stop,continueSilent:()=>{stop();setMuted(true);setError(null);}};
}
