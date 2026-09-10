import { useEffect, useRef, useState } from "react";
import { createPortProcessScene, type PortProcessKind } from "./port-process-scene";
import { useLblPlayback, phase } from "./PortLblPrimitives";

const stages:Record<PortProcessKind,readonly string[]>={
  gate:["车辆到达","交接核对","进入作业区"],
  load:["吊具对位","垂直起升","小车横移","落箱与脱钩"],
  unload:["船上抓取","垂直起升","移向岸侧","交给车辆"],
  transport:["岸边接箱","车辆运送","堆场交接"],
  rehandle:["识别上层箱","移开上层箱","吊具返回","提取目标箱"],
  relay:["车辆衔接","抓取与提升","岸桥横移","船上落位"],
  lock:["进入闸室","关闭上游闸门","闸室降水","开门驶出"],
  bulk:["堆场取料","连续输送","进入船舱"],
  coal:["堆存缓冲","取料与输送","衔接后方需求"],
  grain:["筒仓储存","封闭输送衔接","装船接口"],
  oil:["船岸连接","沿管线输送","储罐接收"],
  lng:["专用船岸连接","低温输送","专用储罐接收"],
  roro:["停车区集结","驶过跳板","进入船内甲板"],
  heavy:["吊点连接","构件起升","平稳横移","落位交接"]
};

function ProcessFallback({kind,progress}:{kind:PortProcessKind;progress:number}){
  const labels=stages[kind];const p=kind==="unload"?1-progress:progress;const lift=phase(p,.15,.35)-phase(p,.7,.9);
  const liquid=kind==="oil"||kind==="lng";const dry=["bulk","coal","grain"].includes(kind);
  const cargo=(x:number,y:number,color="#4094a6")=><g transform={`translate(${x} ${y})`}><rect width="140" height="60" fill={color}/>{Array.from({length:12},(_,i)=><path key={i} d={`M${9+i*11} 5V55`} stroke="#a2c3c2" strokeWidth="2"/>)}</g>;
  return <svg viewBox="0 0 1460 520" className="lbl-process-fallback" role="img" aria-label={`${labels.join("、")}的平面工艺示意`}>
    <defs><linearGradient id={`process-water-${kind}`} x2="0" y2="1"><stop stopColor="#246c7d"/><stop offset="1" stopColor="#0c3044"/></linearGradient></defs>
    <path d="M0 360H1460V520H0Z" fill={`url(#process-water-${kind})`}/><path d="M0 345H660V520H0Z" fill="#586d70"/>
    {labels.map((label,i)=><g key={label}><circle cx={180+i*1100/(labels.length-1)} cy="100" r="22" fill={progress>=i/labels.length?"#dbb573":"#365461"}/><text x={180+i*1100/(labels.length-1)} y="154" textAnchor="middle" fill="#e0e8df" fontSize="25">{label}</text></g>)}
    <path d="M180 100H1280" stroke="#7cc5ce" strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={1-progress}/>
    {["load","unload","heavy","relay"].includes(kind)?<>
      <path d="M490 345V190H1150M565 345V190" fill="none" stroke="#d3af71" strokeWidth="13"/>
      <path d="M860 364H1340L1260 430H920Z" fill="#7c9d9d"/>
      <g transform={`translate(${270+700*phase(p,.36,.67)} ${300-90*lift})`}><path d={`M0 ${190-(300-90*lift)}V0M130 ${190-(300-90*lift)}V0`} stroke="#bbc8bc" strokeWidth="2"/>{kind==="heavy"?<><rect x="-8" y="7" width="155" height="42" rx="21" fill="#b8c6c0"/><path d="M20 0L35 45M110 0L95 45" stroke="#d3b574" strokeWidth="4"/></>:cargo(0,0)}</g>
    </>:kind==="lock"?<>
      <path d="M100 440H1360" stroke="#a7b8ad" strokeWidth="18"/>
      <path d="M100 275H445V435H100Z M1015 375H1360V435H1015Z" fill="#338ba0"/>
      <rect x="445" y={275+100*phase(p,.4,.68)} width="570" height={160-100*phase(p,.4,.68)} fill="#55afbe"/>
      <path d={`M445 ${250+190*(1-phase(p,.23,.33))}V440 M1015 ${250+190*phase(p,.73,.83)}V440`} stroke="#d4bd89" strokeWidth="13"/>
      <g transform={`translate(${160+450*phase(p,0,.2)+520*phase(p,.84,1)} ${250+100*phase(p,.4,.68)})`}><path d="M0 0H150L125 30H18Z" fill="#d2dad2"/><rect x="15" y="-27" width="95" height="27" fill="#6b9caa"/></g>
    </>:kind==="rehandle"?<>
      <path d="M180 420H1300" stroke="#a7b8ad" strokeWidth="10"/>{cargo(350,355-120*phase(p,.8,.97))}{cargo(350+650*phase(p,.22,.4),295-90*phase(p,.04,.19)+150*phase(p,.43,.57),"#b68e50")}
      <path d="M310 215H1230" stroke="#d2b779" strokeWidth="8"/>
    </>:liquid?<>
      <path d="M120 360H580L525 415H165Z" fill="#a0b5b4"/>
      {[950,1190].map(x=><g key={x}><rect x={x} y="242" width="160" height="148" fill="#a7beb6"/><ellipse cx={x+80} cy="242" rx="80" ry="22" fill="#d3dacf"/></g>)}
      <path d="M375 339V248H700V405H1270V370" fill="none" stroke="#c8ad75" strokeWidth="8"/>
      <path d="M375 339V248H700V405H1270V370" fill="none" stroke="#ffe3a0" strokeWidth="10" strokeDasharray="3 50" strokeDashoffset={-progress*600}/>
    </>:dry?<>
      {kind==="grain"?<g fill="#bccdc1"><rect x="140" y="220" width="130" height="170" rx="25"/><rect x="285" y="220" width="130" height="170" rx="25"/></g>:<path d="M100 400L265 235L420 400M275 400L455 252L640 400" fill="#838579"/>}
      <path d="M300 325L690 225H1160V360" fill="none" stroke="#c9ae74" strokeWidth="12"/>
      <path d="M300 325L690 225H1160V360" fill="none" stroke="#eee0b5" strokeWidth="8" strokeDasharray="3 23" strokeDashoffset={-progress*400}/>
      {kind==="coal"?<><path d="M1040 440V360L1170 310L1340 360V440Z" fill="#879f97"/><text x="1110" y="417" fill="#172f3a" fontSize="23">后方接运</text></>:<path d="M915 390H1350L1300 440H965Z" fill="#779ca1"/>}
    </>:kind==="roro"?<>
      <path d="M960 290H1370V415H1030Z" fill="#bbc7c0"/><path d="M290 385H720L1060 320" stroke="#d4b47b" strokeWidth="14" fill="none"/>
      {[0,.18,.36].map((delay,i)=>{const t=Math.max(0,p-delay);return <g key={i} transform={`translate(${220+850*t} ${350-65*phase(t,.5,.9)})`}><rect width="65" height="27" rx="6" fill="#cee0d9"/><circle cx="14" cy="30" r="9" fill="#132d38"/><circle cx="52" cy="30" r="9" fill="#132d38"/></g>;})}
    </>:<>
      <path d="M100 385H1360" stroke="#bac5bc" strokeWidth="6" strokeDasharray="24 16"/>
      <g transform={`translate(${160+1050*phase(p,.1,.9)} 275)`}>{cargo(0,0)}<rect x="145" y="28" width="45" height="42" fill="#d8e0ce"/><path d="M0 65H190" stroke="#d5b779" strokeWidth="12"/><circle cx="20" cy="78" r="15" fill="#122732"/><circle cx="167" cy="78" r="15" fill="#122732"/></g>
    </>}
    <text x="40" y="487" fill="#b7ccc9" fontSize="20">平面工艺示意</text>
  </svg>;
}

