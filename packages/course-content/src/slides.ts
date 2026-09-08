import type {
  PortManagementSlideSpec,
  PortNarrativeBeat,
  PortNarrativeEvidence,
  PortNarrativeMetadata,
  PortNarrativePublicLabel
} from "./index.js";
import {
  PORT_MANAGEMENT_LESSON_ONE_V7_IMAGEGEN_ASSETS,
  PORT_MANAGEMENT_LESSON_ONE_V7_SLIDES
} from "./lesson1-v7.js";

const ASSET_ROOT = "/course-assets/port-management";

const IMAGES = {
  l1ShanghaiDawn: `${ASSET_ROOT}/story-l1-shanghai-dawn.png`,
  l1MegashipScale: `${ASSET_ROOT}/story-l1-megaship-scale.png`,
  l1ChannelRewind: `${ASSET_ROOT}/story-l1-english-channel-rewind.png`,
  l1BritishPortBooks: `${ASSET_ROOT}/story-l1-british-port-books.png`,
  l1FrenchArsenal: `${ASSET_ROOT}/story-l1-french-arsenal.png`,
  l1LondonFinance: `${ASSET_ROOT}/story-l1-london-finance.png`,
  l1ContainerDossier: `${ASSET_ROOT}/story-l1-container-dossier.png`,
  l1DepartureNight: `${ASSET_ROOT}/story-l1-departure-night.png`,
  l2RouteBriefing: `${ASSET_ROOT}/story-l2-route-briefing.png`,
  l2SingaporeApproach: `${ASSET_ROOT}/story-l2-singapore-approach.png`,
  l2TransshipmentHub: `${ASSET_ROOT}/story-l2-transshipment-hub-v2.png`,
  l2MalaccaNight: `${ASSET_ROOT}/story-l2-malacca-night.png`,
  l2SuezTransit: `${ASSET_ROOT}/story-l2-suez-transit.png`,
  l2CanalServiceConvoy: `${ASSET_ROOT}/story-l2-canal-service-convoy-v2.png`,
  l2DisruptionRoom: `${ASSET_ROOT}/story-l2-disruption-room.png`,
  l2CapeDetour: `${ASSET_ROOT}/story-l2-cape-detour.png`,
  l2GuoyuanYangtze: `${ASSET_ROOT}/story-l2-guoyuan-yangtze.png`,
  l2EuropeApproach: `${ASSET_ROOT}/story-l2-europe-approach.png`,
  l3PilotBoarding: `${ASSET_ROOT}/story-l3-pilot-boarding.png`,
  l3BerthWindow: `${ASSET_ROOT}/story-l3-berth-window.png`,
  l3BreakbulkEra: `${ASSET_ROOT}/story-l3-breakbulk-era.png`,
  l3IndustrialPort: `${ASSET_ROOT}/story-l3-industrial-port.png`,
  l3LogisticsControl: `${ASSET_ROOT}/story-l3-logistics-control.png`,
  l3PortCommunity: `${ASSET_ROOT}/story-l3-port-community.png`,
  l3GuoyuanNode: `${ASSET_ROOT}/story-l3-guoyuan-node.png`,
  l3TerminalDiagnosis: `${ASSET_ROOT}/story-l3-terminal-diagnosis.png`
} as const;

export const PORT_MANAGEMENT_IMAGEGEN_ASSETS: readonly string[] =
  [
    ...Object.values(IMAGES),
    ...PORT_MANAGEMENT_LESSON_ONE_V7_IMAGEGEN_ASSETS
  ];

type ReadyLesson = 1 | 2 | 3;
type SlideInput = Omit<
  PortManagementSlideSpec,
  "lessonTitle" | "kicker"
> & {
  lesson: ReadyLesson;
  kicker?: string;
};

const LESSON_TITLES: Record<ReadyLesson, string> = {
  1: "第一讲 · 英国如何把贸易变成影响力？",
  2: "第二讲 · 它为什么必须走这条路？",
  3: "第三讲 · 港口为什么创造不同价值？"
};

function beat(
  location: string,
  voyageStage: string,
  storyBeat: PortNarrativeBeat,
  evidence: PortNarrativeEvidence,
  progress: number,
  openQuestion?: string,
  timeMarker?: string,
  publicLabel?: PortNarrativePublicLabel
): PortNarrativeMetadata {
  return {
    location,
    voyageStage,
    storyBeat,
    evidence,
    progress,
    ...(openQuestion ? { openQuestion } : {}),
    ...(timeMarker ? { timeMarker } : {}),
    ...(publicLabel ? { publicLabel } : {})
  };
}

function page(input: SlideInput): PortManagementSlideSpec {
  const { kicker, ...rest } = input;
  const narrative =
    rest.narrative.evidence === "scenario" && !rest.narrative.publicLabel
      ? { ...rest.narrative, publicLabel: "教学情境" as const }
      : rest.narrative;
  return {
    kicker: kicker ?? `VOYAGE 0${input.lesson} · 航次纪录`,
    lessonTitle: LESSON_TITLES[input.lesson],
    ...rest,
    narrative
  };
}

