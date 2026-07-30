import {
  PORT_MANAGEMENT_IMAGEGEN_ASSETS,
  PORT_MANAGEMENT_SLIDES
} from "./slides.js";

export type PortSlideLayout =
  | "cover"
  | "question"
  | "objectives"
  | "statement"
  | "split"
  | "sequence"
  | "comparison"
  | "table"
  | "image"
  | "stat"
  | "matrix"
  | "activity"
  | "case"
  | "summary";

export type PortSlideDiagram =
  | "voyage-route"
  | "route-layers"
  | "chokepoint-chain"
  | "china-inland"
  | "china-waterway-network"
  | "port-interface"
  | "port-generations"
  | "port-network"
  | "resilience";

export type PortNarrativeEvidence =
  | "documented"
  | "scenario"
  | "concept";

export type PortNarrativePublicLabel =
  | "史料"
  | "官方资料"
  | "教学情境"
  | "路线示意";

export type PortNarrativeBeat =
  | "evidence"
  | "concept"
  | "decision"
  | "consequence"
  | "transition";

export type PortManagementLessonNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16;

export interface PortSlideColumn {
  heading: string;
  body: string;
  note?: string;
}

export interface PortSlideTable {
  headers: string[];
  rows: string[][];
}

export interface PortNarrativeMetadata {
  location: string;
  voyageStage: string;
  storyBeat: PortNarrativeBeat;
  evidence: PortNarrativeEvidence;
  timeMarker?: string;
  openQuestion?: string;
  publicLabel?: PortNarrativePublicLabel;
  progress: number;
}

export interface PortManagementSlideSpec {
  index: number;
  slideKey: string;
  lesson: PortManagementLessonNumber;
  lessonTitle: string;
  section: string;
  title: string;
  kicker: string;
  layout: PortSlideLayout;
  lead?: string;
  bullets?: string[];
  columns?: PortSlideColumn[];
  steps?: string[];
  table?: PortSlideTable;
  stat?: { value: string; label: string; detail?: string };
  image?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  imagePosition?: string;
  diagram?: PortSlideDiagram;
  prompt?: string;
  teachingCue: string;
  assistantCue?: string;
  sourceIds?: string[];
  accent?: "teal" | "blue" | "amber" | "coral" | "navy";
  narrative: PortNarrativeMetadata;
}

export interface PortCourseSource {
  label: string;
  url: string;
}

export interface PortLessonTimingBlock {
  label: string;
  slideStart: number;
  slideEnd: number;
  minutes: number;
  purpose: string;
}

export interface PortManagementLessonAssistantBrief {
  objective: string;
  coreClaims: readonly string[];
  guardrails: readonly string[];
  responsePolicy: string;
}

export interface PortManagementLessonSpec {
  number: PortManagementLessonNumber;
  label: string;
  title: string | null;
  status: "ready" | "planned";
  slideStart: number | null;
  slideEnd: number | null;
  timing: readonly PortLessonTimingBlock[];
  assistantBrief: PortManagementLessonAssistantBrief | null;
}

export interface PortManagementLessonSlidePosition {
  globalIndex: number;
  lessonNumber: PortManagementLessonNumber;
  lessonStart: number;
  lessonEnd: number;
  localIndex: number;
  localTotal: number;
}

export interface PortManagementAssistantContext {
  lessonNumber: PortManagementLessonNumber;
  lessonLabel: string;
  lessonTitle: string;
  voyagePrompt: string;
  lessonPrompt: string;
  slideIndex: number;
  slideKey: string;
  slideTitle: string;
  slidePrompt: string;
}

export interface PortManagementVoyageDossier {
  id: string;
  label: string;
  snapshotDate: string;
  evidenceMode: "historical-service-snapshot";
  vessel: {
    name: string;
    imo: string;
    built: number;
    lengthMeters: number;
    beamMeters: number;
    capacityTeu: number;
  };
  service: {
    name: string;
    cycleDays: number;
    portRotation: readonly string[];
  };
  teachingScenario: {
    cargo: string;
    origin: string;
    joinPort: string;
    disclaimer: string;
  };
  routeDisclaimer: string;
  sourceIds: readonly string[];
}

