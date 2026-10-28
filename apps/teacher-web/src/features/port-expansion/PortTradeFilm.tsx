import {PortFrontierComposition} from './PortFrontierComposition';
import {usePortAutoplay} from '../classroom/usePortAutoplay';
import {PortReviewComposition} from './PortReviewComposition';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Pause,Play} from 'lucide-react';
import {PORT_EXPANSION_FILMS,PORT_EXPANSION_SOURCES,expansionStateValid,expansionTotal,type ExpansionPresentation,type PortExpansionPage} from '@edu/course-content';
import {PageToolsContribution} from '../classroom/PageTools';
import {SlideViewport} from '../classroom/SlideViewport';
import {PortTradeComposition} from './PortTradeComposition';
import {PortInvestmentComposition} from './PortInvestmentComposition';
import {PortQueueComposition} from './PortQueueComposition';
import {PortTransitionComposition} from './PortTransitionComposition';

const stamp=(ms:number)=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
export function PortTradeFilm({page,readOnly,controlled,initial,onChange,scope}:{page:PortExpansionPage;readOnly:boolean;controlled?:ExpansionPresentation;initial?:ExpansionPresentation|null;onChange?:(key:string,state:ExpansionPresentation)=>void;scope:string}){
 const Composition=page.lesson===19?PortFrontierComposition:page.lesson>=20?PortReviewComposition:page.lesson===18?PortInvestmentComposition:page.lesson===17?PortQueueComposition:page.lesson>=15?PortTransitionComposition:PortTradeComposition;
 const film=PORT_EXPANSION_FILMS[page.mediaId!],source=PORT_EXPANSION_SOURCES[film.source],storage=`port-trade-film:${scope}:${page.slideKey}:${film.id}`;
 const authored=film.source==='pq-animation',mediaLabel=authored?'教学动画':page.lesson>=18?'课程片头':'新闻节选';
 const chapters='chapters' in film?film.chapters:[];
 const [state,setState]=useState<ExpansionPresentation>(()=>{
  if(!readOnly)try{const saved=initial?.cinematic?initial:JSON.parse(sessionStorage.getItem(storage)??'null');if(expansionStateValid(page,saved)&&saved.cinematic)return {...saved,cinematic:{...saved.cinematic,status:'paused',startedAt:null}};}catch{/* Optional local resume. */}
  return {progress:1,option:0,revealed:false};
 });
 const video=useRef<HTMLVideoElement>(null),current=useRef(state),callback=useRef(onChange),token=useRef(0),alive=useRef(true),last=useRef(0);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[volume,setVolume]=useState(.85),[muted,setMuted]=useState(readOnly);
 current.current=state;callback.current=onChange;
 const shown=readOnly&&controlled&&expansionStateValid(page,controlled)?controlled:state,active=!!shown.cinematic,playing=shown.cinematic?.status==='playing',elapsed=shown.cinematic?.elapsedMs??0;
 const totalStamp=stamp(Math.round(film.durationMs/1000)*1000);
 const update=useCallback((s:ExpansionPresentation)=>{current.current=s;setState(s);if(!readOnly){callback.current?.(page.slideKey,s);try{sessionStorage.setItem(storage,JSON.stringify(s));}catch{/* Optional persistence. */}}},[storage,readOnly,page.slideKey]);
 const record=useCallback((status:'paused'|'playing',time=(video.current?.currentTime??0)*1000)=>{const elapsedMs=Math.max(0,Math.min(film.durationMs,time));update({progress:elapsedMs/film.durationMs,option:0,revealed:false,cinematic:{clipId:film.id,status,elapsedMs,startedAt:status==='playing'?Date.now():null}});},[film,update]);
 const cancelAutoplay=usePortAutoplay(!readOnly,()=>{void play(true);});
 const pause=()=>{cancelAutoplay();token.current++;video.current?.pause();setBusy(false);record('paused');};
 const play=async(automatic=false)=>{if(!automatic)cancelAutoplay();const v=video.current;if(!v)return;const intent=++token.current;setError('');setNotice('');setBusy(true);try{if(v.currentTime>=film.durationMs/1000-.15)v.currentTime=0;try{await v.play();}catch(reason){if(!automatic||(reason as DOMException)?.name!=='NotAllowedError'||intent!==token.current||!alive.current)throw reason;v.muted=true;setMuted(true);await v.play();setNotice('已静音自动播放，可在“视频与来源”中取消静音。');}if(intent!==token.current||!alive.current){v.pause();return;}record('playing');}catch{if(intent===token.current&&alive.current)setError('未能播放视频，请再次点击播放，或打开MP4独立播放。');}finally{if(intent===token.current&&alive.current)setBusy(false);}};
 const seek=(ms:number)=>{cancelAutoplay();token.current++;const v=video.current;if(v){v.pause();v.currentTime=ms/1000;}setBusy(false);record('paused',ms);};
 useEffect(()=>{alive.current=true;const v=video.current;return()=>{alive.current=false;token.current++;v?.pause();};},[]);
 useEffect(()=>{if(!readOnly)callback.current?.(page.slideKey,current.current);},[page.slideKey,readOnly]);
 useEffect(()=>{const v=video.current;if(v){v.volume=volume;v.muted=readOnly||muted;}},[volume,muted,readOnly]);
 useEffect(()=>{if(readOnly)return;const v=video.current;if(!v)return;const apply=()=>{const c=current.current.cinematic;if(c&&Math.abs(v.currentTime-c.elapsedMs/1000)>.5)v.currentTime=c.elapsedMs/1000;};if(v.readyState)apply();else v.addEventListener('loadedmetadata',apply,{once:true});return()=>v.removeEventListener('loadedmetadata',apply);},[readOnly]);
 useEffect(()=>{if(!readOnly)return;const v=video.current;if(!v)return;const sync=()=>{const c=shown.cinematic;if(!c){v.pause();return;}const target=Math.min(film.durationMs,c.elapsedMs+(c.status==='playing'?Math.max(0,Date.now()-(c.startedAt??Date.now())):0))/1000;if(v.readyState&&Math.abs(v.currentTime-target)>.65)v.currentTime=target;v.muted=true;if(c.status==='playing'&&target<film.durationMs/1000){if(v.paused)void v.play().catch(()=>setError('跟随端未能播放，请检查媒体加载。'));}else v.pause();};sync();const timer=setInterval(sync,250);return()=>clearInterval(timer);},[shown.cinematic,readOnly,film.durationMs]);
 useEffect(()=>{if(readOnly)return;const handler=(e:KeyboardEvent)=>{if(e.ctrlKey||e.altKey||e.metaKey||(e.target as HTMLElement).closest('input,select,button,a,textarea'))return;if(e.code==='Space'){e.preventDefault();if(video.current?.paused)void play();else pause();}};addEventListener('keydown',handler);return()=>removeEventListener('keydown',handler);});
 return <section className="pe-stage"><SlideViewport label={`第${page.lesson}讲 · ${page.localPage}/${expansionTotal(page.lesson)} · ${mediaLabel}`}><div className={`pt-film-canvas${active?' pt-film-canvas--active':''}`}>
  <Composition page={page} state={{progress:1,option:0,revealed:false}}/>
  <video ref={video} src={film.src} poster={film.poster} preload="metadata" playsInline muted={readOnly||muted} aria-label={film.title} onTimeUpdate={()=>{if(readOnly||!current.current.cinematic||video.current?.paused)return;if(Date.now()-last.current>800){last.current=Date.now();record('playing');}}} onPause={()=>{if(!readOnly&&alive.current&&current.current.cinematic?.status==='playing')record('paused');}} onEnded={()=>{if(!readOnly)record('paused',film.durationMs);}} onError={()=>setError('视频加载失败，可查看来源或下载本地MP4排查。')}>
   <track kind="captions" src={film.captions} srcLang="zh" label={authored?'中文旁白（画面已含）':page.lesson>=17?'中文课程旁白字幕（画面已含）':'中文观察字幕（画面已含）'} default={page.lesson===17&&!authored}/>
  </video>{(error||busy)&&<p className="pt-film-error" role="status">{error||`正在加载${mediaLabel}…`}</p>}
 </div></SlideViewport>{!readOnly&&<PageToolsContribution pageKey={page.slideKey} title="视频与来源" actions={[{id:'trade-film-play',label:playing?'暂停视频':elapsed>=film.durationMs?'重播视频':'播放视频',icon:playing?<Pause size={18}/>:<Play size={18}/>,disabled:busy,onInvoke:()=>playing?pause():void play()}]} status={error||notice?{text:error||notice,error:!!error}:undefined}>
  <div className="pt-film-tools">
   <button onClick={()=>{seek(0);void play();}}>从头播放</button><button onClick={pause}>暂停</button>
   <label>视频进度<input aria-label={`${mediaLabel}进度`} type="range" min="0" max="1000" step="1" value={Math.round(elapsed/film.durationMs*1000)} onChange={e=>seek(Number(e.target.value)/1000*film.durationMs)}/></label><output>{elapsed>=film.durationMs?totalStamp:stamp(elapsed)} / {totalStamp}</output>
   <label><input type="checkbox" checked={muted} onChange={e=>setMuted(e.target.checked)}/>静音</label><label>音量<input aria-label={`${mediaLabel}音量`} type="range" min="0" max="1" step=".05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label>
   {chapters.map(chapter=><button key={chapter.startMs} onClick={()=>seek(chapter.startMs)}>{chapter.label} · {stamp(chapter.startMs)}</button>)}
   <button onClick={()=>{pause();update({progress:1,option:0,revealed:false});}}>回到观察卡</button>
   <a href={authored?'/course-assets/port-management/queue-media/queue-explainer.html':film.src} target="_blank" rel="noreferrer">{authored?'独立播放／按章节回看':'独立播放MP4'} ↗</a><a href={film.src} download>{authored?'下载动画':page.lesson>=18?'下载片头':'下载节选'}</a>
   <a href={authored?'/course-assets/port-management/queue-media/queue-explainer-edl.json':source.url} target="_blank" rel="noreferrer">{authored?'动画脚本与模型记录':'原报道与日期'} ↗</a>
   {!authored&&<a href={page.lesson===19?'/course-assets/port-management/frontier-media/index.html':page.lesson>=20?'/course-assets/port-management/review-media-v2/index.html':page.lesson===18?'/course-assets/port-management/investment-media/index.html':page.lesson===17?'/course-assets/port-management/queue-media/index.html':page.lesson>=15?'/course-assets/port-management/transition-media/index.html':'/course-assets/port-management/trade-media/index.html'} target="_blank" rel="noreferrer">全部视频与剪辑记录 ↗</a>}
  </div>
 </PageToolsContribution>}</section>;
}
