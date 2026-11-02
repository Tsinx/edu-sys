import {Bell,Menu,ShipWheel} from 'lucide-react';
import {SCENARIOS,type EnterpriseView} from '@edu/port-simulation-core';
import {wan} from './EnterpriseForms';
import {DIRECTOR_MODE_LABELS} from './enterprise-clock';
const menus=[['operations','经营'],['resources','资源'],['investment','建设'],['market','市场'],['funds','财务'],['reports','报告']] as const;
export function EnterpriseTopBar({v,navigate,attention,formal}:{v:EnterpriseView;navigate:(id:string)=>void;attention:number;formal:boolean}){
  return <header className="enterprise-game-hud enterprise-director-topbar"><div className="enterprise-director-brand"><ShipWheel size={25}/><div><h1>东湾港{formal&&<small>正式</small>}</h1><span>{SCENARIOS[v.config.scenario].name} · {v.config.years}年</span></div></div>
    <nav aria-label="总经理常用菜单">{menus.map(([id,label])=><button key={id} data-enterprise-control={'top-'+id} onClick={()=>navigate(id)} aria-label={label+'菜单'}>{label}<span aria-hidden="true">⌄</span></button>)}<button data-enterprise-control="hud-menu" onClick={()=>navigate('menu')} aria-label="全部经营菜单"><Menu size={17}/><span>全部</span></button></nav>
    <div className="enterprise-director-clock"><strong>{v.date}</strong><span>{v.finance.status==='bankrupt'?'经营失败':v.hour>=v.horizon?'经营期完成':DIRECTOR_MODE_LABELS[v.director.mode]}</span></div><div className="enterprise-director-cash" data-enterprise-control="summary"><span>可用现金</span><strong>{wan(v.cash)}</strong></div>
    <button className="enterprise-director-alerts" data-enterprise-control="hud-events" aria-label={'事件与待办'+(attention?'，'+attention+'项':'')} onClick={()=>navigate('events')}><Bell size={19}/>{attention>0&&<b>{attention}</b>}</button>
  </header>;
}