export const PORT_MANAGEMENT_DECK_VERSION =
  "release-port-management-voyage-v5";

export const PORT_MANAGEMENT_SOURCES: Record<string, PortCourseSource> = {
  "oocl-spain-release": {
    label: "OOCL · OOCL Spain发布及LL3港序（2023）",
    url: "https://www.oocl.com/jpn/pressandmedia/pressreleases/2023/Pages/16Feb2023.aspx?lang=eng&site=china"
  },
  "oocl-spain-vessel": {
    label: "OOCL · 东方西班牙船舶参数",
    url: "https://www.oocl.com/schi/ourservices/vessels/gclass24188/Pages/ooclspain.aspx"
  },
  "wto-comparative": {
    label: "WTO · Comparative Advantage",
    url: "https://www.wto.org/english/res_e/reser_e/cadv_e.htm"
  },
  "unctad-rmt": {
    label: "UNCTAD · Review of Maritime Transport",
    url: "https://unctad.org/RMT"
  },
  "unctad-chokepoints": {
    label: "UNCTAD · Review of Maritime Transport 2024",
    url: "https://unctad.org/publication/review-maritime-transport-2024"
  },
  "unctad-maritime-share": {
    label: "UNCTAD · 海运连通性与贸易占比（2024）",
    url: "https://unctad.org/news/new-context-calls-changing-how-we-measure-maritime-connectivity"
  },
  "uk-georgian": {
    label: "英国国家档案馆 · Georgian Britain",
    url: "https://www.nationalarchives.gov.uk/education/resources/georgian-britain-age-modernity/"
  },
  "uk-port-books": {
    label: "英国国家档案馆 · Port Books 1565–1799",
    url: "https://www.nationalarchives.gov.uk/help-with-your-research/research-guides/merchant-trade-records-port-books-1565-1799/"
  },
  "uk-slave-trade": {
    label: "英国国家档案馆 · Transatlantic Slave Trade",
    url: "https://www.nationalarchives.gov.uk/explore-the-collection/explore-by-time-period/georgians/transatlantic-slave-trade/"
  },
  "france-naval-history": {
    label: "法国国家海军博物馆 · 法国海军史",
    url: "https://www.musee-marine.fr/nos-musees/paris/le-musee-a-paris/a-propos/lieu-et-parcours/les-traversees.html"
  },
  "ppa-piraeus": {
    label: "比雷埃夫斯港务局 · 国际枢纽与港口角色",
    url: "https://www.olp.gr/en/organisation-en/strategy-vision"
  },
  "boe-london": {
    label: "Bank of England · London Financial Centre",
    url: "https://www.bankofengland.co.uk/-/media/boe/files/quarterly-bulletin/2014/why-is-the-uk-banking-system-so-big-and-is-that-a-problem.pdf"
  },
  "rmg-steam": {
    label: "Royal Museums Greenwich · Sail to Steam",
    url: "https://www.rmg.co.uk/stories/ocean/sailing-ships-steam-power-how-industrial-revolution-changed-life-sea-forever"
  },
  "mot-inland": {
    label: "交通运输部 · 内河航运发展纲要",
    url: "https://xxgk.mot.gov.cn/2020/jigou/zhghs/202006/t20200630_3321348.html"
  },
  "mot-network": {
    label: "交通运输部 · 四纵四横两网国家高等级航道",
    url: "https://zjhy.mot.gov.cn/yaowendt/jiaotongyw/202103/t20210324_3538647.html"
  },
  "mot-water-logistics": {
    label: "交通运输部 · 水运物流降本（2025）",
    url: "https://www.mot.gov.cn/zxft2025/shuiyunwljbzx_syy/"
  },
  "yunnan-multimodal": {
    label: "云南省交通运输厅 · 多式联运测算（2023）",
    url: "https://jtyst.yn.gov.cn/html/2023/zaixianfangtan_1124/130662.html"
  },
  "imo-speed-management": {
    label: "IMO · GreenVoyage2050速度管理",
    url: "https://greenvoyage2050.imo.org/technology/speed-management/"
  },
  "itf-mega-ships": {
    label: "ITF/OECD · The Impact of Mega-Ships",
    url: "https://itf-oecd.org/impact-mega-ships"
  },
  "worldbank-logistics-reliability": {
    label: "World Bank · 物流速度与可靠性（2026）",
    url: "https://blogs.worldbank.org/en/trade/why-smarter-logistics-are-essential-for-trade--growth--and-jobs"
  },
  "worldbank-port": {
    label: "World Bank · Port Reform Toolkit, 3rd edition",
    url: "https://www.worldbank.org/en/topic/transport/publication/port-reform-toolkit"
  },
  "worldbank-port-governance": {
    label: "World Bank · Port Reform Toolkit Module 3",
    url: "https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099073025114030998"
  },
  "sipg-yangshan": {
    label: "上港集团 · 洋山四期自动化码头",
    url: "https://shangdong.portshanghai.com.cn/gsjjOurCompany/index.jhtml"
  },
  "mpa-singapore": {
    label: "新加坡海事及港务管理局 · Global Hub Port",
    url: "https://www.mpa.gov.sg/maritime-singapore/what-maritime-singapore-offers/global-hub-port"
  },
  rotterdam: {
    label: "鹿特丹港 · Industry and Logistics",
    url: "https://www.portofrotterdam.com/en/setting"
  },
  "cq-guoyuan": {
    label: "重庆市交通运输委员会 · 果园港多式联运",
    url: "https://jtj.cq.gov.cn/ztzl/cydqscjjq/202401/t20240117_12828937.html"
  }
};

