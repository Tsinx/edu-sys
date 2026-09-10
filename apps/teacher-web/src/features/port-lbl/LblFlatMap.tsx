import type { GlobeCoordinate, GlobeLocation, GlobeRoute, GlobeShippingLanePath } from "../globe/InteractiveEarthGlobe";

/** Local, vector route fallback. Its camera uses the same geographic centre. */
export function LblFlatMap({camera,routes,lanes,locations}:{camera:GlobeCoordinate&{distance:number};routes:readonly GlobeRoute[];lanes:readonly GlobeShippingLanePath[];locations:readonly GlobeLocation[]}){
  const span=Math.min(360,Math.max(28,(camera.distance-1)*140));
  const unit=1000/span;
  const x=(longitude:number)=>500+(((longitude-camera.longitude+540)%360)-180)*unit;
  const y=(latitude:number)=>300+(camera.latitude-latitude)*unit;
  const line=(points:readonly GlobeCoordinate[])=>points.map((point,index)=>{
    const previous=points[index-1];
    const move=!previous||Math.abs(x(point.longitude)-x(previous.longitude))>180*unit;
    return `${move?"M":"L"}${x(point.longitude).toFixed(2)},${y(point.latitude).toFixed(2)}`;
  }).join(" ");
  const imageX=500+(-180-camera.longitude)*unit;
  return <svg className="lbl-flat-map" viewBox="0 0 1000 600" role="img" aria-label="平面地图上的运输路线与地理节点">
    <rect width="1000" height="600" fill="#09141e"/>
    <image href="/globe-assets/earth-bmng-200412-8192.webp" x={imageX-360*unit} y={y(90)} width={360*unit} height={180*unit} opacity=".75"/>
    <image href="/globe-assets/earth-bmng-200412-8192.webp" x={imageX} y={y(90)} width={360*unit} height={180*unit} opacity=".75"/>
    <image href="/globe-assets/earth-bmng-200412-8192.webp" x={imageX+360*unit} y={y(90)} width={360*unit} height={180*unit} opacity=".75"/>
    {lanes.map(lane=><path key={lane.id} d={line(lane.points)} fill="none" stroke="#6dcddd" strokeWidth="1.2" opacity=".45"/>)}
    {routes.map(route=><path key={route.id} d={line(route.points)} fill="none" stroke={route.color??"#6dcddd"} strokeWidth="2.4"/>)}
    {locations.map(location=><g key={location.id} transform={`translate(${x(location.longitude)},${y(location.latitude)})`}><circle r="3" fill="#f5d19b"/><text y="-10" textAnchor="middle" fontSize="16" fill="#f3eee2" stroke="#09141e" strokeWidth="4" paintOrder="stroke">{location.name}</text></g>)}
    <text x="24" y="575" fontSize="14" fill="#c4d5da">平面航线图 · 地理示意</text>
  </svg>;
}
