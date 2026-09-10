import type { PortLblPage } from "../../../../../packages/course-content/src/port-lbl";
import { Paper, Photo, Shade, H, T, Rule, Reveal, Box, Diagram, RouteStroke, Keyline, useLblPlayback, phase } from "./PortLblPrimitives";
import { LblGlobe, JOURNEY_CAMERA } from "./LblGlobe";

export function PortLblLessonTwo({page}:{page:PortLblPage}) {
  const {progress}=useLblPlayback();
  switch(page.localPage) {
    case 1: return <Paper page={page} className="lbl-l2-cover" source="教学情境 · AI生成场景">
      <Photo name="container-dawn" alt="清晨码头上的蓝色教学集装箱"/>
      <Shade style={{background:"linear-gradient(90deg,#071423e6 0%,#071423b0 35%,transparent 76%)"}}/>
      <T x={91} y={102} size={21} className="lbl-label">PORT MANAGEMENT / LECTURE 02</T>
      <H x={82} y={248} w={790} size={91}>一只集装箱<br/>如何走向<strong>世界？</strong></H>
      <Rule x={91} y={543} w={90} h={3} color="#d1b384"/>
      <T x={91} y={586} size={31}>从工厂到客户的完整旅程</T>
      <T x={91} y={796} size={23} color="#dce6eb">重庆 · 上海 · 鹿特丹 · 欧洲腹地</T>
    </Paper>;
    case 2: return <Paper page={page} source="教学订单 · AI生成场景">
      <Photo name="factory-order" alt="制造车间中的普通工业零部件与待装货集装箱"/>
      <Shade style={{background:"linear-gradient(90deg,#081622ed 0%,#081622bb 43%,transparent 88%)"}}/>
      <T x={88} y={104} size={22} className="lbl-label" color="#7dd6df">一票海外订单</T>
      <H x={84} y={190} w={760} size={77}>重庆发货，<br/>欧洲交付</H>
      <T x={90} y={459} w={510} size={32}>普通工业零件<br/>装入一个40英尺干货箱</T>
      <Reveal at={.23}><Rule x={90} y={625} w={500}/><T x={90} y={660} size={25} className="lbl-muted">出发地</T><T x={90} y={705} size={38}>重庆</T></Reveal>
      <Reveal at={.52}><T x={324} y={660} size={25} className="lbl-muted">交付地</T><T x={324} y={705} w={320} size={38}>杜伊斯堡附近</T></Reveal>
      <T x={1110} y={805} size={24} color="#fff">教学箱 C-01</T>
    </Paper>;
    case 3: return <Paper page={page} source="教学路线 · 地理示意，非实时AIS">
      <LblGlobe x={390} y={10} w={1240} h={960} keys={JOURNEY_CAMERA} labels={["shanghai","singapore","suez","rotterdam"]}/>
      <Shade style={{background:"linear-gradient(90deg,#0b1722 0%,#0b1722e6 24%,transparent 63%)"}}/>
      <T x={88} y={104} size={22} className="lbl-label" color="#7dcbd8">从这里，走向世界</T>
      <H x={84} y={196} w={520} size={73}>这只箱子的<br/>完整旅程</H>
      <T x={90} y={434} w={420} size={31}>内河接入远洋。<br/>海港再连接客户所在的腹地。</T>
      <Rule x={90} y={628} w={340}/>
      <T x={90} y={669} w={450} size={26} className="lbl-muted">工具改变，<br/>箱子的身份始终延续。</T>
    </Paper>;
    case 4: return <Paper page={page} tone="paper">
      <T x={88} y={91} size={22} className="lbl-label">ONE DELIVERY / MANY HANDOVERS</T>
      <H y={151} size={69}>一次交付，谁在接力？</H>
      <Diagram label="货主经运输组织、码头与承运人连接收货人的接力关系">
        <RouteStroke d="M190 526 H1410" color="#b6c4c3" width={2}/>
        <RouteStroke d="M430 526 V355 H1140 V526" at={.22} end={.7} color="#15788b" width={3}/>
        <circle cx="190" cy="526" r="9" fill="#177d8d"/><circle cx="1410" cy="526" r="9" fill="#177d8d"/>
      </Diagram>
      <T x={105} y={566} w={210} size={35} weight={600}>货主</T><T x={105} y={623} w={220} size={25} className="lbl-muted">提出货物与交付需求</T>
      <Reveal at={.18}><T x={426} y={274} size={30} weight={600}>货代 / 运输组织</T><T x={430} y={376} w={660} size={26}>协调服务、信息与衔接</T></Reveal>
      <Reveal at={.32}><T x={422} y={566} size={33}>内陆承运人</T><T x={422} y={623} w={220} size={25} className="lbl-muted">接入与配送</T></Reveal>
      <Reveal at={.45}><T x={758} y={566} size={33}>码头</T><T x={758} y={623} w={220} size={25} className="lbl-muted">装卸与场内衔接</T></Reveal>
      <Reveal at={.57}><T x={1061} y={566} size={33}>船公司</T><T x={1061} y={623} w={240} size={25} className="lbl-muted">海上运输服务</T></Reveal>
      <T x={1310} y={566} w={200} size={35} weight={600}>收货人</T>
      <Rule x={88} y={788} w={1424}/><T x={90} y={826} w={1400} size={29}>共同完成一次交付，并不意味着由同一家企业完成所有环节。</T>
    </Paper>;
    case 5: return <Paper page={page} tone="paper" source="货物、箱体与船舶的概念关系 · AI生成场景">
      <H y={112} size={70}>货物、集装箱与船舶</H>
      <Photo name="factory-order" alt="箱内运输的工业零件教学场景" x={88} y={285} w={405} h={333} style={{clipPath:"polygon(0 0,100% 0,88% 100%,0 100%)",objectPosition:"85% 80%"}}/>
      <Box x={512} y={367} w={545}/>
      <Photo name="ocean-voyage" alt="承运集装箱的远洋船舶教学场景" x={1085} y={285} w={425} h={333} style={{clipPath:"polygon(12% 0,100% 0,100% 100%,0 100%)",objectPosition:"85% 75%"}}/>
      <T x={89} y={670} size={41} weight={600}>货物</T><T x={89} y={741} w={360} size={28}>完成交付</T>
      <T x={594} y={670} size={41} weight={600}>集装箱</T><T x={594} y={741} w={390} size={28}>继续周转</T>
      <T x={1110} y={670} size={41} weight={600}>船舶</T><T x={1110} y={741} w={390} size={28}>继续航次</T>
      <Rule x={515} y={692} w={1} h={95}/><Rule x={1040} y={692} w={1} h={95}/>
    </Paper>;
    case 6: return <Paper page={page} source="箱型口径：承运人公开资料 · 箱体为教学示意">
      <H x={90} y={108} size={66}>一个40英尺干货箱</H>
      <T x={93} y={220} w={1000} size={30} className="lbl-muted">标准化的运输单元，让多种运输方式能够接力。</T>
      <Box x={330} y={284} w={880}/>
      <Diagram label="集装箱箱体、角件与箱门位置标注">
        <path d="M365 417V346H130 M1160 424V346H1430 M1150 700H1400V735" fill="none" stroke="#82bbc5" strokeWidth="2"/>
      </Diagram>
      <Reveal at={.18}><T x={98} y={294} size={27}>角件 / 吊装接口</T></Reveal>
      <Reveal at={.36}><T x={1153} y={294} size={27}>箱门与身份记录</T></Reveal>
      <Reveal at={.55}><T x={1240} y={755} w={260} size={27}>箱体 / 运输单元</T></Reveal>
      <T x={90} y={855} w={1400} size={26} className="lbl-muted">20英尺箱 ≈ 1 TEU　　40英尺箱 ≈ 2 TEU　　TEU是换算单位，不是货重。</T>
    </Paper>;
    case 7: return <Paper page={page} tone="paper" source="教学订舱信息 · 具体条件以承运人安排为准">
      <T x={88} y={97} size={22} className="lbl-label">BOOKING A SERVICE</T><H y={158} w={790} size={68}>订舱：<br/>预留一段运输服务</H>
      <T x={90} y={404} w={520} size={31}>起讫点、货物、用箱和时间，<br/>共同定义运输需求。</T>
      <T x={90} y={707} w={530} size={28} className="lbl-callout">一项海运报价，<br/>未必包含端到端的全部费用。</T>
      <Rule x={790} y={147} w={1} h={683}/>
      <T x={867} y={161} size={23} className="lbl-label">教学订舱信息</T>
      <Reveal at={.12}><Keyline x={868} y={253} w={570} label="起运与目的地" body="上海 → 鹿特丹；继续连接客户腹地"/></Reveal>
      <Reveal at={.3}><Keyline x={868} y={411} w={570} label="货物与用箱" body="普通工业零件 / 一个40英尺干货箱"/></Reveal>
      <Reveal at={.5}><Keyline x={868} y={569} w={570} label="时间要求" body="预计出运时间 / 目标交付窗口"/></Reveal>
      <Reveal at={.7}><Rule x={868} y={747} w={570}/><T x={868} y={773} w={570} size={27}>运输服务由具体条件共同确定。</T></Reveal>
    </Paper>;
    case 8: return <Paper page={page} source="普通整箱货教学情境 · AI生成场景">
      <Photo name="factory-order" alt="工厂装货的教学场景" x={470} w={1130}/><Shade/>
      <T x={89} y={100} size={23} className="lbl-label" color="#8acbd3">BEFORE DEPARTURE</T><H y={181} w={540} size={75}>提箱与装箱</H>
      <T x={90} y={333} w={480} size={31}>箱子先抵达工厂，<br/>货物才进入运输单元。</T>
      <Diagram label="空箱场到工厂再到装货的教学过程"><RouteStroke d="M112 605H490V745H1050" width={3}/></Diagram>
      <Box x={100+690*phase(progress,.15,.75)} y={500+135*phase(progress,.43,.75)} w={330}/>
      <T x={90} y={770} size={27}>提取空箱</T><Reveal at={.3}><T x={421} y={800} size={27}>运至工厂</T></Reveal><Reveal at={.66}><T x={1120} y={765} size={32}>装货</T></Reveal>
    </Paper>;
    case 9: return <Paper page={page} tone="paper" source="交接概念 · 箱体与封志为教学示意">
      <H y={113} size={70}>封志与箱号记录</H>
      <Box x={-230} y={250} w={1080} style={{clipPath:"inset(0 0 17% 27%)"}}/>
      <T x={969} y={296} w={475} size={38} weight={600}>同一只箱子，<br/>需要可核对的身份。</T>
      <Reveal at={.2}><Keyline x={967} y={472} w={465} label="箱体身份" body="确认交接的是哪一个运输单元"/></Reveal>
      <Reveal at={.48}><Keyline x={967} y={642} w={465} label="封志记录" body="将箱门上的封志与记录对应"/></Reveal>
      <T x={92} y={846} w={1350} size={27} className="lbl-muted">封志不替代包装质量、质量核实与监管检查。</T>
    </Paper>;
    case 10: return <Paper page={page}>
      <H y={108} size={70}>货物移动，信息也在流动</H><T x={91} y={224} w={1280} size={30} className="lbl-muted">位置与状态，是两条需要衔接的线。</T>
      <T x={88} y={380} size={24} color="#79cfde">实物流</T><T x={88} y={642} size={24} color="#d1b482">信息流</T>
      <Diagram label="实物流与信息流在工厂码头船舶和客户之间衔接">
        <RouteStroke d="M230 429H1440" width={4}/><RouteStroke d="M230 686H1440" at={.05} end={.55} color="#c5aa78" width={3}/>
        <path d="M560 449V663M1020 449V663" stroke="#758894" strokeDasharray="5 9" strokeWidth="2"/>
      </Diagram>
      <Box x={160+1040*phase(progress,.15,.85)} y={317} w={270}/>
      <T x={232} y={477} size={28}>工厂</T><T x={530} y={477} size={28}>码头</T><T x={992} y={477} size={28}>船舶</T><T x={1380} y={477} size={28}>客户</T>
      <Reveal at={.1}><T x={233} y={727} size={27}>货物与订舱信息</T></Reveal><Reveal at={.34}><T x={679} y={727} size={27}>作业条件与指令</T></Reveal><Reveal at={.57}><T x={1167} y={727} size={27}>交付与状态记录</T></Reveal>
      <T x={92} y={840} w={1400} size={26} className="lbl-muted">信息可以提前传递，也可能滞后更新；它并不随箱子同步移动。</T>
    </Paper>;
    case 11: return <Paper page={page} tone="paper" source="IMO · Verified Gross Mass / VGM">
      <T x={85} y={80} size={140} className="lbl-english" color="#a2b1af">VGM</T>
      <H x={91} y={251} w={980} size={63}>装船前，需要准确的总质量</H>
      <T x={92} y={368} w={720} size={30}>经核实的集装箱总质量，<br/>是适用海船装船的条件之一。</T>
      <Box x={831} y={346} w={660}/>
      <Reveal at={.25}><T x={92} y={602} size={40} weight={600}>箱体自重 <span style={{fontWeight:300}}>＋</span> 箱内全部物品</T><Rule x={92} y={685} w={703}/></Reveal>
      <Reveal at={.55}><T x={92} y={719} size={33} color="#147a88">支持配载安排与船舶安全</T></Reveal>
      <T x={946} y={747} w={486} size={27} className="lbl-callout">取得VGM，<br/>并不保证必然装船。</T>
    </Paper>;
    case 12: return <Paper page={page}>
      <H y={111} size={69}>截止时间与交付窗口</H><T x={92} y={229} w={1300} size={30} className="lbl-muted">箱子、信息与运力，要在各自窗口内接上下一步。</T>
      <Diagram label="信息和箱子在不同截止窗口内到位的教学时间轴">
        <path d="M215 750H1430" stroke="#81919a" strokeWidth="2"/>
        <rect x="760" y="356" width="106" height="374" fill="#6dd4e015"/><rect x="1057" y="356" width="106" height="374" fill="#d4b57915"/>
        <path d="M810 345V785M1110 345V785" stroke="#8ca4ad" strokeWidth="2" strokeDasharray="5 8"/>
        <RouteStroke d="M241 478H805" color="#61c9da"/><RouteStroke d="M241 639H1104" at={.2} color="#d1b47e"/>
      </Diagram>
      <T x={235} y={396} size={29}>信息到位</T><T x={235} y={555} size={29}>箱子到位</T>
      <T x={712} y={796} size={26}>信息截止</T><T x={1022} y={796} size={26}>作业衔接窗口</T>
      <Reveal at={.65}><T x={1195} y={412} w={254} size={31}>准备完成，<br/>接入下一程。</T></Reveal>
      <T x={93} y={858} w={1050} size={24} className="lbl-muted">教学时间轴：具体截点因承运人、码头与业务安排而异。</T>
    </Paper>;
    case 13: return <Paper page={page} source="重庆市交通运输委 · 果园港枢纽作用；AI生成江港场景">
      <Photo name="river-port" alt="内河港与长江走廊的教学场景"/><Shade/>
      <T x={88} y={105} size={22} className="lbl-label">CHONGQING / GUOYUAN</T><H y={224} w={640} size={83}>从工厂，<br/>走进长江。</H>
      <Rule x={91} y={482} w={120} color="#cfad78"/><T x={91} y={538} w={470} size={34}>果园港把内陆货源<br/>接入更远的运输网络。</T>
      <Reveal at={.42}><T x={90} y={778} size={27}>C-01 的第一段水上旅程即将开始。</T></Reveal>
    </Paper>;
    case 14: return <Paper page={page} tone="paper">
      <H>进入码头：交接与场内组织</H><T x={92} y={229} w={1200} size={32}>箱子离开公路运输，接入港内作业。</T>
      <Diagram label="公路车辆经交接进入堆场，再由内河船承运的示意"><path d="M80 646H1520" stroke="#b3bbb6" strokeWidth="50"/><path d="M560 404V734M681 404V734M560 420H681" stroke="#758880" strokeWidth="13"/><path d="M1140 430H1440V689H1140Z" fill="#176b761c"/><RouteStroke d="M160 627H1220" color="#1e8193" width={5}/><text x="572" y="787">交接点</text><text x="1210" y="787">待装区</text></Diagram>
      <Box x={126+1020*phase(progress,.08,.74)} y={493} w={233}/>
      <Reveal at={.76}><T x={93} y={840} size={31}>下一步：按装船安排，提取这只箱子。</T></Reveal>
    </Paper>;
    case 15: return <Paper page={page}>
      <H>箱子登上内河船</H><T x={93} y={234} size={32} className="lbl-muted">抓取 → 提升 → 水平移动 → 落位</T>
      <Diagram label="岸吊把教学箱从岸上移入内河船的四阶段示意"><rect x="0" y="730" width="780" height="220" fill="#45585b"/><rect x="780" y="780" width="820" height="170" fill="#144653"/><path d="M610 727V368H1250M645 727V370M500 370H1200" stroke="#a6adb0" strokeWidth="12" fill="none"/><path d="M910 738H1440L1395 803H965Z" fill="#71828a"/><path d={`M${490+640*phase(progress,.35,.68)} 373V${613-186*phase(progress,.12,.34)+195*phase(progress,.7,.92)}`} stroke="#c8c5b0" strokeWidth="3"/><text x="122" y="804">岸侧</text><text x="1135" y="864">内河船</text></Diagram>
      <Box x={380+640*phase(progress,.35,.68)} y={585-186*phase(progress,.12,.34)+195*phase(progress,.7,.92)} w={240}/>
      <T x={91} y={872} size={26}>船型改变，箱子的身份延续。</T>
    </Paper>;
    case 16: return <Paper page={page} source="长江走廊 · 路线为教学概括，非通航图；AI生成背景">
      <Photo name="river-port" alt="长江内河运输场景" style={{opacity:.25}}/><Shade style={{background:"linear-gradient(0deg,#0b1722,transparent)"}}/><H y={88}>沿长江向东</H>
      <T x={92} y={220} size={32}>上游货源，经内河走廊连接沿海接口。</T>
      <Diagram label="长江由西向东连接重庆三峡武汉南京和上海的概念走廊"><path d="M150 646C330 420 345 793 561 596S820 723 934 571S1200 650 1450 483" fill="none" stroke="#61cddd25" strokeWidth="45"/><RouteStroke d="M150 646C330 420 345 793 561 596S820 723 934 571S1200 650 1450 483" width={7}/><circle cx="150" cy="646" r="8" fill="#eee5ce"/><circle cx="561" cy="596" r="8" fill="#eee5ce"/><circle cx="934" cy="571" r="8" fill="#eee5ce"/><circle cx="1265" cy="559" r="8" fill="#eee5ce"/><circle cx="1450" cy="483" r="8" fill="#eee5ce"/></Diagram>
      <T x={103} y={690} size={33}>重庆</T><Reveal at={.2}><T x={516} y={479} size={33}>三峡</T></Reveal><Reveal at={.4}><T x={888} y={635} size={33}>武汉</T></Reveal><Reveal at={.6}><T x={1216} y={617} size={33}>南京</T></Reveal><Reveal at={.78}><T x={1400} y={392} size={33}>上海</T></Reveal>
      <T x={91} y={858} size={24} className="lbl-muted">西部腹地 → 长江经济带 → 海上网络</T>
    </Paper>;
    case 17: return <Paper page={page} tone="steel" source="内河通行条件的概念解释 · AI生成江港场景">
      <H w={740}>内河通行，<br/>也有衔接条件。</H><Photo name="river-port" alt="受水情与通行组织影响的内河运输" x={824} y={0} w={776} h={1000} className="lbl-light-window"/>
      <Rule x={95} y={381} w={582}/><T x={96} y={423} size={37}>水情与船型</T><T x={96} y={488} w={640} size={28} className="lbl-muted">水位、吃水与可用运力需要相匹配。</T>
      <Reveal at={.3}><Rule x={95} y={574} w={582}/><T x={96} y={617} size={37}>通行与班期</T><T x={96} y={682} w={645} size={28} className="lbl-muted">上游通行安排，连接下游换装窗口。</T></Reveal>
      <Reveal at={.68}><T x={95} y={822} w={665} size={30} color="#e1c18d">一段运输，要接得上下一段。</T></Reveal>
    </Paper>;
    case 18: return <Paper page={page} tone="paper" source="船闸单级原理简化 · 三峡船闸为多级衔接，区别于升船机">
      <H>船闸：水位改变，船舶随之升降。</H><T x={95} y={223} size={30}>以下演示由高水位向低水位通行。</T>
      <Diagram label="上游船进入闸室，关闸降水，水位与下游齐平后出闸"><defs><clipPath id="lbl-lock-water"><path d="M85 432H1505V816H85Z"/></clipPath></defs><path d="M85 823H1505" stroke="#aaa99a" strokeWidth="25"/>
        <g clipPath="url(#lbl-lock-water)"><rect x="85" y="509" width="401" height="307" fill="#147a993b"/><rect x="486" y={509+172*phase(progress,.4,.68)} width="571" height="307" fill="#147a995e"/><rect x="1057" y="681" width="448" height="135" fill="#147a993b"/></g>
        <path d={`M486 ${460+355*(1-phase(progress,.22,.32))}V824M1057 ${460+355*phase(progress,.73,.83)}V824`} stroke="#877c5d" strokeWidth="15"/>
        <g transform={`translate(${145+477*phase(progress,0,.2)+523*phase(progress,.84,1)} ${465+172*phase(progress,.4,.68)})`}><path d="M0 0H221L193 45H27Z" fill="#284b59"/><rect x="32" y="-38" width="106" height="35" fill="#64a5b8"/><rect x="145" y="-44" width="35" height="41" fill="#d4c5a7"/></g>
        <text x="198" y="881">上游高水位</text><text x="659" y="881">闸室</text><text x="1176" y="881">下游低水位</text>
      </Diagram>
      <T x={95} y={321} size={34} color="#16728a">{progress<.22?"① 船舶进入闸室":progress<.4?"② 关闭上游闸门":progress<.73?"③ 闸室水位降至下游水位":progress<.84?"④ 打开下游闸门":"⑤ 船舶驶出，继续航程"}</T>
    </Paper>;
    case 19: return <Paper page={page} source="港群层面的教学连接 · AI生成码头场景">
      <Photo name="terminal-aerial" alt="内河与远洋船舶衔接的海港教学场景"/><Shade/>
      <T x={91} y={110} size={23} className="lbl-label">SHANGHAI / SEA–RIVER INTERFACE</T><H y={260} w={620} size={84}>长江抵达海洋。</H><T x={93} y={426} w={550} size={39}>上海：<br/>内河与远洋的接口。</T>
      <Reveal at={.48}><Rule x={92} y={650} w={90}/><T x={93} y={702} w={530} size={29}>C-01 从水侧进入海港，<br/>准备换装远洋船。</T></Reveal>
    </Paper>;
    case 20: return <Paper page={page} tone="paper" source="教学选定工艺 · 经堆场衔接的水水换装">
      <H>从一条船，交给下一条船。</H><T x={92} y={236} size={31}>本例经堆场衔接，并非直接船对船。</T>
      <Diagram label="内河船卸船到堆场，再从堆场装远洋船的水水换装路径"><path d="M95 679H428L397 736H139Z" fill="#326476"/><path d="M1127 659H1502L1448 752H1180Z" fill="#326476"/><rect x="130" y="630" width="211" height="44" fill="#9aaea5"/><rect x="1190" y="568" width="206" height="84" fill="#9aaea5"/><path d="M625 555H969V735H625Z" fill="#baae9127" stroke="#8d8f7a"/><RouteStroke d="M276 573C447 337 533 375 665 520" color="#168399"/><RouteStroke d="M932 520C1052 341 1195 363 1300 528" color="#168399" at={.45}/><text x="199" y="788">内河船</text><text x="722" y="788">堆场</text><text x="1264" y="788">远洋船</text></Diagram>
      <Reveal at={.15}><T x={422} y={395} size={30}>卸船</T></Reveal><Box x={652} y={541} w={290}/><Reveal at={.6}><T x={1077} y={395} size={30}>再装船</T></Reveal>
    </Paper>;
    case 21: return <Paper page={page} source="港口经济与管理 · 集装箱码头空间；AI生成教学全景">
      <Photo name="terminal-aerial" alt="海面岸线堆场与陆侧一体的集装箱码头"/><Shade style={{background:"linear-gradient(0deg,#071423ee,transparent 70%)"}}/>
      <H x={87} y={77} size={65} style={{textShadow:"0 2px 18px #000"}}>集装箱码头的四个空间</H>
      <Diagram label="依次识别水侧、岸线、堆场和陆侧"><path d="M275 393L382 293M758 515L675 412M1104 662L1150 563M1375 842L1418 760" stroke="#e7e5d1" strokeWidth="2"/></Diagram>
      <T x={104} y={375} size={42}>水侧</T><Reveal at={.2}><T x={741} y={523} size={42}>岸线</T></Reveal><Reveal at={.4}><T x={987} y={669} size={42}>堆场</T></Reveal><Reveal at={.6}><T x={1232} y={838} size={42}>陆侧</T></Reveal>
      <T x={91} y={814} w={800} size={32}>交换发生在接口，<br/>衔接贯穿整个码头。</T>
    </Paper>;
    case 22: return <Paper page={page}>
      <H w={690}>卸下内河船</H><T x={93} y={236} w={670} size={34}>船岸交接，把箱子交给码头。</T>
      <Diagram label="教学箱由内河船吊起后落至码头车辆"><rect x="810" y="726" width="790" height="220" fill="#41585c"/><rect x="0" y="781" width="810" height="165" fill="#125364"/><path d="M140 743H635L583 804H197Z" fill="#75888c"/><path d="M945 727V350H325M1000 727V350M849 350H1210" stroke="#bab7a4" strokeWidth="13"/><path d={`M${394+780*phase(progress,.4,.68)} 355V${631-170*phase(progress,.08,.32)+131*phase(progress,.73,.94)}`} stroke="#ddd3b7" strokeWidth="3"/><rect x="1080" y="704" width="270" height="20" fill="#d3b17d"/><circle cx="1120" cy="735" r="18" fill="#091522"/><circle cx="1285" cy="735" r="18" fill="#091522"/></Diagram>
      <Box x={300+780*phase(progress,.4,.68)} y={604-170*phase(progress,.08,.32)+131*phase(progress,.73,.94)} w={230}/>
      <T x={91} y={855} size={29} className="lbl-muted">同一个 C-01，从船上进入场内作业链。</T>
    </Paper>;
    case 23: return <Paper page={page} tone="paper">
      <H>水平运输：把岸边接到堆场。</H><T x={92} y={231} size={31}>车辆周转与两端作业，需要相互衔接。</T>
      <Diagram label="运载箱子的车辆由岸边沿场内车道到达堆场"><path d="M100 645H1500" stroke="#b6b7aa" strokeWidth="112"/><path d="M100 645H1500" stroke="#e8e7da" strokeWidth="3" strokeDasharray="22 16"/><path d="M204 459V584M1290 414V584" stroke="#4b6f73" strokeWidth="11"/><text x="140" y="766">岸边交接</text><text x="1214" y="766">堆场交接</text>
        <g transform={`translate(${140+1040*phase(progress,.1,.85)} 587)`}><path d="M0 0H278V24H0Z" fill="#697a78"/><circle cx="35" cy="39" r="17" fill="#17333b"/><circle cx="238" cy="39" r="17" fill="#17333b"/></g></Diagram>
      <Box x={133+1040*phase(progress,.1,.85)} y={426} w={265}/><T x={93} y={841} w={1380} size={28}>人工驾驶车辆与自动化车辆，是不同配置；AGV 并非所有码头的必备设备。</T>
    </Paper>;
    case 24: return <Paper page={page}>
      <H w={830}>堆场：箱子暂时停在哪里？</H><T x={95} y={234} w={740} size={32}>堆位安排，要看下一次提取。</T>
      <Diagram label="俯视堆场的堆区与车道，教学箱沿通道进入指定堆区"><defs><pattern id="lbl-yard" width="118" height="64" patternUnits="userSpaceOnUse"><rect x="6" y="7" width="102" height="43" fill="#57747d"/><path d="M16 10V45M26 10V45M36 10V45M46 10V45M56 10V45M66 10V45M76 10V45M86 10V45M96 10V45" stroke="#263f49" strokeWidth="2"/></pattern></defs>
        <path d="M710 362H1490V803H710Z" fill="#829c9b13" stroke="#56757e"/><rect x="750" y="405" width="236" height="128" fill="url(#lbl-yard)"/><rect x="1174" y="405" width="236" height="128" fill="url(#lbl-yard)"/><rect x="750" y="669" width="236" height="128" fill="url(#lbl-yard)"/><rect x="1174" y="669" width="236" height="128" fill="url(#lbl-yard)"/>
        <RouteStroke d="M690 595H1080V473" width={5}/><rect x={696+337*phase(progress,.1,.45)} y={568-108*phase(progress,.5,.8)} width="90" height="47" fill="#68d3dd"/><text x="744" y="859">堆区</text><text x="1040" y="859">通道</text><text x="1249" y="859">堆区</text></Diagram>
      <T x={95} y={429} w={487} size={43}>缓冲</T><T x={95} y={503} w={483} size={29} className="lbl-muted">暂存箱子，吸收不同环节的节奏差异。</T><Reveal at={.52}><Rule x={96} y={648} w={429}/><T x={95} y={684} w={474} size={36}>占用，也会累积。</T><T x={95} y={748} w={490} size={28} className="lbl-muted">停留越久，可用空间越少。</T></Reveal>
    </Paper>;
    case 25: return <Paper page={page} tone="paper">
      <H w={1320}>取出一个箱子，先移动另一个。</H><T x={92} y={229} size={30}>堆叠节约空间，也可能增加重复搬移。</T>
      <Diagram label="先把压在目标箱上的箱子移到旁边，再提取目标箱"><path d="M100 804H1480" stroke="#86938c" strokeWidth="5"/><rect x="1040" y="561" width="332" height="243" fill="none" stroke="#81958a" strokeWidth="2" strokeDasharray="8 8"/><path d="M463 437V354H1209V545" fill="none" stroke="#71887c" strokeWidth="2" strokeDasharray="8 9"/><text x="1109" y="855">临时移位</text></Diagram>
      <Box x={320} y={578-314*phase(progress,.69,.97)} w={373}/><Box x={320+704*phase(progress,.24,.48)} y={442-180*phase(progress,.05,.23)+316*phase(progress,.49,.65)} w={373} label="需要先移位的上层箱" style={{filter:"sepia(.9) saturate(.5)"}}/>
      <T x={91} y={638-314*phase(progress,.69,.97)} w={203} size={28} color="#166f83">目标箱<br/>C-01</T><Reveal at={.71}><T x={772} y={336} w={623} size={38}>这一次额外搬移，<br/>叫作“翻箱”。</T></Reveal>
    </Paper>;
    case 26: return <Paper page={page} source="上半讲回顾 · AI生成场景">
      <Photo name="container-dawn" alt="进入堆场等待后续装船的教学箱" x={570} y={0} w={1030} h={1000} style={{opacity:.45}}/><Shade/><H y={151} w={1130} size={80}>箱子就位，<br/>信息也要就位。</H>
      <Rule x={95} y={415} w={97} color="#d2b684"/><T x={95} y={477} w={697} size={35}>物理位置，决定箱子在哪里。<br/>作业条件，决定它能否继续。</T>
      <Reveal at={.4}><T x={95} y={705} w={780} size={32} color="#69cddd">下一程的衔接，已经开始。</T></Reveal>
    </Paper>;
    case 27: return <Paper page={page} source="泊位窗口的概念解释 · AI生成码头场景">
      <Photo name="ocean-voyage" alt="即将进入港口作业窗口的远洋船舶" x={760} w={840} h={1000} style={{opacity:.65}} className="lbl-light-window"/>
      <H y={138} w={815} size={78}>船舶与码头，<br/>在时间上相遇。</H><T x={95} y={372} w={668} size={31}>泊位、岸桥和船舶到港安排，共同形成作业窗口。</T>
      <Diagram label="船舶可用时间和泊位可用时间的交集"><path d="M99 577H723M99 730H723" stroke="#d9e1d230" strokeWidth="2"/><rect x="248" y="548" width="369" height="57" fill="#60c9d8"/><rect x="423" y="703" width="290" height="57" fill="#cdb080"/><rect x="423" y="523" width="194" height="267" fill="#fff1" stroke="#eee6cf" strokeDasharray="4 6"/></Diagram>
      <T x={98} y={620} size={24}>船舶</T><T x={98} y={800} size={24}>泊位</T><Reveal at={.48}><T x={417} y={812} size={29} color="#e1c792">共同窗口</T></Reveal>
    </Paper>;
    case 28: return <Paper page={page} tone="paper" source="IMO · 核实总质量与装船条件；配载图为概念简化">
      <H>配载：箱子上船有位置。</H><T x={93} y={229} size={31}>目的港、质量与船舶安全等条件，影响箱子的安排。</T>
      <Diagram label="船舶横剖面简化舱位，不对应生产配载方案"><defs><pattern id="lbl-stow" width="136" height="89" patternUnits="userSpaceOnUse"><rect x="5" y="5" width="124" height="77" fill="#6c9392"/></pattern><clipPath id="lbl-hull"><path d="M411 470H1483L1344 806H535Z"/></clipPath></defs><path d="M411 470H1483L1344 806H535Z" fill="#314e5b"/><g clipPath="url(#lbl-hull)"><rect x="483" y="475" width="926" height="292" fill="url(#lbl-stow)"/><rect x="819" y="539" width="124" height="77" fill="#d2ac6d"/></g><path d="M382 476H1515" stroke="#547478" strokeWidth="4"/><text x="840" y="867">船舶横剖面示意</text></Diagram>
      <T x={95} y={416} w={279} size={42}>装在哪里，<br/>有约束。</T><Reveal at={.4}><T x={95} y={616} w={271} size={28} className="lbl-muted">本图用于理解舱位，<br/>不作为实际配载方案。</T></Reveal>
    </Paper>;
    case 29: return <Paper page={page}>
      <H>装船前的作业接力</H><T x={95} y={227} size={31}>堆场提取 → 水平运输 → 岸桥作业</T>
      <Diagram label="箱子从堆场移向岸桥的作业衔接"><path d="M125 752H1464" stroke="#5c7a80" strokeWidth="6"/><path d="M220 754V431H502V754M1111 754V377H1490" stroke="#aab2a7" strokeWidth="12"/><rect x="271" y="671" width="182" height="77" fill="#557b86"/><path d="M603 647H892V669H603Z" fill="#cfba93"/><circle cx="639" cy="689" r="17" fill="#405c6a"/><circle cx="853" cy="689" r="17" fill="#405c6a"/><RouteStroke d="M360 413H749V584H1266V437" width={3}/><text x="254" y="819">堆场提取</text><text x="658" y="819">水平运输</text><text x="1231" y="819">岸边交接</text></Diagram>
      <Box x={268+390*phase(progress,.2,.4)+583*phase(progress,.57,.8)} y={535-125*phase(progress,0,.17)+98*phase(progress,.42,.54)-100*phase(progress,.83,1)} w={225}/>
    </Paper>;
    case 30: return <Paper page={page}>
      <H>岸桥把箱子送上船</H><T x={94} y={226} size={31}>一只箱子的落位，完成一次船岸交接。</T>
      <Diagram label="岸桥从车辆抓取集装箱移至远洋船舱位"><rect x="0" y="760" width="806" height="187" fill="#3a5258"/><rect x="806" y="822" width="794" height="125" fill="#154b61"/><path d="M960 735H1500L1455 831H1020Z" fill="#75858a"/><path d="M700 756V345H1441M758 756V345M536 345H1441" stroke="#c0b69f" strokeWidth="13"/><path d={`M${446+820*phase(progress,.34,.67)} 352V${645-215*phase(progress,.05,.29)+190*phase(progress,.72,.94)}`} stroke="#dfd3b9" strokeWidth="3"/><rect x="1010" y="663" width="118" height="64" fill="#5e7f87"/><rect x="1400" y="663" width="75" height="64" fill="#8d8c7c"/></Diagram>
      <Box x={330+820*phase(progress,.34,.67)} y={618-215*phase(progress,.05,.29)+190*phase(progress,.72,.94)} w={235}/>
      <Reveal at={.94}><T x={94} y={856} size={32} color="#71d2db">箱子已落位。对应的作业状态仍需记录。</T></Reveal>
    </Paper>;
    case 31: return <Paper page={page} tone="paper">
      <H>陆侧还有其他箱子</H><T x={92} y={227} size={31}>公路、铁路与内河，从不同方向接入同一码头。</T>
      <Diagram label="内河、公路和铁路分支接入港口，C-01仅沿水水换装主线"><path d="M123 402C650 402 440 614 830 614H1440" stroke="#16869b" strokeWidth="7" fill="none"/><path d="M123 637H599L830 614M123 808H563L830 614" stroke="#8c9d953b" strokeWidth="6" fill="none"/><rect x="812" y="541" width="268" height="148" fill="#d8d7c7"/><RouteStroke d="M123 402C650 402 440 614 830 614H1440" color="#1c8797" width={4}/></Diagram>
      <T x={96} y={329} size={34} color="#157b8d">内河 · C-01</T><T x={96} y={561} size={33} className="lbl-muted">公路</T><T x={96} y={731} size={33} className="lbl-muted">铁路</T><T x={878} y={590} size={35}>码头</T><T x={1348} y={676} size={31}>远洋</T>
      <T x={842} y={793} w={658} size={28}>本箱从水侧进入。<br/>其他箱子可以经陆侧进港。</T>
    </Paper>;
    case 32: return <Paper page={page} source="教学箱主线航次 · AI生成远洋场景">
      <Photo name="terminal-aerial" alt="集装箱码头全景" style={{opacity:.3}}/><Shade style={{background:"#0b172265"}}/><H>一只箱子穿过码头</H>
      <Diagram label="水水换装全过程以五个连续接口回放"><RouteStroke d="M160 551H445L710 673H979L1339 488" width={6}/><circle cx="160" cy="551" r="15" fill="#63c7d5"/><circle cx="445" cy="551" r="15" fill="#63c7d5"/><circle cx="710" cy="673" r="15" fill="#63c7d5"/><circle cx="979" cy="673" r="15" fill="#63c7d5"/><circle cx="1339" cy="488" r="15" fill="#d6b47b"/></Diagram>
      <T x={97} y={397} w={226} size={32}>内河船卸船</T><Reveal at={.16}><T x={364} y={594} size={30}>水平运输</T></Reveal><Reveal at={.36}><T x={644} y={723} size={32}>堆场缓冲</T></Reveal><Reveal at={.59}><T x={912} y={566} size={30}>提取与运输</T></Reveal><Reveal at={.8}><T x={1271} y={344} size={32}>远洋船装船</T></Reveal>
      <Reveal at={.9}><T x={93} y={841} size={33} color="#e2c38e">多台设备的动作，组成一次可衔接的服务。</T></Reveal>
    </Paper>;
    case 33: return <Paper page={page} tone="paper" source="OOCL · 2023-08-08 LL3 港序资料节选，非当前班表">
      <T x={92} y={90} size={23} className="lbl-label">SERVICE ROTATION / 2023</T><H y={165}>航次中的挂港顺序</H><T x={93} y={290} size={31}>一条服务循环，连接多个货源地与市场。</T>
      <Diagram label="2023年LL3历史港序的亚洲至北欧节选"><path d="M152 516H1418V726H200" fill="none" stroke="#89a29b" strokeWidth="3"/><RouteStroke d="M152 516H1418V726H200" color="#117f94" width={5}/></Diagram>
      <T x={116} y={422} size={34}>上海</T><T x={359} y={422} size={31}>厦门</T><T x={598} y={422} size={31}>南沙</T><T x={838} y={422} size={31}>香港</T><T x={1062} y={422} size={31}>盐田</T><T x={1346} y={422} size={31}>盖梅</T>
      <Reveal at={.36}><T x={1322} y={761} size={30}>新加坡</T><T x={1004} y={761} size={30}>比雷埃夫斯</T><T x={746} y={761} size={30}>汉堡</T><T x={444} y={761} size={30}>鹿特丹</T><T x={166} y={761} size={30}>…返程</T></Reveal>
      <T x={94} y={854} size={26} className="lbl-muted">港序描述服务安排；航迹描述船舶经过的地理路径。</T>
    </Paper>;
    case 34: return <Paper page={page} source="挂港与直达的概念解释 · AI生成远洋场景">
      <Photo name="ocean-voyage" alt="载有多只集装箱的远洋船舶" x={598} w={1002} h={1000} className="lbl-light-window"/><Shade/>
      <H y={131} w={980} size={75}>挂靠港口，<br/>箱子未必下船。</H><T x={95} y={382} w={622} size={32}>船可以在中途港口装卸其他箱子，<br/>C-01 继续留在船上。</T>
      <Box x={73} y={530} w={310}/><Reveal at={.38}><T x={429} y={570} w={331} size={31} color="#73d4de">本箱随船继续</T></Reveal><Rule x={96} y={782} w={619}/><T x={96} y={817} w={897} size={31}>直达服务 ≠ 途中不停港</T>
    </Paper>;
    case 35: return <Paper page={page} source="OOCL · 2023 LL3历史挂港；地理示意，非实时AIS">
      <LblGlobe x={535} w={1100} keys={[{at:0,latitude:26,longitude:120,distance:1.65},{at:.3,latitude:20,longitude:113,distance:1.8},{at:.64,latitude:6,longitude:107,distance:1.75}]} labels={["shanghai","singapore","malacca"]}/><Shade style={{background:"linear-gradient(90deg,#0b1722 24%,transparent 64%)"}}/>
      <H y={136} w={646} size={75}>亚洲港口<br/>与新加坡</H><T x={93} y={403} w={480} size={34}>多个市场，通过挂靠<br/>与网络节点汇入远洋服务。</T><Rule x={93} y={675} w={338}/><Reveal at={.64}><T x={93} y={719} w={524} size={30} color="#68ccdc">新加坡：连接区域支线与远洋干线的枢纽之一。</T></Reveal>
    </Paper>;
    case 36: return <Paper page={page} source="亚欧教学路径 · 既有地理航迹重建，非当前航次">
      <LblGlobe x={290} w={1380} keys={[{at:0,latitude:10,longitude:91,distance:2.65},{at:.25,latitude:10,longitude:57,distance:2.6},{at:.53,latitude:23,longitude:37,distance:1.9},{at:.78,latitude:38,longitude:20,distance:2.3}]} labels={["malacca","bab-el-mandeb","suez","gibraltar"]}/><Shade style={{background:"linear-gradient(90deg,#0b1722 6%,#0b1722cf 23%,transparent 60%)"}}/>
      <H y={105} w={940} size={65}>穿过印度洋，进入欧洲方向。</H><T x={96} y={301} w={359} size={33}>马六甲</T><Reveal at={.23}><T x={96} y={389} size={33}>印度洋</T></Reveal><Reveal at={.48}><T x={96} y={477} size={33}>曼德海峡 · 红海</T></Reveal><Reveal at={.7}><T x={96} y={565} size={33}>苏伊士 · 地中海</T></Reveal>
      <T x={96} y={833} w={1170} size={28}>霍尔木兹通往海湾，不在这条典型上海—欧洲去程主线上。</T>
    </Paper>;
    case 37: return <Paper page={page} tone="paper" source="旁支教学情境 · 此处假设换船，区别于主线已发生事件">
      <H>如果这只箱子需要中转</H><T x={93} y={234} size={32}>换船延伸覆盖，也增加一次衔接。</T>
      <Diagram label="第一艘船卸下箱子，在中转港等待后装第二艘船"><path d="M95 687H481L428 746H137Z" fill="#496b77"/><path d="M1130 667H1510L1462 746H1196Z" fill="#496b77"/><rect x="631" y="631" width="324" height="113" fill="#c6c9b6"/><RouteStroke d="M278 552C459 389 606 422 756 561" color="#1d8498"/><RouteStroke d="M840 561C976 411 1162 402 1321 548" at={.5} color="#1d8498"/><text x="210" y="793">第一艘船</text><text x="725" y="793">中转港</text><text x="1258" y="793">第二艘船</text></Diagram>
      <Box x={665} y={507} w={253}/><Reveal at={.43}><T x={715} y={374} size={33} color="#926726">等待下一程</T></Reveal><T x={94} y={863} size={28}>同一只箱子换船，才发生本箱的海上中转。</T>
    </Paper>;
    case 38: return <Paper page={page}>
      <H>中转窗口怎样衔接？</H><T x={93} y={233} size={31}>先看一个按时接上的周班。</T>
      <Diagram label="周三06点到达至18点出发之间有12小时等待"><path d="M128 624H1489" stroke="#77949c" strokeWidth="3"/><path d="M312 489V674M1210 489V674" stroke="#d4c5a5" strokeWidth="2"/><rect x="312" y="556" width={898*phase(progress,.1,.8)} height="67" fill="#5ecbd544"/><path d="M326 747H1196" stroke="#8ea7a9" strokeWidth="2"/></Diagram>
      <T x={238} y={414} size={34}>周三 06:00</T><T x={1121} y={414} size={34}>周三 18:00</T><T x={273} y={681} size={29}>抵达</T><T x={1174} y={681} size={29}>出发</T>
      <Reveal at={.56}><T x={606} y={736} size={83} className="lbl-serif">12 <span style={{fontSize:31}}>小时等待</span></T></Reveal><T x={94} y={867} size={24} className="lbl-muted">教学时刻设定：具体服务须按实际班期与作业条件安排。</T>
    </Paper>;
    case 39: return <Paper page={page} tone="paper">
      <H w={788}>一段去程结束，<br/>服务仍在循环。</H><T x={94} y={371} w={596} size={34}>班轮服务按港序持续运行。<br/>船舶还要完成回程与下一轮。</T>
      <Diagram label="亚洲到欧洲再返回亚洲的服务循环"><RouteStroke d="M800 585C800 356 1431 344 1431 588S800 817 800 585" color="#1a8195" width={6}/><circle cx="812" cy="554" r="15" fill="#c8a26a"/><circle cx="1416" cy="652" r="15" fill="#c8a26a"/><path d="M1240 390L1272 411L1233 419M966 790L932 771L973 759" fill="#1a8195"/></Diagram>
      <T x={748} y={516} size={35}>亚洲</T><T x={1369} y={687} size={35}>欧洲</T><T x={1080} y={297} size={28}>去程</T><Reveal at={.48}><T x={1078} y={835} size={28}>回程</T></Reveal>
      <Rule x={95} y={678} w={555}/><Reveal at={.78}><T x={95} y={723} w={592} size={32}>港序、频率与配船，<br/>共同组织持续的服务。</T></Reveal>
    </Paper>;
    case 40: return <Paper page={page} source="班期衔接的概念解释 · AI生成远洋场景">
      <Photo name="ocean-voyage" alt="海上航行的集装箱船" style={{opacity:.3}}/><Shade/><H y={128} w={1277} size={80}>船期怎样成为交付承诺？</H>
      <T x={97} y={382} w={1320} size={53}>起运准备 <span style={{color:"#71848c"}}>＋</span> 海上航行 <span style={{color:"#71848c"}}>＋</span> 到港提离</T>
      <Rule x={97} y={534} w={1317} color="#d9c18c"/><Reveal at={.38}><T x={97} y={593} w={1261} size={39}>各段时间与各个窗口，共同决定到门时间。</T></Reveal><Reveal at={.68}><T x={97} y={783} size={32} color="#69cddc">海上航行更快，全程交付未必按同样幅度缩短。</T></Reveal>
    </Paper>;
    case 41: return <Paper page={page} source="鹿特丹港务局 · 港口与腹地；地理示意，非实时AIS">
      <LblGlobe x={330} w={1340} keys={[{at:0,latitude:45,longitude:5,distance:2.5},{at:.42,latitude:51.9,longitude:4.48,distance:1.45}]} labels={["rotterdam","gibraltar"]}/><Shade style={{background:"linear-gradient(90deg,#0b1722 8%,#0b1722b0 35%,transparent 72%)"}}/>
      <T x={93} y={101} size={22} className="lbl-label">ROTTERDAM / EUROPEAN GATEWAY</T><H y={252} w={800} size={86}>抵达鹿特丹。</H><T x={95} y={438} w={576} size={35}>远洋段结束，<br/>客户所在的腹地仍在前方。</T><Reveal at={.55}><T x={95} y={764} size={30} color="#70cddd">下一程：从海港到门。</T></Reveal>
    </Paper>;
    case 42: return <Paper page={page} source="交付条件的概念解释 · AI生成码头场景">
      <Photo name="terminal-aerial" alt="海港进口卸船和堆场衔接示意" x={640} w={960} h={1000} className="lbl-light-window"/><Shade/>
      <H y={147} w={794} size={77}>卸船与进口堆存</H><T x={95} y={361} w={574} size={34}>相似的船岸动作，<br/>连接着不同的后续任务。</T>
      <Rule x={95} y={548} w={544}/><T x={95} y={601} size={31}>这一次，箱子等待提离。</T><Reveal at={.45}><T x={95} y={767} w={631} size={29} color="#78ccda">进口业务有自己的条件，<br/>不能把出口流程简单倒放。</T></Reveal>
    </Paper>;
    case 43: return <Paper page={page} tone="paper" source="交付与港口信息协同的概念框架 · 具体条件依当地规则和业务安排">
      <H w={1430}>货到港，为什么还不能立即提走？</H><T x={95} y={237} size={31}>不同主体确认的是不同条件。</T>
      <Diagram label="监管、承运人与码头的条件分别汇入提离安排，不表示固定办理顺序"><path d="M363 477L798 706L1250 477M797 479V706" fill="none" stroke="#b2b8a5" strokeWidth="3"/><path d="M795 706V820" stroke="#1a7e8e" strokeWidth="5"/><circle cx="796" cy="706" r="10" fill="#1a7e8e"/></Diagram>
      <T x={165} y={383} w={382} size={43}>监管</T><T x={165} y={461} w={341} size={28} className="lbl-muted">相关监管与放行条件</T>
      <Reveal at={.25}><T x={665} y={383} w={344} size={43}>承运人</T><T x={665} y={461} w={338} size={28} className="lbl-muted">相关交付安排</T></Reveal>
      <Reveal at={.5}><T x={1153} y={383} w={320} size={43}>码头</T><T x={1153} y={461} w={320} size={28} className="lbl-muted">相关提离与作业条件</T></Reveal>
      <Reveal at={.77}><T x={615} y={823} w={523} size={39} color="#1c7b8d">衔接实际提离</T></Reveal>
    </Paper>;
    case 44: return <Paper page={page} tone="steel" source="鹿特丹港务局 · 腹地连接；公路走廊为教学选择，AI生成背景">
      <H w={1380}>从海港，进入欧洲腹地。</H><Photo name="europe-delivery" alt="欧洲工业客户及公路交付的教学场景" x={839} y={296} w={761} h={638} className="lbl-light-window"/>
      <Diagram label="海港经公路连接杜伊斯堡附近客户，另列铁路与内河方式"><RouteStroke d="M138 487C283 487 226 651 462 651H750" color="#76d1d9" width={5}/><path d="M138 506C276 506 300 755 686 755M138 524C252 524 275 823 620 823" fill="none" stroke="#98b1b744" strokeWidth="2"/></Diagram>
      <T x={94} y={370} size={37}>鹿特丹</T><T x={468} y={529} w={416} size={34}>杜伊斯堡附近客户</T><T x={360} y={682} size={27} color="#7ad0da">本例：公路</T><T x={463} y={756} size={23} className="lbl-muted">铁路</T><T x={463} y={826} size={23} className="lbl-muted">内河</T>
    </Paper>;
    case 45: return <Paper page={page} tone="paper">
      <H>提箱与离港</H><T x={94} y={232} w={1283} size={32}>运输工具、箱子与提离安排，需要在同一窗口衔接。</T>
      <Diagram label="车辆到达、条件就绪和箱子可交接共同构成提箱条件"><path d="M190 514H1436" stroke="#799c98" strokeWidth="3"/><circle cx="243" cy="514" r="14" fill="#30899b"/><circle cx="794" cy="514" r="14" fill="#30899b"/><circle cx="1349" cy="514" r="14" fill="#30899b"/></Diagram>
      <T x={95} y={374} size={42}>车辆到达</T><Reveal at={.25}><T x={650} y={374} size={42}>条件就绪</T></Reveal><Reveal at={.5}><T x={1204} y={374} size={42}>箱子交接</T></Reveal>
      <Box x={86+1070*phase(progress,.62,1)} y={574} w={275}/><T x={94} y={830} size={31}>车辆已到场，不必然意味着可以立即提箱。</T>
    </Paper>;
    case 46: return <Paper page={page} source="教学交付情境 · AI生成客户仓库场景">
      <Photo name="europe-delivery" alt="教学箱抵达客户仓库"/><Shade style={{background:"linear-gradient(90deg,#0a1727ee,transparent 88%)"}}/>
      <H y={235} w={790} size={86}>货物，交到客户手中。</H><T x={95} y={477} w={601} size={36}>交货与拆箱，<br/>结束这批货物的运输旅程。</T><Reveal at={.44}><Rule x={95} y={690} w={90}/><T x={95} y={740} w={820} size={30}>箱体还要继续下一次周转。</T></Reveal><T x={95} y={857} size={23} className="lbl-muted">实物交付与合同约定的风险转移，属于不同概念。</T>
    </Paper>;
    case 47: return <Paper page={page} tone="paper">
      <H w={750}>空箱，回到哪里？</H><T x={96} y={250} w={643} size={35}>归还至指定交还地点，<br/>再进入下一次周转。</T>
      <Diagram label="空箱由客户运至指定空箱堆场，并可继续进入其他货主用箱循环"><path d="M163 627C593 906 1017 833 1306 499" fill="none" stroke="#aec0b4" strokeWidth="3"/><RouteStroke d="M163 627C593 906 1017 833 1306 499" color="#198398" width={5}/><path d="M1157 441H1455V664H1157Z" fill="#657f6d19" stroke="#597f7d"/><text x="1232" y="712">指定堆场</text></Diagram>
      <Box x={630+528*phase(progress,.15,.8)} y={641-156*phase(progress,.15,.8)} w={295}/><T x={97} y={596} w={497} size={31}>空箱不必沿原路返回重庆。</T><Reveal at={.7}><T x={818} y={850} size={31} color="#167b8a">下一个货主，下一次使用。</T></Reveal>
    </Paper>;
    case 48: return <Paper page={page}>
      <H>货物交付，箱子与船舶继续周转。</H><T x={95} y={233} size={31}>三种对象，各有自己的时间尺度。</T>
      <Diagram label="货物链终止于客户，箱体与船舶分别进入后续循环"><RouteStroke d="M291 431H1336" color="#e1c492" width={5}/><circle cx="1336" cy="431" r="9" fill="#e1c492"/><RouteStroke d="M291 603H1214C1430 603 1430 720 1214 720H948" at={.23} width={5}/><RouteStroke d="M291 797H900C1097 797 1097 905 900 905H540" at={.52} color="#92ada3" width={5}/></Diagram>
      <T x={95} y={399} size={36} color="#e1c492">货物</T><T x={1082} y={354} size={28}>客户收到货物</T><Reveal at={.25}><T x={95} y={571} size={36} color="#6dcddd">箱体</T><T x={870} y={525} size={28}>交还与下一次用箱</T></Reveal><Reveal at={.53}><T x={95} y={765} size={36} color="#9bb8a6">船舶</T><T x={762} y={779} size={28}>后续服务循环</T></Reveal>
    </Paper>;
    case 49: return <Paper page={page} tone="paper">
      <H>一次交付的完整记录</H><T x={95} y={227} size={31}>位置、作业、信息与责任，串起端到端运输链。</T>
      <table className="lbl-table" style={{top:345,fontSize:27}}><thead><tr><th>接口</th><th>实物发生什么</th><th>需要衔接什么</th></tr></thead><tbody><tr><td>工厂 → 内河港</td><td>装箱与陆侧交接</td><td>出运安排与箱货信息</td></tr><tr><td>内河 → 海港</td><td>卸船、堆存与再装船</td><td>作业条件与远洋班期</td></tr><tr><td>海港 → 客户</td><td>卸船、提离与末端运输</td><td>相关交付条件与预约</td></tr><tr><td>客户 → 指定堆场</td><td>拆箱与空箱归还</td><td>交还地点与箱体状态</td></tr></tbody></table>
      <T x={95} y={840} size={31} color="#167b8d">地图上的连线，需要现实中的交接来完成。</T>
    </Paper>;
    case 50: return <Paper page={page} tone="paper" source="教学时间账 · 32天移动 + 3天准备作业 + 5天等待，不代表真实服务时效">
      <H>40 天，是怎样组成的？</H><T x={95} y={227} size={31}>移动、准备作业与等待，共同构成全程时间。</T>
      <table className="lbl-table lbl-time-ledger" style={{left:95,top:333,width:931}}><thead><tr><th>运输环节 / 天</th><th>移动</th><th>准备作业</th><th>等待</th></tr></thead><tbody>
        <tr><td>出运准备</td><td>0</td><td>2</td><td>0</td></tr>
        <tr><td>内河运输</td><td>3</td><td>0</td><td>2</td></tr>
        <tr><td>海港衔接</td><td>0</td><td>0.5</td><td>1.5</td></tr>
        <tr><td>海上运输</td><td>28</td><td>0</td><td>0</td></tr>
        <tr><td>进口衔接</td><td>0</td><td>0.5</td><td>1.5</td></tr>
        <tr><td>末端运输</td><td>1</td><td>0</td><td>0</td></tr>
        <tr><td>合计</td><td><strong>32</strong></td><td><strong>3</strong></td><td><strong>5</strong></td></tr>
      </tbody></table>
      <Rule x={1090} y={363} w={1} h={426}/><Reveal at={.35}><T x={1182} y={370} size={138} className="lbl-serif" color="#167b8d">40</T><T x={1203} y={547} size={31}>天 · 全程</T></Reveal><Reveal at={.6}><T x={1147} y={660} w={344} size={30}>8 天没有移动，<br/>仍占用交付周期。</T></Reveal><T x={95} y={862} size={27}>本账目截至货物交付；空箱归还另计，不混入同一个合计。</T>
    </Paper>;
    case 51: return <Paper page={page}>
      <H>错过一班，影响有多大？</H><T x={95} y={230} size={30}>教学设定：下一程每周三 18:00 出发。</T>
      <T x={95} y={385} w={710} size={31}>按时到达：本周三 06:00<br/>等待 12 小时，当天 18:00 出发。</T><Rule x={95} y={530} w={734}/>
      <Reveal at={.22}><T x={95} y={574} w={724} size={31}>延误到达：本周三 20:00<br/>等待 166 小时，下周三 18:00 出发。</T></Reveal>
      <Rule x={896} y={346} w={1} h={426}/><Reveal at={.42}><T x={1018} y={359} size={108} className="lbl-serif" color="#e2be80">14 <span style={{fontSize:32}}>小时</span></T><T x={1021} y={510} size={28}>到达延误</T></Reveal><Reveal at={.65}><T x={1018} y={595} size={108} className="lbl-serif" color="#6ed1df">7 <span style={{fontSize:32}}>天</span></T><T x={1021} y={744} size={28}>下一程出发延误</T></Reveal>
      <Reveal at={.8}><T x={95} y={855} size={28} color="#78d0dc">额外等待 154 小时 ＋ 到达延误 14 小时 ＝ 出发延误 168 小时</T></Reveal>
    </Paper>;
    case 52: return <Paper page={page} source="货类转换引题 · AI生成教学场景">
      <Photo name="dry-bulk" alt="等待装载矿石的散货船与矿石堆场"/><Shade/><T x={95} y={105} size={22} className="lbl-label">BEYOND THE BOX</T><H y={271} w={932} size={84}>换成矿石、<br/>原油或汽车呢？</H><T x={97} y={600} w={743} size={34}>货物改变，船舶、码头<br/>与运输网络也会改变。</T>
      <Rule x={98} y={802} w={90} color="#d6b17b"/><T x={233} y={782} size={30}>下一讲 · 世界货物如何流动</T>
    </Paper>;
    default: return null;
  }
}