export const PORT_MANAGEMENT_VOYAGE_DOSSIER: PortManagementVoyageDossier = {
  id: "oocl-spain-ll3-2023",
  label: "OOCL Spain · 2023年亚欧LL3航次快照",
  snapshotDate: "2023-03",
  evidenceMode: "historical-service-snapshot",
  vessel: {
    name: "OOCL Spain（东方西班牙）",
    imo: "9908126",
    built: 2023,
    lengthMeters: 399.99,
    beamMeters: 61.3,
    capacityTeu: 24_188
  },
  service: {
    name: "Asia–Europe LL3",
    cycleDays: 84,
    portRotation: [
      "上海",
      "厦门",
      "南沙",
      "香港",
      "盐田",
      "盖梅",
      "新加坡",
      "比雷埃夫斯",
      "汉堡",
      "鹿特丹",
      "泽布吕赫",
      "瓦伦西亚",
      "比雷埃夫斯",
      "阿布扎比",
      "新加坡",
      "上海"
    ]
  },
  teachingScenario: {
    cargo: "一只装载重庆制造汽车零部件的教学集装箱",
    origin: "重庆果园港",
    joinPort: "上海",
    disclaimer:
      "货物、延误、绕航与经营选择均为教学情境，不代表OOCL Spain真实承运记录或实际事故。"
  },
  routeDisclaimer:
    "逐段海上路径依据官方挂港顺序进行课程复原，仅作教学路线示意，不作为实时班期、实时AIS或导航轨迹。",
  sourceIds: ["oocl-spain-release", "oocl-spain-vessel"]
};

export const PORT_MANAGEMENT_LESSON_TIMINGS: Record<
  1 | 2 | 3,
  readonly PortLessonTimingBlock[]