const LEGACY_PORT_MANAGEMENT_SLIDES: readonly PortManagementSlideSpec[] = [
  page({
    index: 1,
    slideKey: "l1-cold-open",
    lesson: 1,
    section: "上海冷开场",
    title: "一艘巨轮，正在等待一个答案",
    kicker: "2023 · 上海 · LL3航次",
    layout: "cover",
    lead: "让一艘近400米长的船装满货、准时启航，背后究竟需要怎样的世界？",
    image: IMAGES.l1ShanghaiDawn,
    imageAlt: "清晨大型集装箱船停靠上海港的纪录片式教学复原图",
    teachingCue: "只报时间、地点和船名，先让学生观察，不展示学习目标。",
    assistantCue: "这是基于真实船舶与港序的教学复原画面，不是现场照片。",
    sourceIds: ["oocl-spain-release"],
    accent: "navy",
    narrative: beat(
      "上海",
      "离港前",
      "transition",
      "documented",
      1,
      "什么力量让这艘船值得启航？",
      "2023年3月 · 清晨"
    )
  }),
  page({
    index: 2,
    slideKey: "l1-voyage-dossier",
    lesson: 1,
    section: "上海冷开场",
    title: "上海，航次开始之前",
    layout: "image",
    lead: "官方港序把亚洲、地中海与北欧连成一个84天往返的服务网络。",
    diagram: "voyage-route",
    bullets: [
      "上海是本轮历史港序的起点与终点",
      "挂港不是旅游清单，而是货源、市场和服务承诺",
      "逐段路线为依据港序制作的教学示意"
    ],
    teachingCue: "沿进度线点出上海、新加坡、比雷埃夫斯和鹿特丹，暂不解释原因。",
    sourceIds: ["oocl-spain-release"],
    narrative: beat(
      "上海",
      "航次建档",
      "evidence",
      "documented",
      2,
      "为什么是这些港口，而不是一条直线？",
      "84天往返"
    )
  }),
  page({
    index: 3,
    slideKey: "l1-vessel-scale",
    lesson: 1,
    section: "上海冷开场",
    title: "24,188 TEU：一艘船能装下多少货？",
    layout: "stat",
    stat: {
      value: "24,188 TEU",
      label: "OOCL Spain设计装载能力",
      detail: "总长399.99米，型宽61.3米；一项规模选择会把压力传递给航道、泊位、岸桥与堆场。"
    },
    image: IMAGES.l1MegashipScale,
    imageAlt: "超大型集装箱船与码头设施尺度对比的教学复原图",
    teachingCue: "让学生先猜长度和装载量，再公布官方参数。",
    sourceIds: ["oocl-spain-release", "oocl-spain-vessel"],
    narrative: beat(
      "上海",
      "尺度揭示",
      "evidence",
      "documented",
      3,
      "规模越大，是否一定越经济？",
      undefined,
      "官方资料"
    )
  }),
  page({
    index: 4,
    slideKey: "l1-world-required",
    lesson: 1,
    section: "上海冷开场",
    title: "启航需要怎样的世界？",
    layout: "question",
    lead: "船已经造好，货物却不会自动出现，海洋也不会自动变成市场。",
    columns: [
      { heading: "货物", body: "不同地区为什么愿意交换？" },
      { heading: "运输", body: "为什么海运能支撑大规模交换？" },
      { heading: "接口", body: "谁把陆地生产接到海上网络？" }
    ],
    prompt: "如果只允许保留一个条件，你会保留贸易、船舶还是港口？为什么？",
    teachingCue: "收集三种答案，不马上裁决；宣布要倒叙寻找这套系统的来路。",
    narrative: beat(
      "上海",
      "提出总问题",
      "decision",
      "concept",
      4,
      "现代海运网络是怎样被建成的？"
    )
  }),
  page({
    index: 5,
    slideKey: "l1-channel-rewind",
    lesson: 1,
    section: "英法历史回溯",
    title: "17—18世纪：英吉利海峡两岸",
    kicker: "HISTORICAL REWIND · 17—18世纪",
    layout: "image",
    lead: "海峡两岸都是欧洲重要海上强国，港口、舰队、贸易和国家财政共同塑造着它们的选择。",
    bullets: [
      "不列颠隔海面对欧洲，伦敦等商业港口连接大西洋贸易",
      "法兰西同时面向大西洋与地中海，并承受大陆边界的安全压力"
    ],
    image: IMAGES.l1ChannelRewind,
    imageAlt: "英吉利海峡两岸港口在历史时期的教学复原图",
    teachingCue: "用现代巨轮的声画突然切换到帆船时代，建立时间反差。",
    assistantCue: "英法比较是多因素历史分析，不作民族性格判断。",
    sourceIds: ["uk-georgian", "france-naval-history"],
    accent: "amber",
    narrative: beat(
      "英吉利海峡",
      "历史倒叙",
      "transition",
      "documented",
      5,
      "为什么两岸形成不同的海权与贸易网络路径？",
      "17—18世纪",
      "史料"
    )
  }),
  page({
    index: 6,
    slideKey: "l1-wrong-question",
    lesson: 1,
    section: "英法历史回溯",
    title: "海峡两岸：共同基础与不同压力",
    layout: "comparison",
    lead: "17—18世纪，英法都拥有远洋贸易、殖民活动和海军建设能力，但国家资源面对的安全任务并不相同。",
    columns: [
      {
        heading: "不列颠",
        body: "岛屿防御、商业港口和远洋航路，使海军与海上补给成为持续投入；公共信用支持长期筹资。",
        note: "海上安全与商业网络高度联动"
      },
      {
        heading: "法兰西",
        body: "大陆边界与陆上战争长期占用资源，同时还要建设大西洋、地中海军港和殖民贸易网络。",
        note: "海军投入与大陆安全并行"
      }
    ],
    teachingCue: "请学生把原始直觉问题改写成可由证据回答的问题。",
    assistantCue: "必须明确法国是重要海上强国，不能用“法国一般”概括。",
    sourceIds: ["uk-georgian", "france-naval-history"],
    accent: "amber",
    narrative: beat(
      "英吉利海峡",
      "时代横截面",
      "evidence",
      "documented",
      6,
      "共同的海上能力为何会进入不同的资源配置路径？",
      "17—18世纪",
      "史料"
    )
  }),
  page({
    index: 7,
    slideKey: "l1-security-constraints",
    lesson: 1,
    section: "英法历史回溯",
    title: "证据一：两种安全约束",
    layout: "comparison",
    columns: [
      {
        heading: "不列颠",
        body: "跨海防御使舰队、港口和海上补给成为持续性安全投入。",
        note: "海上投入占比更突出"
      },
      {
        heading: "法兰西",
        body: "既有多面海岸，又长期面对大陆边界与陆上战争压力。",
        note: "海陆预算需同时分配"
      }
    ],
    prompt: "地理改变的是必然结果，还是资源配置的起点？",
    teachingCue: "让学生先说“岛屿优势”，再追问没有财政和组织能力会怎样。",
    assistantCue: "地理改变约束，不单独决定海权结果。",
    sourceIds: ["uk-georgian", "france-naval-history"],
    accent: "amber",
    narrative: beat(
      "英法两岸",
      "证据链一",
      "evidence",
      "documented",
      7,
      "安全约束怎样进入国家预算？",
      undefined,
      "史料"
    )
  }),
  page({
    index: 8,
    slideKey: "l1-island-not-destiny",
    lesson: 1,
    section: "英法历史回溯",
    title: "岛国并不自动成为海权强国",
    layout: "question",
    lead: "海岸线只能提供可能性；把可能性变成持续能力，还需要税收、信用、组织、技术和港口。",
    steps: ["可接近海洋", "持续筹资", "建造与维护舰队", "保护商业航运", "形成反馈"],
    teachingCue: "遮住后四步，只显示“可接近海洋”，让学生补全缺失条件。",
    narrative: beat(
      "英法两岸",
      "证据链一",
      "concept",
      "concept",
      8,
      "从海岸到海权，中间缺少哪些机制？"
    )
  }),
  page({
    index: 9,
    slideKey: "l1-state-capacity",
    lesson: 1,
    section: "英法历史回溯",
    title: "证据二：持续投入的国家能力",
    layout: "comparison",
    columns: [
      { heading: "筹资", body: "税收与公共信用把长期战争和基础设施支出提前组织起来。" },
      { heading: "组织", body: "海军、海关、港口和造船需要稳定的行政体系。" },
      { heading: "取舍", body: "法国的海军建设同样强大，但需与大陆安全压力竞争资源。" }
    ],
    teachingCue: "强调舰队不是一次采购，而是一套长期维护系统。",
    sourceIds: ["uk-georgian", "france-naval-history"],
    accent: "amber",
    narrative: beat(
      "伦敦—巴黎",
      "证据链二",
      "evidence",
      "documented",
      9,
      "谁能为长期海上能力持续买单？",
      undefined,
      "史料"
    )
  }),
  page({
    index: 10,
    slideKey: "l1-port-books",
    lesson: 1,
    section: "英法历史回溯",
    title: "证据三：商人、账本与海关",
    layout: "image",
    lead: "港口账簿记录船名、吨位、船长、货物、目的港与关税——贸易网络首先是一套可记录、可结算的关系。",
    image: IMAGES.l1BritishPortBooks,
    imageAlt: "18世纪英国港口账簿、货物和帆船的纪录片式教学复原图",
    bullets: ["识别货物与责任人", "核算税费与价值", "积累航线和市场信息"],
    teachingCue: "把账簿当作一张早期供应链数据表，让学生找字段。",
    sourceIds: ["uk-port-books"],
    accent: "amber",
    narrative: beat(
      "英国港口",
      "证据链三",
      "evidence",
      "documented",
      10,
      "没有可信记录，远距离交易如何成立？",
      undefined,
      "史料"
    )
  }),
  page({
    index: 11,
    slideKey: "l1-finance",
    lesson: 1,
    section: "英法历史回溯",
    title: "证据四：信用把未来货流变成今天的资本",
    layout: "image",
    lead: "造船、备货和远航都先发生支出，金融体系让未来收益可以支持今天的行动。",
    image: IMAGES.l1LondonFinance,
    imageAlt: "历史港口附近商人、票据和金融交易的教学复原图",
    columns: [
      { heading: "信用", body: "远期收益支持当前投入" },
      { heading: "保险", body: "把单次灾难转化为可分担风险" },
      { heading: "结算", body: "让跨地区承诺可以履行" }
    ],
    teachingCue: "用“船还没回来，钱从哪里来”引出信用与保险。",
    sourceIds: ["boe-london", "uk-georgian"],
    accent: "amber",
    narrative: beat(
      "伦敦",
      "证据链四",
      "evidence",
      "documented",
      11,
      "谁愿意为尚未到港的货物承担风险？",
      undefined,
      "史料"
    )
  }),
  page({
    index: 12,
    slideKey: "l1-industry-port-loop",
    lesson: 1,
    section: "英法历史回溯",
    title: "证据五：工业与港口彼此放大",
    layout: "sequence",
    steps: [
      "工业需要进口原料与出口市场",
      "港口聚集货流、船舶和服务",
      "规模推动航线与造船投资",
      "更低成本又扩大工业市场"
    ],
    lead: "这不是单向因果，而是一条持续增强的反馈回路。",
    teachingCue: "请学生指出循环中任何一环中断的后果。",
    sourceIds: ["uk-georgian", "rmg-steam"],
    accent: "amber",
    narrative: beat(
      "工业港口",
      "证据链五",
      "concept",
      "documented",
      12,
      "工业推动港口，还是港口推动工业？",
      undefined,
      "史料"
    )
  }),
  page({
    index: 13,
    slideKey: "l1-france-maritime-power",
    lesson: 1,
    section: "英法历史回溯",
    title: "法国并非缺席海洋",
    layout: "image",
    lead: "法国以国家意志建设舰队、军港和专业化兵工体系，自17世纪末已与英、西、荷舰队竞争。",
    image: IMAGES.l1FrenchArsenal,
    imageAlt: "法国旧制度时期海军兵工厂和舰船建造的教学复原图",
    bullets: [
      "多面海岸要求分散防御与保障",
      "军港、船厂、人员训练同样需要国家组织",
      "不同路径不等于没有海洋能力"
    ],
    teachingCue: "用这一页纠正此前可能形成的“法国不重视海洋”印象。",
    assistantCue: "法国自17世纪末成为世界海上强国；不得描述为海洋能力薄弱。",
    sourceIds: ["france-naval-history"],
    accent: "amber",
    narrative: beat(
      "法国军港",
      "反证",
      "evidence",
      "documented",
      13,
      "为什么强大的海军仍可能形成不同的商业网络？",
      undefined,
      "史料"
    )
  }),
  page({
    index: 14,
    slideKey: "l1-colonial-violence",
    lesson: 1,
    section: "英法历史回溯",
    title: "海上扩张的阴影",
    layout: "statement",
    lead: "海权网络不仅运输商品，也依赖殖民征服、垄断、奴隶贸易和强制劳动；成本与收益从未被公平分配。",
    columns: [
      { heading: "收益", body: "商人、港口、金融和制造业获得货流与市场" },
      { heading: "代价", body: "被殖民地区、被奴役者和普通劳动者承受暴力与剥夺" }
    ],
    prompt: "如果只计算运价，我们遗漏了哪些社会成本？",
    teachingCue: "保持克制，明确价值判断；不把帝国扩张讲成浪漫冒险。",
    sourceIds: ["uk-slave-trade", "france-naval-history"],
    accent: "coral",
    narrative: beat(
      "大西洋网络",
      "代价揭示",
      "consequence",
      "documented",
      14,
      "海上网络的收益由谁获得、代价由谁承担？",
      undefined,
      "史料"
    )
  }),
  page({
    index: 15,
    slideKey: "l1-seapower-system",
    lesson: 1,
    section: "英法历史回溯",
    title: "海权最终改变了什么？",
    layout: "summary",
    lead: "它把国家能力、商业金融、工业生产、航线与港口连接起来，使跨海货流能够以更低成本、更稳定地持续发生。",
    diagram: "port-network",
    bullets: [
      "分工产生跨海交换的动力",
      "船舶与班期把长距离运输成本摊薄",
      "港口把海上网络接入腹地与市场"
    ],
    teachingCue: "回到第5页问题，用国家、商业、航线与港口组成的因果链收束历史回溯。",
    assistantCue: "海权应解释为持续组织跨海贸易的多因素系统能力，不得落回舰队数量或地理决定论。",
    sourceIds: ["uk-georgian", "france-naval-history", "uk-slave-trade"],
    accent: "amber",
    narrative: beat(
      "上海",
      "历史回到当下",
      "consequence",
      "concept",
      15,
      "这套系统为什么值得长期维持？"
    )
  }),
  page({
    index: 16,
    slideKey: "l1-container-open",
    lesson: 1,
    section: "货物为何出发",
    title: "镜头回到上海：箱门打开",
    layout: "image",
    lead: "在本教学情境中，这只箱子装载重庆制造的汽车零部件，将在上海加入亚欧航次。",
    image: IMAGES.l1ContainerDossier,
    imageAlt: "集装箱内汽车零部件与物流单据的纪录片式教学复原图",
    bullets: ["货物：汽车零部件", "来路：重庆果园港—上海", "目的：欧洲生产与售后网络"],
    teachingCue: "先声明“教学情境”，再发放集装箱档案。",
    assistantCue: "该货物是教学设定，不是OOCL公开承运记录。",
    sourceIds: ["cq-guoyuan"],
    accent: "blue",
    narrative: beat(
      "上海",
      "教学货物入场",
      "transition",
      "scenario",
      16,
      "为什么不在欧洲本地生产全部零部件？",
      "离港前"
    )
  }),
  page({
    index: 17,
    slideKey: "l1-why-cargo-moves",
    lesson: 1,
    section: "货物为何出发",
    title: "箱内货物为何去欧洲？",
    layout: "question",
    lead: "跨国运输本身消耗资源；只有生产与交换收益足以覆盖运输和协调成本，货物才会出发。",
    prompt: "如果欧洲也能生产同类零部件，贸易还有必要吗？",
    teachingCue: "让学生先按绝对生产率作答，为机会成本制造认知冲突。",
    narrative: beat(
      "上海",
      "贸易动机",
      "decision",
      "concept",
      17,
      "会生产，是否等于应该自己生产？"
    )
  }),
  page({
    index: 18,
    slideKey: "l1-absolute-vs-comparative",
    lesson: 1,
    section: "货物为何出发",
    title: "两地都能生产，为什么仍要交换？",
    layout: "comparison",
    columns: [
      { heading: "绝对优势", body: "同样资源下，谁能生产更多？", note: "比较生产率" },
      { heading: "比较优势", body: "多生产一种产品，要放弃多少另一种产品？", note: "比较机会成本" }
    ],
    teachingCue: "只用一句话区分两个概念，然后立即进入数字例子。",
    sourceIds: ["wto-comparative"],
    accent: "blue",
    narrative: beat(
      "上海",
      "比较框架",
      "concept",
      "concept",
      18,
      "真正决定分工的比较量是什么？"
    )
  }),
  page({
    index: 19,
    slideKey: "l1-opportunity-cost-table",
    lesson: 1,
    section: "货物为何出发",
    title: "机会成本才是分工钥匙",
    layout: "table",
    lead: "假设同样一组资源可以在汽车零部件与精密设备之间转换。",
    table: {
      headers: ["地区", "汽车零部件", "精密设备", "1批零部件的机会成本"],
      rows: [
        ["重庆制造基地", "12批", "6台", "0.5台设备"],
        ["欧洲制造基地", "8批", "8台", "1台设备"]
      ]
    },
    prompt: "哪一方在汽车零部件上具有比较优势？",
    teachingCue: "逐项计算，不让学生只凭产量大小判断。",
    assistantCue: "在本教学数字中，重庆生产1批零部件放弃0.5台设备，机会成本更低。",
    sourceIds: ["wto-comparative"],
    accent: "blue",
    narrative: beat(
      "上海",
      "机会成本",
      "concept",
      "concept",
      19,
      "怎样从产量表读出分工方向？"
    )
  }),
  page({
    index: 20,
    slideKey: "l1-opportunity-cost-activity",
    lesson: 1,
    section: "货物为何出发",
    title: "90秒计算：谁生产零部件？",
    layout: "activity",
    steps: [
      "分别计算两地两种产品的机会成本",
      "确定各自比较优势",
      "写出一种双方都可能接受的交换比例"
    ],
    prompt: "只报结论不计分：必须说出放弃了什么。",
    teachingCue: "计时90秒；随机请一人讲计算路径。",
    accent: "coral",
    narrative: beat(
      "课堂决策桌",
      "计算活动",
      "decision",
      "concept",
      20,
      "分工结论能否由机会成本复核？"
    )
  }),
  page({
    index: 21,
    slideKey: "l1-exchange-range",
    lesson: 1,
    section: "货物为何出发",
    title: "交换区间从哪里来？",
    layout: "statement",
    lead: "交换比例必须落在双方各自的机会成本之间，否则至少有一方宁愿自己生产。",
    stat: {
      value: "0.5 < P < 1",
      label: "每批零部件对应的精密设备数量",
      detail: "这是教学数据推导出的互利边界，不是市场现价。"
    },
    teachingCue: "让学生把上一页报价放到区间内检验。",
    sourceIds: ["wto-comparative"],
    accent: "blue",
    narrative: beat(
      "上海",
      "交换边界",
      "consequence",
      "concept",
      21,
      "有比较优势是否必然成交？"
    )
  }),
  page({
    index: 22,
    slideKey: "l1-beyond-price",
    lesson: 1,
    section: "货物为何出发",
    title: "价格不是唯一边界",
    layout: "matrix",
    columns: [
      { heading: "质量", body: "规格、检验与责任追溯" },
      { heading: "交期", body: "何时到达，延误如何处理" },
      { heading: "风险", body: "损坏、汇率与需求变化" },
      { heading: "权责", body: "谁订舱、报关、投保和承担费用" }
    ],
    teachingCue: "把“愿意交换”推进到“能否履约”。",
    accent: "blue",
    narrative: beat(
      "上海",
      "交易条件",
      "concept",
      "concept",
      22,
      "谁来把经济上的互利变成可执行合同？"
    )
  }),
  page({
    index: 23,
    slideKey: "l1-contract-chain",
    lesson: 1,
    section: "货物为何出发",
    title: "一份贸易合同穿过哪些主体？",
    layout: "sequence",
    steps: ["货主确认订单", "物流组织订舱", "港口与监管放行", "承运人完成海运", "收货人接收"],
    lead: "货流、资金流、单证流与信息流必须在同一时间窗口内对齐。",
    teachingCue: "请学生为每一步标出一种可能导致箱子滞留的文件。",
    narrative: beat(
      "上海",
      "履约链",
      "concept",
      "concept",
      23,
      "哪条流最容易被课堂忽略？"
    )
  }),
  page({
    index: 24,
    slideKey: "l1-trade-not-transport",
    lesson: 1,
    section: "货物为何出发",
    title: "比较优势创造货流，距离仍要付费",
    layout: "summary",
    lead: "比较优势只创造潜在货流；运输与港口决定生产收益能否在跨越空间之后仍然兑现。",
    bullets: [
      "生产收益必须大于全程物流成本",
      "平均运输时间可以计划，时间波动需要缓冲",
      "接下来追问：水运为什么便宜，港口为什么重要"
    ],
    teachingCue: "从交换收益转入距离成本，保留“潜在货流—真实货流”的对照。",
    accent: "blue",
    narrative: beat(
      "上海",
      "从贸易到运输",
      "transition",
      "concept",
      24,
      "怎样避免距离成本吃掉分工收益？"
    )
  }),
  page({
    index: 25,
    slideKey: "l1-four-modes",
    lesson: 1,
    section: "为什么选择海运",
    title: "水运的优势，出现在长距离",
    layout: "stat",
    lead: "货运量只计算重量，货物周转量还乘以距离；两种口径的反差揭示了水运最擅长的任务。",
    stat: {
      value: "17.25% → 55.65%",
      label: "2024年中国水运货运量占比 → 货物周转量占比",
      detail: "同年水运以较少的货量占比完成过半周转量，集中服务长距离、大批量运输。"
    },
    bullets: [
      "重庆—上海集装箱单位运价区域测算：水路∶铁路∶公路约为1∶2∶6",
      "这是特定线路的区域测算，不是全国统一报价",
      "问题不再是“水运便不便宜”，而是“为什么能便宜到这个数量级”"
    ],
    teachingCue: "先解释货运量与周转量的口径，再展示重庆—上海区域运价比。",
    assistantCue: "17.25%和55.65%是2024年中国综合运输口径；1∶2∶6是重庆—上海集装箱区域测算，不得泛化为全国固定费率。",
    sourceIds: ["mot-water-logistics", "yunnan-multimodal"],
    accent: "teal",
    narrative: beat(
      "中国综合运输网络",
      "成本数量级",
      "evidence",
      "documented",
      25,
      "同样一吨货，为什么运输越远，水运优势越明显？",
      "2024年",
      "官方资料"
    )
  }),
  page({
    index: 26,
    slideKey: "l1-scale-economies",
    lesson: 1,
    section: "为什么选择海运",
    title: "第一层原因：一次搬得足够多",
    layout: "stat",
    lead: "浮力支撑船体与货物，船舶可以在较低速度下运送巨量载荷；固定成本由更多货物共同分摊。",
    stat: {
      value: "24,188",
      label: "TEU设计箱位共享一次航行的船舶与船员成本",
      detail: "OOCL Spain的设计能力不等于实际装载量；高装载率和稳定双向货流是规模经济兑现的条件。"
    },
    image: IMAGES.l1MegashipScale,
    imageAlt: "超大型集装箱船尺度与箱位的教学复原图",
    bullets: [
      "巨量载荷摊薄船舶、船员与航行组织的固定成本",
      "标准箱让不同货主共享同一条班轮服务",
      "装载率不足或回程空舱会削弱单位成本优势"
    ],
    teachingCue: "先从浮力与载荷解释物理基础，再说明箱位共享和装载率条件。",
    assistantCue: "24,188 TEU是设计装载能力，不代表本教学航次实际装载量。",
    sourceIds: ["oocl-spain-vessel"],
    narrative: beat(
      "海上",
      "规模经济",
      "evidence",
      "documented",
      26,
      "规模经济会把成本转移给谁？"
    )
  }),
  page({
    index: 27,
    slideKey: "l1-big-ship-cost-shift",
    lesson: 1,
    section: "为什么选择海运",
    title: "第二层原因：用时间换燃料",
    layout: "stat",
    lead: "船舶航速越高，克服水阻所需功率上升得更快；班轮可以把较慢航速提前写进固定船期。",
    stat: {
      value: "航速 −10%",
      label: "推进功率需求约下降27%",
      detail: "IMO给出的经验值：按全航程计算，燃料节约约19%；实际结果取决于船型、海况和主机工况。"
    },
    bullets: [
      "推进功率与航速近似呈立方关系",
      "稳定的慢航可以由班期与生产排班提前吸收",
      "航程变长仍会增加在途时间、资金占用和船舶周转压力"
    ],
    teachingCue: "用速度—功率关系解释“慢”为什么也是成本机制，再立即指出时间代价。",
    assistantCue: "10%、27%和约19%是IMO用于说明速度管理的经验关系，不得扩写为所有船舶的保证值。",
    sourceIds: ["imo-speed-management"],
    accent: "teal",
    narrative: beat(
      "海上",
      "速度与燃料",
      "evidence",
      "documented",
      27,
      "较慢的运输能否被生产计划吸收？",
      undefined,
      "官方资料"
    )
  }),
  page({
    index: 28,
    slideKey: "l1-landed-cost",
    lesson: 1,
    section: "为什么选择海运",
    title: "低海运费，不等于低到岸成本",
    layout: "sequence",
    steps: ["海上干线运费", "两端集疏运与换装", "在途资金与库存", "延误与损坏风险", "管理协调成本"],
    lead: "水运在海上创造的低成本，必须穿过整条供应链后仍被保留下来。",
    prompt: "哪一项最可能不出现在海运报价里，却最终由货主支付？",
    teachingCue: "把每项成本归到货主、承运人或港口，并区分报价与实际承担。",
    narrative: beat(
      "供应链",
      "广义成本",
      "concept",
      "concept",
      28,
      "谁承担的成本没有出现在海运报价中？"
    )
  }),
  page({
    index: 29,
    slideKey: "l1-value-density",
    lesson: 1,
    section: "为什么选择海运",
    title: "慢有两种：时间长，与时间不准",
    layout: "comparison",
    lead: "稳定地慢可以提前下单并写入生产计划；无法预测的到达时间才会迫使企业准备更多缓冲。",
    columns: [
      {
        heading: "平均提前期",
        body: "稳定的30天可以通过提前生产、提前下单和固定补货节奏安排。",
        note: "增加在途库存≈日均需求×平均提前期"
      },
      {
        heading: "提前期波动",
        body: "同一批货有时18天、有时26天，计划无法确定何时补上库存。",
        note: "波动推动安全库存与停线风险"
      }
    ],
    teachingCue: "在时间轴上分别画出平均值和波动范围，避免把“慢”与“不可靠”混为一谈。",
    assistantCue: "稳定的平均时间可以通过排班吸收，但仍增加在途库存、资金占用与暴露时间；不得回答成慢完全没有成本。",
    sourceIds: ["worldbank-logistics-reliability"],
    narrative: beat(
      "供应链",
      "时间结构",
      "concept",
      "concept",
      29,
      "企业真正需要缓冲的是平均时间，还是时间波动？"
    )
  }),
  page({
    index: 30,
    slideKey: "l1-time-has-price",
    lesson: 1,
    section: "为什么选择海运",
    title: "哪个方案更容易排进生产计划？",
    layout: "case",
    lead: "在本教学情境中，零部件需求稳定、耐储且并非紧急件；两条路线的平均速度和波动范围不同。",
    columns: [
      {
        heading: "方案A · 30天±1天",
        body: "平均更慢，可以提前下单；到达窗口稳定，但在途库存和资金占用更多。",
        note: "低运费 · 高可计划性"
      },
      {
        heading: "方案B · 18天±8天",
        body: "平均更快，但到达窗口分散；需要更多时间缓冲或应急运力。",
        note: "较快 · 波动较大"
      }
    ],
    prompt: "如果只能选一条主补货路线，你会选哪一条？请同时说明库存与停线风险。",
    teachingCue: "先投票，再要求答案区分在途库存与安全库存；最后讨论应急快运的角色。",
    assistantCue: "两组时间均为教学设定，不是企业或具体运输线路公开数据；结论只适用于需求较稳定、耐储、非紧急货物。",
    accent: "coral",
    narrative: beat(
      "供应链",
      "排班决策",
      "decision",
      "scenario",
      30,
      "平均更快，是否必然更容易管理？"
    )
  }),
  page({
    index: 31,
    slideKey: "l1-maritime-share",
    lesson: 1,
    section: "为什么选择海运",
    title: "低成本把世界变成可交易的空间",
    layout: "stat",
    stat: {
      value: ">80% / ≈70%",
      label: "国际贸易的海运占比：货量 / 价值",
      detail: "UNCTAD口径显示，海运承担超过八成国际贸易货量、约七成贸易价值；两种口径不能混用。"
    },
    bullets: [
      "低单位成本让低价值、大批量货物也能跨洲交换",
      "并非所有货类都适合海运，时效、货值与波动仍会改变选择",
      "海上成本足够低之后，决定全程表现的关键接口来到港口"
    ],
    teachingCue: "先分别解释货量与价值口径，再把问题转向港口如何保住海上成本优势。",
    assistantCue: "引用时必须明确：超过80%是国际贸易货量口径，约70%是价值口径；不得写成价值占比八成。",
    sourceIds: ["unctad-maritime-share"],
    narrative: beat(
      "全球海运",
      "规模结果",
      "consequence",
      "documented",
      31,
      "如此低的海上成本，为什么仍可能在港口被耗尽？",
      "2024年资料",
      "官方资料"
    )
  }),
  page({
    index: 32,
    slideKey: "l1-port-interface",
    lesson: 1,
    section: "港口接口与启航",
    title: "港口：海上规模经济的兑现接口",
    layout: "image",
    lead: "海上低成本只有在货物按时集结、完成换装与监管，并顺利进入腹地之后，才成为货主真正获得的低成本。",
    diagram: "port-interface",
    bullets: ["聚集足够货量", "衔接船期与泊位", "完成换装与监管", "连接腹地运输", "同步责任与信息"],
    teachingCue: "沿图从腹地到航线走一遍，指出每一次状态转换怎样保留或损失成本优势。",
    assistantCue: "港口价值应落在全程物流接口，不得只解释为码头装卸。",
    sourceIds: ["worldbank-port", "itf-mega-ships"],
    narrative: beat(
      "上海港",
      "海陆转换",
      "concept",
      "concept",
      32,
      "哪一次转换最可能让箱子停下来？"
    )
  }),
  page({
    index: 33,
    slideKey: "l1-five-gates",
    lesson: 1,
    section: "港口接口与启航",
    title: "低成本可能在港口被重新变贵",
    layout: "sequence",
    steps: ["等待泊位", "应对装卸峰值", "控制堆场停留", "完成通关与单证", "接入疏港通道"],
    lead: "大船在海上获得规模经济，却把更集中的作业峰值交给港口；等待、换装和拥堵会重新抬高每箱成本。",
    prompt: "哪一种等待既增加成本，又会把波动传给后续港口？",
    teachingCue: "逐项追踪等待时间如何进入船期、堆场和腹地库存。",
    assistantCue: "应说明海上规模经济不必然延伸到港内和腹地，不能把所有延误归因于设备不足。",
    sourceIds: ["itf-mega-ships", "worldbank-logistics-reliability"],
    narrative: beat(
      "上海港",
      "成本再形成",
      "consequence",
      "concept",
      33,
      "港口怎样避免把海上节省重新消耗掉？"
    )
  }),
  page({
    index: 34,
    slideKey: "l1-departure-checklist",
    lesson: 1,
    section: "港口接口与启航",
    title: "离港检查单：成本是否真的可控？",
    layout: "table",
    table: {
      headers: ["证据", "当前状态（教学情境）", "尚需监控"],
      rows: [
        ["货源与装载计划", "箱量达到计划", "临时退载与空舱"],
        ["班期到达窗口", "预计偏差±1天", "天气与前港延误"],
        ["泊位与装船窗口", "已确认", "错过窗口后的等待"],
        ["两端集疏运", "保留应急路径", "短驳与疏港拥堵"]
      ]
    },
    prompt: "这些证据足以保住海运的成本优势吗？还缺哪一项？",
    teachingCue: "不提供唯一答案，要求学生分别说明平均成本和波动风险。",
    assistantCue: "检查单全部属于教学情境；不得描述为OOCL Spain真实离港状态。",
    accent: "coral",
    narrative: beat(
      "上海港",
      "离港审查",
      "evidence",
      "scenario",
      34,
      "信息不完全时怎样作出可辩护决策？"
    )
  }),
  page({
    index: 35,
    slideKey: "l1-go-no-go",
    lesson: 1,
    section: "港口接口与启航",
    title: "批准启航吗？",
    layout: "activity",
    steps: [
      "比较分工收益与全程物流成本",
      "说明平均运输时间如何进入生产排班",
      "指出最需要控制的一项时间波动",
      "给出一项港口监控指标"
    ],
    prompt: "选择批准、附条件批准或暂缓，并用完整证据链说明理由。",
    teachingCue: "三人小组5分钟；评价是否同时处理收益、平均时间、波动和港口接口。",
    accent: "coral",
    narrative: beat(
      "上海港",
      "启航决策",
      "decision",
      "scenario",
      35,
      "决策之后，哪一种风险会最先出现？"
    )
  }),
  page({
    index: 36,
    slideKey: "l1-departure-cliffhanger",
    lesson: 1,
    section: "港口接口与启航",
    title: "海运把公里变便宜，港口不让等待重新把它变贵",
    kicker: "END OF VOYAGE 01 · 离开上海",
    layout: "cover",
    lead: "分工创造货流，水运压低距离成本，排班吸收平均时长，港口控制波动与接口成本——前方仍不是一条直线。",
    image: IMAGES.l1DepartureNight,
    imageAlt: "大型集装箱船夜间离开上海港的纪录片式教学复原图",
    teachingCue: "以船尾远去收束，不总结第二讲知识点，只留下路线悬念。",
    sourceIds: ["oocl-spain-release"],
    accent: "navy",
    narrative: beat(
      "上海外海",
      "已经启航",
      "transition",
      "documented",
      36,
      "它为什么必须走这条路？",
      "航次开始"
    )
  }),
  page({
    index: 37,
    slideKey: "l2-cover",
    lesson: 2,
    section: "恢复航海日志",
    title: "它为什么必须走这条路？",
    kicker: "VOYAGE 02 · 路线、咽喉与腹地",
    layout: "cover",
    lead: "一条班轮航线不是两点之间的直线，而是一系列市场、港口、通道和时间承诺。",
    image: IMAGES.l2RouteBriefing,
    imageAlt: "航运控制室查看亚欧路线的纪录片式教学复原图",
    teachingCue: "用航海日志承接第一讲的离港画面。",
    assistantCue: "画面为教学复原，路线依据官方港序，不是实时AIS。",
    sourceIds: ["oocl-spain-release"],
    accent: "navy",
    narrative: beat(
      "上海外海",
      "路线任务启动",
      "transition",
      "documented",
      37,
      "为什么不是直接驶向欧洲？",
      "航次初段"
    )
  }),
  page({
    index: 38,
    slideKey: "l2-log-restored",
    lesson: 2,
    section: "恢复航海日志",
    title: "航海日志恢复：上海之后",
    layout: "image",
    lead: "上海—厦门—南沙—香港—盐田—盖梅—新加坡，亚洲段先聚集货源，再进入远洋干线。",
    diagram: "voyage-route",
    teachingCue: "依次点亮亚洲港口，让学生猜这一连串挂港的共同作用。",
    sourceIds: ["oocl-spain-release"],
    narrative: beat(
      "东亚沿海",
      "亚洲挂港段",
      "evidence",
      "documented",
      39,
      "多挂港是低效，还是规模形成方式？",
      "上海之后"
    )
  }),
  page({
    index: 39,
    slideKey: "l2-port-rotation",
    lesson: 2,
    section: "恢复航海日志",
    title: "真实港序不是一条直线",
    layout: "sequence",
    steps: [
      "东亚货源港群",
      "新加坡网络节点",
      "比雷埃夫斯进入地中海",
      "汉堡—鹿特丹—泽布吕赫",
      "瓦伦西亚—比雷埃夫斯—阿布扎比返亚洲"
    ],
    lead: "84天循环同时服务去程、回程与区域货流。",
    teachingCue: "提醒同一港口可能在一个循环中出现两次。",
    sourceIds: ["oocl-spain-release"],
    narrative: beat(
      "亚欧LL3",
      "港序解码",
      "evidence",
      "documented",
      40,
      "班轮为何需要循环而不是单程？"
    )
  }),
  page({
    index: 40,
    slideKey: "l2-explain-every-choice",
    lesson: 2,
    section: "恢复航海日志",
    title: "LL3航线中的四类网络线索",
    layout: "comparison",
    lead: "上一页的挂港顺序并非港名清单；每一段航程都同时连接货流、通道、港口和腹地。",
    columns: [
      { heading: "走廊", body: "上海—新加坡—苏伊士—北欧串联亚洲货源与欧洲市场。" },
      { heading: "咽喉", body: "马六甲与苏伊士把大范围航段压缩到有限通道。" },
      { heading: "节点", body: "新加坡、比雷埃夫斯等挂港连接干线、支线与区域市场。" },
      { heading: "腹地", body: "上海与鹿特丹等港口继续连接内陆生产和消费空间。" }
    ],
    teachingCue: "把四个词作为本讲持续出现的侦查标签。",
    narrative: beat(
      "亚欧LL3",
      "建立观察框架",
      "concept",
      "concept",
      41,
      "当前页面属于哪一个网络层级？"
    )
  }),
  page({
    index: 41,
    slideKey: "l2-corridor-not-line",
    lesson: 2,
    section: "班轮走廊与节点",
    title: "走廊不是画出来的线",
    layout: "statement",
    lead: "走廊是稳定货流、运力、港口与市场关系形成的高密度通道，不等同于一条固定航迹。",
    diagram: "route-layers",
    bullets: ["可以包含多条具体航线", "会随货类和市场变化", "需要节点与腹地持续供货"],
    teachingCue: "先展示一条线，再逐层叠加货源、班轮和港口。",
    narrative: beat(
      "东亚",
      "识别走廊",
      "concept",
      "concept",
      42,
      "什么让一条海上方向成为稳定走廊？"
    )
  }),
  page({
    index: 42,
    slideKey: "l2-cargo-consolidation",
    lesson: 2,
    section: "班轮走廊与节点",
    title: "上海—华南：货源在集聚",
    layout: "sequence",
    steps: ["制造基地形成货源", "区域运输送入港口", "多个挂港持续集货", "远洋段兑现规模经济"],
    lead: "大船需要大货量；亚洲多挂港是运力与分散货源之间的组织结果。",
    teachingCue: "把第一讲的规模经济放回真实港序。",
    sourceIds: ["oocl-spain-release"],
    narrative: beat(
      "东亚沿海",
      "货源集聚",
      "consequence",
      "documented",
      43,
      "规模经济为何需要多节点协同？"
    )
  }),
  page({
    index: 43,
    slideKey: "l2-feeder-mainline",
    lesson: 2,
    section: "班轮走廊与节点",
    title: "支线如何把箱子送上干线",
    layout: "split",
    columns: [
      { heading: "支线", body: "连接较小港口与区域枢纽，频率和覆盖更重要" },
      { heading: "干线", body: "连接大市场和主要枢纽，规模与时刻表更重要" },
      { heading: "衔接", body: "中转窗口、舱位和信息决定箱子是否赶上下一程" }
    ],
    teachingCue: "用接驳公交与干线列车类比，但指出集装箱换装成本更高。",
    narrative: beat(
      "区域网络",
      "支干衔接",
      "concept",
      "concept",
      44,
      "箱子错过衔接窗口会发生什么？"
    )
  }),
  page({
    index: 44,
    slideKey: "l2-hub-vs-gateway",
    lesson: 2,
    section: "班轮走廊与节点",
    title: "枢纽港与门户港不是同义词",
    layout: "comparison",
    columns: [
      { heading: "枢纽港", body: "核心价值是连接多条航线并组织转运", note: "海向网络" },
      { heading: "门户港", body: "核心价值是连接远洋航线与大型内陆腹地", note: "陆向网络" }
    ],
    prompt: "一个港口能否同时承担两种角色？",
    teachingCue: "接受“可以”，但要求分别给出海向与陆向证据。",
    narrative: beat(
      "港口网络",
      "节点分类",
      "concept",
      "concept",
      45,
      "判断港口角色需要观察哪一侧的连接？"
    )
  }),
  page({
    index: 45,
    slideKey: "l2-singapore",
    lesson: 2,
    section: "班轮走廊与节点",
    title: "新加坡：没有巨大本地腹地，为何仍关键？",
    layout: "image",
    lead: "位置只是入口，真正的枢纽价值来自全球连接、转运组织、港航服务与可靠衔接。",
    image: IMAGES.l2SingaporeApproach,
    imageAlt: "大型集装箱船接近新加坡繁忙港区的教学复原图",
    bullets: ["多航线交汇", "高频转运连接", "港航与海事服务集聚"],
    teachingCue: "要求学生不用“位置好”三个字作完整答案。",
    sourceIds: ["mpa-singapore", "oocl-spain-release"],
    narrative: beat(
      "新加坡",
      "枢纽挂港",
      "evidence",
      "documented",
      46,
      "位置优势怎样转化为可兑现的网络服务？"
    )
  }),
  page({
    index: 46,
    slideKey: "l2-transshipment",
    lesson: 2,
    section: "班轮走廊与节点",
    title: "一次中转发生了什么？",
    layout: "sequence",
    steps: ["卸下干线箱", "进入中转堆场", "等待下一航次窗口", "匹配舱位与装船计划", "装上支线或另一干线"],
    lead: "箱子没有进入本地市场，却完成了一次关键网络重组。",
    image: IMAGES.l2TransshipmentHub,
    imageAlt: "大型干线船、集装箱堆场与支线船共同构成转运港的教学复原图",
    teachingCue: "让学生找出等待与信息错误可能发生在哪一步。",
    sourceIds: ["mpa-singapore"],
    narrative: beat(
      "新加坡",
      "转运作业",
      "concept",
      "concept",
      47,
      "中转增加一次装卸，为什么仍可能降低网络总成本？"
    )
  }),
  page({
    index: 47,
    slideKey: "l2-liner-network",
    lesson: 2,
    section: "班轮走廊与节点",
    title: "港序背后的班轮网络",
    layout: "image",
    lead: "一条服务循环把多地货流合并到有限运力上，再通过枢纽与支线扩展覆盖。",
    diagram: "route-layers",
    bullets: ["航线层：船按时刻表循环", "节点层：港口完成聚散与转运", "腹地层：内陆网络持续供货"],
    teachingCue: "逐层显示三张网络，不让学生把港序当作孤立港名。",
    narrative: beat(
      "亚欧网络",
      "网络合成",
      "concept",
      "concept",
      48,
      "航线变化会把影响传到哪些腹地？"
    )
  }),
  page({
    index: 48,
    slideKey: "l2-route-classifications",
    lesson: 2,
    section: "班轮走廊与节点",
    title: "“五大/六大航线”为什么都可能对？",
    layout: "summary",
    lead: "分类口径取决于研究对象：集装箱、能源、散货、区域市场或战略通道会得到不同分组。",
    columns: [
      { heading: "按市场", body: "跨太平洋、亚欧、跨大西洋等" },
      { heading: "按货类", body: "集装箱、油气、矿石、粮食等" },
      { heading: "按尺度", body: "全球干线、区域支线与沿海运输" }
    ],
    teachingCue: "把旧的航线清单压缩成这一页分析方法。",
    assistantCue: "不得把任何五大或六大航线分组称为唯一固定标准。",
    narrative: beat(
      "全球海运",
      "分类校准",
      "consequence",
      "concept",
      49,
      "当前航次应在哪一种分类中被观察？"
    )
  }),
  page({
    index: 49,
    slideKey: "l2-malacca",
    lesson: 2,
    section: "马六甲与苏伊士",
    title: "第一个咽喉：马六甲",
    layout: "image",
    lead: "从东亚进入印度洋的高密度交通在狭窄水域汇集，局部安全与容量问题会影响更大范围。",
    image: IMAGES.l2MalaccaNight,
    imageAlt: "夜间船流通过马六甲海峡的纪录片式教学复原图",
    teachingCue: "先看船流密度，再解释“咽喉”不是只看最窄宽度。",
    sourceIds: ["unctad-chokepoints"],
    narrative: beat(
      "马六甲海峡",
      "进入印度洋",
      "evidence",
      "documented",
      50,
      "为什么局部水域能影响远方库存？"
    )
  }),
  page({
    index: 50,
    slideKey: "l2-why-chokepoint",
    lesson: 2,
    section: "马六甲与苏伊士",
    title: "海峡为什么把风险集中？",
    layout: "image",
    diagram: "chokepoint-chain",
    bullets: ["大量航线在此收敛", "可替代路线更长或能力有限", "事故与管制会形成排队", "延误沿时刻表向后传播"],
    teachingCue: "让学生指出四条链中哪一条属于容量、哪一条属于网络。",
    sourceIds: ["unctad-chokepoints"],
    narrative: beat(
      "马六甲海峡",
      "咽喉机制",
      "concept",
      "concept",
      51,
      "风险是发生在点上，还是传播在网络中？"
    )
  }),
  page({
    index: 51,
    slideKey: "l2-indian-ocean",
    lesson: 2,
    section: "马六甲与苏伊士",
    title: "驶入印度洋：航线仍受下一道门约束",
    layout: "statement",
    lead: "离开一个咽喉不等于风险结束；航次要继续匹配天气、燃料、船期和下一通道窗口。",
    bullets: ["航行计划具有连续性", "后续港口共享同一时刻表", "提前信息决定能否调整"],
    teachingCue: "用“下一站准点”解释航次链式约束。",
    narrative: beat(
      "印度洋",
      "咽喉之间",
      "transition",
      "concept",
      52,
      "前一段延误怎样改变后一段决策？"
    )
  }),
  page({
    index: 52,
    slideKey: "l2-suez",
    lesson: 2,
    section: "马六甲与苏伊士",
    title: "第二个咽喉：苏伊士",
    layout: "image",
    lead: "运河把亚洲—欧洲航程压缩为一条高价值通道，也让大量船期依赖同一服务系统。",
    image: IMAGES.l2SuezTransit,
    imageAlt: "大型集装箱船通过苏伊士运河的纪录片式教学复原图",
    teachingCue: "把运河当作容量有限的服务台，而不是地图上的一条线。",
    sourceIds: ["unctad-chokepoints"],
    narrative: beat(
      "苏伊士运河",
      "进入地中海前",
      "evidence",
      "documented",
      53,
      "缩短航程为何也会集中风险？"
    )
  }),
  page({
    index: 53,
    slideKey: "l2-canal-service-system",
    lesson: 2,
    section: "马六甲与苏伊士",
    title: "运河是一台服务系统",
    layout: "sequence",
    steps: ["抵达与申报", "等待编队或通行窗口", "引航与交通组织", "受控通过", "恢复远洋船期"],
    lead: "每一步都有能力、秩序和信息条件。",
    image: IMAGES.l2CanalServiceConvoy,
    imageAlt: "船舶编队通过苏伊士运河并接受引航与交通组织的教学复原图",
    teachingCue: "让学生把“排队”与“通航能力”分开表述。",
    narrative: beat(
      "苏伊士运河",
      "受控通行",
      "concept",
      "concept",
      54,
      "增加船舶数量为什么不能解决通道拥堵？"
    )
  }),
  page({
    index: 54,
    slideKey: "l2-capacity-order-safety",
    lesson: 2,
    section: "马六甲与苏伊士",
    title: "容量之外，还有秩序与安全",
    layout: "matrix",
    columns: [
      { heading: "物理容量", body: "水深、宽度、交通组织和通过能力" },
      { heading: "运行秩序", body: "预约、编队、引航与优先规则" },
      { heading: "安全边界", body: "船型、天气、操纵与事故处置" },
      { heading: "信息质量", body: "预计到达、拥堵状态和替代方案" }
    ],
    teachingCue: "要求学生为每个维度提出一种监测指标。",
    narrative: beat(
      "苏伊士运河",
      "通道管理",
      "concept",
      "concept",
      55,
      "哪个维度最可能先触发船期调整？"
    )
  }),
  page({
    index: 55,
    slideKey: "l2-risk-propagation",
    lesson: 2,
    section: "马六甲与苏伊士",
    title: "一个局部中断怎样传播？",
    layout: "image",
    diagram: "chokepoint-chain",
    steps: ["通道等待", "船期偏移", "后续泊位冲突", "箱子错过中转", "库存与交付承压"],
    teachingCue: "逐步点击传播链，询问哪一步可以被提前信息削弱。",
    sourceIds: ["unctad-chokepoints"],
    narrative: beat(
      "亚欧供应链",
      "风险传播",
      "consequence",
      "concept",
      56,
      "港口为什么会受到千里之外的通道影响？"
    )
  }),
  page({
    index: 56,
    slideKey: "l2-chokepoint-chain",
    lesson: 2,
    section: "马六甲与苏伊士",
    title: "咽喉不是一个点，而是一串约束",
    layout: "summary",
    lead: "走廊中的每个关键通道都连接船期、港口窗口、中转关系和腹地库存。",
    bullets: ["局部容量决定等待", "网络连接决定影响范围", "信息与替代性决定恢复速度"],
    teachingCue: "要求学生用一句完整因果链总结，而不是只说“堵船”。",
    sourceIds: ["unctad-chokepoints"],
    narrative: beat(
      "亚欧走廊",
      "咽喉总结",
      "consequence",
      "concept",
      57,
      "如果通行受限，船公司有哪些真实选择？"
    )
  }),
  page({
    index: 57,
    slideKey: "l2-reconstructed-route",
    lesson: 2,
    section: "马六甲与苏伊士",
    title: "LL3亚欧航线：从港序到地理路径",
    layout: "image",
    lead: "2023年历史港序从上海集聚亚洲货流，经新加坡进入亚欧航段，再连接地中海与北欧港口。",
    diagram: "voyage-route",
    bullets: [
      "亚洲段依次挂靠上海、厦门、南沙、香港、盐田、盖梅和新加坡",
      "欧洲段连接比雷埃夫斯、汉堡、鹿特丹、泽布吕赫和瓦伦西亚",
      "84天循环把去程、欧洲挂港与返程重新接回上海"
    ],
    teachingCue: "专门讲清事实层与复原层，避免地图产生过度确定性。",
    assistantCue: "必须把逐段线路称为教学路线示意，不得称为实时轨迹。",
    sourceIds: ["oocl-spain-release"],
    narrative: beat(
      "亚欧走廊",
      "事实边界",
      "evidence",
      "documented",
      58,
      "当真实资料只给港序时，地图应怎样诚实表达？",
      undefined,
      "路线示意"
    )
  }),
  page({
    index: 58,
    slideKey: "l2-disruption-brief",
    lesson: 2,
    section: "教学中断决策",
    title: "教学情境：前方通行受限",
    layout: "image",
    lead: "在本教学情境中，预计等待时间持续上升，后续港口窗口和欧洲安全库存同时承压。",
    image: IMAGES.l2DisruptionRoom,
    imageAlt: "航运调度室评估通道受限的纪录片式教学复原图",
    bullets: [
      "预计等待时间继续上升，稳定通行窗口尚未形成",
      "后续港口的靠泊窗口相互衔接，延误会沿航次传播",
      "欧洲端安全库存持续下降，可靠性与库存成本同时承压"
    ],
    teachingCue: "醒目标注教学情境，发放三种方案卡。",
    assistantCue: "不得把本页中断说成OOCL Spain真实经历。",
    accent: "coral",
    narrative: beat(
      "印度洋—苏伊士前",
      "中断情境",
      "transition",
      "scenario",
      59,
      "等待、绕行还是调整网络？",
      undefined
    )
  }),
  page({
    index: 59,
    slideKey: "l2-option-wait",
    lesson: 2,
    section: "教学中断决策",
    title: "方案A：等待",
    layout: "comparison",
    columns: [
      { heading: "可能收益", body: "维持原航线与挂港计划，避免额外航程" },
      { heading: "主要代价", body: "等待时间不确定，后续泊位与中转窗口可能错位" },
      { heading: "适用条件", body: "预计恢复较快，且库存与船期有足够缓冲" }
    ],
    teachingCue: "提醒“什么都不做”也是有成本的决策。",
    assistantCue: "方案结果是教学推演，不提供虚假的精确天数。",
    accent: "coral",
    narrative: beat(
      "苏伊士前",
      "方案比较",
      "decision",
      "scenario",
      60,
      "等待的价值取决于哪项未知信息？"
    )
  }),
  page({
    index: 60,
    slideKey: "l2-option-cape",
    lesson: 2,
    section: "教学中断决策",
    title: "方案B：绕行好望角",
    layout: "image",
    lead: "绕行提高路径可控性，却增加航程、燃料、时间和船队周转压力。",
    image: IMAGES.l2CapeDetour,
    imageAlt: "大型集装箱船绕行好望角海域的教学复原图",
    columns: [
      { heading: "获得", body: "摆脱单一通道等待" },
      { heading: "付出", body: "更长航程与更高资源占用" }
    ],
    teachingCue: "禁止只比较距离；至少加入库存与后续船期。",
    assistantCue: "本页是替代路线教学推演，不声称该船实际绕航。",
    sourceIds: ["unctad-chokepoints"],
    accent: "coral",
    narrative: beat(
      "印度洋",
      "方案比较",
      "decision",
      "scenario",
      61,
      "更长但更可控，何时会优于等待？"
    )
  }),
  page({
    index: 61,
    slideKey: "l2-option-network",
    lesson: 2,
    section: "教学中断决策",
    title: "方案C：调整挂港与转运",
    layout: "split",
    columns: [
      { heading: "做法", body: "调整部分挂港、换接其他航线或提前转运紧急箱" },
      { heading: "优势", body: "把单船问题转化为网络资源重组" },
      { heading: "风险", body: "舱位、单证、责任与信息协调更复杂" }
    ],
    teachingCue: "让学生看到韧性不仅是绕路，还包括网络重排。",
    accent: "coral",
    narrative: beat(
      "亚欧网络",
      "方案比较",
      "decision",
      "scenario",
      62,
      "网络替代需要哪些节点能力？"
    )
  }),
  page({
    index: 62,
    slideKey: "l2-decision-table",
    lesson: 2,
    section: "教学中断决策",
    title: "决策桌：你优化什么？",
    layout: "activity",
    table: {
      headers: ["方案", "成本", "时效确定性", "网络复杂度", "核心风险"],
      rows: [
        ["等待", "较低但不确定", "低", "低", "恢复时间未知"],
        ["绕行", "高", "中", "中", "航程与周转"],
        ["调整网络", "中高", "中高", "高", "衔接与信息"]
      ]
    },
    prompt: "先声明你优化成本、可靠性还是客户服务，再选择方案。",
    teachingCue: "10分钟小组活动；答案必须写出放弃了什么。",
    assistantCue: "表中为定性教学比较，不是具体船公司的经营报价。",
    accent: "coral",
    narrative: beat(
      "航运决策桌",
      "中断决策",
      "decision",
      "scenario",
      63,
      "同一证据为何会支持不同选择？"
    )
  }),
  page({
    index: 63,
    slideKey: "l2-container-origin",
    lesson: 2,
    section: "重庆集装箱支线",
    title: "镜头倒回：这只箱子来自哪里？",
    layout: "image",
    lead: "远洋船从上海启航，但教学集装箱的供应链更早从重庆果园港开始。",
    image: IMAGES.l2GuoyuanYangtze,
    imageAlt: "重庆果园港集装箱经长江运输的纪录片式教学复原图",
    teachingCue: "用箱号作为视觉锚点，明确镜头跟随的是箱子，不是海船。",
    assistantCue: "OOCL Spain没有驶入重庆；本段跟随教学集装箱。",
    sourceIds: ["cq-guoyuan"],
    narrative: beat(
      "重庆果园港",
      "追溯内陆来路",
      "transition",
      "scenario",
      64,
      "海运网络从海岸才开始吗？",
      "装船之前"
    )
  }),
  page({
    index: 64,
    slideKey: "l2-guoyuan-role",
    lesson: 2,
    section: "重庆集装箱支线",
    title: "果园港：远洋航次的内陆来路",
    layout: "case",
    lead: "果园港通过水运、铁路和公路组织内陆货流，使重庆制造能够接入沿海港和国际航线。",
    columns: [
      { heading: "集货", body: "汇集制造企业与区域货源" },
      { heading: "换装", body: "连接水路、铁路与公路" },
      { heading: "信息", body: "协调箱、单、车、船与时刻" }
    ],
    teachingCue: "让本地案例承担网络解释，不把它当作课程彩蛋。",
    sourceIds: ["cq-guoyuan"],
    narrative: beat(
      "重庆果园港",
      "内陆节点",
      "evidence",
      "documented",
      65,
      "内河港怎样参与全球供应链？"
    )
  }),
  page({
    index: 65,
    slideKey: "l2-container-chain",
    lesson: 2,
    section: "重庆集装箱支线",
    title: "果园港—上海：不是船的航次，是箱子的链条",
    layout: "image",
    diagram: "china-inland",
    steps: ["重庆工厂", "果园港集结", "长江水运", "上海港换装", "加入亚欧班轮"],
    teachingCue: "沿图重复主语：移动的是教学集装箱。",
    assistantCue: "内河路径是教学箱链条，不得表述为OOCL Spain航次。",
    sourceIds: ["cq-guoyuan", "mot-inland"],
    narrative: beat(
      "重庆—上海",
      "内河支线",
      "concept",
      "scenario",
      66,
      "哪一次换装最容易错过远洋船期？"
    )
  }),
  page({
    index: 66,
    slideKey: "l2-yangtze-corridor",
    lesson: 2,
    section: "重庆集装箱支线",
    title: "长江是一条走廊，也是一组节点",
    layout: "statement",
    lead: "干线航道提供连续通行，港口群、支流、城市与产业腹地决定货流怎样进入和离开走廊。",
    bullets: ["航道是通行条件", "港口是组织节点", "腹地是货流来源与去向", "规则与信息决定衔接效率"],
    teachingCue: "把海上走廊四层框架原样应用到长江。",
    sourceIds: ["mot-inland"],
    narrative: beat(
      "长江",
      "内河走廊",
      "concept",
      "documented",
      67,
      "只有深水航道，能否自动形成高效物流？"
    )
  }),
  page({
    index: 67,
    slideKey: "l2-three-gorges",
    lesson: 2,
    section: "重庆集装箱支线",
    title: "三峡改变了什么，又没改变什么？",
    layout: "comparison",
    columns: [
      { heading: "改变", body: "通航条件、运输组织和上游可达性" },
      { heading: "仍受约束", body: "船闸能力、排队、船型、季节与后续港口衔接" }
    ],
    prompt: "基础设施改善为何不会消除所有网络瓶颈？",
    teachingCue: "避免“有大坝就畅通”的单因叙述。",
    sourceIds: ["mot-inland"],
    narrative: beat(
      "三峡",
      "内河咽喉",
      "evidence",
      "documented",
      68,
      "通航改善会把瓶颈转移到哪里？"
    )
  }),
  page({
    index: 68,
    slideKey: "l2-national-inland-network",
    lesson: 2,
    section: "重庆集装箱支线",
    title: "中国高等级航道的骨架：四纵四横两网",
    layout: "image",
    diagram: "china-waterway-network",
    lead: "国家高等级航道把主干水系、区域网络和出海接口组织成连续运输骨架，长江是其中重要的东西向通道。",
    bullets: ["四纵联系南北主要水系", "四横组织东西向干线货流", "两网增强长三角与珠三角航道密度", "果园港通过长江连接沿海远洋网络"],
    teachingCue: "先教如何读骨架，再给名称；不做逐条背诵。",
    assistantCue: "采用当前四纵四横两网框架；提到旧框架时必须说明规划演变。",
    sourceIds: ["mot-network", "cq-guoyuan"],
    narrative: beat(
      "中国内河网络",
      "国家航道骨架",
      "concept",
      "documented",
      69,
      "果园港在骨架中承担哪一种连接任务？",
      undefined,
      "官方资料"
    )
  }),
  page({
    index: 69,
    slideKey: "l2-inland-hidden-costs",
    lesson: 2,
    section: "重庆集装箱支线",
    title: "内河段的隐性成本",
    layout: "matrix",
    columns: [
      { heading: "等待", body: "船闸、泊位与换装窗口" },
      { heading: "衔接", body: "内河班期与远洋截关时间" },
      { heading: "信息", body: "箱货状态和单证一致性" },
      { heading: "波动", body: "水情、运力与局部拥堵" }
    ],
    teachingCue: "把第一讲的广义成本再次放回内河链条。",
    narrative: beat(
      "长江—上海",
      "内河成本",
      "consequence",
      "concept",
      70,
      "最便宜的内河方案是否一定赶得上远洋船？"
    )
  }),
  page({
    index: 70,
    slideKey: "l2-whole-chain",
    lesson: 2,
    section: "网络韧性与抵欧",
    title: "把整条链放到一张图上",
    layout: "image",
    diagram: "port-network",
    lead: "重庆货源—果园港—长江—上海—亚洲挂港—海峡与运河—欧洲港口，共享同一交付承诺。",
    teachingCue: "让学生逐一指出走廊、咽喉、节点和腹地。",
    sourceIds: ["oocl-spain-release", "cq-guoyuan", "mot-network"],
    narrative: beat(
      "重庆—欧洲",
      "全链合成",
      "concept",
      "concept",
      71,
      "哪一层的失效最容易被其他层放大？"
    )
  }),
  page({
    index: 71,
    slideKey: "l2-resilience",
    lesson: 2,
    section: "网络韧性与抵欧",
    title: "韧性不是永不受阻",
    layout: "matrix",
    diagram: "resilience",
    columns: [
      { heading: "预见", body: "看见风险与状态变化" },
      { heading: "吸收", body: "用库存、时间和容量缓冲" },
      { heading: "适应", body: "调整路线、挂港和运力" },
      { heading: "恢复", body: "重新同步船期与供应链" }
    ],
    teachingCue: "要求每组用中断情境举出四种能力中的一项。",
    sourceIds: ["unctad-chokepoints", "worldbank-port"],
    narrative: beat(
      "亚欧网络",
      "韧性复盘",
      "consequence",
      "concept",
      72,
      "哪一种能力最依赖港口之间的协同？"
    )
  }),
  page({
    index: 72,
    slideKey: "l2-europe-cliffhanger",
    lesson: 2,
    section: "网络韧性与抵欧",
    title: "船抵近欧洲：下一问在码头",
    kicker: "END OF VOYAGE 02 · 欧洲近岸",
    layout: "cover",
    lead: "路线解释了船怎样抵达，却没有解释为什么同一艘船在不同港口得到完全不同的服务与价值。",
    image: IMAGES.l2EuropeApproach,
    imageAlt: "大型集装箱船接近北欧港口的纪录片式教学复原图",
    teachingCue: "用引航艇和港口灯光作为第三讲的视觉伏笔。",
    sourceIds: ["oocl-spain-release"],
    accent: "navy",
    narrative: beat(
      "欧洲近岸",
      "等待引航",
      "transition",
      "documented",
      73,
      "同一艘船，为何在不同港口创造不同价值？",
      "抵港前"
    )
  }),
  page({
    index: 73,
    slideKey: "l3-cover",
    lesson: 3,
    section: "抵港问题",
    title: "港口为什么创造不同价值？",
    kicker: "VOYAGE 03 · 靠泊、连接与治理",
    layout: "cover",
    lead: "船已经抵达。真正的问题不再是有没有码头，而是港口能为整条供应链组织什么。",
    image: IMAGES.l3PilotBoarding,
    imageAlt: "引航员登上大型集装箱船准备靠港的纪录片式教学复原图",
    teachingCue: "从引航员登轮开始，不先给港口代际定义。",
    accent: "navy",
    narrative: beat(
      "欧洲近岸",
      "引航登轮",
      "transition",
      "concept",
      74,
      "靠港之后，价值在哪里发生？",
      "抵港"
    )
  }),
  page({
    index: 74,
    slideKey: "l3-berthing-not-completion",
    lesson: 3,
    section: "抵港问题",
    title: "靠港不等于完成",
    layout: "question",
    lead: "船舶靠上泊位只是开始：箱子还要卸下、暂存、转运、放行并进入腹地。",
    prompt: "如果岸桥很快，但箱子三天后仍在堆场，港口算高效吗？",
    teachingCue: "只讨论现象，不急着引入代际。",
    narrative: beat(
      "港口锚地—泊位",
      "靠泊窗口",
      "decision",
      "concept",
      75,
      "港口效率的边界应画在哪里？"
    )
  }),
  page({
    index: 75,
    slideKey: "l3-four-port-tasks",
    lesson: 3,
    section: "抵港问题",
    title: "同一艘船，四个港口四种任务",
    layout: "comparison",
    columns: [
      { heading: "上海", body: "连接大型制造腹地与远洋干线" },
      { heading: "新加坡", body: "组织多航线转运与港航服务" },
      { heading: "比雷埃夫斯", body: "完成地中海挂港与区域连接" },
      { heading: "鹿特丹", body: "连接北欧产业、物流与内陆网络" }
    ],
    teachingCue: "强调是角色对照，不是港口排名。",
    assistantCue: "比雷埃夫斯只依据官方挂港事实作有限描述，不扩写未经来源支持的经营结论。",
    sourceIds: ["oocl-spain-release", "mpa-singapore", "rotterdam"],
    narrative: beat(
      "亚欧LL3挂港",
      "港口角色比较",
      "evidence",
      "documented",
      76,
      "同一港口能否承担多种任务？"
    )
  }),
  page({
    index: 76,
    slideKey: "l3-value-beyond-quay",
    lesson: 3,
    section: "抵港问题",
    title: "船边只看到作业，价值藏在哪里？",
    layout: "image",
    lead: "装卸发生在码头，交付能力却延伸到堆场、闸口、铁路、仓库、工厂和信息平台。",
    image: IMAGES.l3BerthWindow,
    imageAlt: "从船桥窗口看到码头与腹地交通的纪录片式教学复原图",
    bullets: ["海侧作业", "港内流转", "陆侧连接", "信息与治理"],
    teachingCue: "按由近及远的顺序，让学生扩展港口边界。",
    sourceIds: ["worldbank-port"],
    narrative: beat(
      "泊位",
      "价值边界",
      "concept",
      "concept",
      77,
      "哪个环节不在船边，却决定船边效率？"
    )
  }),
  page({
    index: 77,
    slideKey: "l3-no-taxonomy-first",
    lesson: 3,
    section: "抵港问题",
    title: "港口服务边界如何一步步扩大？",
    layout: "statement",
    lead: "港口从完成船岸装卸，逐步延伸到临港生产、物流组织和跨主体网络协同；旧能力不会因此消失。",
    steps: ["船岸转换", "临港生产", "物流组织", "网络协同", "能力组合"],
    teachingCue: "把代际名称暂时隐藏，告诉学生先做证据观察。",
    assistantCue: "港口代际是分析框架，不是先进程度排名。",
    sourceIds: ["worldbank-port-governance"],
    narrative: beat(
      "港口系统",
      "观察规则",
      "concept",
      "concept",
      78,
      "港口能力是替代旧能力，还是累积新能力？"
    )
  }),
  page({
    index: 78,
    slideKey: "l3-breakbulk-scene",
    lesson: 3,
    section: "港口能力演化",
    title: "第一幕：货物过岸",
    layout: "image",
    lead: "早期港口的核心任务是让船、货与岸安全接触，完成装卸、短暂存储和交付。",
    image: IMAGES.l3BreakbulkEra,
    imageAlt: "传统件杂货码头人工装卸场景的历史教学复原图",
    teachingCue: "让学生只列看得见的动作，不评价先进或落后。",
    sourceIds: ["worldbank-port-governance"],
    accent: "amber",
    narrative: beat(
      "传统码头",
      "能力观察一",
      "evidence",
      "concept",
      79
    )
  }),
  page({
    index: 79,
    slideKey: "l3-first-generation",
    lesson: 3,
    section: "港口能力演化",
    title: "第一代：海陆转换",
    layout: "statement",
    lead: "核心能力是船舶靠泊、货物装卸、临时存储与交付；这些基础能力今天仍不可替代。",
    bullets: ["船岸接口", "货物安全", "基本仓储", "港界内作业"],
    teachingCue: "强调后续代际不会取消第一代能力。",
    sourceIds: ["worldbank-port-governance"],
    accent: "amber",
    narrative: beat(
      "传统码头",
      "命名能力一",
      "concept",
      "concept",
      80,
      "现代港口若失去基础装卸能力会怎样？"
    )
  }),
  page({
    index: 80,
    slideKey: "l3-industrial-scene",
    lesson: 3,
    section: "港口能力演化",
    title: "第二幕：工厂来到港边",
    layout: "image",
    lead: "钢铁、炼化、粮油等产业利用港口的大宗物流条件，把生产和装卸组织在相邻空间。",
    image: IMAGES.l3IndustrialPort,
    imageAlt: "港区与钢铁炼化设施连接的工业港教学复原图",
    teachingCue: "让学生找出专用泊位、管线、堆场和工厂的耦合。",
    sourceIds: ["worldbank-port-governance", "rotterdam"],
    accent: "amber",
    narrative: beat(
      "工业港区",
      "能力观察二",
      "evidence",
      "concept",
      81,
      "工厂为什么愿意贴近港口？"
    )
  }),
  page({
    index: 81,
    slideKey: "l3-second-generation",
    lesson: 3,
    section: "港口能力演化",
    title: "第二代：装卸 + 工业增值",
    layout: "split",
    columns: [
      { heading: "保留", body: "靠泊、装卸、仓储与交付" },
      { heading: "增加", body: "工业加工、能源供应和专用设施" },
      { heading: "新风险", body: "安全、环境、土地与产业依赖" }
    ],
    teachingCue: "让学生说出第二代比第一代多了什么，而不是好在哪里。",
    sourceIds: ["worldbank-port-governance"],
    accent: "amber",
    narrative: beat(
      "工业港区",
      "命名能力二",
      "concept",
      "concept",
      82,
      "产业增值会给港口带来哪些外部成本？"
    )
  }),
  page({
    index: 82,
    slideKey: "l3-logistics-scene",
    lesson: 3,
    section: "港口能力演化",
    title: "第三幕：箱子进入供应链",
    layout: "image",
    lead: "港口开始组织仓配、拆拼箱、运输衔接、客户服务和信息，而不只管理港界内的货物。",
    image: IMAGES.l3LogisticsControl,
    imageAlt: "港口物流控制中心与仓配网络的教学复原图",
    teachingCue: "追踪一个箱子从岸桥到客户，数出跨主体交接。",
    sourceIds: ["worldbank-port-governance"],
    accent: "blue",
    narrative: beat(
      "物流港区",
      "能力观察三",
      "evidence",
      "concept",
      83,
      "港口怎样从地点变成供应链组织者？"
    )
  }),
  page({
    index: 83,
    slideKey: "l3-third-generation",
    lesson: 3,
    section: "港口能力演化",
    title: "第三代：物流组织与服务",
    layout: "sequence",
    steps: ["连接客户订单", "组织仓储与配送", "协调多式联运", "共享货物状态", "优化供应链总成本"],
    lead: "核心变化不是多建仓库，而是把多个主体的流程组织起来。",
    teachingCue: "纠正“第三代等于物流园”的简化。",
    assistantCue: "第三代重点是物流与供应链组织，不只是增加仓储设施。",
    sourceIds: ["worldbank-port-governance"],
    accent: "blue",
    narrative: beat(
      "物流网络",
      "命名能力三",
      "concept",
      "concept",
      84,
      "组织能力怎样降低港外成本？"
    )
  }),
  page({
    index: 84,
    slideKey: "l3-community-scene",
    lesson: 3,
    section: "港口能力演化",
    title: "第四幕：多个主体共享一个网络",
    layout: "image",
    lead: "港口、航运、铁路、公路、海关、城市与产业共同决策；价值来自数据共享、规则协调和港群治理。",
    image: IMAGES.l3PortCommunity,
    imageAlt: "港口共同体多主体协同控制中心的教学复原图",
    teachingCue: "让学生指出哪些主体并不由港口直接指挥。",
    sourceIds: ["worldbank-port", "worldbank-port-governance"],
    accent: "teal",
    narrative: beat(
      "港口共同体",
      "能力观察四",
      "evidence",
      "concept",
      85,
      "没有行政隶属关系，怎样实现协同？"
    )
  }),
  page({
    index: 85,
    slideKey: "l3-fourth-generation",
    lesson: 3,
    section: "港口能力演化",
    title: "第四代：协同与治理",
    layout: "split",
    columns: [
      { heading: "网络化", body: "跨港口、跨方式、跨区域组织资源" },
      { heading: "共同体", body: "通过规则、数据与信任协调多主体" },
      { heading: "治理", body: "兼顾效率、韧性、环境与城市关系" }
    ],
    teachingCue: "问学生：自动化设备是否天然拥有治理能力？",
    assistantCue: "第四代判断重点是网络化协同与治理，不是单一码头自动化。",
    sourceIds: ["worldbank-port", "worldbank-port-governance"],
    accent: "teal",
    narrative: beat(
      "港口网络",
      "命名能力四",
      "concept",
      "concept",
      86,
      "协同为什么比单点效率更难？"
    )
  }),
  page({
    index: 86,
    slideKey: "l3-generation-lens",
    lesson: 3,
    section: "港口能力演化",
    title: "港口能力如何逐层累积",
    layout: "table",
    diagram: "port-generations",
    table: {
      headers: ["观察镜头", "核心能力", "今天是否仍需要"],
      rows: [
        ["第一代", "海陆转换", "需要"],
        ["第二代", "产业增值", "视港口角色"],
        ["第三代", "物流组织", "需要"],
        ["第四代", "网络协同与治理", "日益重要"]
      ]
    },
    teachingCue: "让学生找一个同时具有多代特征的港口。",
    assistantCue: "港口分类不是投票排名；后代特征不会消除前代能力。",
    sourceIds: ["worldbank-port-governance"],
    narrative: beat(
      "港口系统",
      "代际总结",
      "consequence",
      "concept",
      87,
      "同一港口可以同时具有几代能力？"
    )
  }),
  page({
    index: 87,
    slideKey: "l3-automation-question",
    lesson: 3,
    section: "沿航次比较港口",
    title: "自动化在哪一层？",
    layout: "question",
    lead: "自动化可以提升装卸、堆场和信息处理，却不会自动形成腹地连接、跨主体信任或港群治理。",
    prompt: "一座全自动码头，是否必然属于第四代港口？",
    teachingCue: "先投票，课程末再要求学生修正答案。",
    assistantCue: "答案是否定必然关系；自动化是跨代能力之一。",
    sourceIds: ["sipg-yangshan", "worldbank-port"],
    narrative: beat(
      "现代码头",
      "常见误区",
      "decision",
      "concept",
      88,
      "设备能力与网络治理之间缺少什么？"
    )
  }),
  page({
    index: 88,
    slideKey: "l3-four-port-map",
    lesson: 3,
    section: "沿航次比较港口",
    title: "沿航次重新看四个港口",
    layout: "image",
    diagram: "voyage-route",
    lead: "比较对象相同：同一航次、同一艘船；观察维度改为海向连接、腹地、产业、服务和治理。",
    teachingCue: "固定比较维度，避免用印象给港口贴标签。",
    sourceIds: ["oocl-spain-release"],
    narrative: beat(
      "上海—新加坡—比雷埃夫斯—鹿特丹",
      "港口比较",
      "concept",
      "documented",
      89,
      "同一航次为何需要不同类型的节点？"
    )
  }),
  page({
    index: 89,
    slideKey: "l3-shanghai-gateway",
    lesson: 3,
    section: "沿航次比较港口",
    title: "上海：门户与规模接口",
    layout: "case",
    lead: "上海连接大型制造腹地、长江与沿海网络，并为远洋班轮提供规模化海陆转换。",
    columns: [
      { heading: "海向", body: "远洋干线与区域航线" },
      { heading: "陆向", body: "长江、沿海及综合集疏运" },
      { heading: "作业", body: "超大型船舶与自动化码头能力" }
    ],
    teachingCue: "把第一讲的离港五道门重新套到上海。",
    sourceIds: ["oocl-spain-release", "sipg-yangshan"],
    narrative: beat(
      "上海",
      "港口画像一",
      "evidence",
      "documented",
      90,
      "门户功能如何依赖腹地持续供货？"
    )
  }),
  page({
    index: 90,
    slideKey: "l3-singapore-hub",
    lesson: 3,
    section: "沿航次比较港口",
    title: "新加坡：转运与网络组织",
    layout: "case",
    lead: "本地腹地不是唯一价值来源；多航线连接、转运可靠性与港航服务可以形成全球枢纽。",
    columns: [
      { heading: "连接", body: "多条全球与区域航线交汇" },
      { heading: "转运", body: "箱子在航线之间重新配置" },
      { heading: "服务", body: "海事、补给与信息能力支撑船舶网络" }
    ],
    teachingCue: "要求学生用功能证据解释，不用“地理位置优越”结束回答。",
    sourceIds: ["mpa-singapore"],
    narrative: beat(
      "新加坡",
      "港口画像二",
      "evidence",
      "documented",
      91,
      "没有巨大腹地，港口仍能创造什么价值？"
    )
  }),
  page({
    index: 91,
    slideKey: "l3-piraeus-call",
    lesson: 3,
    section: "沿航次比较港口",
    title: "比雷埃夫斯：地中海门户与转运节点",
    layout: "case",
    lead: "港口靠近亚欧主干航路，既服务希腊进出口，也通过支线网络连接地中海区域市场。",
    columns: [
      { heading: "门户", body: "连接希腊本地进出口与雅典都市区。" },
      { heading: "转运", body: "支线服务连接地中海、黑海和亚得里亚海港口。" },
      { heading: "航次位置", body: "在LL3的84天港序中两次出现，衔接欧洲段与返程航段。" }
    ],
    teachingCue: "把“知道什么、推断什么、还不知道什么”分三栏。",
    assistantCue: "港口角色依据比雷埃夫斯港务局与OOCL官方资料；其他绩效结论若无来源必须说明未知。",
    sourceIds: ["oocl-spain-release", "ppa-piraeus"],
    narrative: beat(
      "比雷埃夫斯",
      "港口画像三",
      "evidence",
      "documented",
      92,
      "门户与转运两种角色如何同时创造价值？",
      undefined,
      "官方资料"
    )
  }),
  page({
    index: 92,
    slideKey: "l3-rotterdam-industry",
    lesson: 3,
    section: "沿航次比较港口",
    title: "鹿特丹：港口与产业腹地",
    layout: "case",
    lead: "港区把海运、物流、工业设施与欧洲内陆连接组织在一起，价值不止来自一次装卸。",
    columns: [
      { heading: "产业", body: "港区生产与能源设施形成货流需求" },
      { heading: "物流", body: "仓储、配送与内陆运输扩大服务边界" },
      { heading: "治理", body: "港口发展需协调环境、城市与商业目标" }
    ],
    teachingCue: "让学生指出第二、三、四代能力分别出现在哪里。",
    sourceIds: ["rotterdam", "worldbank-port"],
    narrative: beat(
      "鹿特丹",
      "港口画像四",
      "evidence",
      "documented",
      93,
      "产业与物流如何共同塑造港口价值？"
    )
  }),
  page({
    index: 93,
    slideKey: "l3-multiple-roles",
    lesson: 3,
    section: "沿航次比较港口",
    title: "同一港口也可能承担多种角色",
    layout: "matrix",
    columns: [
      { heading: "门户", body: "服务大型本地或区域腹地" },
      { heading: "转运", body: "连接多条海上航线" },
      { heading: "工业", body: "支持临港生产与加工" },
      { heading: "城市", body: "与就业、空间、环境和公共利益互动" }
    ],
    teachingCue: "让学生给上海或鹿特丹勾选多个角色并提供证据。",
    sourceIds: ["worldbank-port"],
    narrative: beat(
      "港口网络",
      "角色组合",
      "concept",
      "concept",
      94,
      "为什么单一标签不足以描述大型港口？"
    )
  }),
  page({
    index: 94,
    slideKey: "l3-no-ranking",
    lesson: 3,
    section: "沿航次比较港口",
    title: "为不同任务匹配港口角色",
    layout: "activity",
    steps: [
      "选择一个港口",
      "指出两项主要网络角色",
      "给出三条页面证据",
      "说明这种匹配的适用边界"
    ],
    prompt: "针对给定运输任务，哪座港口最匹配？请说明任务条件与判断依据。",
    teachingCue: "6分钟小组陈述，专门追问被放弃的角色。",
    accent: "coral",
    narrative: beat(
      "课堂决策桌",
      "港口比较活动",
      "decision",
      "concept",
      95,
      "功能匹配比吞吐量排名多解释了什么？"
    )
  }),
  page({
    index: 95,
    slideKey: "l3-china-port-types",
    lesson: 3,
    section: "中国港口与果园港",
    title: "回到中国：港口类型看网络位置",
    layout: "statement",
    lead: "沿海港、河口港、河港、枢纽与支线节点描述的是空间和网络关系，不是行政级别。",
    diagram: "port-network",
    teachingCue: "把名称放到网络图上，不作孤立定义。",
    sourceIds: ["mot-inland", "worldbank-port"],
    narrative: beat(
      "中国港口网络",
      "类型框架",
      "concept",
      "concept",
      96,
      "果园港应从哪些关系被定义？"
    )
  }),
  page({
    index: 96,
    slideKey: "l3-coastal-river-inland",
    lesson: 3,
    section: "中国港口与果园港",
    title: "沿海港、河港和内河枢纽",
    layout: "comparison",
    columns: [
      { heading: "沿海港", body: "直接连接海上航线，承担远洋或沿海运输接口" },
      { heading: "河港", body: "依托内河航道组织区域货流和换装" },
      { heading: "内河枢纽", body: "连接多方式、多方向与较大腹地" }
    ],
    teachingCue: "让学生指出空间位置和网络角色是两套不同分类。",
    sourceIds: ["mot-inland"],
    narrative: beat(
      "中国港口网络",
      "空间类型",
      "concept",
      "concept",
      97,
      "河港何时能成为枢纽？"
    )
  }),
  page({
    index: 97,
    slideKey: "l3-gateway-transshipment",
    lesson: 3,
    section: "中国港口与果园港",
    title: "门户港与转运港",
    layout: "comparison",
    columns: [
      { heading: "门户逻辑", body: "货物大量进入或离开腹地，陆向连接决定价值" },
      { heading: "转运逻辑", body: "货物在航线间换船，海向连接与衔接可靠性决定价值" }
    ],
    prompt: "一个箱子是否进入本地腹地，是哪类判断的关键证据？",
    teachingCue: "用同一只箱子的去向区分两种角色。",
    narrative: beat(
      "港口网络",
      "功能类型一",
      "concept",
      "concept",
      98,
      "海向与陆向连接如何共同定义港口？"
    )
  }),
  page({
    index: 98,
    slideKey: "l3-industrial-city-port",
    lesson: 3,
    section: "中国港口与果园港",
    title: "工业港与城市港",
    layout: "comparison",
    columns: [
      { heading: "工业港", body: "设施与特定产业、货类和生产流程深度耦合" },
      { heading: "城市港", body: "港口发展与城市空间、就业、交通和环境持续互动" }
    ],
    prompt: "工业效率提升可能把哪些成本转移给城市？",
    teachingCue: "把外部成本与决策权放在同一问题里。",
    sourceIds: ["worldbank-port"],
    narrative: beat(
      "港口—城市",
      "功能类型二",
      "concept",
      "concept",
      99,
      "谁承担港口发展带来的外部成本？"
    )
  }),
  page({
    index: 99,
    slideKey: "l3-guoyuan-identities",
    lesson: 3,
    section: "中国港口与果园港",
    title: "果园港：一座内河节点的多重身份",
    layout: "image",
    lead: "果园港既是河港，也是多式联运节点和重庆制造连接外部市场的内陆接口。",
    image: IMAGES.l3GuoyuanNode,
    imageAlt: "重庆果园港水铁公多式联运节点的纪录片式教学复原图",
    columns: [
      { heading: "空间", body: "长江上游内河港" },
      { heading: "网络", body: "水铁公多式联运节点" },
      { heading: "腹地", body: "服务重庆及周边产业货流" }
    ],
    teachingCue: "要求学生用三个维度而不是一个标签描述果园港。",
    sourceIds: ["cq-guoyuan"],
    narrative: beat(
      "重庆果园港",
      "本地案例",
      "evidence",
      "documented",
      100,
      "多重身份怎样转化为真实服务能力？"
    )
  }),
  page({
    index: 100,
    slideKey: "l3-hinterland-view",
    lesson: 3,
    section: "中国港口与果园港",
    title: "从港口看到腹地",
    layout: "image",
    diagram: "china-inland",
    lead: "港口竞争力的一部分位于港界之外：产业密度、道路铁路、水运连接和信息透明共同决定货流。",
    bullets: ["腹地提供货源与需求", "集疏运决定可达范围", "节点效率决定连接质量", "信息决定协同速度"],
    teachingCue: "把视角从码头逐层拉远到区域产业。",
    sourceIds: ["mot-inland", "cq-guoyuan"],
    narrative: beat(
      "港口腹地",
      "网络外延",
      "consequence",
      "concept",
      101,
      "为什么海侧效率高仍可能陆侧拥堵？"
    )
  }),
  page({
    index: 101,
    slideKey: "l3-diagnosis-brief",
    lesson: 3,
    section: "港口诊断任务",
    title: "诊断任务：船已到，系统却没准备好",
    layout: "image",
    lead: "在本教学情境中，船舶等待、堆场占用、闸口拥堵和单证延迟同时出现，但预算只允许优先解决一项。",
    image: IMAGES.l3TerminalDiagnosis,
    imageAlt: "港口控制室面对船舶等待与堆场拥堵的教学复原图",
    teachingCue: "强调这是综合症状，不暗示某一真实港口。",
    assistantCue: "诊断材料是教学情境，不对应真实港口事故。",
    accent: "coral",
    narrative: beat(
      "教学港口",
      "系统诊断",
      "transition",
      "scenario",
      102,
      "哪个症状是原因，哪个只是结果？",
      undefined
    )
  }),
  page({
    index: 102,
    slideKey: "l3-diagnosis-vessel",
    lesson: 3,
    section: "港口诊断任务",
    title: "症状一：船舶等待",
    layout: "case",
    columns: [
      { heading: "可能原因", body: "泊位冲突、岸桥不足、航道窗口或前序船延误" },
      { heading: "所需证据", body: "计划靠泊、实际到港、泊位占用与作业率" },
      { heading: "判断边界", body: "等待是结果信号，需结合时间与作业数据定位根因" }
    ],
    teachingCue: "要求学生先列证据，再给原因。",
    accent: "coral",
    narrative: beat(
      "教学港口",
      "症状诊断一",
      "evidence",
      "scenario",
      103,
      "船舶等待发生在海侧，原因是否也一定在海侧？"
    )
  }),
  page({
    index: 103,
    slideKey: "l3-diagnosis-yard",
    lesson: 3,
    section: "港口诊断任务",
    title: "症状二：堆场占用",
    layout: "case",
    columns: [
      { heading: "可能原因", body: "进口箱滞留、转运错接、堆位策略或陆侧提箱不足" },
      { heading: "所需证据", body: "箱龄、堆存结构、翻箱次数与提箱节奏" },
      { heading: "系统联系", body: "堆场拥堵会反向降低岸桥和车辆效率" }
    ],
    teachingCue: "让学生画出堆场拥堵向海侧和陆侧的反馈。",
    accent: "coral",
    narrative: beat(
      "教学港口",
      "症状诊断二",
      "evidence",
      "scenario",
      104,
      "堆场是缓冲区，何时会变成瓶颈？"
    )
  }),
  page({
    index: 104,
    slideKey: "l3-diagnosis-hinterland",
    lesson: 3,
    section: "港口诊断任务",
    title: "症状三：集疏运拥堵",
    layout: "case",
    columns: [
      { heading: "可能原因", body: "闸口峰值、道路容量、铁路班次或预约失配" },
      { heading: "所需证据", body: "车辆到达分布、等待时间、铁路装卸与道路状态" },
      { heading: "治理问题", body: "关键资源可能不由码头单独控制" }
    ],
    teachingCue: "追问港口能直接控制哪些变量、只能协调哪些变量。",
    accent: "coral",
    narrative: beat(
      "教学港口",
      "症状诊断三",
      "evidence",
      "scenario",
      105,
      "没有指挥权时怎样改善陆侧拥堵？"
    )
  }),
  page({
    index: 105,
    slideKey: "l3-diagnosis-information",
    lesson: 3,
    section: "港口诊断任务",
    title: "症状四：信息延迟",
    layout: "case",
    columns: [
      { heading: "可能原因", body: "状态更新滞后、单证不一致、系统不互通或责任边界模糊" },
      { heading: "所需证据", body: "事件时间戳、错误率、重复录入与放行等待" },
      { heading: "隐藏影响", body: "设备空闲却无法作业，车辆到场却无法提箱" }
    ],
    teachingCue: "用“一份缺失的放行信息”贯穿全链后果。",
    accent: "coral",
    narrative: beat(
      "教学港口",
      "症状诊断四",
      "evidence",
      "scenario",
      106,
      "看不见的信息瓶颈怎样制造看得见的拥堵？"
    )
  }),
  page({
    index: 106,
    slideKey: "l3-priority-investment",
    lesson: 3,
    section: "港口诊断任务",
    title: "只能优先投资一项",
    layout: "activity",
    table: {
      headers: ["候选方案", "主要改善", "可能遗漏"],
      rows: [
        ["增加岸桥或泊位能力", "海侧作业", "陆侧与信息瓶颈"],
        ["扩建或优化堆场", "港内缓冲", "箱子为何滞留"],
        ["改善集疏运协同", "陆侧连接", "码头峰值能力"],
        ["建设共同信息机制", "跨主体同步", "物理容量不足"]
      ]
    },
    prompt: "选择一项优先投资，引用三条证据，并明确暂不解决什么。",
    teachingCue: "12分钟；禁止回答“全部升级”。",
    assistantCue: "回答必须有取舍，并区分症状、根因和证据。",
    accent: "coral",
    narrative: beat(
      "港口决策桌",
      "优先级决策",
      "decision",
      "scenario",
      107,
      "哪项投资最能解除系统性瓶颈？"
    )
  }),
  page({
    index: 107,
    slideKey: "l3-whole-voyage-answer",
    lesson: 3,
    section: "航次收束",
    title: "把答案放回整条航次",
    layout: "summary",
    diagram: "port-network",
    lead: "货物创造运输需求，航线组织规模，咽喉约束选择，港口连接海陆，腹地与治理决定价值能否兑现。",
    steps: ["货物", "航线", "咽喉", "港口", "腹地", "协同治理"],
    teachingCue: "逐个回看三讲开场问题，让学生用完整因果链回答。",
    sourceIds: ["oocl-spain-release", "worldbank-port"],
    narrative: beat(
      "完整航次",
      "三讲合流",
      "consequence",
      "concept",
      108,
      "港口为什么不是航次的终点，而是另一套系统的入口？"
    )
  }),
  page({
    index: 108,
    slideKey: "l3-next-lesson",
    lesson: 3,
    section: "航次收束",
    title: "下一讲：船靠岸后，系统怎样运转？",
    kicker: "END OF VOYAGE 03 · 转入码头生产",
    layout: "cover",
    lead: "下一步进入泊位计划、岸桥分配、堆场组织与集卡调度——从宏观网络走进港口的微观生产系统。",
    image: IMAGES.l3TerminalDiagnosis,
    imageAlt: "港口码头生产调度与控制中心的教学复原图",
    teachingCue: "用作业指令界面替代传统总结页，留下进入模拟实验的期待。",
    assistantCue: "第四讲尚未建设，只能说明拟进入码头生产系统，不得虚构具体页码与内容。",
    accent: "navy",
    narrative: beat(
      "集装箱码头",
      "进入微观系统",
      "transition",
      "concept",
      100,
      "一艘船的靠泊计划怎样变成每台设备的任务？",
      "下一讲"
    )
  })
];

export const PORT_MANAGEMENT_SLIDES: readonly PortManagementSlideSpec[] = [
  ...PORT_MANAGEMENT_LESSON_ONE_V7_SLIDES,
  ...LEGACY_PORT_MANAGEMENT_SLIDES.slice(36)
].map((slide, offset) => ({
  ...slide,
  index: offset + 1,
  narrative: {
    ...slide.narrative,
    progress: offset + 1
  }
}));
