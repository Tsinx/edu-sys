import type { CSSProperties, ReactNode } from 'react';
import { getPortLessonFourDemo, type PortLessonFourPage, type PortDemoCueId } from '@edu/course-content';

const asset=(name:string)=>`/course-assets/port-management/l4/${name}-v1.png`;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const at=(p:number,i:number,n:number)=>clamp(p*n-i+1);
function Photo({name,x=0,y=0,w=1600,h=1000,opacity=1,fit='cover'}:{name:string;x?:number;y?:number;w?:number;h?:number;opacity?:number;fit?:'cover'|'contain'}) {
  return <img className="l4-photo" src={asset(name)} alt="" draggable={false} style={{left:x,top:y,width:w,height:h,opacity,objectFit:fit}}/>;
}
function Text({x,y,w=600,size=30,children,tone,className='',style={}}:{x:number;y:number;w?:number;size?:number;children:ReactNode;tone?:string;className?:string;style?:CSSProperties}) {
  return <div className={`l4-text ${className}`} style={{left:x,top:y,width:w,fontSize:size,color:tone,...style}}>{children}</div>;
}
function Diagram({children,label,y=390,h=450}:{children:ReactNode;label:string;y?:number;h?:number}) {
  return <svg className="l4-diagram" style={{top:y,height:h}} viewBox={`0 0 1440 ${h}`} role="img" aria-label={label}>{children}</svg>;
}
function Box({x,y,color='#49a6af',scale=1}:{x:number;y:number;color?:string;scale?:number}) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 0l23-17h88l-23 17Z" fill={color} opacity=".7"/><path d="M88 0l23-17v49L88 49Z" fill={color} opacity=".55"/><rect width="88" height="49" fill={color}/>{[10,23,36,49,62,75].map(a=><path key={a} d={`M${a} 7v35`} stroke="#102d3b" opacity=".25"/>)}</g>;
}
function Ship({x,y,scale=1}:{x:number;y:number;scale?:number}) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 22h164l-26 40H25Z" fill="currentColor"/><rect x="15" y="-13" width="25" height="35" fill="currentColor"/><rect x="49" y="-7" width="94" height="27" fill="#54a6ad"/><path d="M72-7v27m24-27v27m24-27v27" stroke="#163644" strokeWidth="3"/></g>;
}
function LineRows({points,x=80,y=380,w=1360,gap=105,p=1}:{points:readonly string[];x?:number;y?:number;w?:number;gap?:number;p?:number}) {
  return <>{points.map((s,i)=><Text key={s} x={x} y={y+i*gap} w={w} size={33} style={{opacity:at(p,i,points.length)}} className="l4-lined-row"><span className="l4-row-number">{String(i+1).padStart(2,'0')}</span>{s}</Text>)}</>;
}
function Route({points,p,reverse=false,object="box"}:{points:readonly string[];p:number;reverse?:boolean;object?:"box"|"ship"}) {
  const n=points.length;const distance=1160;const x=reverse?1280-distance*p:120+distance*p;
  return <Diagram label={points.join('，')} y={530} h={320}><path d="M120 122H1280" stroke="currentColor" opacity=".23" strokeWidth="3"/>
    <path d={reverse?'M1280 122H120':'M120 122H1280'} stroke={reverse?'#dab174':'#56b8c3'} strokeWidth="5" fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p}/>
    {object==="ship"?<Ship x={x-75} y={51} scale={.9}/>:<Box x={x-44} y={60} color={reverse?'#c99a60':'#4daab7'}/>}
    {points.map((s,i)=>{const px=120+i*distance/(n-1);return <g key={s} opacity={at(p,reverse?n-i-1:i,n)*.75+.25}><circle cx={px} cy="122" r="8" fill={reverse?'#d0a269':'#4daab7'}/><text x={px} y="187" textAnchor="middle" fontSize="29" fill="currentColor">{s}</text></g>;})}
  </Diagram>;
}
function Harbor({p,labels}:{p:number;labels:readonly string[]}) {
  return <Diagram label="海侧、堆场与陆侧的接续关系" y={420} h={460}>
    <path d="M0 315H1440V460H0Z" fill="#286072" opacity=".15"/>
    <path d="M0 315H1440" stroke="#cbaa6d" strokeWidth="5"/>
    <Ship x={140} y={300} scale={1.7}/>
    <g stroke="currentColor" strokeWidth="6" fill="none"><path d="M380 307V120H590M380 145l120 162M590 120v180"/><path d="M340 307l40-160"/></g>
    {[0,1,2].map(i=><Box key={i} x={730+i*140} y={200} color={i===1?'#c8a474':'#52949d'}/>)}
    <path d="M1260 310V198h110v112" fill="none" stroke="currentColor" strokeWidth="9"/>
    <path d="M540 270H1310" stroke="#4b9eab" strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p}/>
    <Box x={520+p*720} y={252} scale={.55}/>
    {labels.map((s,i)=><g key={s} opacity={at(p,i,3)}><path d={`M${270+i*480} 90v45`} stroke="currentColor" opacity=".4"/><text x={270+i*480} y="65" textAnchor="middle" fill="currentColor" fontSize="31">{s}</text></g>)}
  </Diagram>;
}