> = {
  1: [
    {
      label: "上海冷开场",
      slideStart: 1,
      slideEnd: 4,
      minutes: 8,
      purpose: "由真实巨轮和离港悬念建立主线。"
    },
    {
      label: "英法历史回溯",
      slideStart: 5,
      slideEnd: 15,
      minutes: 25,
      purpose: "用多因素证据解释不同海权与贸易网络路径。"
    },
    {
      label: "货物为何出发",
      slideStart: 16,
      slideEnd: 24,
      minutes: 22,
      purpose: "由教学集装箱引出比较优势、交换边界和交易责任。"
    },
    {
      label: "为什么水运如此便宜",
      slideStart: 25,
      slideEnd: 31,
      minutes: 19,
      purpose: "用规模、航速与可靠性解释低运价及其时间代价。"
    },
    {
      label: "港口接口与启航",
      slideStart: 32,
      slideEnd: 36,
      minutes: 16,
      purpose: "说明港口如何兑现海上规模经济并完成离港决策。"
    }
  ],
  2: [
    {
      label: "恢复航海日志",
      slideStart: 37,
      slideEnd: 40,
      minutes: 8,
      purpose: "以真实LL3港序提出路线解释任务。"
    },
    {
      label: "班轮走廊与节点",
      slideStart: 41,
      slideEnd: 48,
      minutes: 18,
      purpose: "在航次中辨认干线、支线、枢纽、门户和腹地。"
    },
    {
      label: "马六甲与苏伊士",
      slideStart: 49,
      slideEnd: 57,
      minutes: 22,
      purpose: "解释海峡、运河及风险传播。"
    },
    {
      label: "教学中断决策",
      slideStart: 58,
      slideEnd: 62,
      minutes: 15,
      purpose: "比较等待、绕航和调整转运的后果。"
    },
    {
      label: "重庆集装箱支线",
      slideStart: 63,
      slideEnd: 69,
      minutes: 17,
      purpose: "从果园港追踪集装箱进入上海海运网络。"
    },
    {
      label: "网络韧性与抵欧",
      slideStart: 70,
      slideEnd: 72,
      minutes: 10,
      purpose: "形成完整网络图并留下港口价值悬念。"
    }
  ],
  3: [
    {
      label: "抵港问题",
      slideStart: 73,
      slideEnd: 77,
      minutes: 10,
      purpose: "由同船不同港的作业差异提出价值问题。"
    },
    {
      label: "港口能力演化",
      slideStart: 78,
      slideEnd: 86,
      minutes: 21,
      purpose: "先观察能力变化，再命名一至四代港口。"
    },
    {
      label: "沿航次比较港口",
      slideStart: 87,
      slideEnd: 94,
      minutes: 20,
      purpose: "比较上海、新加坡、比雷埃夫斯与鹿特丹的角色。"
    },
    {
      label: "中国港口与果园港",
      slideStart: 95,
      slideEnd: 100,
      minutes: 15,
      purpose: "把港口类型放回网络位置和腹地关系。"
    },
    {
      label: "港口诊断任务",
      slideStart: 101,
      slideEnd: 106,
      minutes: 18,
      purpose: "诊断船舶、堆场、集疏运和信息瓶颈。"
    },
    {
      label: "航次收束",
      slideStart: 107,
      slideEnd: 108,
      minutes: 6,
      purpose: "回看整条价值链并衔接码头生产系统。"
    }
  ]
};

function plannedLesson(
  number: PortManagementLessonNumber
): PortManagementLessonSpec {
  return {
    number,
    label: `第${number}讲`,
    title: null,
    status: "planned",
    slideStart: null,
    slideEnd: null,
    timing: [],
    assistantBrief: null
  };
}

