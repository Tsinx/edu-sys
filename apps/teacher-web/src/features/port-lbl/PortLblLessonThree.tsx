import { PortProcessScene } from "./PortProcessScene";
import type { PortLblPage } from "../../../../../packages/course-content/src/port-lbl";
import { Paper, Photo, Shade, H, T, Rule, Reveal, Box, Diagram, RouteStroke, useLblPlayback, phase } from "./PortLblPrimitives";
import { LblGlobe } from "./LblGlobe";
import { PACIFIC, ATLANTIC, PANAMA, CAPE, NORTH_SOUTH, SOUTH_SOUTH, GULF_EXIT, GULF_ASIA, MINERAL_ROUTES, GRAIN_ATLANTIC, ASIA_EUROPE, CAPE_COMPARISON, SUEZ_EASTCOAST, LNG_ROUTES, COAL_INDONESIA, GRAIN_ROUTES } from "./LblRoutes";

export function PortLblLessonThree({page}:{page:PortLblPage}) {
  const {progress}=useLblPlayback();
  switch(page.localPage){
    case 1:return <Paper page={page} source="世界海运网络 · 地理示意，非实时船位">
      <LblGlobe x={390} y={-30} w={1260} h={1040} global routes={[]} keys={[{at:0,latitude:15,longitude:110,distance:3.5},{at:.32,latitude:15,longitude:20,distance:3.5},{at:.68,latitude:15,longitude:-70,distance:3.5}]}/><Shade style={{background:"linear-gradient(90deg,#09151e 10%,#09151eaf 37%,transparent 75%)"}}/>
      <T x={94} y={103} size={22} className="lbl-label">PORT MANAGEMENT / LECTURE 03</T><H y={270} w={1000} size={94}>世界货物<br/>如何<strong>流动？</strong></H><Rule x={98} y={578} w={94} color="#d2af78"/><T x={98} y={637} w={960} size={35}>船舶、码头与全球航运网络</T>
    </Paper>;
    case 2:return <Paper page={page} source="城市需求的概念联系 · AI生成城市场景">
      <Photo name="city-needs" alt="能源工业住宅与商业构成城市需求的教学场景"/><Shade/><H y={137} w={976} size={78}>一座城市，<br/>需要哪些海运货物？</H>
      <T x={96} y={427} size={42}>能源</T><Reveal at={.15}><T x={96} y={517} size={42}>粮食</T></Reveal><Reveal at={.3}><T x={96} y={607} size={42}>工业原料</T></Reveal><Reveal at={.45}><T x={96} y={697} size={42}>汽车与消费品</T></Reveal><Reveal at={.68}><T x={802} y={806} w={691} size={32}>它们通过不同的运输链，<br/>进入生产与生活。</T></Reveal>
    </Paper>;
    case 3:return <Paper page={page} tone="paper">
      <H>货类与运输形态，是不同视角。</H><T x={95} y={226} size={31}>货物是什么、怎样装运、交易规模多大，需要分别说明。</T>
      <Rule x={94} y={365} w={1406}/><T x={95} y={410} size={40}>货物性质</T><T x={600} y={416} size={32}>矿石 · 石油 · 粮食 · 汽车 · 制成品</T>
      <Reveal at={.23}><Rule x={94} y={539} w={1406}/><T x={95} y={580} size={40}>装运形态</T><T x={600} y={586} size={32}>集装箱 · 干散货 · 液体散货 · 滚装 · 件杂货</T></Reveal>
      <Reveal at={.49}><Rule x={94} y={712} w={1406}/><T x={95} y={753} size={40}>交易与货批</T><T x={600} y={759} size={32}>大宗商品，可以采用不同装运形态。</T></Reveal>
      <T x={95} y={879} size={25} color="#16788d">“大宗”并不是与“干散货”“液体货”互斥的分类。</T>
    </Paper>;
    case 4:return <Paper page={page} source="船型与货物适配 · AI生成场景，图片不按船舶比例排列">
      <Photo name="ocean-voyage" alt="集装箱船" x={0} y={290} w={800} h={325}/><Photo name="dry-bulk" alt="干散货船" x={800} y={290} w={800} h={325}/><Photo name="liquid-bulk" alt="油轮" x={0} y={615} w={800} h={325}/><Photo name="roro" alt="车辆运输滚装船" x={800} y={615} w={800} h={325}/>
      <H y={78}>船舶随着货物改变</H><T x={94} y={192} size={30}>货物的形态，改变船舶的舱室与装卸接口。</T>
      <T x={40} y={536} size={34} style={{textShadow:"0 2px 12px #000"}}>箱 · 标准化装载</T><T x={841} y={536} size={34} style={{textShadow:"0 2px 12px #000"}}>矿石 · 散装货舱</T><T x={40} y={860} size={34} style={{textShadow:"0 2px 12px #000"}}>液体 · 货舱与管系</T><T x={841} y={860} size={34} style={{textShadow:"0 2px 12px #000"}}>车辆 · 多层甲板</T>
    </Paper>;
    case 5:return <Paper page={page} tone="paper" source="鹿特丹港务局 · 专业码头分类；空间关系为概念示意">
      <H>一个港口，可以有多种码头。</H><T x={94} y={233} size={31}>港口、港区与码头，对应不同的空间与组织尺度。</T>
      <Diagram label="综合港内多个港区包含不同专业码头的嵌套关系"><path d="M512 333H1500V862H512Z" fill="#1e7a8710" stroke="#4b8b90" strokeWidth="3"/><path d="M565 459H968V816H565ZM1015 459H1450V816H1015Z" fill="#f0eee5" stroke="#9daf9f" strokeWidth="2"/><path d="M601 583H934M601 696H934M1055 583H1408M1055 696H1408" stroke="#a2b3a4" strokeWidth="2"/></Diagram>
      <T x={95} y={401} w={358} size={43}>多种专业化，<br/>共处一个综合港。</T><T x={557} y={359} size={33}>港口</T><T x={601} y={482} size={28}>港区 A</T><T x={1055} y={482} size={28}>港区 B</T>
      <T x={601} y={617} size={32}>集装箱码头</T><T x={601} y={729} size={32}>汽车滚装码头</T><T x={1055} y={617} size={32}>干散货码头</T><T x={1055} y={729} size={32}>液体散货码头</T>
    </Paper>;
    case 6:return <Paper page={page}>
      <H y={117} w={950}>货物怎样决定岸上的设施？</H><T x={95} y={254} w={1184} size={32}>装卸、储存与后方运输，要与货物特性相适应。</T>
      <Diagram label="货物特性影响四类设施和衔接"><circle cx="800" cy="571" r="113" fill="#6dcddd15" stroke="#6dcddd" strokeWidth="2"/><path d="M690 565H249M908 565H1357M799 685V831M799 459V349" stroke="#9cafad" strokeWidth="2"/></Diagram>
      <T x={712} y={540} size={43}>货物</T><T x={93} y={501} size={40}>船舶</T><T x={1210} y={501} size={40}>岸上装卸</T><T x={721} y={319} size={34}>储存设施</T><Reveal at={.45}><T x={714} y={835} size={34}>后方运输</T></Reveal><T x={96} y={797} w={422} size={28} className="lbl-muted">观察位置相同，<br/>具体工艺各不相同。</T>
    </Paper>;
    case 7:return <Paper page={page} source="矿石出口装船 · 三维教学工艺示意，非工程设计">
      <H>铁矿石码头</H><T x={95} y={230} size={31}>从堆场取料，经输送带与装船机进入散货船货舱。</T>
      <PortProcessScene kind="bulk" label="矿石由堆场进入输送带，沿装船机臂架输送并从溜筒落入货舱"/>
      <T x={95} y={884} size={25}>本页演示出口装船；进口方向为卸船 → 输送 → 堆场，需分别识别。</T>
    </Paper>;
    case 8:return <Paper page={page} source="煤炭堆取料与连续输送 · 三维教学简化，非工程设计">
      <H>堆存缓冲与连续输送</H><T x={95} y={230} size={31}>煤炭堆场吸收作业节奏差异，再通过输送系统衔接后方需求。</T>
      <PortProcessScene kind="coal" label="堆场取出的煤炭沿连续输送设备送向后方接运端"/>
      <T x={95} y={884} size={25}>堆取料组织、设备衔接与粉尘管理，需要一并考虑。</T>
    </Paper>;
    case 9:return <Paper page={page} source="粮食筒仓与装船接口 · 三维教学示意，非工程设计">
      <H>粮食为什么进入筒仓？</H><T x={95} y={230} size={31}>防潮、清洁与品质保持，改变了储运设施的选择。</T>
      <PortProcessScene kind="grain" label="粮食筒仓、输送设备与船舶构成连续储运连接"/>
      <T x={95} y={884} size={25}>筒仓是典型设施之一；粮食也可采用其他适宜储存方式。图中颗粒表示货物流向。</T>
    </Paper>;
    case 10:return <Paper page={page} source="原油卸船至储罐 · 三维教学管线示意，亮点仅表示流向">
      <H>原油：从船舶进入储罐。</H><T x={95} y={230} size={31}>装卸臂、管线与储罐连续衔接，货物沿封闭系统输送。</T>
      <PortProcessScene kind="oil" label="油轮经关节式装卸连接和岸上管线向储罐输送，亮点表示内部流动方向"/>
      <T x={95} y={884} size={25}>流动的货物，需要连续的管线接口。亮点是流向示意，不表示液体暴露在空气中。</T>
    </Paper>;
    case 11:return <Paper page={page} tone="paper">
      <H>液体货物，不能任意共用设施。</H><T x={95} y={231} size={31}>不同货物，需要各自适配的储罐、管线与装卸安排。</T>
      <Diagram label="三种液体货物分别经独立连接进入各自储存区的概念示意"><path d="M241 505V763H1369M735 505V681H1369M1197 505V601H1369" fill="none" stroke="#c6b389" strokeWidth="6"/><path d="M115 464V384Q115 350 239 350Q363 350 363 384V464Q363 498 239 498Q115 498 115 464M612 464V384Q612 350 735 350Q858 350 858 384V464Q858 498 735 498Q612 498 612 464M1074 464V384Q1074 350 1197 350Q1320 350 1320 384V464Q1320 498 1197 498Q1074 498 1074 464" fill="#a7bbb247" stroke="#6e8d80" strokeWidth="3"/></Diagram>
      <T x={193} y={544} size={32}>原油</T><T x={659} y={544} size={32}>成品油</T><T x={1097} y={544} size={32}>化工液体</T><Reveal at={.46}><T x={95} y={845} w={1400} size={31}>分区与适配，是设施组织的一部分；不能据示意图判断物料兼容性。</T></Reveal>
    </Paper>;
    case 12:return <Paper page={page} source="LNG专用储运 · 三维教学示意，球罐船仅为一种船型">
      <H>LNG，专用储运设施。</H><T x={95} y={230} size={31}>液化天然气的低温储运要求，由专用船舶与接收设施承接。</T>
      <PortProcessScene kind="lng" label="球形货舱LNG船通过专用连接向低温储罐卸载，亮点表示管线内部流向"/>
      <T x={95} y={884} size={25}>卸载 → 低温储存 → 再气化 → 接入管网；本段展示卸载与储存接口。</T>
    </Paper>;
    case 13:return <Paper page={page} source="汽车滚装 · 三维教学工艺示意，非车辆调度或绑扎方案">
      <H>汽车怎样驶上船？</H><T x={95} y={230} size={31}>车辆从停车区出发，转向跳板，沿坡道驶入船内甲板。</T>
      <PortProcessScene kind="roro" label="汽车依次从停车区驶上船岸跳板，车体随坡度倾斜后进入滚装船甲板"/>
      <T x={95} y={884} size={25}>停车区、跳板与船内甲板，组成连续的滚装路径；装船后还需按要求停放与系固。</T>
    </Paper>;
    case 14:return <Paper page={page} source="件杂货与重大件 · 三维教学示意，非吊装工程方案">
      <H>一件货物，就可能改变整套安排。</H><T x={95} y={230} size={31}>大型工业构件的尺寸、重量与吊点，改变装卸和接运要求。</T>
      <PortProcessScene kind="heavy" label="起重设备通过吊点连接大型圆筒构件，提升、横移并落到船上"/>
      <T x={95} y={884} size={25}>吊装设备、作业空间与后方接运，需要针对货物组织；本图不提供实际吊装参数。</T>
    </Paper>;
    case 15:return <Paper page={page} tone="paper">
      <H>为什么不能任意换码头？</H><T x={94} y={227} size={31}>同样是工业货物，整箱零件和散装矿石需要不同的适配。</T>
      <table className="lbl-table" style={{top:333,fontSize:27}}><thead><tr><th>观察位置</th><th>整箱零件</th><th>散装矿石</th></tr></thead><tbody><tr><td>船舶</td><td>集装箱船与箱位</td><td>散货船与货舱</td></tr><tr><td>船岸交接</td><td>吊具抓取标准箱体</td><td>相应散货装卸设备</td></tr><tr><td>储存</td><td>箱区与堆位</td><td>适宜堆场与堆取料组织</td></tr><tr><td>后方连接</td><td>整箱交接与多式联运</td><td>连续输送与适配接运</td></tr></tbody></table><Reveal at={.52}><T x={95} y={839} size={31} color="#15778c">适配关系，是成套的。</T></Reveal>
    </Paper>;
    case 16:return <Paper page={page} source="港口专业化的概念解释 · AI生成场景">
      <Photo name="terminal-aerial" alt="综合港中集装箱码头的教学场景" x={788} y={0} w={812} h={1000} className="lbl-light-window"/><Shade/><H y={143} w={946} size={78}>专业化与综合化，<br/>可以同时存在。</H>
      <T x={95} y={414} w={650} size={38}>专业码头</T><T x={95} y={481} w={681} size={30} className="lbl-muted">围绕具体货物，配置设备与工艺。</T><Rule x={95} y={599} w={574}/><Reveal at={.4}><T x={95} y={643} size={38}>综合港</T><T x={95} y={710} w={680} size={30} className="lbl-muted">连接多种产业与市场，容纳多种码头。</T></Reveal>
    </Paper>;
    case 17:return <Paper page={page} source="代表运输方向 · 教学路线示意，不表示当前可订服务">
      <LblGlobe x={303} w={1350} h={1000} routes={progress<.34?ASIA_EUROPE:progress<.67?[PACIFIC]:[SOUTH_SOUTH]} keys={[{at:0,latitude:22,longitude:75,distance:3.4},{at:.34,latitude:28,longitude:180,distance:3.5},{at:.67,latitude:-16,longitude:30,distance:3.6}]}/><Shade style={{background:"linear-gradient(90deg,#0b1722 8%,#0b1722b0 28%,transparent 67%)"}}/>
      <H y={113} w={950} size={79}>目的地改变，<br/>路线怎样改变？</H><T x={95} y={417} w={535} size={34}>同一出发地，<br/>连接不同方向的海外市场。</T>
      <T x={95} y={772} w={1247} size={43} color="#d8bc86">{progress<.34?"欧洲方向":progress<.67?"北美方向":"南美方向"}</T>
    </Paper>;
    case 18:return <Paper page={page} source="亚欧联系 · 既有航迹重建与概念解释，非实时AIS">
      <LblGlobe x={440} w={1200} h={1000} routes={ASIA_EUROPE} keys={[{at:0,latitude:20,longitude:95,distance:3.4},{at:.6,latitude:30,longitude:55,distance:3.4}]} labels={["shanghai","singapore","suez","rotterdam"]}/><Shade style={{background:"linear-gradient(90deg,#0b1722 17%,transparent 68%)"}}/>
      <T x={95} y={100} size={23} className="lbl-label">ASIA — EUROPE</T><H y={223} w={650} size={83}>亚欧集装箱联系</H><T x={95} y={434} w={471} size={35}>两端市场，<br/>沿途区域，<br/>以及连接它们的枢纽。</T><Reveal at={.55}><T x={95} y={808} w={1096} size={32}>一条远洋联系，同时嵌入多个区域网络。</T></Reveal>
    </Paper>;
    case 19:return <Paper page={page} source="亚洲—北美西岸代表方向 · 教学地理示意，非通航图">
      <LblGlobe x={140} y={104} w={1320} h={887} routes={[PACIFIC]} keys={[{at:0,latitude:30,longitude:150,distance:3.5},{at:.5,latitude:32,longitude:-160,distance:3.5}]} labels={["shanghai","los-angeles-long-beach"]}/>
      <H x={86} y={70} size={68}>跨太平洋：亚洲与北美西岸</H><Shade style={{background:"linear-gradient(0deg,#0b1722 2%,transparent 45%)"}}/>
      <T x={92} y={733} w={550} size={33}>从太平洋中心看，<br/>两岸属于同一运输联系。</T><T x={1035} y={733} w={452} size={33}>港口之后，<br/>还有各自的腹地。</T>
    </Paper>;
    case 20:return <Paper page={page} source="北美东岸连接方式 · 教学地理比较，不保证所有船型或班期适用">
      <LblGlobe x={646} y={57} w={1050} h={887} routes={progress<.36?[PANAMA]:progress<.69?[SUEZ_EASTCOAST]:[PACIFIC]} keys={[{at:0,latitude:22,longitude:-110,distance:3.5},{at:.36,latitude:25,longitude:65,distance:3.6},{at:.55,latitude:30,longitude:-35,distance:3.6},{at:.69,latitude:36,longitude:-110,distance:3.3}]} labels={["shanghai","panama","suez","los-angeles-long-beach","new-york-new-jersey"]}/><Shade style={{background:"linear-gradient(90deg,#0b1722 29%,transparent 67%)"}}/>
      <H y={98} w={944} size={68}>去北美东岸的不同路径</H>
      <T x={95} y={303} w={570} size={39} color={progress<.36?"#dabc83":undefined}>① 经巴拿马的海路</T><T x={95} y={401} w={570} size={39} color={progress>=.36&&progress<.69?"#dabc83":undefined}>② 经苏伊士方向的海路</T><T x={95} y={499} w={570} size={39} color={progress>=.69?"#dabc83":undefined}>③ 美西港口接陆桥</T>
      <Diagram label="美西到美东的陆桥以虚线单列，不误标为海上航线"><path d="M132 726H600" stroke="#cad4c4" strokeWidth="3" strokeDasharray="12 10"/></Diagram><T x={96} y={764} size={25}>美西港口</T><T x={486} y={764} size={25}>东部市场</T><T x={95} y={861} w={1431} size={25}>虚线表示陆路联系。具体选择受起讫港、船型、通道条件与服务安排影响。</T>
    </Paper>;
    case 21:return <Paper page={page} source="欧洲—北美代表方向 · 教学地理示意">
      <LblGlobe x={0} y={15} w={1130} h={937} routes={[ATLANTIC]} keys={[{at:0,latitude:40,longitude:-25,distance:3.2},{at:.7,latitude:38,longitude:-43,distance:3.2}]} labels={["rotterdam","new-york-new-jersey"]}/><Shade style={{background:"linear-gradient(270deg,#0b1722 14%,transparent 66%)"}}/>
      <T x={965} y={140} size={22} className="lbl-label">TRANSATLANTIC</T><H x={960} y={246} w={565} size={80}>大西洋<br/>两岸的联系</H><T x={966} y={503} w={529} size={32}>欧洲与北美，<br/>构成另一组洲际运输联系。</T><Rule x={965} y={714} w={125}/><T x={965} y={761} w={522} size={28}>世界航运网络，<br/>拥有多个市场中心。</T>
    </Paper>;
    case 22:return <Paper page={page} source="南北向代表联系 · 地理示意，非全部服务清单">
      <LblGlobe x={438} w={1210} h={1000} routes={[NORTH_SOUTH]} keys={[{at:0,latitude:30,longitude:-14,distance:3.6},{at:.65,latitude:-4,longitude:-23,distance:3.6}]} labels={["rotterdam","santos"]}/><Shade/>
      <T x={95} y={103} size={22} className="lbl-label">NORTH — SOUTH</T><H y={234} w={873} size={82}>南北向联系</H><T x={95} y={413} w={636} size={35}>欧洲、北美，<br/>与拉美、非洲相连。</T><Reveal at={.42}><T x={95} y={715} w={656} size={29}>图中以欧洲—南美东岸为例。<br/>区域联系不等于任意两港都有直达。</T></Reveal>
    </Paper>;
    case 23:return <Paper page={page} source="亚洲—南美代表联系 · 教学方向示意，非当前航次">
      <LblGlobe x={185} y={122} w={1380} h={870} routes={[SOUTH_SOUTH]} keys={[{at:0,latitude:-12,longitude:84,distance:3.7},{at:.6,latitude:-15,longitude:12,distance:3.8}]} labels={["shanghai","santos","cape-good-hope"]}/><H x={87} y={80} size={71}>南南向联系：亚洲与非洲、南美</H><Shade style={{background:"linear-gradient(0deg,#0b1722 0%,transparent 55%)"}}/>
      <T x={94} y={729} w={747} size={35}>全球网络，沿更多方向展开。</T><T x={95} y={807} w={1390} size={27}>这里的“南南”指发展中经济体间的联系，不能仅按纬度正负划分。</T>
    </Paper>;
    case 24:return <Paper page={page} tone="paper">
      <H>区域航线怎样接入全球？</H><T x={94} y={230} size={31}>主干、区域与支线，形成不同层次的覆盖。</T>
      <Diagram label="支线经区域枢纽汇入主干航线的概念网络"><path d="M165 404L459 546M165 708L459 546M412 814L459 546" stroke="#8eb3a6" strokeWidth="3"/><path d="M459 546H974" stroke="#247f95" strokeWidth="8"/><path d="M974 546L1400 358M974 546L1394 581M974 546L1396 801" stroke="#8eb3a6" strokeWidth="3"/><circle cx="459" cy="546" r="23" fill="#247f95"/><circle cx="974" cy="546" r="23" fill="#247f95"/><RouteStroke d="M165 708L459 546H974L1396 801" color="#bd955d" width={5}/></Diagram>
      <T x={92} y={324} size={28}>区域港口</T><T x={378} y={596} size={31}>枢纽</T><T x={674} y={426} size={38}>主干联系</T><T x={918} y={596} size={31}>枢纽</T><T x={1302} y={829} size={28}>区域覆盖</T><T x={94} y={875} size={25} className="lbl-muted">概念网络：每条线代表一种连接关系，不对应特定公司的服务数量。</T>
    </Paper>;
    case 25:return <Paper page={page} source="EIA · 能源通道与 LNG 贸易；代表方向示意，线宽不表示运量">
      <H y={79} size={72}>石油与天然气：不同的运输地图</H><T x={95} y={204} size={29}>资源所在地与消费市场，共同塑造能源运输方向。</T>
      <LblGlobe x={15} y={304} w={786} h={526} routes={[GULF_ASIA]} keys={[{at:0,latitude:22,longitude:75,distance:3.1}]} labels={["hormuz","shanghai"]}/>
      <LblGlobe x={810} y={304} w={775} h={526} routes={LNG_ROUTES} keys={[{at:0,latitude:0,longitude:117,distance:3.4},{at:.57,latitude:31,longitude:-45,distance:3.5}]} labels={["rotterdam","shanghai"]}/>
      <T x={95} y={283} size={32} color="#dfb575">石油 · 海湾 → 亚洲</T><T x={865} y={283} size={32} color="#9bc6a2">LNG · {progress<.4?"澳大利亚 → 东亚":"美国 → 欧洲"}</T>
      <T x={95} y={826} w={640} size={29}>液体货物连接储罐、管线与工业需求。</T><T x={865} y={826} w={640} size={29}>LNG 贸易同时连接亚洲与大西洋市场。</T>
    </Paper>;
    case 26:return <Paper page={page} source="UNCTAD · 矿石与煤炭贸易；代表方向示意，线宽不表示运量">
      <LblGlobe x={310} y={10} w={1340} h={970} routes={progress<.65?MINERAL_ROUTES:[COAL_INDONESIA]} keys={[{at:0,latitude:-3,longitude:117,distance:3.2},{at:.38,latitude:-14,longitude:20,distance:3.8},{at:.7,latitude:9,longitude:118,distance:3.1}]} labels={["shanghai","cape-good-hope"]}/><Shade/>
      <H y={113} w={962} size={76}>矿石与煤炭运输地图</H><T x={95} y={321} w={589} size={32}>资源产地与工业需求，<br/>通过专业港口连接。</T>
      <T x={95} y={531} w={705} size={36} color="#dfae85">矿石：澳大利亚、巴西 → 亚洲</T><Reveal at={.46}><T x={95} y={656} w={705} size={34} color="#b7bdc1">煤炭：印度尼西亚 → 东亚</T><T x={95} y={724} w={633} size={29}>同属干散货，各自的贸易分布仍不同。</T></Reveal><T x={95} y={868} size={24}>当前图层：{progress<.65?"矿石的两组代表方向":"煤炭的一组代表方向"} · 非实时船流</T>
    </Paper>;
    case 27:return <Paper page={page} source="UNCTAD · 粮食贸易；美洲、黑海—地中海代表方向，非航次记录">
      <LblGlobe x={505} w={1120} h={1000} routes={GRAIN_ROUTES} keys={[{at:0,latitude:23,longitude:-32,distance:3.7},{at:.62,latitude:35,longitude:26,distance:2.6}]} labels={["gibraltar","turkish-straits"]}/><Shade/><T x={95} y={102} size={22} className="lbl-label">GRAIN TRADE</T><H y={241} w={852} size={83}>粮食运输地图</H><T x={95} y={425} w={623} size={33}>出口产区与进口市场，<br/>通过粮港和海运相连。</T><Rule x={95} y={599} w={109}/><T x={95} y={642} size={29} color="#b6c983">南美洲 → 地中海</T><T x={95} y={694} size={29} color="#d2bb7e">美国 → 地中海</T><T x={95} y={746} size={29} color="#88c6b5">黑海 → 地中海</T><T x={95} y={855} size={24}>区域之间的联系，受作物、季节、贸易条件与运输安排影响。</T>
    </Paper>;
    case 28:return <Paper page={page}>
      <LblGlobe x={253} w={1345} h={1000} routes={progress<.25?ASIA_EUROPE:progress<.5?[GULF_ASIA]:progress<.75?MINERAL_ROUTES:[GRAIN_ATLANTIC]} keys={[{at:0,latitude:25,longitude:70,distance:3.7},{at:.3,latitude:15,longitude:70,distance:3.7},{at:.6,latitude:-10,longitude:35,distance:3.7},{at:.86,latitude:15,longitude:-20,distance:3.7}]}/><Shade/>
      <H y={102} w={1400} size={68}>同一片海洋，多张运输网络。</H><T x={95} y={310} w={605} size={34}>换一种货物，<br/>地图上的重点也会改变。</T><T x={93} y={526} size={86} color={progress<.25?"#6dcddd":progress<.5?"#dfb575":progress<.75?"#d6a080":"#b6c983"}>{progress<.25?"集装箱":progress<.5?"油气":progress<.75?"矿石":"粮食"}</T><T x={95} y={826} w={1240} size={30}>货物结构、设施适配与贸易方向，共同塑造网络。</T>
    </Paper>;
    case 29:return <Paper page={page} source="EIA · 世界能源通道；地理位置示意，非实时船流">
      <LblGlobe x={283} w={1328} h={1000} global routes={[]} keys={[{at:0,latitude:20,longitude:70,distance:3.6},{at:.55,latitude:20,longitude:-10,distance:3.7}]} labels={["malacca","suez","bab-el-mandeb","hormuz","panama","cape-good-hope","gibraltar"]}/><Shade/><H y={115} w={902} size={79}>世界航运的<br/>关键通道</H><T x={95} y={429} w={531} size={33}>海峡<br/>运河<br/>绕角路径</T><Reveal at={.42}><T x={95} y={750} w={628} size={29}>它们承担不同作用，<br/>也面临不同类型的约束。</T></Reveal>
    </Paper>;
    case 30:return <Paper page={page} source="EIA · 马六甲通道；两个相邻海峡的教学定位">
      <LblGlobe x={572} w={1087} h={970} routes={ASIA_EUROPE} keys={[{at:0,latitude:6,longitude:100,distance:1.8},{at:.62,latitude:2.5,longitude:102.7,distance:1.35}]} labels={["malacca","singapore-strait"]}/><Shade/>
      <H y={132} w={1070} size={75}>马六甲与新加坡海峡</H><T x={95} y={340} w={617} size={35}>印度洋与东亚方向的船流，<br/>在这里连接。</T><Rule x={95} y={572} w={99}/><T x={95} y={622} w={607} size={31}>两个相邻海峡，<br/>连接周边港口与区域市场。</T><T x={95} y={834} size={25}>通道的存在，与枢纽的服务组织相互关联。</T>
    </Paper>;
    case 31:return <Paper page={page}>
      <LblGlobe x={140} y={123} w={1355} h={839} routes={[]} keys={[{at:0,latitude:-3,longitude:111,distance:1.9},{at:.7,latitude:-6,longitude:113,distance:1.55}]} labels={["malacca","sunda","lombok"]}/><H x={88} y={85} size={73}>替代通道，也有条件。</H><Shade style={{background:"linear-gradient(0deg,#0b1722 0%,transparent 62%)"}}/>
      <T x={95} y={716} w={719} size={34}>巽他、龙目等方向，<br/>提供不同的地理连接。</T><T x={945} y={729} w={564} size={30}>距离、吃水与通行条件会改变。<br/>具体船舶须按实际条件判断。</T><T x={95} y={866} size={24}>地理定位，不作为导航或船舶适航建议。</T>
    </Paper>;
    case 32:return <Paper page={page} source="红海通道 · 教学地理定位">
      <LblGlobe x={457} w={1178} h={1000} routes={ASIA_EUROPE} keys={[{at:0,latitude:30,longitude:33,distance:1.5},{at:.45,latitude:21,longitude:38,distance:1.65},{at:.8,latitude:12.6,longitude:43.4,distance:1.5}]} labels={["suez","bab-el-mandeb"]}/><Shade/>
      <H y={117} w={900} size={77}>苏伊士与红海通道</H><T x={95} y={345} size={38}>苏伊士运河</T><Rule x={107} y={416} w={2} h={77}/><T x={95} y={514} size={38}>红海</T><Rule x={107} y={585} w={2} h={77}/><T x={95} y={683} size={38}>曼德海峡</T><T x={95} y={855} w={1376} size={28}>前后相连的航段，不等于同一种约束：运河运行条件与海峡安全条件需要分别看。</T>
    </Paper>;
    case 33:return <Paper page={page} source="历史案例 · UNCTAD，2024-02-22；背景为AI生成教学场景">
      <Photo name="ocean-voyage" alt="商船航行的教学场景" style={{opacity:.27}}/><Shade/><T x={95} y={100} size={23} className="lbl-label">CASE / 2023—2024</T><H y={203} w={1420} size={77}>红海风险怎样改变运输安排？</H>
      <T x={95} y={393} w={1360} size={38}>商船遭袭与安全风险，改变了部分航运公司的航行选择。</T><Rule x={96} y={527} w={1310}/>
      <Reveal at={.25}><T x={95} y={580} size={35}>等待与评估</T></Reveal><Reveal at={.45}><T x={586} y={580} size={35}>调整航路</T></Reveal><Reveal at={.65}><T x={1070} y={580} size={35}>重排后续窗口</T></Reveal><T x={95} y={791} w={1305} size={29} className="lbl-muted">这是一段有日期的历史案例。船公司的安排会随安全条件、航线与时间改变。</T>
    </Paper>;
    case 34:return <Paper page={page} source="UNCTAD 2024 · 绕航机制；教学路径比较，不作固定延误天数推算">
      <LblGlobe x={298} w={1350} h={1000} routes={CAPE_COMPARISON} keys={[{at:0,latitude:18,longitude:47,distance:3.8},{at:.6,latitude:-2,longitude:24,distance:3.7}]} labels={["suez","bab-el-mandeb","cape-good-hope"]}/><Shade/>
      <H y={127} w={929} size={85}>绕行好望角</H><T x={95} y={349} w={566} size={33}>绕开某段通道，<br/>换取更长的航程。</T><T x={95} y={537} size={28} color="#6dcddd">青色：苏伊士方向</T><T x={95} y={593} size={28} color="#d9b475">金色：好望角方向</T><Reveal at={.53}><T x={95} y={774} w={695} size={30}>更多航行时间，<br/>意味着更多船舶与资源占用。</T></Reveal>
    </Paper>;
    case 35:return <Paper page={page} source="巴拿马运河管理局 · 地理连接；路径为教学示意">
      <LblGlobe x={476} w={1188} h={1000} routes={[PANAMA]} keys={[{at:0,latitude:16,longitude:-96,distance:3.1},{at:.66,latitude:9.1,longitude:-79.7,distance:1.35}]} labels={["panama"]}/><Shade/>
      <T x={95} y={105} size={22} className="lbl-label">PANAMA CANAL</T><H y={233} w={794} size={81}>巴拿马，<br/>连接两大洋。</H><T x={95} y={507} w={563} size={34}>从太平洋一侧，<br/>接入大西洋方向。</T><Rule x={95} y={717} w={106}/><T x={95} y={760} w={634} size={28}>运河通行，需要船舶条件、<br/>船闸与水资源共同支撑。</T>
    </Paper>;
    case 36:return <Paper page={page} tone="paper" source="历史安排 · 巴拿马运河管理局 A-54-2023，2024-01-16起调整；非当前限额">
      <T x={95} y={87} size={23} className="lbl-label">CASE / 2023—2024</T><H y={164} size={71}>干旱怎样限制运河通行？</H><T x={95} y={282} size={31}>降雨不足 → 湖水位下降 → 调整通行安排</T>
      <T x={123} y={437} size={118} className="lbl-serif">36</T><T x={123} y={596} w={335} size={28}>常规情景<br/>每日通行艘次</T><Reveal at={.24}><T x={631} y={437} size={118} className="lbl-serif" color="#9e7542">22</T><T x={631} y={596} w={335} size={28}>当时受限安排<br/>2023年12月</T></Reveal><Reveal at={.51}><T x={1142} y={437} size={118} className="lbl-serif" color="#197f8f">24</T><T x={1142} y={596} w={335} size={28}>随后调整安排<br/>2024年1月16日起</T></Reveal>
      <Rule x={96} y={757} w={1404}/><T x={95} y={803} w={1329} size={30}>限制会根据水情与运行条件调整，旧限额不能当作今日限额。</T>
    </Paper>;
    case 37:return <Paper page={page} source="EIA、IMO · 霍尔木兹地理关系；教学船位，非实时AIS">
      <LblGlobe x={444} w={1230} h={1000} routes={[GULF_EXIT]} keys={[{at:0,latitude:24,longitude:57,distance:2.5},{at:.65,latitude:26.3,longitude:56.4,distance:1.25}]} labels={["hormuz","iran","oman","persian-gulf","gulf-of-oman"]} highlight={["hormuz"]}/><Shade/>
      <T x={95} y={101} size={22} className="lbl-label">STRAIT OF HORMUZ</T><H y={224} w={871} size={82}>波斯湾的<br/>海上出口</H><T x={95} y={490} w={573} size={33}>波斯湾 → 霍尔木兹海峡<br/>→ 阿曼湾 → 外部海域</T><Reveal at={.52}><Rule x={95} y={711} w={107}/><T x={95} y={756} w={654} size={29}>湾内货物要走向远洋，<br/>首先需要接通这个出口。</T></Reveal>
    </Paper>;
    case 38:return <Paper page={page} tone="paper" source="IMO Middle East专题 · 2026-09-09检索，页面标示2026-09-05；冻结资料快照">
      <T x={95} y={88} size={23} className="lbl-label">CURRENT AFFAIRS / DATED SNAPSHOT</T><H y={159} w={1401} size={73}>通道仍在，运输为何受阻？</H>
      <T x={95} y={321} size={26} color="#8b6a3e">IMO · 2026年9月资料快照</T><Rule x={95} y={383} w={1400}/>
      <T x={95} y={427} w={1245} size={37}>区域不稳定持续影响航运与船员安全。</T><Reveal at={.2}><T x={95} y={532} w={1245} size={37}>部分船舶无法驶离海峡，船员受到影响。</T></Reveal><Reveal at={.4}><T x={95} y={637} w={1245} size={37}>IMO 页面当时将撤离计划标示为暂停。</T></Reveal>
      <Reveal at={.66}><Rule x={95} y={744} w={1400}/><T x={95} y={793} w={1350} size={33} color="#177c90">地理连通，是运输的条件之一；安全与实际运行，同样决定能否通行。</T></Reveal>
    </Paper>;
    case 39:return <Paper page={page}>
      <H y={76} w={1440} size={67}>绕好望角，能解决霍尔木兹的问题吗？</H>
      <LblGlobe x={39} y={242} w={754} h={540} routes={[CAPE]} keys={[{at:0,latitude:-4,longitude:40,distance:3.8}]} labels={["cape-good-hope"]}/><LblGlobe x={804} y={242} w={754} h={540} routes={[GULF_EXIT]} keys={[{at:0,latitude:26.3,longitude:56.4,distance:1.4}]} labels={["hormuz","iran","oman"]}/>
      <Rule x={800} y={279} w={1} h={579}/><T x={91} y={199} size={35} color="#d7b37b">亚欧船舶：改变中间路径</T><T x={865} y={199} size={35} color="#d7b37b">湾内油轮：首先需要驶出湾口</T>
      <T x={93} y={785} w={634} size={29}>绕非洲，可以避开红海方向的航段。</T><T x={865} y={785} w={636} size={29}>绕非洲，不能消除湾口出口约束。</T><Reveal at={.53}><T x={95} y={867} size={25}>管道、来源替代等是另一类机制，仍受设施、容量与货物流向限制。</T></Reveal>
    </Paper>;
    case 40:return <Paper page={page}>
      <LblGlobe x={287} w={1330} h={1000} routes={ASIA_EUROPE} keys={[{at:0,latitude:36,longitude:-5.5,distance:1.65},{at:.65,latitude:37,longitude:5,distance:2.2}]} labels={["gibraltar","piraeus"]}/><Shade/><H y={167} w={958} size={78}>直布罗陀<br/>与地中海网络</H><T x={95} y={465} w={584} size={33}>大西洋与地中海的接口，<br/>也是周边运输组织的空间背景。</T><T x={95} y={793} w={755} size={29}>位置提供条件，港口价值还需要服务与连接来实现。</T>
    </Paper>;
    case 41:return <Paper page={page}>
      <H y={80} w={1430} size={66}>区域海域，怎样连接外部网络？</H><LblGlobe x={50} y={260} w={728} h={581} routes={[]} keys={[{at:0,latitude:41.2,longitude:29,distance:1.75}]} labels={["turkish-straits"]}/><LblGlobe x={822} y={260} w={728} h={581} routes={[]} keys={[{at:0,latitude:55.7,longitude:11.8,distance:1.85}]} labels={["danish-straits"]}/>
      <T x={94} y={214} size={35}>黑海 · 土耳其海峡</T><T x={858} y={214} size={35}>波罗的海 · 丹麦海峡</T><T x={95} y={846} size={29}>区域海域通过各自的海峡系统，接入更广阔的外部海域。</T>
    </Paper>;
    case 42:return <Paper page={page} tone="paper" source="EIA、UNCTAD · 通道风险传递的教学概念模型">
      <H>通道风险怎样传到远方？</H><T x={95} y={232} size={31}>先识别约束类型，再看它如何改变交付。</T>
      <T x={95} y={383} w={452} size={35}>出口依赖</T><T x={95} y={440} w={452} size={26} className="lbl-muted">霍尔木兹：货物能否驶出湾口</T><T x={584} y={383} size={35}>中途改线</T><T x={584} y={440} w={445} size={26} className="lbl-muted">红海：航程与资源占用改变</T><T x={1077} y={383} size={35}>水资源约束</T><T x={1077} y={440} w={439} size={26} className="lbl-muted">巴拿马：通行安排与等待改变</T>
      <Diagram label="局部约束通过船期港口窗口到交付周期的传播链"><RouteStroke d="M176 665H1439" color="#208195" width={5}/></Diagram><T x={97} y={705} size={30}>局部约束</T><Reveal at={.22}><T x={512} y={705} size={30}>船期改变</T></Reveal><Reveal at={.44}><T x={925} y={705} size={30}>窗口重排</T></Reveal><Reveal at={.66}><T x={1327} y={705} size={30}>交付受影响</T></Reveal><T x={95} y={853} w={1420} size={27}>价格还受供需、合同与市场条件等因素影响，不能由单一事件直接推出固定涨幅。</T>
    </Paper>;
    case 43:return <Paper page={page} source="航运服务组织的概念解释 · AI生成场景">
      <Photo name="ocean-voyage" alt="由船货港口时间共同组织的海运服务"/><Shade/><T x={95} y={104} size={22} className="lbl-label">FROM NETWORK TO SERVICE</T><H y={258} w={1257} size={86}>地图上的线，<br/>怎样成为运输服务？</H><T x={97} y={567} w={872} size={35}>船、货、港口与时间，<br/>需要一起被组织。</T><Reveal at={.46}><T x={96} y={811} w={1222} size={29}>地理上可以连通，仍需要实际服务安排来完成交付。</T></Reveal>
    </Paper>;
    case 44:return <Paper page={page} tone="paper">
      <H>班轮与不定期船运输</H><T x={95} y={225} size={31}>服务循环与货批需求，形成不同的组织方式。</T>
      <Rule x={797} y={357} w={1} h={446}/><T x={95} y={373} size={48}>班轮</T><T x={95} y={462} w={617} size={31}>围绕预定服务与班期，<br/>组织多批货物的持续运输。</T>
      <Diagram label="班轮的重复循环与不定期船按货批连接的对照"><path d="M133 676H618C706 676 706 778 618 778H133" fill="none" stroke="#238498" strokeWidth="4"/><path d="M913 745L1080 644L1200 731L1420 605" fill="none" stroke="#aa8e5f" strokeWidth="4"/></Diagram>
      <T x={878} y={373} size={48}>不定期船</T><T x={878} y={462} w={608} size={31}>围绕货批、合同与市场需求，<br/>安排具体航次。</T><T x={95} y={851} w={1400} size={26}>班轮可以运输滚装等货物；散货运输也可能形成长期、稳定的联系。</T>
    </Paper>;
    case 45:return <Paper page={page} tone="paper" source="教学配船模型 · 循环含航行与挂港；不计备用船、维修与复杂调度">
      <H>每周一班，需要多少艘船？</H><T x={95} y={231} size={31}>发班间隔 H ＝ 7 天，循环时间 T 包括航行与挂港。</T>
      <T x={95} y={360} size={54} className="lbl-serif">N = ⌈T / H⌉</T><T x={593} y={382} size={29} className="lbl-muted">向上取整，覆盖完整服务循环。</T><Rule x={95} y={484} w={1399}/>
      <T x={95} y={541} size={37}>70 天循环</T><T x={95} y={609} size={81} className="lbl-serif">70 ÷ 7 = <strong>10</strong></T><Reveal at={.33}><T x={850} y={541} size={37}>84 天循环</T><T x={850} y={609} size={81} className="lbl-serif" color="#177e92">84 ÷ 7 = <strong>12</strong></T></Reveal>
      <Reveal at={.64}><T x={95} y={812} size={31}>维持周班：需要增加 2 艘船，即 20% 的配置量。</T></Reveal><T x={95} y={876} size={23} className="lbl-muted">配置量变化，不代表运费或真实总成本按同一比例变化。</T>
    </Paper>;
    case 46:return <Paper page={page}>
      <H>多挂一港，会改变什么？</H><T x={95} y={232} size={31}>覆盖更多货源，也会改变绕行、港时与循环。</T>
      <Diagram label="原服务增加一个挂靠港后形成更长的连接与时间占用"><path d="M138 549H1450" fill="none" stroke="#8da9a840" strokeWidth="4"/><RouteStroke d="M138 549H565L799 384L1033 549H1450" color="#d8b575" width={6}/><circle cx="799" cy="384" r="15" fill="#d8b575"/><circle cx="138" cy="549" r="11" fill="#7bd0dc"/><circle cx="1450" cy="549" r="11" fill="#7bd0dc"/></Diagram>
      <T x={698} y={286} size={34} color="#ddbc87">新增挂靠</T><T x={96} y={611} size={29}>起点</T><T x={1398} y={611} size={29}>终点</T><Reveal at={.4}><T x={94} y={740} size={35}>新增货源与服务收入</T><T x={895} y={740} size={35}>增加的时间与资源占用</T></Reveal><T x={95} y={866} size={26} className="lbl-muted">合适的挂港数量，取决于这条服务的需求和约束。</T>
    </Paper>;
    case 47:return <Paper page={page} tone="paper">
      <H>直达与转运，怎样组织覆盖？</H><T x={95} y={235} size={31}>保持同一起讫点，比较本箱是否换船。</T>
      <Diagram label="直达本箱不换船，转运经枢纽卸下再装下一船"><path d="M306 453H1373M306 720H1373" stroke="#8aa397" strokeWidth="3"/><circle cx="838" cy="720" r="35" fill="#d1b57b"/><RouteStroke d="M306 453H1373" color="#258297" width={6}/><RouteStroke d="M306 720H1373" color="#b19153" at={.35} width={6}/></Diagram>
      <T x={95} y={392} size={40}>直达</T><T x={508} y={497} size={29}>本箱不换船，途中仍可挂港。</T><Reveal at={.34}><T x={95} y={657} size={40}>转运</T><T x={675} y={769} size={29}>经枢纽，卸船后接下一船。</T></Reveal><T x={95} y={867} size={26}>覆盖范围、衔接次数、班期与等待，需要一起权衡。</T>
    </Paper>;
    case 48:return <Paper page={page}>
      <H>枢纽、门户与腹地</H><T x={95} y={231} size={31}>海向转接与陆向连接，可以在同一港口同时存在。</T>
      <Diagram label="一个港口连接海向航线与陆向腹地的两类角色"><path d="M111 437L744 596L111 802M209 602H744" fill="none" stroke="#5dbdce" strokeWidth="5"/><path d="M844 596L1457 426M844 596H1430M844 596L1457 802" fill="none" stroke="#bca46f" strokeWidth="4" strokeDasharray="12 10"/><circle cx="794" cy="596" r="75" fill="#294951" stroke="#9fbbb7" strokeWidth="2"/></Diagram>
      <T x={744} y={565} size={40}>港口</T><T x={93} y={344} size={38} color="#6bcddc">海向转接</T><T x={1207} y={344} size={38} color="#d7bb85">陆向连接</T><T x={95} y={841} size={30}>角色由具体货流与功能确定，不是港口名称的永久标签。</T>
    </Paper>;
    case 49:return <Paper page={page} tone="paper" source="匿名教学舱位示意 · 不对应当前联盟、公司名单或真实合作合同">
      <H>船公司怎样合作提供服务？</H><T x={95} y={232} size={31}>船舶运营、舱位安排与商业销售，可以由不同主体参与。</T>
      <Diagram label="一艘教学船中不同色块表示不同主体安排的舱位，非船舶所有权份额"><path d="M137 543H1455L1348 744H231Z" fill="#375361"/><rect x="259" y="466" width="287" height="153" fill="#69999d"/><rect x="557" y="466" width="287" height="153" fill="#c4ab7e"/><rect x="855" y="466" width="287" height="153" fill="#819686"/><rect x="1155" y="517" width="142" height="102" fill="#69999d"/></Diagram>
      <T x={333} y={503} size={41} color="#f4f1e6">A</T><T x={641} y={503} size={41} color="#243c43">B</T><T x={940} y={503} size={41} color="#f4f1e6">C</T><Reveal at={.43}><T x={95} y={803} w={1370} size={32}>合作可以共享部分运输安排；参与合作的主体仍然是不同企业。</T></Reveal>
    </Paper>;
    case 50:return <Paper page={page} source="海陆衔接的概念解释 · AI生成江港场景">
      <Photo name="river-port" alt="内河与陆路接入港口的教学场景"/><Shade/><H y={173} w={1110} size={82}>海上网络，<br/>还要接上陆上网络。</H><T x={95} y={474} w={682} size={35}>港口把远洋服务，<br/>接到内河、铁路、公路与产业。</T><Reveal at={.41}><Rule x={95} y={710} w={107}/><T x={95} y={760} w={761} size={31}>它是接口，也是组织者。</T></Reveal>
    </Paper>;
    case 51:return <Paper page={page} tone="paper" source="港口角色的教学概括 · 上海、新加坡、鹿特丹与重庆果园港；角色可重叠">
      <H>不同港口，承担不同任务。</H><T x={95} y={230} size={31}>从具体连接看价值，比单看吞吐量更完整。</T>
      <T x={95} y={382} size={42}>上海</T><T x={558} y={389} w={928} size={31}>内河、沿海货源与远洋服务的接口</T><Rule x={95} y={465} w={1400}/><T x={95} y={502} size={42}>新加坡</T><T x={558} y={510} w={928} size={31}>区域与洲际联系中的海向转接</T><Rule x={95} y={589} w={1400}/><T x={95} y={626} size={42}>鹿特丹</T><T x={558} y={634} w={928} size={31}>欧洲腹地与多种专业货物的门户</T><Rule x={95} y={713} w={1400}/><T x={95} y={750} size={42}>果园港</T><T x={558} y={758} w={928} size={31}>内陆产业与长江、多式联运的连接</T>
    </Paper>;
    case 52:return <Paper page={page}>
      <H>管理要改善哪一个接口？</H><T x={95} y={232} size={31}>先看交付受阻的位置，再找需要改善的衔接。</T>
      <Rule x={802} y={367} w={1} h={441}/><T x={95} y={375} size={38} color="#d4b378">情境 A · 箱子难以提取</T><T x={95} y={473} w={633} size={30}>堆位与提箱顺序不匹配，<br/>导致重复搬移。</T><Reveal at={.24}><T x={95} y={661} w={632} size={31}>改善堆存与提取衔接，<br/>减少无效作业与后续等待。</T></Reveal>
      <T x={880} y={375} size={38} color="#6dcddd">情境 B · 车辆集中等候</T><T x={880} y={473} w={619} size={30}>提箱条件与到场窗口错位，<br/>车辆到达后无法及时交接。</T><Reveal at={.51}><T x={880} y={661} w={619} size={31}>改善信息、预约与作业衔接，<br/>提高交付的可预期性。</T></Reveal>
      <T x={95} y={863} w={1420} size={27}>管理对象是具体接口，收益要落到作业、时间与交付上。</T>
    </Paper>;
    case 53:return <Paper page={page} source="全球航道地理示意 · 非实时AIS；图示用于回顾网络关系">
      <LblGlobe x={440} w={1210} h={1000} global routes={[]} keys={[{at:0,latitude:10,longitude:-45,distance:3.7},{at:.55,latitude:17,longitude:70,distance:3.7}]} labels={["shanghai","singapore","rotterdam","hormuz","suez","panama"]}/><Shade/><H y={117} w={951} size={79}>全球货物、<br/>船舶与港口</H>
      <T x={95} y={441} w={716} size={35}>货物，形成需求。</T><Reveal at={.2}><T x={95} y={545} w={716} size={35}>船舶与码头，提供适配。</T></Reveal><Reveal at={.42}><T x={95} y={649} w={716} size={35}>网络，组织持续交付。</T></Reveal><Reveal at={.66}><T x={95} y={827} w={1250} size={30} color="#ddbd88">通道连接世界，接口决定货物能否顺利通过。</T></Reveal>
    </Paper>;
    case 54:return <Paper page={page} source="下一讲引题 · AI生成码头教学场景">
      <Photo name="terminal-aerial" alt="一艘船舶与码头资源共同组织装卸的场景"/><Shade/><T x={95} y={103} size={22} className="lbl-label">NEXT / TERMINAL OPERATIONS</T><H y={271} w={1179} size={86}>码头怎样把<br/>一艘船“做完”？</H><T x={97} y={588} w={875} size={34}>从看懂流程，<br/>进入作业组织、资源安排与完成条件。</T><Rule x={98} y={815} w={98} color="#d3b281"/>
    </Paper>;
    default:return null;
  }
}