export function PortProcessScene({kind,label}:{kind:PortProcessKind;label:string}){
  const {progress,reducedMotion}=useLblPlayback();
  const canvas=useRef<HTMLCanvasElement>(null);
  const engine=useRef<ReturnType<typeof createPortProcessScene>|null>(null);
  const current=useRef(progress);current.current=progress;
  const [status,setStatus]=useState<"loading"|"ready"|"fallback">("loading");
  useEffect(()=>{
    const node=canvas.current;if(!node)return;
    let active=true;
    const lost=(event:Event)=>{event.preventDefault();if(active)setStatus("fallback");};
    node.addEventListener("webglcontextlost",lost);
    try{engine.current=createPortProcessScene(node,kind,1460,520);engine.current.update(current.current);setStatus("ready");}
    catch{engine.current?.dispose();engine.current=null;setStatus("fallback");}
    return()=>{active=false;node.removeEventListener("webglcontextlost",lost);engine.current?.dispose();engine.current=null;};
  },[kind]);
  useEffect(()=>{if(status==="ready")engine.current?.update(progress);},[progress,status,reducedMotion]);
  const labels=stages[kind];const index=Math.min(labels.length-1,Math.floor(progress*labels.length));
  return <>
    <div className="lbl-process-scene" data-render-state={status} role="img" aria-label={label}>
      {status!=="ready"&&<ProcessFallback kind={kind} progress={progress}/>}
      <canvas ref={canvas} style={{visibility:status==="ready"?"visible":"hidden"}} aria-hidden="true"/>
    </div>
    <div className="lbl-process-timeline" aria-label="当前工艺阶段">
      {labels.map((text,i)=><span key={text} className={i===index?"is-current":i<index?"is-complete":""}><b>{String(i+1).padStart(2,"0")}</b>{text}</span>)}
    </div>
  </>;
}