export const PORT_MANAGEMENT_LESSONS: readonly PortManagementLessonSpec[] = [
  {
    number: 1,
    label: "第1讲",
    title: "一艘巨轮为什么值得启航？",
    status: "ready",
    slideStart: 1,
    slideEnd: 36,
    timing: PORT_MANAGEMENT_LESSON_TIMINGS[1],
    assistantBrief: {
      objective:
        "从OOCL Spain启航问题出发，解释分工如何创造货流、水运如何压低距离成本、生产排班如何吸收稳定提前期，以及港口如何控制接口成本与时间波动。",
      coreClaims: [
        "英国与法国都是重要海洋强国，其路径差异来自安全约束、国家能力、商业金融、工业港口关系及殖民体系的共同作用。",
        "比较优势比较机会成本；绝对生产率更高并不取消专业化交换的可能。",
        "水运低单位成本来自巨量载荷、固定成本分摊、标准化网络和以较慢航速降低推进能耗，但高装载率与稳定货流是兑现条件。",
        "稳定的平均提前期可以通过提前生产和下单纳入计划，但仍增加在途库存、资金占用和暴露时间；提前期波动主要推动安全库存与停线风险。",
        "港口通过货量聚集、装卸、集疏运、仓储、单证、监管与信息协同，把海上规模经济兑现为全程物流成本。"
      ],
      guardrails: [
        "不得把英国崛起简化为岛国宿命，也不得把法国描述为缺乏海洋能力。",
        "必须指出殖民扩张和强制劳动造成的暴力与不平等，不能把海权叙事浪漫化。",
        "海运超过八成是国际贸易货量口径，约七成才是价值口径；两种数字不得混用。",
        "不得把稳定地慢回答成完全没有成本，也不得把教学时间参数写成真实线路表现。",
        "重庆—上海水铁公1∶2∶6是区域测算，不是全国统一固定费率。",
        "教学集装箱不属于OOCL公开货运记录。"
      ],
      responsePolicy:
        "沿当前航次和页面问题回答；先区分平均时间与时间波动，再解释成本和港口接口。涉及具体航线时简要衔接第二讲。"
    }
  },
  {
    number: 2,
    label: "第2讲",
    title: "它为什么必须走这条路？",
    status: "ready",
    slideStart: 37,
    slideEnd: 72,
    timing: PORT_MANAGEMENT_LESSON_TIMINGS[2],
    assistantBrief: {
      objective:
        "沿LL3历史港序，用走廊、咽喉、节点和腹地解释班轮网络的空间组织、风险传播与改道决策。",
      coreClaims: [
        "港序连接货源、市场、枢纽和服务网络，真实班轮航线不是地图上的最短直线。",
        "干线、支线、枢纽港、门户港和腹地描述不同网络关系，不能混为同一层级。",
        "马六甲与苏伊士等咽喉会把局部容量或安全问题放大为时间、库存与可靠性冲击。",
        "韧性来自替代路径、时间缓冲、运力配置和信息透明，而不是永不受阻。"
      ],
      guardrails: [
        "不得把五大或六大航线说成唯一、永久不变的标准。",
        "中断、等待和绕好望角均为教学情境，不得说成OOCL Spain真实事故。",
        "果园港到上海是教学集装箱的内河来路，不是远洋船舶航段。",
        "港序后的逐段海上路径是课程复原图，不是实时AIS轨迹。"
      ],
      responsePolicy:
        "先说明当前地点和网络层级，再回答路线或决策问题；涉及港口功能时提示第三讲继续。"
    }
  },
  {
    number: 3,
    label: "第3讲",
    title: "港口为什么创造不同价值？",
    status: "ready",
    slideStart: 73,
    slideEnd: 108,
    timing: PORT_MANAGEMENT_LESSON_TIMINGS[3],
    assistantBrief: {
      objective:
        "沿同一航次观察港口能力与网络角色，使用代际框架和系统诊断解释港口价值差异。",
      coreClaims: [
        "港口价值不仅发生在船边，还来自产业、物流、腹地连接、信息协同和治理。",
        "一至四代港口是能力演化的分析框架，同一港口可同时保留多代特征。",
        "自动化、绿色与韧性是跨代能力，自动化本身不能证明属于第四代。",
        "门户、转运、工业、城市与内河枢纽角色应按货流和网络关系判断，不能只比吞吐量。"
      ],
      guardrails: [
        "不得把港口代际当成先进程度排行榜。",
        "不得把比雷埃夫斯的挂港事实扩写成未经来源支持的经营结论。",
        "港口诊断场景是教学情境，不对应某一真实港口事故。",
        "不能用单一吞吐量替代效率、连接、服务、韧性和治理能力。"
      ],
      responsePolicy:
        "先诊断当前港口的功能与瓶颈，再指出需要的证据；涉及码头微观生产时衔接第四讲。"
    }
  },
  plannedLesson(4),
  plannedLesson(5),
  plannedLesson(6),
  plannedLesson(7),
  plannedLesson(8),
  plannedLesson(9),
  plannedLesson(10),
  plannedLesson(11),
  plannedLesson(12),
  plannedLesson(13),
  plannedLesson(14),
  plannedLesson(15),
  plannedLesson(16)
];

