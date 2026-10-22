import {useCallback,useEffect,useRef,useState} from 'react';
import {Pause,Play} from 'lucide-react';
import {PORT_EXPANSION_FILMS,PORT_EXPANSION_SOURCES,expansionStateValid,expansionTotal,type ExpansionPresentation,type PortExpansionPage} from '@edu/course-content';
import {PageToolsContribution} from '../classroom/PageTools';
import {SlideViewport} from '../classroom/SlideViewport';
import {PortTradeComposition} from './PortTradeComposition';
import {PortTransitionComposition} from './PortTransitionComposition';

const stamp=(ms:number)=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
export function PortTradeFilm({page,readOnly,controlled,initial,onChange,scope}:{page:PortExpansionPage;readOnly:boolean;controlled?:ExpansionPresentation;initial?:ExpansionPresentation|null;onChange?:(key:string,state:ExpansionPresentation)=>void;scope:string}){
 const Composition=page.lesson>=15?PortTransitionComposition:PortTradeComposition;
 const film=PORT_EXPANSION_FILMS[page.mediaId!],source=PORT_EXPANSION_SOURCES[film.source],storage=`port-trade-film:${scope}:${page.slideKey}:${film.id}`;
 const [state,setState]=useState<ExpansionPresentation>(()=>{
  if(!readOnly)try{const saved=initial?.cinematic?initial:JSON.parse(sessionStorage.getItem(storage)??'null');if(expansionStateValid(page,saved)&&saved.cinematic)return {...saved,cinematic:{...saved.cinematic,status:'paused',startedAt:null}};}catch{/* Optional local resume. */}
  return {progress:1,option:0,revealed:false};
 });
 const video=useRef<HTMLVideoElement>(null),current=useRef(state),callback=useRef(onChange),token=useRef(0),alive=useRef(true),last=useRef(0);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[volume,setVolume]=useState(.85),[muted,setMuted]=useState(readOnly);
 current.current=state;callback.current=onChange;
 const shown=readOnly&&controlled&&expansionStateValid(page,controlled)?controlled:state,active=!!shown.cinematic,playing=shown.cinematic?.status==='playing',elapsed=shown.cinematic?.elapsedMs??0;
 const update=useCallback((s:ExpansionPresentation)=>{current.current=s;setState(s);if(!readOnly){callback.current?.(page.slideKey,s);try{sessionStorage.setItem(storage,JSON.stringify(s));}catch{/* Optional persistence. */}}},[storage,readOnly,page.slideKey]);
 const record=useCallback((status:'paused'|'playing',time=(video.current?.currentTime??0)*1000)=>{const elapsedMs=Math.max(0,Math.min(film.durationMs,time));update({progress:elapsedMs/film.durationMs,option:0,revealed:false,cinematic:{clipId:film.id,status,elapsedMs,startedAt:status==='playing'?Date.now():null}});},[film,update]);
 const pause=()=>{token.current++;video.current?.pause();setBusy(false);record('paused');};
 const play=async()=>{const v=video.current;if(!v)return;const intent=++token.current;setError('');setBusy(true);try{if(v.currentTime>=film.durationMs/1000-.15)v.currentTime=0;await v.play();if(intent!==token.current||!alive.current){v.pause();return;}record('playing');}catch{if(intent===token.current&&alive.current)setError('未能播放视频，请再次点击播放，或打开MP4独立播放。');}finally{if(intent===token.current&&alive.current)setBusy(false);}};
 const seek=(ms:number)=>{token.current++;const v=video.current;if(v){v.pause();v.currentTime=ms/1000;}setBusy(false);record('paused',ms);};
 useEffect(()=>{alive.current=true;const v=video.current;return()=>{alive.current=false;token.current++;v?.pause();};},[]);
 useEffect(()=>{if(!readOnly)callback.current?.(page.slideKey,current.current);},[page.slideKey,readOnly]);
 useEffect(()=>{const v=video.current;if(v){v.volume=volume;v.muted=readOnly||muted;}},[volume,muted,readOnly]);
 useEffect(()=>{if(readOnly)return;const v=video.current;if(!v)return;const apply=()=>{const c=current.current.cinematic;if(c&&Math.abs(v.currentTime-c.elapsedMs/1000)>.5)v.currentTime=c.elapsedMs/1000;};if(v.readyState)apply();else v.addEventListener('loadedmetadata',apply,{once:true});return()=>v.removeEventListener('loadedmetadata',apply);},[readOnly]);
 useEffect(()=>{if(!readOnly)return;const v=video.current;if(!v)return;const sync=()=>{const c=shown.cinematic;if(!c){v.pause();return;}const target=Math.min(film.durationMs,c.elapsedMs+(c.status==='playing'?Math.max(0,Date.now()-(c.startedAt??Date.now())):0))/1000;if(v.readyState&&Math.abs(v.currentTime-target)>.65)v.currentTime=target;v.muted=true;if(c.status==='playing'&&target<film.durationMs/1000){if(v.paused)void v.play().catch(()=>setError('跟随端未能播放，请检查媒体加载。'));}else v.pause();};sync();const timer=setInterval(sync,250);return()=>clearInterval(timer);},[shown.cinematic,readOnly,film.durationMs]);
 useEffect(()=>{if(readOnly)return;const handler=(e:KeyboardEvent)=>{if(e.ctrlKey||e.altKey||e.metaKey||(e.target as HTMLElement).closest('input,select,button,a,textarea'))return;if(e.code==='Space'){e.preventDefault();if(video.current?.paused)void play();else pause();}};addEventListener('keydown',handler);return()=>removeEventListener('keydown',handler);});
 return <section className="pe-stage"><SlideViewport label={`第${page.lesson}讲 · ${page.localPage}/${expansionTotal(page.lesson)} · 新闻节选`}><div className={`pt-film-canvas${active?' pt-film-canvas--active':''}`}>
  <Composition page={page} state={{progress:1,option:0,revealed:false}}/>
  <video ref={video} src={film.src} poster={film.poster} preload="metadata" playsInline muted={readOnly||muted} aria-label={film.title} onTimeUpdate={()=>{if(readOnly||!current.current.cinematic||video.current?.paused)return;if(Date.now()-last.current>800){last.current=Date.now();record('playing');}}} onEnded={()=>{if(!readOnly)record('paused',film.durationMs);}} onError={()=>setError('视频加载失败，可查看来源或下载本地MP4排查。')}>
   <track kind="captions" src={film.captions} srcLang="zh" label="中文观察字幕（画面已含）"/>
  </video>{(error||busy)&&<p className="pt-film-error" role="status">{error||'正在加载新闻节选…'}</p>}
 </div></SlideViewport>{!readOnly&&<PageToolsContribution pageKey={page.slideKey} title="视频与来源" actions={[{id:'trade-film-play',label:playing?'暂停视频':elapsed>=film.durationMs?'重播视频':'播放视频',icon:playing?<Pause size={18}/>:<Play size={18}/>,disabled:busy,onInvoke:()=>playing?pause():void play()}]} status={error?{text:error,error:true}:undefined}>
  <div className="pt-film-tools"><button onClick={()=>{seek(0);void play();}}>从头播放</button><button onClick={pause}>暂停</button><label>视频进度<input aria-label="新闻节选进度" type="range" min="0" max={film.durationMs} step="250" value={elapsed} onChange={e=>seek(Number(e.target.value))}/></label><output>{stamp(elapsed)} / {stamp(film.durationMs)}</output><label><input type="checkbox" checked={muted} onChange={e=>setMuted(e.target.checked)}/>静音</label><label>音量<input aria-label="新闻节选音量" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><button onClick={()=>{pause();update({progress:1,option:0,revealed:false});}}>回到观察卡</button><a href={film.src} target="_blank" rel="noreferrer">独立播放MP4 ↗</a><a href={film.src} download>下载节选</a><a href={source.url} target="_blank" rel="noreferrer">原报道与日期 ↗</a><a href={page.lesson>=15?'/course-assets/port-management/transition-media/index.html':'/course-assets/port-management/trade-media/index.html'} target="_blank" rel="noreferrer">全部视频与剪辑记录 ↗</a></div>
 </PageToolsContribution>}</section>;
}
