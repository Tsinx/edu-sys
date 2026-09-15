import { useEffect, useRef, useState } from "react";
import { portNavigationPose, portNavigationProfile, type PortView } from "@edu/port-simulation-core";

export function PortNavigationReadout({ship,view,speed}:{ship:PortView["vessels"][number];view:PortView;speed:number}) {
  const anchor=useRef({view,wall:performance.now()});
  if(anchor.current.view!==view)anchor.current={view,wall:performance.now()};
  const [,refresh]=useState(0);
  useEffect(()=>{if(view.status!=="running"||!ship.call.move?.navigation)return;const id=setInterval(()=>refresh(n=>n+1),200);return()=>clearInterval(id);},[view.status,!!ship.call.move?.navigation]);
  if(view.schema==="port-operations/3.0")return <p className="port-advice">本记录沿用 3.0 通航规则。</p>;
  const profile=portNavigationProfile(ship.large),move=ship.call.move;
  const second=view.second+(view.status==="running"?Math.min(30,(performance.now()-anchor.current.wall)/1000*(view.mode==="battle"?60:speed)):0);
  const pose=move?.navigation?portNavigationPose(move.navigation,second-move.start):null;
  const heading=pose?((90+pose.heading*180/Math.PI)%360+360)%360:90;
  return <section className="port-navigation-readout" data-tutorial-target="navigation-status" aria-label="船舶航行状态">
    <strong>{pose?.phase ?? (ship.call.stage==="mooring"?"已停稳 · 等待系泊":ship.call.stage==="unmooring"?"解缆准备":"等待航行任务")}</strong>
    <dl><div><dt>当前航速</dt><dd>{(pose?.speedKnots??0).toFixed(2)} 节</dd></div><div><dt>船头朝向</dt><dd>{heading.toFixed(0)}°</dd></div><div><dt>当前转弯半径</dt><dd>{pose?.radiusMetres?`${pose.radiusMetres.toFixed(0)} 米`:"直行 / 靠离泊"}</dd></div><div><dt>剩余通航时间</dt><dd>{pose?`${Math.ceil(pose.remaining/60)} 分钟`:"—"}</dd></div></dl>
    <small>蓝色虚线为实际航线 · 船舶自动航行</small>
    <details><summary>查看本船教学参数</summary><p>港外 {profile.outerKnots} 节 · 港内 {profile.innerKnots} 节 · 弯道 ≤ 2 节 · 辅助靠离泊 ≤ 0.3 节</p><p>最小转弯半径 {profile.radiusMetres} 米；加速 {profile.acceleration}、减速 {profile.deceleration} 米/秒²。</p><small>每场景单位 2 米；参数为教学假设。</small></details>
  </section>;
}