export {
  PORT_MANAGEMENT_IMAGEGEN_ASSETS,
  PORT_MANAGEMENT_SLIDES
};

export const PORT_MANAGEMENT_SLIDE_TOTAL = PORT_MANAGEMENT_SLIDES.length;
export const PORT_MANAGEMENT_SLIDE_CONTEXT_MAX_CHARS = 700;

export function getPortManagementSlide(
  index: number
): PortManagementSlideSpec {
  return PORT_MANAGEMENT_SLIDES[index - 1] ?? PORT_MANAGEMENT_SLIDES[0]!;
}

export function getPortManagementSlideByKey(
  slideKey: string
): PortManagementSlideSpec | undefined {
  return PORT_MANAGEMENT_SLIDES.find((slide) => slide.slideKey === slideKey);
}

export function getPortManagementLesson(
  lesson: PortManagementLessonNumber
): PortManagementLessonSpec {
  return (
    PORT_MANAGEMENT_LESSONS.find((candidate) => candidate.number === lesson) ??
    PORT_MANAGEMENT_LESSONS[0]!
  );
}

export function getPortManagementLessonStart(
  lesson: PortManagementLessonNumber
): number | null {
  return getPortManagementLesson(lesson).slideStart;
}

export function getPortManagementReadyLessons(): readonly PortManagementLessonSpec[] {
  return PORT_MANAGEMENT_LESSONS.filter(
    (lesson) => lesson.status === "ready"
  );
}

export function getPortManagementLessonSlidePosition(
  globalIndex: number
): PortManagementLessonSlidePosition | null {
  if (!Number.isInteger(globalIndex)) return null;

  const slide = PORT_MANAGEMENT_SLIDES[globalIndex - 1];
  if (!slide) return null;

  const lesson = PORT_MANAGEMENT_LESSONS.find(
    (candidate) =>
      candidate.number === slide.lesson &&
      candidate.status === "ready" &&
      candidate.slideStart !== null &&
      candidate.slideEnd !== null
  );
  if (
    !lesson ||
    lesson.slideStart === null ||
    lesson.slideEnd === null ||
    globalIndex < lesson.slideStart ||
    globalIndex > lesson.slideEnd
  ) {
    return null;
  }

  return {
    globalIndex,
    lessonNumber: lesson.number,
    lessonStart: lesson.slideStart,
    lessonEnd: lesson.slideEnd,
    localIndex: globalIndex - lesson.slideStart + 1,
    localTotal: lesson.slideEnd - lesson.slideStart + 1
  };
}

export function getPortManagementGlobalSlideIndex(
  lessonNumber: number,
  localIndex: number
): number | null {
  if (!Number.isInteger(lessonNumber) || !Number.isInteger(localIndex)) {
    return null;
  }

  const lesson = PORT_MANAGEMENT_LESSONS.find(
    (candidate) =>
      candidate.number === lessonNumber &&
      candidate.status === "ready" &&
      candidate.slideStart !== null &&
      candidate.slideEnd !== null
  );
  if (
    !lesson ||
    lesson.slideStart === null ||
    lesson.slideEnd === null
  ) {
    return null;
  }

  const localTotal = lesson.slideEnd - lesson.slideStart + 1;
  if (localIndex < 1 || localIndex > localTotal) return null;
  return lesson.slideStart + localIndex - 1;
}

function appendContextLine(
  current: string,
  line: string,
  maximumLength: number
): string {
  if (!line) return current;
  const separator = current ? "\n" : "";
  const candidate = `${current}${separator}${line}`;
  if (candidate.length <= maximumLength) return candidate;

  const remaining = maximumLength - current.length - separator.length;
  if (remaining <= 1) return current;
  return `${current}${separator}${line.slice(0, remaining - 1)}…`;
}

