import type {ExpansionPresentation,PortExpansionPage} from '@edu/course-content';
// Page-specific spatial evidence: empty lanes, equipment connections and callouts
// are drawn explicitly so labels never substitute for the object being explained.
export function CargoSpace({page,state}:{page:PortExpansionPage;state:ExpansionPresentation}){
 const visible=(step:number)=>state.progress>=step?1:.18;
 if(page.slideKey==='l7-stockpile')return <g fontSize="28" fill="#234b57">
  <rect x="25" y="50" width="1390" height="370" fill="#e1e6d6"/>
  <path d="M100 318Q180 108 340 130Q450 111 540 318Z" fill="#769397" stroke="#315d69" strokeWidth="4"/>
  <g opacity={visible(.33)}><path d="M850 318Q940 123 1045 167Q1160 75 1310 318Z" fill="#b69367" stroke="#816b4d" strokeWidth="4"/></g>
  <g opacity={visible(.66)}><rect x="605" y="70" width="130" height="318" fill="#b7c4ae"/><path d="M670 85V373" stroke="#f6f3e1" strokeWidth="5" strokeDasharray="20 12"/><path d="M620 125L600 145M733 245L753 265" stroke="#3c7580" strokeWidth="5"/><text x="670" y="465" textAnchor="middle">隔离与作业通道</text></g>
  <text x="310" y="367" textAnchor="middle">品种A · 保留批次身份</text><text x="1070" y="367" textAnchor="middle">品种B · 避免混料</text>
  <path d="M120 496H1280" stroke="#4b858c" strokeWidth="5"/><path d="M1260 482L1284 496L1260 510" fill="none" stroke="#4b858c" strokeWidth="5"/><text x="110" y="540" fontSize="22">取料与外运路径示意 · 不表示实际隔离距离</text>
 </g>;
 if(page.slideKey==='l7-roro-yard')return <g fontSize="26" fill="#234b57">
  <rect x="30" y="35" width="1380" height="490" fill="#e3e7d8"/>
  <path d="M710 48V480H1320" fill="none" stroke="#9eafa0" strokeWidth="85"/><path d="M710 48V480H1320" fill="none" stroke="#f6f3df" strokeWidth="4" strokeDasharray="18 12"/>
  {[0,1,2,3,4,5,6,7].map(i=>{const x=i<4?130+(i%2)*230:920+(i%2)*230,y=110+Math.floor(i%4/2)*180;return <g key={i} opacity={visible(i<4?.25:.5)}><rect x={x-17} y={y-15} width="165" height="120" fill="none" stroke="#a9bba8" strokeWidth="3"/><rect x={x} y={y} width="130" height="78" rx="22" fill={i<4?'#609099':'#bc9764'}/><rect x={x+30} y={y+10} width="62" height="57" rx="12" fill="#d5e6dc"/><text x={x+65} y={y+138} textAnchor="middle">{i<4?'目的地A':'目的地B'}</text></g>})}
  <g opacity={visible(.75)}><path d="M480 175H670V480H1270" fill="none" stroke="#2f7f87" strokeWidth="6"/><path d="M1255 466L1278 480L1255 494" fill="none" stroke="#2f7f87" strokeWidth="6"/><text x="1320" y="552" textAnchor="end">交付出口 →</text><text x="710" y="29" textAnchor="middle">可通行通道</text></g>
 </g>;
 if(page.slideKey==='l7-reefer-object')return <g fontSize="28" fill="#234b57">
  <rect x="310" y="150" width="760" height="270" rx="7" fill="#e1e9dd" stroke="#3f7580" strokeWidth="5"/>{Array.from({length:14},(_,i)=><path key={i} d={`M${422+i*45} 168V400`} stroke="#aac5b9" strokeWidth="3"/>)}
  <rect x="310" y="150" width="94" height="270" fill="#8cb7b6" stroke="#3f7580" strokeWidth="4"/><circle cx="357" cy="242" r="29" fill="none" stroke="#3f7580" strokeWidth="5"/><path d="M335 330H380M335 350H380" stroke="#3f7580" strokeWidth="5"/>
  <text x="680" y="300" textAnchor="middle" fontSize="38">标准箱体 · 货物另有温控要求</text>
  <g opacity={visible(.33)}><path d="M340 419V464H132V299" fill="none" stroke="#b5854e" strokeWidth="8"/><rect x="83" y="211" width="95" height="90" fill="#285c69"/><path d="M118 228V250M145 228V250M118 250H145V272" stroke="#f1edce" strokeWidth="5" fill="none"/><text x="130" y="179" textAnchor="middle">供电接入</text></g>
  <g opacity={visible(.66)}><path d="M895 151V85H1190" fill="none" stroke="#5e918c" strokeWidth="4"/><rect x="1115" y="92" width="248" height="80" fill="#d6e1d1"/><text x="1239" y="142" textAnchor="middle">状态记录与监测</text><path d="M1070 385H1240V442" fill="none" stroke="#5e918c" strokeWidth="4"/><text x="1240" y="483" textAnchor="middle">下一程接续</text></g>
  <text x="310" y="536" fontSize="23">温控要求因货物而异 · 供电、监测与交接同时核查</text>
 </g>;
 return null;
}
export function WarehouseSite({state}:{state:ExpansionPresentation}){return <g fontSize="28" fill="#234b57">
 <rect x="25" y="30" width="1390" height="490" fill="#e4e8d9"/><path d="M45 450H1375" stroke="#91a69c" strokeWidth="56"/><path d="M45 450H1375" stroke="#f5f1df" strokeWidth="3" strokeDasharray="20 12"/>
 <path d="M240 192L490 80L740 192Z" fill="#a4b5a6" stroke="#496e72" strokeWidth="4"/><rect x="270" y="192" width="440" height="194" fill="#d2d5bb" stroke="#496e72" strokeWidth="4"/><rect x="398" y="242" width="185" height="144" fill="#75979a"/><text x="490" y="223" textAnchor="middle">既有仓库</text>
 <g opacity={state.option===1&&state.progress>.3?1:.13}><rect x="65" y="130" width="137" height="152" fill="#b88857"/><text x="133" y="323" textAnchor="middle">供电条件</text><path d="M202 180H270" stroke="#b88857" strokeWidth="9"/>{[0,1,2].map(i=><rect key={i} x={970+i*105} y={120-i%2*40} width="75" height={140+i%2*40} fill="#a9b29a"/>)}<text x="1110" y="304" textAnchor="middle">邻近社区</text><path d="M710 324H930V422" stroke="#367e87" strokeWidth="7" fill="none"/><text x="1060" y="409" textAnchor="middle">交通接入与影响</text></g>
 <text x="38" y="552" fontSize="23">虚构场地 · 面积充足不代表配套、许可与货源已经落实</text>
 </g>;}
