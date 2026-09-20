import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import type {LessonSixCamera,LessonSixPresentation,PortLessonSixPage} from '@edu/course-content';
import {InteractiveEarthGlobe,type InteractiveEarthGlobeHandle} from '../globe/InteractiveEarthGlobe';
import {getLessonSixGeography,gateways,lessonSixCamera,LESSON_SIX_GLOBE_LOCATIONS,LESSON_SIX_QUIZ_LOCATIONS,LESSON_SIX_GLOBE_ROUTES,routeId} from './lesson-six-geography';

export const LessonSixGlobeControls=createContext<{readOnly:boolean;onCameraChange?:(camera:LessonSixCamera)=>void}>({readOnly:true});
export function PortLessonSixGlobe({page,state,fallback,children}:{page:PortLessonSixPage;state:LessonSixPresentation;fallback:ReactNode;children:ReactNode}){
 const controls=useContext(LessonSixGlobeControls),ref=useRef<InteractiveEarthGlobeHandle>(null),localCamera=useRef<LessonSixCamera|undefined>(undefined);
 const [renderState,setRenderState]=useState<'loading'|'ready'|'error'>('loading');
 const data=getLessonSixGeography(page.localPage,state.option),camera=state.camera??lessonSixCamera(page.localPage,state.option);
 const signature=JSON.stringify(camera);
 useEffect(()=>{if(signature!==JSON.stringify(localCamera.current))ref.current?.focusCoordinate(camera,camera.distance,0);},[signature,renderState]);
 const report=(value:LessonSixCamera)=>{const camera={latitude:Math.round(value.latitude*1e6)/1e6,longitude:Math.round(value.longitude*1e6)/1e6,distance:Math.max(1.45,Math.min(4,value.distance))};localCamera.current=camera;controls.onCameraChange?.(camera);};
 const visible=state.progress>=.5?data.ids:state.progress>=.25?data.ids.filter(id=>gateways.has(id)):[];
 const routes=state.progress>=.75?data.links.map(routeId):[];
 // Catalog identity stays fixed while layers/cameras change, preserving WebGL resources.
 const quiz=page.localPage===38&&!state.revealed;
 return <div className="l6-geography">
  {renderState==='error'?fallback:<div className="l6-globe-notes">{children}</div>}
  <div className={`l6-globe-window${controls.readOnly?' l6-globe-readonly':''}`} style={renderState==='error'?{display:'none'}:undefined}>
   <InteractiveEarthGlobe ref={ref} locations={quiz?LESSON_SIX_QUIZ_LOCATIONS:LESSON_SIX_GLOBE_LOCATIONS} routes={LESSON_SIX_GLOBE_ROUTES}
    visibleLocationIds={visible} visibleRouteIds={routes} initialFocus={camera} featuredRouteFocus={camera} featuredRouteDistance={camera.distance}
    minDistance={1.45} maxDistance={4} zoomToCursor={false} routeView="featured" mapMode="natural" autoRotate={false} showGraticule={false} showProvinceBoundaries={false} showSouthChinaSeaLine={false}
    showControls={false} showMapModeToggle={false} showRouteModeToggle={false} presentationMode
    onRenderStateChange={setRenderState} onCameraChange={controls.readOnly?undefined:report}
    onLocationSelect={controls.readOnly?undefined:location=>controls.onCameraChange?.({latitude:location.latitude,longitude:location.longitude,distance:camera.distance})}
    textureUrl="/globe-assets/earth-bmng-200412-8192.webp" fallbackImageUrl="/globe-assets/earth-bmng-200412-8192.webp"
    title="" eyebrow="" interactionHint="" attribution="NASA地理底图 · 节点近似定位" featuredRouteAttribution="运输联系示意，非实际线路" ariaLabel="第6讲港口与腹地地球仪"/>
   <div className="l6-globe-legend">青线：水运联系 · 金线：陆向联系 · 路线示意</div>
   <ul className="l6-globe-location-list" aria-label="当前地理节点">{visible.map(id=><li key={id}>{(quiz?LESSON_SIX_QUIZ_LOCATIONS:LESSON_SIX_GLOBE_LOCATIONS).find(p=>p.id===id)?.name}</li>)}</ul>
  </div>
 </div>;
}
