import { useEffect, useRef, useState, useMemo } from "react";
import { InteractiveEarthGlobe, type GlobeCoordinate, type GlobeLocation, type GlobeRoute, type GlobeShippingLanePath, type InteractiveEarthGlobeHandle } from "../globe/InteractiveEarthGlobe";
import { GLOBAL_MARITIME_LOCATIONS, loadGlobalShippingLanes } from "../globe/global-maritime-preset";
import { LL3_GLOBE_ROUTES } from "../globe/ll3-globe-preset";
import { useLblPlayback, phase } from "./PortLblPrimitives";
import { LblFlatMap } from "./LblFlatMap";

export interface LblCameraKey { at: number; latitude: number; longitude: number; distance: number }
const WORLD_CAMERA: readonly LblCameraKey[] = [{at:0,latitude:20,longitude:75,distance:3.4}];
export const WESTBOUND_ROUTES=LL3_GLOBE_ROUTES.filter(r=>r.id==="ll3-westbound").map(r=>({...r,animated:false}));
const DEFAULT_LABELS=["shanghai","singapore","suez","rotterdam"];
const EMPTY_IDS:readonly string[]=[];
const LBL_LOCATIONS:readonly GlobeLocation[]=[...GLOBAL_MARITIME_LOCATIONS.map(location=>({...location,visibilityScope:"all" as const,showLabel:true})),
  {id:"iran",name:"伊朗",latitude:29.2,longitude:55,kind:"city",visibilityScope:"all"},
  {id:"oman",name:"阿曼",latitude:23,longitude:57,kind:"city",visibilityScope:"all"},
  {id:"persian-gulf",name:"波斯湾",latitude:27,longitude:51.5,kind:"city",visibilityScope:"all"},
  {id:"gulf-of-oman",name:"阿曼湾",latitude:24.4,longitude:59,kind:"city",visibilityScope:"all"},
  {id:"sunda",name:"巽他海峡",latitude:-5.9,longitude:105.8,kind:"chokepoint",visibilityScope:"all"},
  {id:"lombok",name:"龙目海峡",latitude:-8.5,longitude:115.8,kind:"chokepoint",visibilityScope:"all"},
  {id:"singapore-strait",name:"新加坡海峡",latitude:1.2,longitude:104,kind:"chokepoint",visibilityScope:"all"},
  {id:"turkish-straits",name:"土耳其海峡",latitude:40.9,longitude:29,kind:"chokepoint",visibilityScope:"all"},
  {id:"danish-straits",name:"丹麦海峡",latitude:55.7,longitude:11.1,kind:"chokepoint",visibilityScope:"all"}
];
export const JOURNEY_CAMERA: readonly LblCameraKey[] = [
  {at:0,latitude:29.6,longitude:106.6,distance:1.65},
  {at:.2,latitude:31,longitude:121,distance:1.8},
  {at:.4,latitude:8,longitude:99,distance:2.3},
  {at:.62,latitude:26,longitude:41,distance:2.3},
  {at:.8,latitude:44,longitude:7,distance:2.4},
  {at:.94,latitude:25,longitude:65,distance:3.5}
];

export function LblGlobe({x=530,y=0,w=1120,h=940,keys=WORLD_CAMERA,global=false,routes=WESTBOUND_ROUTES,labels=DEFAULT_LABELS,className="",highlight=EMPTY_IDS}:{
  x?:number;y?:number;w?:number;h?:number;keys?:readonly LblCameraKey[];global?:boolean;routes?:readonly GlobeRoute[];labels?:readonly string[];className?:string;highlight?:readonly string[];
}) {
  const ref=useRef<InteractiveEarthGlobeHandle>(null);
  const {progress,reducedMotion}=useLblPlayback();
  const [lanes,setLanes]=useState<readonly GlobeShippingLanePath[]>([]);
  const [laneError,setLaneError]=useState(false);
  const [renderState,setRenderState]=useState<"loading"|"ready"|"error">("loading");
  const previous=keys.filter(k=>k.at<=progress).at(-1)??keys[0]!;
  const next=keys.find(k=>k.at>progress)??previous;
  const mix=next===previous?0:phase(progress,previous.at,next.at);
  const longitudeDelta=((next.longitude-previous.longitude+540)%360)-180;
  const camera={latitude:previous.latitude+(next.latitude-previous.latitude)*mix,longitude:previous.longitude+longitudeDelta*mix,distance:previous.distance+(next.distance-previous.distance)*mix};
  const keyId=`${camera.latitude}:${camera.longitude}:${camera.distance}`;
  useEffect(()=>{let active=true;if(global)loadGlobalShippingLanes().then(data=>{if(active)setLanes(data)}).catch(()=>{if(active)setLaneError(true)});return()=>{active=false}},[global]);
  useEffect(()=>{ref.current?.focusCoordinate(camera as GlobeCoordinate,camera.distance,0)},[keyId,reducedMotion]);
  const routeKey=routes.map(r=>r.id).join("|");
  const stableRoutes=useMemo(()=>routes,[routeKey]);
  const routeIds=useMemo(()=>stableRoutes.map(r=>r.id),[stableRoutes]);
  return <div className={`lbl-globe ${className}`} style={{left:x,top:y,width:w,height:h}}>
    <InteractiveEarthGlobe ref={ref} locations={LBL_LOCATIONS} routes={stableRoutes}
      shippingLanes={lanes} shippingLaneState={global?(laneError?"error":lanes.length?"ready":"loading"):"ready"}
      routeView={global?"global":"featured"} shippingLaneDetail="major" initialFocus={camera}
      globalRouteFocus={camera} featuredRouteFocus={camera} globalRouteDistance={camera.distance} featuredRouteDistance={camera.distance}
      visibleLocationIds={labels} activeLocationIds={highlight} visibleRouteIds={routeIds}
      mapMode="natural" showControls={false} showMapModeToggle={false} showRouteModeToggle={false}
      textureUrl="/globe-assets/earth-bmng-200412-8192.webp"
      showGraticule={false} autoRotate={false} showLabels showProvinceBoundaries={false}
      presentationMode onRenderStateChange={setRenderState}
      movingVessel={!global&&routes.length===1?{id:"lbl-vessel",coordinate:routes[0]!.points[0]!,color:routes[0]!.color,label:"教学船位",motion:{routeId:routes[0]!.id,durationMs:1000,elapsedMs:progress*1000,startedAt:null}}:undefined}
      title="" eyebrow="" interactionHint="" attribution="路线示意，非实时AIS" ariaLabel="世界海运地理示意"/>
    {renderState==="error"&&<LblFlatMap camera={camera} routes={stableRoutes} lanes={global?lanes:[]} locations={LBL_LOCATIONS.filter(location=>labels.includes(location.id))}/>}
    {laneError&&<span className="lbl-map-notice">全球航道图层未载入 · 当前仅显示地理节点</span>}
  </div>;
}
