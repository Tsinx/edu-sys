import type {GlobeLocation,GlobeRoute} from '../globe/InteractiveEarthGlobe';
type Place={name:string;lon:number;lat:number;dx?:number;dy?:number};
export const places:Record<string,Place>={
  ocean:{name:'远洋网络',lon:139,lat:25},
  dalian:{name:'大连',lon:121.65,lat:38.92},fuzhou:{name:'福州',lon:119.5,lat:26},guangzhou:{name:'广州',lon:113.6,lat:22.9},zhanjiang:{name:'湛江',lon:110.4,lat:21.2},
  shanghai:{name:'上海',lon:121.5,lat:31.2,dx:15,dy:-12},ningbo:{name:'宁波舟山',lon:122,lat:29.8,dx:20,dy:27},chongqing:{name:'重庆果园港',lon:106.8,lat:29.6,dx:-85,dy:35},
  wuhan:{name:'武汉',lon:114.3,lat:30.6,dx:-30,dy:32},nanjing:{name:'南京',lon:118.8,lat:32,dx:-70,dy:-16},hefei:{name:'合肥',lon:117.25,lat:31.85,dx:-72,dy:28},
  yiwu:{name:'义乌',lon:120.1,lat:29.3,dx:-50,dy:42},pingyu:{name:'平舆',lon:114.6,lat:33,dx:-32,dy:-20},tianjin:{name:'天津',lon:117.7,lat:39,dx:20,dy:-5},
  beijing:{name:'北京',lon:116.4,lat:39.9,dx:-80,dy:-20},hohhot:{name:'呼和浩特',lon:111.7,lat:40.8,dx:-95,dy:-25},qingdao:{name:'青岛',lon:120.2,lat:36,dx:20,dy:0},
  xian:{name:'西安',lon:108.9,lat:34.3,dx:-30,dy:-24},taiyuan:{name:'太原',lon:112.55,lat:37.87,dx:-40,dy:-25},chengdu:{name:'成都',lon:104.1,lat:30.7,dx:-50,dy:-17},
  shuifu:{name:'水富',lon:104.4,lat:28.6,dx:-72,dy:30},xiamen:{name:'厦门',lon:118.1,lat:24.5,dx:24,dy:0},shenzhen:{name:'深圳',lon:114.1,lat:22.5,dx:18,dy:35},qinzhou:{name:'北部湾',lon:108.6,lat:21.7,dx:-108,dy:-18}
};

export const gateways=new Set(['shanghai','ningbo','chongqing','tianjin','qingdao','xiamen','shenzhen','qinzhou','dalian','fuzhou','guangzhou','zhanjiang']);
export function getLessonSixGeography(n:number,option=0){
  let ids=['chongqing','wuhan','shanghai'],links:string[][]=[['chongqing','wuhan','nanjing','shanghai']];
  if(n===26){ids=['tianjin','shanghai','xiamen','shenzhen','qinzhou'];links=[];}
  if(n===27){ids=['shanghai','nanjing','wuhan','chongqing'];links=[['shanghai','nanjing','wuhan','chongqing']];}
  if(n===29){ids=['hefei','shanghai','ningbo'];links=option===0?[['hefei','shanghai']]:[['hefei','shanghai'],['hefei','ningbo']];}
  if(n===31||n===33&&option===0){ids=['shanghai','nanjing','hefei','wuhan'];links=[['wuhan','nanjing','shanghai'],['hefei','nanjing']];}
  if(n===32||n===33&&option===1){ids=['ningbo','pingyu','yiwu'];links=[['pingyu','ningbo'],['yiwu','ningbo']];}
  if(n===34){ids=['chongqing','chengdu','shuifu','xian'];links=[['shuifu','chongqing'],['chengdu','chongqing'],['xian','chongqing']];}
  if(n===35){ids=['chongqing','wuhan','nanjing','shanghai'];links=[ids];}
  if(n===36){ids=['tianjin','beijing','hohhot'];links=[['beijing','tianjin'],['hohhot','tianjin']];}
  if(n===37){ids=['qingdao','xian','taiyuan'];links=[['xian','qingdao'],['taiyuan','qingdao']];}
  if(n===38){ids=['chongqing','qingdao','shanghai','ningbo'];links=[];}
  // Regional examples get their own geographic extent, keeping the actual node coordinates.
  const bounds=n===29?[113,125,26,35]:n===31||n===33&&option===0?[110,125,26,36]:n===32||n===33&&option===1?[110,125,25,37]:n===34?[100,113,25,37]:n===36?[105,124,33,45]:n===37?[103,125,30,42]:[97,130,18,44];

  return {ids,links,bounds};
}

const labelOffsets:Record<string,readonly [number,number]>={
  chongqing:[-50,30],wuhan:[-12,-22],hefei:[-18,32],nanjing:[0,-25],shanghai:[40,0],ningbo:[52,32],yiwu:[-28,40],pingyu:[-25,-18],
  beijing:[-35,-30],tianjin:[35,0],hohhot:[-30,-24],dalian:[45,0],qingdao:[35,0],fuzhou:[35,-15],xiamen:[40,12],guangzhou:[-40,-25],shenzhen:[40,25],zhanjiang:[35,22],qinzhou:[-45,0]
};
export const LESSON_SIX_GLOBE_LOCATIONS:readonly GlobeLocation[]=Object.entries(places).map(([id,p])=>({id,name:p.name,latitude:p.lat,longitude:p.lon,kind:gateways.has(id)?'port':'city',showLabel:true,visibilityScope:'all',color:gateways.has(id)?'#80c7ce':'#edc482',presentationLabelOffset:labelOffsets[id]}));
export const LESSON_SIX_QUIZ_LOCATIONS:readonly GlobeLocation[]=LESSON_SIX_GLOBE_LOCATIONS.map(p=>({...p,name:p.id==='chongqing'?'①':p.id==='qingdao'?'②':'③'}));
export function routeId(ids:string[]){return ids.join('--');}
const routeMap=new Map<string,GlobeRoute>();
for(const n of [25,26,27,29,31,32,33,34,35,36,37,38])for(const option of [0,1])for(const ids of getLessonSixGeography(n,option).links){
 const water=[25,27,31,35].includes(n)||(n===33&&option===0)||(n===34&&ids[0]==='shuifu');
 routeMap.set(routeId(ids),{id:routeId(ids),label:'运输联系示意',points:ids.map(id=>({latitude:places[id]!.lat,longitude:places[id]!.lon})),color:water?'#80c7ce':'#edc482',animated:false,interpolation:'piecewise-geodesic'});
}
routeMap.set('hefei--shanghai',{id:'hefei--shanghai',label:'陆向联系示意',points:['hefei','shanghai'].map(id=>({latitude:places[id]!.lat,longitude:places[id]!.lon})),color:'#edc482',animated:false,interpolation:'piecewise-geodesic'});
routeMap.set('shanghai--ocean',{id:'shanghai--ocean',label:'接入远洋网络示意',points:['shanghai','ocean'].map(id=>({latitude:places[id]!.lat,longitude:places[id]!.lon})),color:'#80c7ce',animated:false,interpolation:'piecewise-geodesic'});
export const LESSON_SIX_GLOBE_ROUTES=Array.from(routeMap.values());
export function lessonSixCamera(n:number,option=0){
 const [west,east,south,north]=getLessonSixGeography(n,option).bounds as [number,number,number,number];
 return {latitude:(south+north)/2,longitude:(west+east)/2,distance:n===29?1.55:n>=31&&n<=37?(n===35?1.95:1.55):2.05};
}
