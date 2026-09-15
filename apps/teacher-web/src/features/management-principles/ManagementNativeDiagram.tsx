import type {ManagementDiagram} from '@edu/course-content/management-principles';
type Node={id:string;label:string;x:number;y:number;w?:number};
type Edge={from:string;to:string;support?:boolean};
function Organization({nodes,edges}:{nodes:Node[];edges:Edge[]}){
 return <svg className="mg-native mg-native-org" viewBox="0 0 1440 410" role="img" aria-label="组织结构：实线为指挥或隶属，虚线为支持或协作"><g fill="none" stroke="#668879" strokeWidth="2">{edges.map((e,i)=>{const a=nodes.find(n=>n.id===e.from)!,b=nodes.find(n=>n.id===e.to)!;return <path key={i} d={`M${a.x} ${a.y+22} V${(a.y+b.y)/2} H${b.x} V${b.y-22}`} strokeDasharray={e.support?'8 6':undefined}/>;})}</g>{nodes.map(n=><g key={n.id}><rect x={n.x-(n.w??190)/2} y={n.y-23} width={n.w??190} height="46" rx="3" fill="#edf0e6" stroke="#8b9e87"/><text x={n.x} y={n.y+9} textAnchor="middle">{n.label}</text></g>)}<text x="1430" y="406" className="mg-native-caption" textAnchor="end">实线：指挥／隶属　虚线：支持／协作</text></svg>;
}
function org(variant?:string){
 const nodes:Node[]=[];const edges:Edge[]=[];
 const add=(id:string,label:string,x:number,y:number,parent?:string,support=false,w=190)=>{nodes.push({id,label,x,y,w});if(parent)edges.push({from:parent,to:id,support});};
 if(variant==='line'){
  add('top','厂长',720,35);[260,720,1180].forEach((x,i)=>{add(`c${i}`,`车间主任${i+1}`,x,140,'top');[-150,0,150].forEach((d,j)=>add(`g${i}${j}`,`班组长${j+1}`,x+d,275,`c${i}`,false,128));});
 }else if(variant==='club-innovation'){
  add('top','社长',720,30);add('assist','社长助理',300,80,'top',true);add('advisory','顾问团',1140,80,'top',true);add('left','副社长：会员传承',400,145,'top',false,300);add('right','副社长：项目',1090,145,'top',false,270);add('office','办公室',730,245,'top');['知识管理部','资深会员部','会员部'].forEach((x,i)=>add(`l${i}`,x,150+i*230,340,'left'));['重大项目部','项目部'].forEach((x,i)=>add(`r${i}`,x,990+i*245,340,'right'));
 }else if(variant==='club-base'){
  add('top','社长',720,30);add('v1','副社长',420,120,'top');add('v2','副社长',1060,120,'top');['项目部','外联部','宣传部'].forEach((x,i)=>add(`d${i}`,x,150+i*260,230,'v1'));['人力资源部','办公室'].forEach((x,i)=>add(`s${i}`,x,970+i*260,230,'v2'));add('a','项目组A',105,345,'d0',false,140);add('b','项目组B',285,345,'d0',false,140);
 }else if(variant==='division'){
  add('top','总经理',720,30);add('staff','办公室 · 财务 · 人力资源 · 投资',720,110,'top',true,650);['事业部A','事业部B','事业部C'].forEach((s,i)=>add(`d${i}`,s,280+i*440,210,'top'));
  ['工厂A','工厂B','技术部','销售部','采购部','管理部'].forEach((s,i)=>add(`b${i}`,s,140+i*230,325,'d1',false,160));
 }else if(variant==='functional'){
  add('top','厂长',720,30);add('f1','职能部室1',260,95,'top');add('f2','职能部室2',1180,95,'top');[250,720,1190].forEach((x,i)=>{add(`c${i}`,`车间主任${i+1}`,x,170,'top');edges.push({from:'f1',to:`c${i}`},{from:'f2',to:`c${i}`});});
  add('t1','职能组1',400,245,'c1');add('t2','职能组2',1040,245,'c1');[300,720,1140].forEach((x,i)=>{add(`g${i}`,`班组长${i+1}`,x,340,'c1');edges.push({from:'t1',to:`g${i}`},{from:'t2',to:`g${i}`});});
 }else{
  add('top','厂长',720,28);add('staff','财务科 · 技术科 · 供销科 · 人事科',720,108,'top',true,670);['一车间','二车间','三车间'].forEach((s,i)=>add(`c${i}`,s,270+i*450,200,'top'));
  add('support','材料室 · 质检室 · 保全室 · 技术室',720,270,'c1',true,670);['班组1','班组2','班组3'].forEach((s,i)=>add(`b${i}`,s,300+i*420,345,'c1'));
 }
 return <Organization nodes={nodes} edges={edges}/>;
}
export function ManagementNativeDiagram({value}:{value:ManagementDiagram}){
 const {kind,items,center}=value;
 if(kind==='org-chart')return org(value.variant);
 if(kind==='matrix')return <div className="mg-native-matrix"><div className="mg-matrix-cell">职能线 ↓ / 项目线 →</div>{items.map(x=><strong className="mg-matrix-cell" key={x}>{x}</strong>)}{(value.rows??[]).map(row=><div className="mg-matrix-row" key={row}><strong className="mg-matrix-cell">{row}</strong>{items.map(x=><span className="mg-matrix-cell" key={x}><i aria-label={`${row}与${x}的双重管理关系`}/></span>)}</div>)}<p>交点：专业资源参与项目，同时保留职能与项目责任关系。</p></div>;
 if(kind==='gantt')return <svg className="mg-native" viewBox="0 0 1440 320" role="img" aria-label="甘特图示意：实色为已完成，空白为尚未完成，时间未标定"><path d="M200 30V270H1380" stroke="#668879" fill="none"/>{items.map((x,i)=><g key={x}><text x="20" y={85+i*75}>{x}</text><rect x={240+i*170} y={52+i*75} width={600-i*80} height="42" fill="none" stroke="#668879" strokeWidth="2"/><rect x={240+i*170} y={52+i*75} width={[380,210,65][i]} height="42" fill="#789e87"/></g>)}<text x="1300" y="310">时间 →</text><text x="260" y="310">实色：已完成　空白：未完成（无数值刻度）</text></svg>;
 if(kind==='hierarchy'||kind==='culture-layers')return <div className={`mg-native-layers ${kind==='culture-layers'?'mg-native-layers--culture':''}`}><p>{center}</p>{items.map((x,i)=><div key={x} style={{width:`${100-i*10}%`}}><span>{String(i+1).padStart(2,'0')}</span><strong>{x}</strong></div>)}{kind==='hierarchy'&&<small>目标与措施向下展开；下层成果向上提供保证。</small>}</div>;
 if(kind==='fishbone')return <svg className="mg-native" viewBox="0 0 1440 340" role="img" aria-label="鱼刺图：四类待检验原因汇入问题"><path d="M80 170H1170" stroke="#668879" strokeWidth="3"/>{items.map((x,i)=>{const pos=260+(i%2)*450,upper=i<2;return <g key={x}><path d={`M${pos} ${upper?65:290} L${pos+150} 170`} stroke="#668879" strokeWidth="2" fill="none"/><text x={pos-80} y={upper?40:330}>{x}</text></g>;})}<rect x="1150" y="128" width="280" height="85" rx="4" fill="#e3e9db"/><text x="1290" y="179" textAnchor="middle">{center}</text></svg>;
 if(kind==='radar'){
  const xy=(i:number,r:number)=>[720+Math.sin(i*Math.PI*2/items.length)*r,180-Math.cos(i*Math.PI*2/items.length)*r];
  return <svg className="mg-native" viewBox="0 0 1440 380" role="img" aria-label="雷达图维度示意：空白坐标，没有实际经营数据">{[45,90,135].map(r=><polygon key={r} points={items.map((_,i)=>xy(i,r).join(',')).join(' ')} fill="none" stroke="#afbeaa"/>)}{items.map((x,i)=>{const p=xy(i,135),t=xy(i,175);return <g key={x}><path d={`M720 180L${p[0]} ${p[1]}`} stroke="#75917f"/><text x={t[0]} y={t[1]!+9} textAnchor="middle">{x}</text></g>;})}<text x="1150" y="340" className="mg-native-caption">各维度需统一尺度后再比较</text></svg>;
 }
 if(kind==='orbit')return <div className="mg-native-orbit"><strong>{center}</strong><div>{items.map(x=><span key={x}>{x}</span>)}</div></div>;
 if(kind==='cpm'){
  const ns=[['A',5,100,170],['B',2,340,60],['C',8,340,270],['D',10,620,90],['E',5,620,290],['F',10,940,50],['G',11,940,240],['H',10,1280,160]] as const;
  const links=[['A','B'],['A','C'],['B','D'],['C','D'],['C','E'],['D','F'],['D','G'],['E','G'],['F','H'],['G','H']];
  const critical=new Set(['AC','CD','DG','GH']);
  return <svg className="mg-native" viewBox="0 0 1440 385" role="img" aria-label="原CPM工作依赖网络，关键路径A C D G H，总工期44"><defs><marker id="mg-cpm-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0 0L7 3L0 6Z" fill="#668879"/></marker></defs>{links.map(([a,b])=>{const f=ns.find(n=>n[0]===a)!,t=ns.find(n=>n[0]===b)!;return <path key={a!+b} d={`M${f[2]+65} ${f[3]}L${t[2]-66} ${t[3]}`} fill="none" stroke={critical.has(a!+b)?'#ab864d':'#668879'} strokeWidth={critical.has(a!+b)?4:2} markerEnd="url(#mg-cpm-arrow)"/>;})}{ns.map(([id,d,x,y])=><g key={id}><rect x={x-65} y={y-28} width="130" height="56" rx="4" fill="#edf0e6" stroke="#86997e"/><text x={x} y={y+10} textAnchor="middle">{id} · {d}</text></g>)}<text x="80" y="375">节点：工作 · 持续时间　金线：关键路径　总工期44（原教学单位）</text></svg>;
 }
 return null;
}
