import {usePortAutoplay} from '../classroom/usePortAutoplay';
import {useCallback,useContext,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {getLessonSixFilm,lessonSixFilmDuration,lessonSixFilmElapsed,lessonSixFilmFrame,lessonSixFilmCamera,lessonSixShotDuration,lessonSixStateValid,type LessonSixPresentation,type PortLessonSixPage,type LessonSixCamera} from '@edu/course-content';
import {SlideViewport} from '../classroom/SlideViewport';
import {ClassroomPlaybackSlot} from '../classroom/ClassroomPlaybackSlot';
import {PortLessonSixFilm} from './PortLessonSixFilm';
import {LessonSixFilmControls} from './lesson-six-film-controls';
import {useLessonSixNarration} from './useLessonSixNarration';
type Host={scope:string;audioRole?:'teacher'|'projection'|'student';initial?:LessonSixPresentation&{slideKey:string}|null;onChange?:(key:string,value:LessonSixPresentation)=>void};
const time=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
function normalise(page:PortLessonSixPage,value:LessonSixPresentation):LessonSixPresentation{
 const film=getLessonSixFilm(page.localPage,value.option,value.revealed)!;
 return value.cinematic?.clipId===film.id?value:{...value,cinematic:{clipId:film.id,status:'paused',elapsedMs:value.progress*lessonSixFilmDuration(film),startedAt:null,runId:`legacy-${film.id}`}};
}
export function PortLessonSixFilmPlayback({page,host,readOnly=false,state:controlled}:{page:PortLessonSixPage;host:Host;readOnly?:boolean;state?:LessonSixPresentation}){
 const storageKey=`port-l6:${host.scope}:${page.slideKey}`,slot=useContext(ClassroomPlaybackSlot),callback=useRef(host.onChange);callback.current=host.onChange;
 const [state,setState]=useState<LessonSixPresentation>(()=>{
  const restore=(value:LessonSixPresentation)=>{const next=normalise(page,value);if(readOnly)return next;const f=getLessonSixFilm(page.localPage,next.option,next.revealed)!,elapsed=lessonSixFilmElapsed(f,next.cinematic!);return {...next,progress:elapsed/lessonSixFilmDuration(f),cinematic:{...next.cinematic!,status:'paused' as const,elapsedMs:elapsed,startedAt:null}};};
  if(host.initial?.slideKey===page.slideKey&&lessonSixStateValid(page,host.initial))return restore(host.initial);
  if(!readOnly)try{const saved=JSON.parse(sessionStorage.getItem(storageKey)??'null');if(saved&&lessonSixStateValid(page,saved))return restore(saved);}catch{}
  return normalise(page,{progress:/^(reading|study:|browse:|student:)/.test(host.scope)?1:0,revealed:false,option:page.localPage===33?2:page.localPage===29?1:0});
 });
 const shown=normalise(page,controlled??state),film=getLessonSixFilm(page.localPage,shown.option,shown.revealed)!,duration=lessonSixFilmDuration(film),clock=shown.cinematic!;
 const [now,setNow]=useState(Date.now()),[preparing,setPreparing]=useState(false),current=useRef(state),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),alive=useRef(true),intent=useRef(0);current.current=state;
 const elapsed=lessonSixFilmElapsed(film,clock,now),playing=clock.status==='playing'&&elapsed<duration;
 const update=useCallback((next:LessonSixPresentation)=>{current.current=next;setState(next);setNow(Date.now());},[]);
 const cancelAutoPlay=usePortAutoplay(!readOnly,()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches){seek(duration);return;}if(current.current.cinematic?.status!=='playing')void play(true);});
 const pause=useCallback(()=>{cancelAutoPlay();if(readOnly)return;intent.current++;clearTimeout(timer.current);const value=current.current,film=getLessonSixFilm(page.localPage,value.option,value.revealed)!,elapsed=lessonSixFilmElapsed(film,value.cinematic!);update({...value,progress:elapsed/lessonSixFilmDuration(film),cinematic:{...value.cinematic!,status:'paused',elapsedMs:elapsed,startedAt:null}});},[readOnly,page.localPage,update,cancelAutoPlay]);
 const narration=useLessonSixNarration(film,clock,readOnly||host.audioRole==='projection',pause,host.audioRole==='projection');
 useEffect(()=>{if(readOnly)return;callback.current?.(page.slideKey,state);try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch{}},[state,readOnly,storageKey,page.slideKey]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;intent.current++;clearTimeout(timer.current);};},[]);
 useEffect(()=>{if(clock.status!=='playing')return;const id=setInterval(()=>{const now=Date.now();setNow(now);if(!readOnly&&lessonSixFilmElapsed(film,current.current.cinematic!,now)>=duration)pause();},80);return()=>clearInterval(id);},[clock.status,clock.runId,clock.startedAt,film.id,duration,readOnly,pause]);
 const seek=(ms:number)=>{pause();narration.stop();const value=current.current;update({...value,camera:undefined,progress:ms/duration,cinematic:{...value.cinematic!,elapsedMs:ms,status:'paused',startedAt:null}});};
 const play=async(silent=false)=>{
  cancelAutoPlay();if(readOnly||preparing)return;if(current.current.cinematic?.status==='playing'){pause();return;}const token=++intent.current;setPreparing(true);
  const ok=silent||narration.muted||await narration.prepare();if(!alive.current||token!==intent.current){setPreparing(false);return;}setPreparing(false);if(!ok)return;
  let value=current.current,offset=lessonSixFilmElapsed(film,value.cinematic!);if(offset>=duration)offset=0;
  const begin=()=>{if(!alive.current||token!==intent.current)return;const v=current.current;update({...v,camera:undefined,progress:offset/duration,cinematic:{clipId:film.id,status:'playing',elapsedMs:offset,startedAt:Date.now(),runId:crypto.randomUUID()}});};
  if(value.camera){update({...value,camera:undefined,cinematic:{...value.cinematic!,elapsedMs:offset,status:'paused',startedAt:null}});timer.current=setTimeout(begin,620);}else begin();
 };
 const replay=()=>{seek(0);void play();};
 const next=()=>{const frame=lessonSixFilmFrame(film,elapsed);seek(Math.min(duration,frame.start+lessonSixShotDuration(frame.shot)));};
 const changeVariant=(option:number,revealed:boolean)=>{pause();narration.stop();const f=getLessonSixFilm(page.localPage,option,revealed)!;update({progress:0,option,revealed,cinematic:{clipId:f.id,status:'paused',elapsedMs:0,startedAt:null,runId:crypto.randomUUID()}});};
 const explore=()=>{if(readOnly)return;pause();narration.stop();const v=current.current;update({...v,camera:v.camera??lessonSixFilmCamera(film,v.cinematic!.elapsedMs)});};
 const cameraChange=(camera:LessonSixCamera)=>{if(readOnly)return;pause();update({...current.current,camera});};
 useEffect(()=>{if(readOnly)return;const key=(e:KeyboardEvent)=>{if(e.ctrlKey||e.altKey||e.metaKey||(e.target as HTMLElement).closest('input,select,textarea,button,a'))return;if(e.code==='Space'){e.preventDefault();void play();}if(e.key==='.'){e.preventDefault();next();}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);});
 const audioControls=<div className="l6-audio-controls" data-l6-audio-control="true"><button onClick={()=>void narration.toggle()}>{narration.muted||!narration.unlocked?'开启旁白':'静音'}</button><input type="range" min="0" max="1" step="0.05" aria-label="旁白音量" value={narration.volume} onChange={e=>narration.setVolume(Number(e.target.value))}/></div>;
 const bar=host.audioRole==='projection'?null:<div className={`l6-playback l6-film-playback${readOnly?' l6-film-readonly-controls':''}`} aria-label="第6讲播片控制">
  {!readOnly&&<><button disabled={preparing} onClick={()=>void play()}>{preparing?'准备旁白…':playing?'暂停':'播放'}</button><button onClick={replay}>重播</button><button onClick={next}>下一幕</button><input aria-label="动画进度" type="range" min="0" max="1000" value={Math.round(elapsed/duration*1000)} onChange={e=>seek(Number(e.target.value)/1000*duration)}/><output>{time(elapsed)} / {time(duration)}</output><button onClick={()=>seek(duration)}>全景</button>
   {page.options&&<select aria-label="演示选项" value={shown.option} onChange={e=>changeVariant(Number(e.target.value),false)}>{page.options.map((text,i)=><option key={text} value={i}>{text}</option>)}</select>}
   <button onClick={()=>{explore();cameraChange({latitude:30,longitude:110,distance:3.5});}}>地球全貌</button><button onClick={()=>{pause();update({...current.current,camera:undefined});}}>回到镜头</button>
   {page.reveal&&<button onClick={()=>changeVariant(shown.option,!shown.revealed)}>{shown.revealed?'收起解析':'揭示解析'}</button>}</>}
  {readOnly&&<span>跟随教师画面 · 声音由本机控制</span>}{audioControls}
  {narration.error&&<div className="l6-film-error" role="status">{narration.error}{!readOnly&&<button onClick={()=>{narration.continueSilent();void play(true);}}>静音继续</button>}</div>}
 </div>;
 return <LessonSixFilmControls.Provider value={{readOnly,onExploreStart:explore,onCameraChange:cameraChange}}><section className="l6-stage"><SlideViewport label={`第6讲 · ${page.localPage}/48`}><PortLessonSixFilm page={page} state={shown}/></SlideViewport>{bar&&(slot?createPortal(bar,slot):bar)}</section></LessonSixFilmControls.Provider>;
}