function formatVoyagePrompt(): string {
  const dossier = PORT_MANAGEMENT_VOYAGE_DOSSIER;
  return [
    `航次快照：${dossier.label}。`,
    `船舶：${dossier.vessel.name}，IMO ${dossier.vessel.imo}，${dossier.vessel.lengthMeters}米，${dossier.vessel.capacityTeu.toLocaleString("en-US")} TEU。`,
    `班轮：${dossier.service.name}，官方发布为${dossier.service.cycleDays}天往返；港序为${dossier.service.portRotation.join("—")}。`,
    `教学货物：${dossier.teachingScenario.cargo}，从${dossier.teachingScenario.origin}出发，在${dossier.teachingScenario.joinPort}加入海运。`,
    `事实边界：${dossier.teachingScenario.disclaimer}${dossier.routeDisclaimer}`
  ].join("\n");
}

function formatLessonPrompt(
  brief: PortManagementLessonAssistantBrief
): string {
  return [
    `教学目标：${brief.objective}`,
    `核心判断：${brief.coreClaims.join("；")}`,
    `事实边界：${brief.guardrails.join("；")}`,
    `回答策略：${brief.responsePolicy}`
  ].join("\n");
}

function formatSlidePrompt(slide: PortManagementSlideSpec): string {
  const evidenceLabels: Record<PortNarrativeEvidence, string> = {
    documented: "真实资料",
    scenario: "教学情境",
    concept: "概念模型"
  };
  const lines = [
    `页面单元：${slide.section}`,
    `页面标题：${slide.title}`,
    `航次位置：${slide.narrative.location}；阶段：${slide.narrative.voyageStage}`,
    `证据状态：${evidenceLabels[slide.narrative.evidence]}`
  ];

  if (slide.narrative.timeMarker) {
    lines.push(`时间标记：${slide.narrative.timeMarker}`);
  }
  if (slide.narrative.openQuestion) {
    lines.push(`未决问题：${slide.narrative.openQuestion}`);
  }
  if (slide.lead) lines.push(`页面主旨：${slide.lead}`);
  if (slide.stat) {
    lines.push(
      `关键数据：${slide.stat.value}；${slide.stat.label}${
        slide.stat.detail ? `；${slide.stat.detail}` : ""
      }`
    );
  }
  if (slide.bullets?.length) {
    lines.push(`要点：${slide.bullets.join("；")}`);
  }
  if (slide.steps?.length) {
    lines.push(`逻辑顺序：${slide.steps.join(" → ")}`);
  }
  if (slide.columns?.length) {
    lines.push(
      `对照内容：${slide.columns
        .map(
          (column) =>
            `${column.heading}：${column.body}${
              column.note ? `（${column.note}）` : ""
            }`
        )
        .join("；")}`
    );
  }
  if (slide.table) {
    lines.push(
      `表格：${slide.table.headers.join(" / ")}；${slide.table.rows
        .map((row) => row.join(" / "))
        .join("；")}`
    );
  }
  if (slide.prompt) lines.push(`课堂问题：${slide.prompt}`);
  if (slide.assistantCue) {
    lines.push(`本页回答约束：${slide.assistantCue}`);
  }

  const sourceLabels = slide.sourceIds
    ?.map((sourceId) => PORT_MANAGEMENT_SOURCES[sourceId]?.label)
    .filter((label): label is string => Boolean(label));
  if (sourceLabels?.length) {
    lines.push(`本页来源：${sourceLabels.join("；")}`);
  }

  return lines.reduce(
    (context, line) =>
      appendContextLine(
        context,
        line,
        PORT_MANAGEMENT_SLIDE_CONTEXT_MAX_CHARS
      ),
    ""
  );
}

export function getPortManagementAssistantContext(
  slideIndex: number
): PortManagementAssistantContext {
  const slide = getPortManagementSlide(slideIndex);
  const lesson = getPortManagementLesson(slide.lesson);
  if (!lesson.title || !lesson.assistantBrief) {
    throw new Error(`第 ${lesson.number} 讲尚未配置课堂助手上下文`);
  }

  return {
    lessonNumber: lesson.number,
    lessonLabel: lesson.label,
    lessonTitle: lesson.title,
    voyagePrompt: formatVoyagePrompt(),
    lessonPrompt: formatLessonPrompt(lesson.assistantBrief),
    slideIndex: slide.index,
    slideKey: slide.slideKey,
    slideTitle: slide.title,
    slidePrompt: formatSlidePrompt(slide)
  };
}
