import type { PortManagementSlideSpec, PortLessonTimingBlock } from './index.js';
import { PORT_LESSON_FOUR_NOTES } from './port-lesson-four-notes.js';

export const PORT_LESSON_FOUR_TITLE = '码头怎样把一艘船“做完”？';
export type PortDemoCueId = 'l4-arrival' | 'l4-cargo' | 'l4-yard' | 'l4-departure';
export interface PortLessonFourPage extends PortManagementSlideSpec {
  localPage: number; image: string; visual: 'scene' | 'diagram' | 'record' | 'task' | 'demo';
  points: readonly string[]; english: string; animationSeconds?: number; demoCue?: PortDemoCueId; answerHidden?: boolean;
}
// Keep the original 28 identities attached to their original teaching topics.
export const PORT_LESSON_FOUR_LEGACY_POSITIONS = [1,5,4,8,9,10,11,12,14,15,18,19,20,21,23,24,27,29,30,31,32,35,37,38,40,41,43,44] as const;
const motionPages = new Set([3,4,7,8,9,12,14,16,17,18,22,24,27,29,34,43]);
type Input = {n:number; key?:string; title:string; lead:string; image:string; english:string; points:readonly string[]; visual?:PortLessonFourPage['visual']; prompt?:string; demoCue?:PortDemoCueId; answerHidden?:boolean};
function page(p:Input):PortLessonFourPage {
  const legacy = PORT_LESSON_FOUR_LEGACY_POSITIONS.findIndex(n=>n===p.n);
  const note = PORT_LESSON_FOUR_NOTES[p.n - 1]!;
  return {lesson:4,lessonTitle:PORT_LESSON_FOUR_TITLE,index:153+p.n,localPage:p.n,
    slideKey:legacy>=0?`l4-port-${String(legacy+1).padStart(2,'0')}`:`l4-${p.key}`,
    kicker:'PORT LOGISTICS · 04',layout:'split',section:note.section,title:p.title,lead:p.lead,prompt:p.prompt,
    image:p.image,english:p.english,points:p.points,visual:p.visual??'diagram',demoCue:p.demoCue,answerHidden:p.answerHidden,
    animationSeconds:motionPages.has(p.n)?16:undefined,steps:[...p.points],
    teachingCue:note.teaching,
    assistantCue:`${note.assistant}\n本页依据：${p.lead}。${p.answerHidden?'本页答案尚未揭示，只给检查方向，不引用教师答案或后续解析。':''}S01和箱量是教学设定，单位为实体箱；四段独立起始，演示不等于个人完成。`,
    sourceIds:['port-l4-model'],
    narrative:{location:'S01 · 集装箱码头',voyageStage:note.section,storyBeat:'evidence',evidence:'scenario',publicLabel:'教学情境',progress:153+p.n}
  };
}
// Each page has its own authored composition, copy and teaching/assistant notes.
export const PORT_LESSON_FOUR_SLIDES:readonly PortLessonFourPage[] = [
  page({n:1,title:'码头怎样把一艘船“做完”？',lead:'S01即将抵港。116箱要卸下，78箱要装上。\n船、货物与码头，正在等待不同的终点。',image:'terminal-dawn',english:'ONE SHIP / MANY FINISH LINES',visual:'scene',points:['船舶周转','货物交付','资源释放']}),
  page({n:2,key:'finished-question',title:'船靠妥了，\n这票业务就完成了吗？',lead:'船停在岸边，箱子可能还在船上。\n位置改变，只回答了一个问题。',image:'berth',english:'ARRIVED ≠ COMPLETED',visual:'scene',points:['船在哪里？','货交给谁？','资源何时可再用？'],prompt:'你会先检查哪一条记录？'}),
  page({n:3,key:'terminal-geography',title:'从水面到陆地，\n作业怎样接起来？',lead:'海侧接船，堆场缓冲，陆侧接续运输。\n一只箱子跨过的每个接口，都需要下一环节能够接收。',image:'yard-aerial',english:'WATERSIDE / YARD / LANDSIDE',points:['海侧 · 船与岸桥','堆场 · 存放与提取','陆侧 · 闸口与车辆']}),
  page({n:4,title:'同一艘船，\n两股方向相反的箱流',lead:'进口I1／I2共116箱，出口E1／E2共78箱。\n这是194个实体箱的作业任务，箱数不等于TEU。',image:'ship-cutout',english:'IMPORT 116 / EXPORT 78',points:['进口：船 → 岸 → 场 → 闸口','出口：陆侧 → 场 → 岸 → 船']}),
  page({n:5,title:'三张完成单，\n三个不同的终点',lead:'装卸完成、进口交付、资源释放，需要分别核验。\n岸桥停下来，也可能只是作业在等待。',image:'terminal-dawn',english:'DEFINE THE FINISH LINE',points:['船舶作业：本港卸船与装船完成','进口交付：实际提离与交接记录','资源释放：泊位、航道恢复可用'],prompt:'岸桥停止，足以证明哪一项？'}),
  page({n:6,key:'anchorage',title:'船已经到港外，\n为什么还要等？',lead:'港外到达是新的起点。\n手续、通行条件和目的位置，需要在同一时刻接上。',image:'anchorage',english:'BEFORE THE BERTH',visual:'scene',points:['到达港外','等待可进入条件','检查当前缺项']}),
  page({n:7,key:'receipt',title:'点击提交之后，\n回执还在路上。',lead:'提交表示资料已经发出；有效回执表示相应条件已得到确认。\n时钟、返回状态和需补正的信息，都要核对。',image:'mooring',english:'SENT / RECEIVED / EFFECTIVE',points:['核对资料','提交与等待','有效回执'],prompt:'“已提交”能否替代“已批准”？'}),
  page({n:8,title:'泊位空着，\n船就能直接进来吗？',lead:'空泊位只提供位置条件。\n适用回执、船舶状态与航道通行条件，需要一起满足。',image:'berth',english:'ONE SPACE / SEVERAL CONDITIONS',points:['有效回执','可进入的船舶状态','可通行航道','兼容目的泊位']}),
  page({n:9,title:'从进港指令，\n走到真正靠妥。',lead:'目的预留、实际到位和系泊完成，是不同状态。\n指令生效以后，物理作业仍然需要时间。',image:'channel',english:'RESERVED / ARRIVING / MOORED',points:['安排进港','预留泊位','通过航道','到达与系泊','已靠妥']}),
  page({n:10,title:'盯住三个变化：\n回执、预留、靠妥',lead:'每次暂停，用“对象＋状态＋依据”描述现场。\n先看业务记录，再把记录与船的位置对应起来。',image:'tug',english:'OBSERVE 01 / ARRIVAL',visual:'demo',demoCue:'l4-arrival',points:['回执什么时候有效？','泊位什么时候被预留？','哪条记录确认已经靠妥？']}),
  page({n:11,title:'把S01接到\n可作业的状态',lead:'进入“船舶入港”，完成自己的本段练习。\n保留靠妥状态，并解释进港指令与实际到位的区别。',image:'anchorage',english:'YOUR TURN / 07 MIN',visual:'task',answerHidden:true,points:['核对资料，等待有效回执','选择可用泊位，运行至靠妥','核对三个目标，记录一句解释']}),
  page({n:12,title:'同一句“完成了”，\n可能指四件事。',lead:'描述状态时，要说清完成的是哪个对象、哪个环节。\n“系泊中”与“已靠妥”之间，还隔着实际作业。',image:'mooring',english:'READ THE STATE PRECISELY',visual:'record',points:['已提交 → 资料已经发出','已安排进港 → 指令与预留生效','系泊中 → 固定船位仍在进行','已靠妥 → 到达本段终点']}),
  page({n:13,key:'evidence-sentence',title:'把“完成了”，\n说成一句可核验的话。',lead:'S01已靠妥，依据是系泊完成后的船舶状态记录。\n一条明确的陈述，应该能指向一处明确的证据。',image:'mooring',english:'OBJECT + STATE + EVIDENCE',visual:'record',points:['对象：S01','状态：已靠妥','依据：实际状态记录'],prompt:'用你的运行记录，再写一句。'}),
  page({n:14,title:'上一环节的终点，\n怎样成为下一环节的起点？',lead:'入港交出位置与有效回执。\n装卸接收船舶，还要接上货批、堆场、设备和岗位。',image:'ship-deck',english:'HAND OVER THE CONDITIONS',points:['入港：船已靠妥','交接：条件可以被核验','装卸：货批与作业资源就绪']}),
  page({n:15,title:'站在船边，\n同时看见进口与出口。',lead:'进口箱从船上进入陆侧链条，出口箱沿另一方向登船。\n两股箱流共享部分设备和空间，作业目标分别计数。',image:'ship-deck',english:'TWO FLOWS / ONE QUAY',points:['进口：116箱离开船舶','出口：78箱装入船舶'],prompt:'卸船完成以后，进口箱可能在哪里？'}),
  page({n:16,key:'import-path',title:'一只进口箱，\n怎样接力到陆侧？',lead:'岸桥把箱子从船上卸下，水平运输把它接往堆场。\n场内存放、提取和闸口交接，继续推进交付。',image:'import-handoff',english:'IMPORT / FOLLOW THE HANDOVER',points:['船上','岸侧','水平运输','堆场','实际提离']}),
  page({n:17,key:'export-path',title:'出口箱，\n沿反方向找到船。',lead:'出口箱要先满足货批和场内作业条件，再接续运至岸侧。\n装上目标船舶，才计入本船的出口装船完成量。',image:'export-loading',english:'EXPORT / REVERSE THE PATH',points:['陆侧准备','目标堆场','水平运输','岸桥接取','本船装船']}),
  page({n:18,title:'一股箱流，\n需要哪些条件接上？',lead:'货批资料、兼容堆场与可用岗位共同决定能否接续。\n某台设备空闲，不能证明整条链已经具备条件。',image:'quay-crane',english:'CONNECT THE WORK',points:['货批：I1／I2／E1／E2','空间：兼容且可接收','资源：设备与岗位配合','交接：下游具备条件']}),
  page({n:19,title:'跟住一只箱子，\n再看整艘船。',lead:'查看货批条件和一箱交接记录，再复核装卸目标。\n箱流的局部变化，需要与整船计数相互印证。',image:'quay-crane',english:'OBSERVE 02 / CARGO',visual:'demo',demoCue:'l4-cargo',points:['四货批怎样就绪？','一只箱子刚交给谁？','卸船与装船是否完成？']}),
  page({n:20,title:'完成本船装卸，\n留下一个箱号。',lead:'进入“装卸与运输”，在自己的运行中接通双向箱流。\n检查116箱卸船、78箱装船，并保存一只箱子的交接依据。',image:'import-handoff',english:'YOUR TURN / 10 MIN',visual:'task',answerHidden:true,points:['安排货批、堆场与作业条件','运行并检查卸船／装船目标','选一个箱号，说明上一条交接']}),
  page({n:21,title:'同一张快照，\n三组数字。',lead:'本课程默认装卸演示的冻结记录：\n卸船116箱，装船78箱，进口提离88箱。',image:'yard-aerial',english:'ONE SNAPSHOT / DIFFERENT MEASURES',visual:'record',points:['116 / 116 · 进口卸船','78 / 78 · 出口装船','88 / 116 · 进口提离'],prompt:'哪项完成了，哪项仍在继续？'}),
  page({n:22,key:'remaining-containers',title:'还有28箱，\n留在哪一段交接里？',lead:'116－88＝28箱进口尚未实际提离。\n仅凭差额不能判定每箱位置，需要逐箱查看当前状态。',image:'container-cutout',english:'UNLOADED ≠ DELIVERED',points:['卸船：116箱','已经提离：88箱','尚未提离：28箱'],prompt:'需要补查位置、限制，还是下一条交接？'}),
  page({n:23,title:'一个箱号，\n把位置与交接串起来。',lead:'箱号让记录能够对应到同一实体。\n当前所在位置、上一条交接与下一项条件，需要一起阅读。',image:'container-cutout',english:'IDENTITY / LOCATION / HISTORY',visual:'record',points:['箱号：对应哪一个对象','当前位置：现在停在哪里','交接记录：刚刚交给谁','下一条件：还差什么']}),
  page({n:24,title:'箱子在移动，\n信息也在推进。',lead:'位置变化与信息确认不一定同时发生。\n核对值、回执和交接记录，让下游知道能否接收。',image:'import-handoff',english:'PHYSICAL FLOW / INFORMATION FLOW',points:['实物流：船 → 岸 → 场 → 闸口','信息流：资料 → 回执 → 交接 → 状态']}),
  page({n:25,key:'responsibility',title:'接口处，\n谁把什么交给谁？',lead:'一次交接同时改变对象的位置与责任关系。\n解释物流组织时，要指出交出方、接收方和交接依据。',image:'gate-exit',english:'THE HANDOVER MATTERS',visual:'scene',points:['交出什么','由谁接收','用什么记录确认'],prompt:'选你的一条箱记录，说明这个接口。'}),
  page({n:26,key:'quay-wait',title:'箱子已经下船，\n为什么还停在岸侧？',lead:'卸船只完成了海侧的一步。\n下游运输、堆场与闸口能否接上，要回到现场逐项核对。',image:'yard-waiting',english:'WAITING FOR THE NEXT LINK',visual:'scene',points:['已发生的动作','目前的状态','尚缺的接续条件']}),
  page({n:27,title:'三个0，\n让箱流停了下来。',lead:'本段起始现场：运输、场桥、闸口岗位均为0。\n箱子已经进入链条，接续作业能力却尚未到岗。',image:'yard-waiting',english:'STAFF THE CONNECTIONS',points:['运输岗位 · 0','场桥岗位 · 0','闸口岗位 · 0']}),
  page({n:28,key:'feasible-staff',title:'先恢复一条\n能够继续的链。',lead:'参考配置：运输12、场桥4、闸口2。\n它用于恢复本教学情境的可行作业，不代表唯一或最优配置。',image:'yard-aerial',english:'A FEASIBLE START',points:['12 · 运输','4 · 场桥','2 · 闸口'],prompt:'怎样证明箱流真的重新接上了？'}),
  page({n:29,title:'已委托核查，\n为什么限制还没有解除？',lead:'委托只是处理流程的开始。\n实际运输、核查完成与限制解除，需要分别查看记录。',image:'inspection',english:'REQUESTED / CHECKED / RELEASED',points:['委托核查','实际运输与核查','确认限制解除']}),
  page({n:30,title:'看见接续，\n也看见异常怎样解除。',lead:'先观察岗位恢复后的箱流，再跟踪待核查箱。\n每个停点都检查状态和记录，直到进口箱实际提离。',image:'inspection',english:'OBSERVE 03 / YARD & DELIVERY',visual:'demo',demoCue:'l4-yard',points:['岗位是否接续？','核查走到哪一步？','实际提离是否完成？']}),
  page({n:31,title:'把进口箱交出去，\n把异常解释清楚。',lead:'进入“堆场与交付”，完成自己的本段练习。\n目标是116箱实际提离，并找到待核查箱的限制解除依据。',image:'gate-exit',english:'YOUR TURN / 08 MIN',visual:'task',answerHidden:true,points:['恢复可行岗位与货批条件','跟踪核查，检查限制状态','复核实际提离与本段记录']}),
  page({n:32,title:'交付完成，\n要落在实际提离上。',lead:'卸船数、在场数与实际提离数，描述不同状态。\n本段终点以116箱进口实际提离和异常解除记录共同复核。',image:'gate-exit',english:'VERIFY THE DELIVERY',visual:'record',points:['数量：进口提离116箱','异常：限制已经解除','依据：实际状态与交接记录']}),
  page({n:33,key:'departure-ready',title:'装卸已经完成，\n还要怎样离港？',lead:'离港段从已完成装卸的独立现场开始。\n核对出口岸资料和有效回执，再安排离港作业。',image:'ship-deck',english:'READY FOR THE NEXT VOYAGE',visual:'scene',points:['本船装卸完成','出口岸条件有效','安排离港并等待实际执行']}),
  page({n:34,key:'release-timeline',title:'船在离开，\n资源也分时释放。',lead:'离泊、离开泊位、通过航道、已离港，是连续但不同的状态。\n泊位与航道的可用性要分别查看。',image:'departure',english:'BERTH RELEASE / CHANNEL RELEASE',points:['离港指令','离泊与泊位释放','通过航道','航道释放与已离港']}),
  page({n:35,title:'别只看船走远了。\n再看一次资源状态。',lead:'把船舶记录与泊位、航道状态放在一起核对。\n画面中的位置变化，不能替代业务上的释放证据。',image:'departure',english:'OBSERVE 04 / DEPARTURE',visual:'demo',demoCue:'l4-departure',points:['出口岸回执是否有效？','泊位何时恢复可用？','航道何时真正释放？']}),
  page({n:36,key:'four-evidences',title:'四段现场，\n留下四组完成证据。',lead:'每段记录对应自己的起始条件和运行。\n按对象、状态和依据复核，才能说明本段完成了什么。',image:'terminal-dusk',english:'FOUR SCENARIOS / FOUR RECORDS',visual:'record',points:['入港 → S01已靠妥','装卸 → 卸116箱／装78箱','交付 → 提离116箱／异常解除','离港 → 已离港／资源释放']}),
  page({n:37,title:'同样是等待，\n缺的条件可能不同。',lead:'等待可能来自资料、资源、位置或限制状态。\n先定位缺项，再观察一个动作能否改变后续结果。',image:'yard-waiting',english:'DIAGNOSE THE WAIT',points:['信息未确认','能力未接续','空间不能接收','异常仍有限制']}),
  page({n:38,title:'有设备，\n还要有接得上的能力。',lead:'设备、岗位与下游条件共同影响作业。\n资源闲置可能出现在链条受阻时，不能只看设备总数。',image:'quay-crane',english:'EQUIPMENT / PEOPLE / CONNECTIONS',points:['设备能做什么','岗位是否到位','下游能否接收']}),
  page({n:39,key:'feasible-not-optimal',title:'能够运行，\n距离运行得更好还有多远？',lead:'补上0岗位可以恢复可行性。\n比较效率，还需固定起始条件，观察时间、等待与代价。',image:'yard-aerial',english:'FEASIBILITY / PERFORMANCE',points:['可行：链条能够接续','更好：同条件下比较结果'],prompt:'“车辆越多越好”需要怎样验证？'}),
  page({n:40,title:'一份有用的记录，\n留下四类信息。',lead:'把起点、动作、结果和边界写清楚。\n一张截图可以提供证据，一句解释把证据接回问题。',image:'container-cutout',english:'MAKE THE RUN EXPLAINABLE',visual:'record',points:['起点：分段与已有条件','动作：改变了什么、何时生效','结果：状态与数量怎样变化','边界：尚缺什么依据']}),
  page({n:41,title:'三个判断，\n各补一句依据。',lead:'独立判断是否成立，并写出需要补查的记录。',image:'terminal-dusk',english:'BEFORE YOU LEAVE',visual:'record',answerHidden:true,points:['卸船116箱＝进口已经全部交付？','已委托核查＝该箱限制已经解除？','离港指令生效＝泊位与航道都已空闲？']}),
  page({n:42,key:'exit-explanation',title:'把每个推断，\n放回它需要的证据。',lead:'三项推断都不能由前一个条件直接推出。\n真正的完成，要落到相应对象的实际状态。',image:'terminal-dusk',english:'CHECK WHAT ACTUALLY FINISHED',visual:'record',points:['进口交付 → 核对实际提离','限制解除 → 核对核查结果与限制状态','资源可用 → 分别核对泊位与航道']}),
  page({n:43,title:'港口物流，\n把海陆之间的交接做完整。',lead:'船舶周转、货物交付与资源再使用，在同一码头中相互衔接。\n明确对象，列出条件，查验记录。',image:'terminal-dawn',english:'CONNECT THE WHOLE CHAIN',points:['船舶周转','货物交付','资源再使用']}),
  page({n:44,title:'只改变一项资源，\n等待会在哪里减少？',lead:'同一船期、同一起始条件，比较一个岗位或设备变化。\n写下一个瓶颈假设，以及能够推翻它的观察结果。',image:'terminal-dusk',english:'NEXT / CAPACITY & BOTTLENECKS',visual:'scene',points:['固定起点','改变一项','核对结果']})
];

