import {useCallback,useEffect,useRef,useState} from 'react';
import {Pause,Play} from 'lucide-react';
import {portOpeningFilm,expansionStateValid,type ExpansionPresentation,type PortExpansionPage} from '@edu/course-content';
import {SlideViewport} from '../classroom/SlideViewport';
import {PageToolsContribution} from '../classroom/PageTools';
import {PortAdvancedComposition} from './PortAdvancedComposition';

const duration=180000;
const stamp=(ms:number)=>`${Math.floor(ms/60000).toString().padStart(2,'0')}:${Math.floor(ms/1000)%60<10?'0':''}${Math.floor(ms/1000)%60}`;
export function PortElevenOpening({page,readOnly,controlled,initial,onChange,scope}:{page:PortExpansionPage;readOnly:boolean;controlled?:ExpansionPresentation;initial?:ExpansionPresentation|null;onChange?:(key:string,state:ExpansionPresentation)=>void;scope:string}){
 const film=portOpeningFilm(page.slideKey)!;
 const storageKey=`port-expansion-film:${scope}:${page.slideKey}:${film.id}`;
 const [state,setState]=useState<ExpansionPresentation>(()=>{
  if(!readOnly)try{const s=initial?.cinematic?initial:JSON.parse(sessionStorage.getItem(storageKey)??'null');if(expansionStateValid(page,s)&&s.cinematic)return {...s,cinematic:{...s.cinematic,status:'paused',startedAt:null}};}catch{/* Optional local persistence. */}
  return {progress:1,option:0,revealed:false};
 });
 const video=useRef<HTMLVideoElement>(null),current=useRef(state),callback=useRef(onChange),intent=useRef(0),last=useRef(0),alive=useRef(true);
 const [error,setError]=useState(''),[loading,setLoading]=useState(false),[volume,setVolume]=useState(.85),[muted,setMuted]=useState(readOnly);
 current.current=state;callback.current=onChange;
 const shown=readOnly&&controlled&&expansionStateValid(page,controlled)?controlled:state,playing=shown.cinematic?.status==='playing',active=!!shown.cinematic;
 const update=useCallback((s:ExpansionPresentation)=>{current.current=s;setState(s);if(!readOnly){callback.current?.(page.slideKey,s);try{sessionStorage.setItem(storageKey,JSON.stringify(s));}catch{/* Optional local persistence. */}}},[readOnly,page.slideKey,storageKey]);
 const record=useCallback((status:'playing'|'paused',time?:number)=>{const elapsedMs=Math.min(duration,Math.max(0,time??(video.current?.currentTime??0)*1000));update({progress:elapsedMs/duration,option:0,revealed:false,cinematic:{clipId:film.id,status,elapsedMs,startedAt:status==='playing'?Date.now():null}});},[update,film.id]);
 const pause=()=>{intent.current++;video.current?.pause();setLoading(false);record('paused');};
 const play=async()=>{const element=video.current;if(!element)return;const token=++intent.current;setError('');setLoading(true);
  try{if(element.currentTime>=179.9)element.currentTime=0;await element.play();if(token!==intent.current||!alive.current){element.pause();return;}record('playing');}
  catch{if(token===intent.current&&alive.current)setError('短片未能开始。请再次点击播放；也可打开独立播放器或下载MP4。');}
  finally{if(token===intent.current&&alive.current)setLoading(false);}
 };
 const seek=(ms:number)=>{intent.current++;const element=video.current;if(element){element.pause();element.currentTime=ms/1000;}setLoading(false);record('paused',ms);};
 useEffect(()=>{alive.current=true;const element=video.current;return()=>{alive.current=false;intent.current++;element?.pause();};},[]);
 useEffect(()=>{if(!readOnly)callback.current?.(page.slideKey,current.current);},[page.slideKey,readOnly]);
 useEffect(()=>{const v=video.current;if(v){v.volume=volume;v.muted=readOnly||muted;}},[volume,muted,readOnly]);
 // An initial seek waits for metadata; reloads resume paused and never unexpectedly play sound.
 useEffect(()=>{if(readOnly)return;const v=video.current;if(!v)return;const apply=()=>{const c=current.current.cinematic;if(c&&Math.abs(v.currentTime-c.elapsedMs/1000)>.6)v.currentTime=c.elapsedMs/1000;};if(v.readyState)apply();else v.addEventListener('loadedmetadata',apply,{once:true});return()=>v.removeEventListener('loadedmetadata',apply);},[readOnly]);
 // The teacher is authoritative. Projection/student media is silent and follows the shared clock.
 useEffect(()=>{if(!readOnly)return;const v=video.current;if(!v)return;let timer=0;const sync=()=>{const c=shown.cinematic;if(!c){v.pause();return;}const target=Math.min(duration,c.elapsedMs+(c.status==='playing'?Math.max(0,Date.now()-(c.startedAt??Date.now())):0))/1000;
  if(v.readyState&&Math.abs(v.currentTime-target)>.65)v.currentTime=target;v.muted=true;
  if(c.status==='playing'&&target<180){if(v.paused)void v.play().catch(()=>setError('投影端未能自动播放，请检查媒体加载。'));}else v.pause();};sync();timer=window.setInterval(sync,250);return()=>clearInterval(timer);},[shown.cinematic,readOnly]);
 useEffect(()=>{if(readOnly)return;const handler=(e:KeyboardEvent)=>{if(e.ctrlKey||e.altKey||e.metaKey||(e.target as HTMLElement).closest('input,select,button,a,textarea'))return;if(e.code==='Space'){e.preventDefault();if(video.current?.paused)void play();else pause();}};addEventListener('keydown',handler);return()=>removeEventListener('keydown',handler);});
 const elapsed=shown.cinematic?.elapsedMs??0;
 return <section className="pe-stage"><SlideViewport label={`第${page.lesson}讲 · 1/32 · 3分钟开场片`}><div className={`ps-film-stage${active?' ps-film-stage--active':''}`}>
   <PortAdvancedComposition page={page} state={{progress:1,option:0,revealed:false}}/>
   <video ref={video} src={film.src} poster={film.poster} preload="metadata" playsInline muted={readOnly||muted} aria-label={`第${page.lesson}讲3分钟开场短片`} onTimeUpdate={()=>{if(readOnly||!current.current.cinematic||video.current?.paused)return;if(Date.now()-last.current>900){last.current=Date.now();record('playing');}}} onEnded={()=>{if(!readOnly)record('paused',duration);}} onError={()=>setError('短片加载失败，请使用独立播放器或下载MP4检查。')}>
    <track kind="captions" src={film.captions} srcLang="zh" label="中文字幕（画面已含字幕）"/>
   </video>{(loading||error)&&<p className="ps-film-loading" role="status">{error||'正在加载开场片…'}</p>}
  </div></SlideViewport>
  {!readOnly&&<PageToolsContribution pageKey={page.slideKey} title="影片控制" actions={[{id:'opening-play',label:playing?'暂停短片':elapsed>=duration?'重播开场片':'播放开场片',icon:playing?<Pause size={18}/>:<Play size={18}/>,disabled:loading,onInvoke:()=>playing?pause():void play()}]} status={error?{text:error,error:true}:undefined}>
   <div className="ps-film-tools"><button onClick={()=>{seek(0);void play();}}>从头播放</button><button onClick={pause}>暂停</button><label>影片进度<input type="range" min="0" max={duration} step="1000" value={elapsed} aria-label="开场片进度" onChange={e=>seek(Number(e.target.value))}/></label><output>{stamp(elapsed)} / 03:00</output><label><input type="checkbox" checked={muted} onChange={e=>setMuted(e.target.checked)}/>静音</label><label>音量<input type="range" min="0" max="1" step="0.05" aria-label="开场片音量" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><button onClick={()=>{pause();update({progress:1,option:0,revealed:false});}}>回到封面</button><a href={film.player} target="_blank" rel="noreferrer">独立播放器 ↗</a><a href={film.src} download={`港口管理概论-第${page.lesson}讲-开场片.mp4`}>下载MP4</a></div>
  </PageToolsContribution>}
 </section>;
}
