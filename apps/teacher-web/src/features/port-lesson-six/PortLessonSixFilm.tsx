import {useContext,useEffect,useRef,useState} from 'react';
import {getLessonSixFilm,lessonSixFilmCamera,lessonSixFilmDuration,lessonSixFilmElapsed,lessonSixFilmFrame,PORT_LESSON_SIX_SOURCES,type LessonSixPresentation,type PortLessonSixPage} from '@edu/course-content';
import {InteractiveEarthGlobe,type InteractiveEarthGlobeHandle} from '../globe/InteractiveEarthGlobe';
import {LESSON_SIX_GLOBE_LOCATIONS,LESSON_SIX_GLOBE_ROUTES,LESSON_SIX_QUIZ_LOCATIONS,places} from './lesson-six-geography';
import {LessonSixFilmControls} from './lesson-six-film-controls';

export function PortLessonSixFilm({page,state}:{page:PortLessonSixPage;state:LessonSixPresentation}){
 const film=getLessonSixFilm(page.localPage,state.option,state.revealed)!,duration=lessonSixFilmDuration(film),controls=useContext(LessonSixFilmControls),ref=useRef<InteractiveEarthGlobeHandle>(null);
 const [now,setNow]=useState(Date.now()),[ready,setReady]=useState<'loading'|'ready'|'error'>('loading'),[reduced,setReduced]=useState(false),returnUntil=useRef(0),wasExploring=useRef(false);
 const current=useRef({film,state});current.current={film,state};
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(media.matches);change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 const elapsed=state.cinematic?lessonSixFilmElapsed(film,state.cinematic,now):state.progress*duration,frame=lessonSixFilmFrame(film,elapsed),shot=frame.shot;
 useEffect(()=>{let raf=0,last=0;const tick=(time:number)=>{const {film,state}=current.current,clock=Date.now(),elapsed=state.cinematic?lessonSixFilmElapsed(film,state.cinematic,clock):state.progress*lessonSixFilmDuration(film);
   if(!state.camera&&clock>=returnUntil.current){const camera=reduced?lessonSixFilmFrame(film,elapsed).shot.focus:lessonSixFilmCamera(film,elapsed);ref.current?.focusCoordinate(camera,camera.distance,0);}
   if(time-last>=80){setNow(clock);last=time;}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[reduced,ready]);
 useEffect(()=>{if(state.camera){wasExploring.current=true;ref.current?.focusCoordinate(state.camera,state.camera.distance,0);}else if(wasExploring.current){wasExploring.current=false;returnUntil.current=Date.now()+600;const camera=lessonSixFilmCamera(film,elapsed);ref.current?.focusCoordinate(camera,camera.distance,reduced?0:600);}},[state.camera,film.id,reduced]);
 const camera=state.camera??lessonSixFilmCamera(film,elapsed),previous=film.shots[Math.max(0,frame.index-1)]!,routeIds=shot.routes.filter(id=>frame.index===0||!previous.routes.includes(id));
 const routePlayback={routeIds,elapsedMs:state.cinematic?state.cinematic.elapsedMs-frame.start:frame.localMs,startedAt:state.cinematic?.status==='playing'?state.cinematic.startedAt:null,durationMs:Math.max(1800,frame.duration*.65)};
 const quiz=page.localPage===38&&!state.revealed,locations=quiz?LESSON_SIX_QUIZ_LOCATIONS:LESSON_SIX_GLOBE_LOCATIONS,source=PORT_LESSON_SIX_SOURCES[page.source];
 const complete=elapsed>=duration,playing=state.cinematic?.status==='playing'&&!complete;
 const mapWest=97,mapEast=shot.nodes.includes('ocean')?145:133,mapSouth=17,mapNorth=46;
 const mapX=(lon:number)=>660+(lon-mapWest)*860/(mapEast-mapWest),mapY=(lat:number)=>210+(mapNorth-lat)*570/(mapNorth-mapSouth);
 return <article className="port-l6-slide l6-dark l6-film" aria-label={`第6讲第${page.localPage}页`}>
  <div className={`l6-film-earth${controls.readOnly?' l6-film-earth--readonly':''}`} onPointerDownCapture={()=>{if(!controls.readOnly)controls.onExploreStart?.();}} onWheelCapture={()=>{if(!controls.readOnly)controls.onExploreStart?.();}} style={ready==='error'||reduced?{visibility:'hidden'}:undefined}>
   <InteractiveEarthGlobe ref={ref} locations={locations} routes={LESSON_SIX_GLOBE_ROUTES} visibleLocationIds={shot.nodes} visibleRouteIds={shot.routes} activeLocationIds={shot.nodes}
    initialFocus={film.shots[0]!.focus} featuredRouteFocus={film.shots[0]!.focus} featuredRouteDistance={film.shots[0]!.focus.distance} minDistance={1.45} maxDistance={4} zoomToCursor={false} autoRotate={false} presentationMode choreographedRoutes routePlayback={routePlayback}
    showControls={false} showMapModeToggle={false} showRouteModeToggle={false} showGraticule={false} showProvinceBoundaries={false} showSouthChinaSeaLine={false} routeView="featured" mapMode="natural"
    onRenderStateChange={setReady} onCameraChange={controls.readOnly?undefined:controls.onCameraChange} onLocationSelect={controls.readOnly?undefined:l=>controls.onCameraChange?.({latitude:l.latitude,longitude:l.longitude,distance:camera.distance})}
    forceFallback={reduced} textureUrl="/globe-assets/earth-bmng-200412-8192.webp" fallbackImageUrl="/globe-assets/earth-bmng-200412-8192.webp" title="" eyebrow="" interactionHint="" attribution="" featuredRouteAttribution="" ariaLabel="港口与腹地分镜地球仪"/>
  </div>
  {(ready==='error'||reduced)&&<svg className="l6-film-planar" viewBox="0 0 1600 1000" role="img" aria-label="港口与腹地平面分镜">
   <defs><clipPath id="l6-film-map-clip"><rect x="660" y="210" width="860" height="570" rx="5"/></clipPath></defs>
   <g clipPath="url(#l6-film-map-clip)"><image href="/globe-assets/earth-bmng-200412-8192.webp" x={mapX(-180)} y={mapY(90)} width={360*860/(mapEast-mapWest)} height={180*570/(mapNorth-mapSouth)}/>
    {shot.routes.map(id=>{const ids=id.split('--'),water=LESSON_SIX_GLOBE_ROUTES.find(r=>r.id===id)?.color;return <polyline key={id} points={ids.map(i=>`${mapX(places[i]!.lon)},${mapY(places[i]!.lat)}`).join(' ')} fill="none" stroke={water} strokeWidth="4"/>;})}
    {shot.nodes.map(id=>{const p=places[id]!,x=mapX(p.lon),y=mapY(p.lat);return <g key={id}><circle cx={x} cy={y} r="5" fill="#f0bc70"/><text x={x+(p.dx??10)/2} y={y+(p.dy??-22)/2} fill="white" stroke="#09273a" strokeWidth="5" paintOrder="stroke" fontSize="23">{locations.find(l=>l.id===id)?.name}</text></g>;})}
   </g>
  </svg>}
  <div className="l6-film-vignette" aria-hidden="true"/>
  <header className="l6-film-heading"><div className="l6-film-eyebrow">PORTS / HINTERLAND / CONNECTIONS <span>06—{String(page.localPage).padStart(2,'0')}</span></div><h1 data-l6-bounds="title">{page.title}</h1></header>
  <section className="l6-film-story" key={shot.id}><div className="l6-film-chapter">{String(frame.index+1).padStart(2,'0')} <i/> {String(film.shots.length).padStart(2,'0')}</div><h2 data-l6-bounds="shot-title">{shot.title}</h2><div className="l6-film-status">{state.camera?'自由探索':complete?(quiz?'请先作答，再核对解析':'停留观察 · 可重播'):(playing?'正在播放':'已暂停 · 点击播放继续')}</div><div className="l6-film-rule"/><p>港口位置<br/>内陆节点<br/>运输联系</p></section>
  <nav className="l6-film-chapters" aria-label="分镜进度">{film.shots.map((s,i)=><span key={s.id} className={i===frame.index?'is-current':i<frame.index?'is-done':''}><b>{String(i+1).padStart(2,'0')}</b><i/></span>)}</nav>
  <section className="l6-film-caption" data-l6-bounds="caption"><span>{quiz?'定位问题':page.source==='l6-concept'?'概念观察':'案例观察'}</span><p>{shot.caption}</p></section>
  <footer><span className="l6-source"><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>{page.localPage===33?' / 宁波舟山港（2024）':''} · 路线示意{ready==='error'||reduced?' · 平面分镜':''}</span><span>港口管理概论 · 第6讲 <b>{page.localPage}/48</b></span></footer>
  <ul className="l6-globe-location-list" aria-label="当前公开地理节点">{shot.nodes.map(id=><li key={id}>{locations.find(l=>l.id===id)?.name}</li>)}</ul>
 </article>;
}