export const PORT_LESSON_FOUR_TIMING:readonly PortLessonTimingBlock[] = [
  {label:'接过这一艘船',slideStart:154,slideEnd:158,minutes:8,purpose:'明确完成对象和作业空间。'},
  {label:'入港讲解与示范',slideStart:159,slideEnd:163,minutes:8,purpose:'观察回执、目的预留与靠妥。'},
  {label:'学生实机 A',slideStart:164,slideEnd:164,minutes:7,purpose:'个人完成入港并记录依据。'},
  {label:'入港复核',slideStart:165,slideEnd:167,minutes:5,purpose:'用对象、状态和依据复核交接。'},
  {label:'装卸讲解与示范',slideStart:168,slideEnd:172,minutes:9,purpose:'理解双向箱流及接续条件。'},
  {label:'学生实机 B',slideStart:173,slideEnd:173,minutes:10,purpose:'完成装卸，跟踪一箱交接。'},
  {label:'装卸与交付复核',slideStart:174,slideEnd:178,minutes:8,purpose:'解释数量、位置、信息与责任。'},
  {label:'堆场讲解与示范',slideStart:179,slideEnd:183,minutes:8,purpose:'恢复接续，跟踪异常处理。'},
  {label:'学生实机 C',slideStart:184,slideEnd:184,minutes:8,purpose:'完成进口实际提离与异常复核。'},
  {label:'离港与复核',slideStart:185,slideEnd:188,minutes:7,purpose:'观察泊位和航道分别释放。'},
  {label:'系统解释',slideStart:189,slideEnd:193,minutes:7,purpose:'辨认等待与能力，留下运行证据。'},
  {label:'出门判断与衔接',slideStart:194,slideEnd:197,minutes:5,purpose:'复核三个判断，提出下讲假设。'}
];
export const PORT_LESSON_FOUR_LABS = [
  {cueId:'l4-arrival',unit:'arrival',name:'船舶入港',entryLabel:'进入靠泊现场',demoPage:10,taskPage:11,reviewPage:12,minutes:7,stop:'回执 → 目的预留 → 已靠妥',acceptance:'三个入港目标完成；区分指令和实际靠妥。',assistant:'在入港现场，先读适用资料和回执，再解释预留、航行、系泊与靠妥。只以当前记录确认状态，不把提交当作有效回执。'},
  {cueId:'l4-cargo',unit:'cargo',name:'装卸与运输',entryLabel:'进入船岸作业',demoPage:19,taskPage:20,reviewPage:21,minutes:10,stop:'四货批就绪 → 一箱交接 → 整船装卸完成',acceptance:'116箱卸船、78箱装船；不固定提离快照数。',assistant:'在装卸现场，区分进口卸船、出口装船和进口提离。用实际箱状态解释一条交接，不能把预录的88箱提离当成实时结果。'},
  {cueId:'l4-yard',unit:'yard',name:'堆场与交付',entryLabel:'进入堆场现场',demoPage:30,taskPage:31,reviewPage:32,minutes:8,stop:'岗位接续 → 委托核查 → 解除限制与提离',acceptance:'116箱实际提离；核查箱限制已经解除。',assistant:'在堆场现场，先核对运输、场桥和闸口岗位，再跟踪委托、核查和限制解除。12/4/2是可行参考，不能说是最优；未有记录时不能宣称已交付。'},
  {cueId:'l4-departure',unit:'departure',name:'离港与复核',entryLabel:'进入离港现场',demoPage:35,taskPage:null,reviewPage:36,minutes:0,stop:'出口岸回执 → 泊位释放 → 航道释放',acceptance:'已离港；泊位和航道分别恢复可用。',assistant:'在离港现场，解释有效回执、离港指令、离泊、出航道与释放的差异。分别核对泊位和航道，不能凭图中船走远就宣称资源空闲。'}
] as const;
export const getPortLessonFourDemo = (cueId:string) => PORT_LESSON_FOUR_LABS.find(l=>l.cueId===cueId);