export function PortLessonFourComposition({page,p,readOnly,onOpen}:{page:PortLessonFourPage;p:number;readOnly:boolean;onOpen?:(cueId:PortDemoCueId)=>void}) {
  const n=page.localPage;
  const image=page.image;
  const points=page.points;
  const photoScene=[1,2,6,10,19,25,26,30,33,35,44].includes(n);
  const paper=[4,5,7,8,12,13,14,17,18,21,22,23,24,28,32,36,38,39,40,41,42].includes(n);
  const narrowHeading=photoScene||[11,20,31].includes(n);
  const content=(()=>{
    switch(n){
      case 1:return <><Text x={84} y={710} size={27} tone="#d8b176">S01 / 一艘船的港内接力</Text><Text x={84} y={764} w={830} size={29}>{points.join('　／　')}</Text></>;
      case 2:return <><Text x={84} y={650} size={126} tone="#dbb273">？</Text><Text x={240} y={730} size={29}>{points.join('　')}</Text></>;
      case 3:return <Harbor p={p} labels={points}/>;
      case 4:return <><Photo name={image} x={620} y={380} w={930} h={490} fit="contain"/><Text x={86} y={382} size={134} tone="#258797">116<span className="l4-unit">箱进口</span></Text><Text x={86} y={568} size={116} tone="#b18c58">78<span className="l4-unit">箱出口</span></Text><Diagram label="进口向陆侧，出口向船舶" y={460} h={270}>{[0,1].map(i=>{const t=at(p,i,2),y=50+i*160;return <g key={i} opacity={t}><path d={i?`M425 ${y}h295l-16-12m16 12l-16 12`:`M720 ${y}H425l16-12m-16 12l16 12`} stroke={i?"#b18c58":"#258797"} strokeWidth="3" fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={1-t}/><Box x={i?425+240*t:665-240*t} y={y-36} scale={.48} color={i?"#b18c58":"#258797"}/></g>;})}</Diagram><Text x={640} y={808} w={800} size={26} style={{opacity:at(p,1,2)}}>{points[0]}<br/>{points[1]}</Text></>;
      case 5:return <><Photo name={image} x={970} y={340} w={545} h={508}/><LineRows points={points} w={825} y={400} gap={140}/></>;
      case 6:return <Text x={84} y={762} w={850} size={31}><span className="l4-accent">港外到达</span>　→　可进入　→　靠妥</Text>;
      case 7:return <><Diagram label="提交与回执是不同事件" y={420} h={340}><path d="M70 80H250V230H70Z M70 80l90 90 90-90" fill="none" stroke="#258797" strokeWidth="5"/><path d="M350 155H1100" stroke="#258797" strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p}/><path d="M1140 65h190v190h-190Z" fill="none" stroke="currentColor" strokeWidth="4" opacity={at(p,2,3)}/><path d="M1190 160l35 35 62-85" fill="none" stroke="#258797" strokeWidth="7" opacity={at(p,2,3)}/>{points.map((s,i)=><text key={s} x={160+i*535} y="310" fill="currentColor" textAnchor="middle" fontSize="32" opacity={at(p,i,3)}>{s}</text>)}</Diagram><Text x={445} y={575} w={600} size={30}>资料已发出，不等于回执已有效</Text></>;
      case 8:return <><Photo name={image} x={750} y={420} w={770} h={410}/><LineRows points={points} x={90} y={385} w={610} gap={106} p={p}/></>;
      case 9:return <><Photo name={image} x={830} y={0} w={770} h={1000} opacity={.3}/><Route points={points} p={p} object="ship"/><Text x={85} y={406} size={32} tone="#d8b176">预留 ≠ 占用 ≠ 靠妥</Text></>;
      case 10:case 19:case 30:case 35:{const cue=getPortLessonFourDemo(page.demoCue!)!;return <><div className="l4-observations">{points.map((s,i)=><p key={s}><span>{String(i+1).padStart(2,'0')}</span>{s}</p>)}</div><div className="l4-entry-line" aria-hidden="true"><i/></div>{!readOnly&&onOpen?<button className="l4-scene-entry" onClick={()=>onOpen(cue.cueId)}><span>{cue.entryLabel}</span><b aria-hidden="true">↗</b><small>三维现场</small></button>:<Text x={1060} y={781} w={440} size={30} tone="#e2bd82">{cue.name} · 现场观察</Text>}</>;}
      case 11:case 20:case 31:return <><Photo name={image} x={0} y={0} w={565} h={1000}/><div className="l4-task-shade"/><Text x={76} y={590} size={170} tone="#e4bf83">{n===11?'07':n===20?'10':'08'}<span className="l4-unit">分钟</span></Text><LineRows points={points} x={660} y={430} w={840} gap={134}/><Text x={660} y={853} size={25} tone="#99c4c7">自主练习 · 保留本段记录</Text></>;
      case 12:return <><Photo name={image} x={1120} y={360} w={395} h={470}/><LineRows points={points} y={392} w={975} gap={109} p={p}/></>;
      case 13:return <><Photo name={image} x={890} y={365} w={626} h={470}/><Text x={85} y={389} size={106} tone="#267e8d">S01</Text><Text x={85} y={522} size={66}>已靠妥</Text><Text x={85} y={664} w={730} size={31} className="l4-lined-row">依据：实际状态记录</Text></>;
      case 14:return <><Diagram label="入港条件交给装卸环节" y={417} h={300}><Ship x={30} y={80} scale={1.6}/><path d="M350 125H1340" stroke="#3395a2" strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1-p}/>{[600,950,1300].map((x,i)=><g key={x} opacity={at(p,i,3)}><circle cx={x} cy="125" r="12" fill="#c49d66"/><text x={x} y="206" fontSize="30" textAnchor="middle" fill="currentColor">{['货批','堆场','设备与岗位'][i]}</text></g>)}</Diagram><Text x={90} y={785} w={1300} size={33}>交出的不是一句“完成”，而是下一环节能够使用的条件。</Text></>;
      case 15:return <><Photo name={image} x={760} y={0} w={840} h={1000}/><div className="l4-right-shade"/><Text x={85} y={503} size={116} tone="#62bfcb">116<small className="l4-unit">进口卸船</small></Text><Text x={85} y={694} size={104} tone="#dfb477">78<small className="l4-unit">出口装船</small></Text></>;
      case 16:return <><Photo name={image} x={865} y={0} w={735} h={515} opacity={.62}/><Route points={points} p={p}/></>;
      case 17:return <><Photo name={image} x={925} y={66} w={595} h={390}/><Route points={[...points].reverse()} p={p} reverse/></>;
      case 18:return <Diagram label="货批空间资源和交接围绕同一箱流" y={380} h={485}><Box x={640} y={194} scale={1.4}/>{points.map((s,i)=>{const left=i%2===0;const x=left?40:1000;const y=i<2?90:400;return <g key={s} opacity={at(p,i,4)}><path d={`M${left?490:980} ${y}L${left?570:860} ${y}L720 232`} fill="none" stroke="#4095a0" strokeWidth="2"/><text x={x} y={y-22} fill="currentColor" fontSize="28">{s}</text></g>;})}</Diagram>;
      case 21:return <><Diagram label="冻结快照中三组不同环节的数量" y={390} h={440}>{[{x:20,n:116,total:116,label:'进口卸船',c:'#278694'},{x:505,n:78,total:78,label:'出口装船',c:'#a27b44'},{x:990,n:88,total:116,label:'进口提离',c:'#278694'}].map(a=><g key={a.label}><text x={a.x} y="159" fontSize="158" fontWeight="600" fill={a.c}>{a.n}</text><text x={a.x} y="230" fontSize="31" fill="currentColor">{a.label} / {a.total}箱</text><path d={`M${a.x} 288h400`} stroke="currentColor" opacity=".16" strokeWidth="9"/><path d={`M${a.x} 288h${400*a.n/a.total}`} stroke={a.c} strokeWidth="9"/></g>)}</Diagram><Text x={85} y={815} size={25} w={1400}>冻结快照 · 本课程默认装卸演示 · 2026-09-15</Text></>;
      case 22:return <><Text x={80} y={400} size={155} tone="#a4763c">28<span className="l4-unit">箱尚未提离</span></Text><Diagram label="28箱数量示意，不表示具体位置" y={475} h={380}>{Array.from({length:28},(_,i)=><g key={i} opacity={at(p,i,28)}><Box x={700+(i%7)*91} y={20+Math.floor(i/7)*77} scale={.65}/></g>)}</Diagram><Text x={85} y={660} w={580} size={32}>116 − 88 = 28<br/><span className="l4-muted">差额说明数量，明细解释位置。</span></Text></>;
      case 23:return <><Photo name={image} x={25} y={400} w={835} h={430} fit="contain"/><LineRows points={points} x={905} y={386} w={610} gap={111}/></>;
      case 24:return <Diagram label="实物流与信息流的两条时间线" y={405} h={435}><text x="0" y="72" fill="#268394" fontSize="32">实物流</text><text x="0" y="292" fill="#ad864c" fontSize="32">信息流</text>{[0,1].map(row=><g key={row}><path d={`M210 ${70+row*220}H1350`} stroke={row?'#b38d53':'#3195a5'} strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1-clamp(p*(row?1.2:1))}/>{(row?['资料','回执','交接','状态']:['船','岸','场','闸口']).map((s,i)=><g key={s} opacity={at(p,i,4)}><circle cx={260+i*340} cy={70+row*220} r="7" fill={row?'#b38d53':'#3195a5'}/><text x={260+i*340} y={127+row*220} textAnchor="middle" fill="currentColor" fontSize="31">{s}</text>{!row&&<path d={`M${260+i*340} 145V250`} stroke="currentColor" opacity=".2" strokeDasharray="6 8"/>}</g>)}</g>)}</Diagram>;
      case 25:return <Text x={85} y={765} w={1100} size={36}>交出什么　<span className="l4-accent">→</span>　由谁接收　<span className="l4-accent">→</span>　怎样确认</Text>;
      case 26:return <Text x={85} y={762} w={1000} size={34}>先读当前状态，再找下一项条件。</Text>;
      case 27:return <><Photo name={image} x={0} y={325} w={1600} h={675} opacity={.27}/><Diagram label="三个接续岗位的起始人数均为零" y={420} h={420}>{points.map((s,i)=><g key={s} opacity={at(p,i,3)}><text x={125+i*510} y="195" fontSize="190" fill="#e1b576">0</text><path d={`M${100+i*510} 245h300`} stroke="#72c0c8" strokeWidth="3"/><text x={100+i*510} y="315" fill="currentColor" fontSize="34">{s.split(' · ')[0]}</text></g>)}</Diagram></>;
      case 28:return <><Photo name={image} x={0} y={730} w={1600} h={210}/><Diagram label="可行参考配置运输12场桥4闸口2" y={385} h={320}>{[12,4,2].map((v,i)=><g key={i}><text x={95+i*520} y="165" fontSize="152" fill={i===1?'#b08a50':'#298596'}>{v}</text><text x={95+i*520} y="250" fontSize="34" fill="currentColor">{['运输岗位','场桥岗位','闸口岗位'][i]}</text></g>)}</Diagram></>;
      case 29:return <><Photo name={image} x={780} y={0} w={820} h={1000} opacity={.35}/><Route points={points} p={p}/><Text x={90} y={430} size={35} tone="#ddb478">处理开始，距离实际解除仍有过程。</Text></>;
      case 32:return <><Photo name={image} x={800} y={410} w={715} h={440}/><Text x={85} y={386} size={145} tone="#258a96">116<span className="l4-unit">箱</span></Text><Text x={85} y={600} size={39}>实际提离</Text><Text x={85} y={695} size={28}>同时核对异常解除与交接记录</Text></>;
      case 33:return <Text x={85} y={746} w={950} size={34}>有效回执　→　离港安排　→　实际执行</Text>;
      case 34:return <><Diagram label="泊位与航道分别释放的概念时间线" y={410} h={445}><Ship x={110+clamp(p)*1000} y={20} scale={1.1}/><path d="M110 120H1330" stroke="currentColor" opacity=".25" strokeWidth="2"/><text x="0" y="225" fill="currentColor" fontSize="32">泊位</text><text x="0" y="345" fill="currentColor" fontSize="32">航道</text>{[0,1].map(row=>{const t=row?.82:.42;return <g key={row}><path d={`M210 ${215+row*120}H${210+t*1080}`} stroke="#d8ae70" strokeWidth="13"/><path d={`M${210+t*1080} ${215+row*120}H1320`} stroke="#5db3bc" opacity={p>=t?1:.12} strokeWidth="13"/><text x={230+t*1080} y={262+row*120} fill="currentColor" opacity={p>=t?1:0} fontSize="27">实际释放</text></g>})}<text x="210" y="413" fontSize="23" fill="currentColor" opacity=".6">占用与释放关系示意 · 非真实时间刻度</text></Diagram></>;
      case 36:return <><Text x={1225} y={401} w={290} size={185} tone="#d6d9ca">04</Text><LineRows points={points} y={396} w={1100} gap={105}/></>;
      case 37:return <><Photo name={image} x={635} y={410} w={880} h={440} opacity={.6}/><LineRows points={points} x={85} y={405} w={590} gap={106}/></>;
      case 38:return <><Photo name={image} x={84} y={425} w={594} h={423}/><LineRows points={points} x={760} y={412} w={750} gap={136}/></>;
      case 39:return <><Diagram label="可行与性能比较需要不同证据" y={455} h={340}><path d="M40 185h575m185 0h590" stroke="currentColor" opacity=".25" strokeWidth="3"/><circle cx="330" cy="185" r="18" fill="#3493a0"/><path d="M805 180l175-40 150-60 190-45" fill="none" stroke="#b18a50" strokeWidth="5"/><text x="40" y="91" fontSize="46" fill="#268898">链条能否接续</text><text x="800" y="260" fontSize="29" fill="currentColor">固定起点，再比较时间、等待与代价</text><text x="40" y="262" fontSize="29" fill="currentColor">恢复缺失条件，核验实际结果</text></Diagram></>;
      case 40:return <><Photo name={image} x={1075} y={610} w={450} h={235} fit="contain"/><LineRows points={points} y={392} w={970} gap={106}/></>;
      case 41:return <><Text x={1240} y={334} w={270} size={220} tone="#dcdacd">？</Text><LineRows points={points} y={397} w={1330} gap={146}/></>;
      case 42:return <LineRows points={points} y={420} w={1410} gap={143}/>;
      case 43:return <Harbor p={p} labels={points}/>;
      case 44:return <><Text x={85} y={720} size={105} tone="#dfb77d">Δ</Text><Text x={216} y={769} w={1050} size={33}>固定起点　／　改变一项　／　核对结果</Text></>;
      default:throw new Error(`Unregistered lesson four composition ${n}`);
    }
  })();
  return <article className={`port-l4-slide authored-slide l4-page-${n} ${paper?'l4-paper':'l4-ink'} ${photoScene?'l4-scene':''} ${narrowHeading?'l4-heading-narrow':''} ${page.visual==='task'?'l4-task':''}`} aria-label={page.title}>
    {photoScene&&<><Photo name={image}/><div className="l4-photo-shade"/></>}
    {content}
    <header className="l4-heading"><div className="l4-kicker">{page.english}</div><h1>{page.title}</h1><p>{page.lead}</p></header>
    {page.prompt&&<div className="l4-question">{page.prompt}</div>}
    <footer className="l4-footer"><span>{n===21?'演示运行快照':photoScene||[4,5,8,9,11,12,13,15,16,17,20,23,27,28,29,31,32,37,38,40].includes(n)?'教学情境 · AI生成示意':'教学情境 · 概念示意'} · {n===21?'默认装卸演示冻结记录':'本课程单船模型'}</span><span>港口物流 · 第4讲</span><strong>{String(n).padStart(2,'0')} / 44</strong></footer>
  </article>;
}
