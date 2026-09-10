import { PORT_LBL_SOURCES } from "./port-lbl-sources.js";
import { PORT_LBL_LEGACY_KEYS } from "./port-lbl-migration.js";
export { PORT_LBL_LEGACY_KEYS } from "./port-lbl-migration.js";
export { PORT_LBL_SLIDES, PORT_LBL_LESSON_TWO, PORT_LBL_LESSON_THREE, PORT_LBL_TITLES, type PortLblPage } from "./port-lbl.js";
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
  | "england-france-1700"
  | "canton-london-trade"
  | "comparative-advantage"
  | "jiangnan-huguang-trade"
  | "historical-trade-chain"
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
  | "路线示意"
  | "概念模型";

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

export interface PortManagementGlobeCueFocus {
  latitude: number;
  longitude: number;
  distance: number;
}

export type PortManagementGlobeCueVisual =
  | "emergence"
  | "channel"
  | "silk"
  | "historical-route"
  | "london-network"
  | "global-network"
  | "question";

export interface PortManagementGlobeCueStep {
  id: string;
  durationMs: number;
  visual: PortManagementGlobeCueVisual;
  eyebrow: string;
  title: string;
  caption: string;
  narration: string;
  focus: PortManagementGlobeCueFocus;
  activeLocationIds: readonly string[];
  publicLabel?: PortNarrativePublicLabel;
  sourceIds: readonly string[];
}

export interface PortManagementGlobeCue {
  id: string;
  lesson: PortManagementLessonNumber;
  title: string;
  startSlideKey: string;
  returnSlideKey: string;
  estimatedDurationMs: number;
  steps: readonly PortManagementGlobeCueStep[];
}

export const PORT_MANAGEMENT_DECK_VERSION =
  "release-port-management-lbl-v8";

export const PORT_MANAGEMENT_GLOBE_CUES: readonly PortManagementGlobeCue[] = [
  {
    id: "l1-opening-trade-influence",
    lesson: 1,
    title: "第一讲证据追踪：贸易如何放大影响力",
    startSlideKey: "l1-1700-wager",
    returnSlideKey: "l1-france-england-scale",
    estimatedDurationMs: 90_000,
    steps: [
      {
        id: "year-1700",
        durationMs: 8_000,
        visual: "emergence",
        eyebrow: "MISSION 01 / EVIDENCE HUNT",
        title: "下注完成：现在沿贸易网络寻找证据",
        caption:
          "任务：解释一个人口与陆地资源并不占优的国家，如何把海上贸易转化为全球影响力。",
        narration:
          "你已经做出选择。现在把时间拨回一七零零年，沿着商品、航线、港口与组织能力，寻找能够改变最初判断的证据。",
        focus: { latitude: 25, longitude: 15, distance: 4.15 },
        activeLocationIds: [],
        publicLabel: "史料",
        sourceIds: ["population-europe-1700"]
      },
      {
        id: "channel-scale",
        durationMs: 12_000,
        visual: "channel",
        eyebrow: "ENGLISH CHANNEL",
        title: "海峡两岸：四倍人口差",
        caption:
          "英格兰和威尔士的人口约为法国四分之一；法国仍是拥有陆海力量的欧洲强国。",
        narration:
          "海峡这边，英格兰和威尔士大约五百万人；另一边，法国大约两千万人。若只看人口与陆地资源，答案似乎并不难。",
        focus: { latitude: 50.2, longitude: 0.7, distance: 2.22 },
        activeLocationIds: ["england", "france"],
        publicLabel: "史料",
        sourceIds: ["population-europe-1700", "france-naval-history"]
      },
      {
        id: "canton-silk",
        durationMs: 11_000,
        visual: "silk",
        eyebrow: "CANTON / SILK",
        title: "镜头转向广州：一件中国丝织品",
        caption:
          "1727年广州采购档案记录了10,200件织造丝绸；轻而贵的货物能承担漫长海运。",
        narration:
          "再把目光移到广州。一七二七年的采购档案记录了一万零二百件织造丝绸。轻而贵，让它足以承担漫长的海上旅程。",
        focus: { latitude: 23.1, longitude: 113.3, distance: 2.18 },
        activeLocationIds: ["canton"],
        publicLabel: "史料",
        sourceIds: ["bl-canton-1727"]
      },
      {
        id: "reconstructed-route",
        durationMs: 28_000,
        visual: "historical-route",
        eyebrow: "ROUTE RECONSTRUCTION",
        title: "货物离开广州：跟随帆船驶向伦敦",
        caption:
          "帆船沿广州—马六甲—好望角—多佛—伦敦路线航行；镜头持续跟随，路线属于教学复原。",
        narration:
          "现在跟住这艘离开广州的帆船。它经马六甲进入印度洋，绕过好望角，再穿过多佛海峡抵达伦敦。这是路线复原，不是某一批丝绸留下的完整航迹。",
        focus: { latitude: 8, longitude: 45, distance: 3.82 },
        activeLocationIds: [
          "canton",
          "malacca",
          "cape-good-hope",
          "dover",
          "london"
        ],
        publicLabel: "路线示意",
        sourceIds: ["bl-eic-china-trade"]
      },
      {
        id: "london-network",
        durationMs: 11_000,
        visual: "london-network",
        eyebrow: "LONDON / NETWORK",
        title: "商品抵达后，影响力才开始扩散",
        caption:
          "港口、市场、信用与重复航线把一次交换变成可记录、可融资、可复制的网络。",
        narration:
          "抵达伦敦并不是终点。港口、市场、信用和重复航线，把一次交换变成可记录、可融资、也可复制的网络。",
        focus: { latitude: 51.5, longitude: -0.1, distance: 2.16 },
        activeLocationIds: ["london", "bristol", "amsterdam", "lisbon"],
        publicLabel: "概念模型",
        sourceIds: ["bl-eic-china-trade"]
      },
      {
        id: "modern-network",
        durationMs: 11_000,
        visual: "global-network",
        eyebrow: "THEN → NOW",
        title: "历史航路淡出，现代全球主干航线浮现",
        caption:
          "今天，超过80%的国际贸易货量由海运承担；连接能力已成为全球生产分工的基础设施。",
        narration:
          "三百年后，帆船航路变成全球主干航线。今天，超过八成的国际贸易货量由海运承担，连接能力已经成为生产分工的基础设施。",
        focus: { latitude: 8, longitude: -18, distance: 4.1 },
        activeLocationIds: [
          "shanghai",
          "singapore",
          "rotterdam",
          "los-angeles-long-beach"
        ],
        publicLabel: "官方资料",
        sourceIds: ["unctad-maritime-share"]
      },
      {
        id: "opening-question",
        durationMs: 9_000,
        visual: "question",
        eyebrow: "MISSION REVIEW / 05 EVIDENCE FILES",
        title: "证据已经改变你的最初判断吗？",
        caption:
          "人口只是起点；商品、航线、港口与组织能力决定贸易能否持续转化为全球影响力。",
        narration:
          "现在回看最初的下注。人口并不是影响力的上限，商品、航线、港口与组织能力，决定贸易能否被持续放大。下一页，我们核对海峡两岸真实的起点。",
        focus: { latitude: 35, longitude: 20, distance: 4.05 },
        activeLocationIds: ["england", "france", "canton", "london"],
        sourceIds: []
      }
    ]
  }
] as const;

export function getPortManagementGlobeCue(
  cueId: string
): PortManagementGlobeCue | undefined {
  return PORT_MANAGEMENT_GLOBE_CUES.find((cue) => cue.id === cueId);
}

export const PORT_MANAGEMENT_SOURCES: Record<string, PortCourseSource> = {
  ...PORT_LBL_SOURCES,
  "oocl-spain-release": {
    label: "OOCL · OOCL Spain发布及LL3港序（2023）",
    url: "https://www.oocl.com/jpn/pressandmedia/pressreleases/2023/Pages/16Feb2023.aspx?lang=eng&site=china"
  },
  "oocl-spain-vessel": {
    label: "OOCL · 东方西班牙船舶参数",
    url: "https://www.oocl.com/schi/ourservices/vessels/gclass24188/Pages/ooclspain.aspx"
  },
  "population-europe-1700": {
    label: "INED · 1700年前后欧洲人口历史估算",
    url: "https://shs.cairn.info/journal-population-and-societies-2005-2-page-1?lang=en"
  },
  "bl-eic-china-trade": {
    label: "British Library · 东印度公司对华贸易档案",
    url: "https://searcharchives.bl.uk/catalog/033-000226869"
  },
  "bl-canton-1727": {
    label: "British Library · 1727年广州采购记录",
    url: "https://searcharchives.bl.uk/catalog/040-000175408"
  },
  "sass-yangtze-division": {
    label: "上海社会科学院 · 长江中下游地区分工研究",
    url: "https://ie.sass.org.cn/2023/0323/c2063a536506/page.htm"
  },
  "uk-eic-charter": {
    label: "英国国家档案馆 · 17世纪生活与东印度贸易",
    url: "https://www.nationalarchives.gov.uk/currency-converter/living-in-the-17th-century/"
  },
  "uk-naval-trade": {
    label: "英国国家档案馆 · 海军、海盗与海上贸易档案",
    url: "https://www.nationalarchives.gov.uk/education/families/time-travel-tv/archives-ahoy/hca1-15/"
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
      label: "1700年的赌局",
      slideStart: 1,
      slideEnd: 6,
      minutes: 10,
      purpose: "由正式封面、英法下注和地球仪证据追踪进入人口劣势之谜。"
    },
    {
      label: "沿丝织品寻找网络",
      slideStart: 7,
      slideEnd: 13,
      minutes: 14,
      purpose: "用英国贸易档案追踪公司、航线、清单与伦敦市场。"
    },
    {
      label: "极端比较优势模型",
      slideStart: 14,
      slideEnd: 23,
      minutes: 20,
      purpose: "解释同时具有绝对优势时，有限时间仍会产生比较优势。"
    },
    {
      label: "江南—湖广—海港",
      slideStart: 24,
      slideEnd: 31,
      minutes: 15,
      purpose: "用历史综合链说明区域分工如何依赖内河与海运。"
    },
    {
      label: "英国如何放大贸易",
      slideStart: 32,
      slideEnd: 39,
      minutes: 16,
      purpose: "解释港口、账簿、金融、国家与工业化如何放大网络。"
    },
    {
      label: "现代镜像与港口结论",
      slideStart: 40,
      slideEnd: 47,
      minutes: 15,
      purpose: "回到现代巨轮，解释水运低成本、稳定性与港口接口。"
    }
  ],
  2: [
    {
      label: "海外订单与出运准备",
      slideStart: 48,
      slideEnd: 59,
      minutes: 20,
      purpose: "以教学箱C-01建立货物、箱体、参与者与出运条件。"
    },
    {
      label: "长江接力与海港换装",
      slideStart: 60,
      slideEnd: 73,
      minutes: 25,
      purpose: "沿果园港、船闸与上海水水换装解释作业衔接；上半课45分钟收束。"
    },
    {
      label: "装船与班轮航次",
      slideStart: 74,
      slideEnd: 87,
      minutes: 23,
      purpose: "逐步演示装船接力，辨认挂靠、换船与服务循环。"
    },
    {
      label: "到门交付、空箱与全程复盘",
      slideStart: 88,
      slideEnd: 99,
      minutes: 22,
      purpose: "区分相关提离条件与三种循环，由教师演算时间账与错过周班案例。"
    }
  ],
  3: [
    {
      label: "货物、船舶与专业码头",
      slideStart: 100,
      slideEnd: 115,
      minutes: 28,
      purpose: "由城市需求进入干散货、液体、LNG、滚装与件杂货的设施适配。"
    },
    {
      label: "全球市场与货物流向",
      slideStart: 116,
      slideEnd: 125,
      minutes: 17,
      purpose: "切换大洋中心与货类视角，建立洲际联系和能源、矿石网络认识。"
    },
    {
      label: "货流层次、通道与时政案例",
      slideStart: 126,
      slideEnd: 141,
      minutes: 27,
      purpose: "区分出口依赖、绕航与水资源约束，以冻结日期资料解释风险传递。"
    },
    {
      label: "服务组织与港口管理",
      slideStart: 142,
      slideEnd: 153,
      minutes: 18,
      purpose: "教师演算周班配船，解释挂港与转运选择，再回到海陆接口管理。"
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
    title: "英国如何把贸易变成影响力？",
    status: "ready",
    slideStart: 1,
    slideEnd: 47,
    timing: PORT_MANAGEMENT_LESSON_TIMINGS[1],
    assistantBrief: {
      objective:
        "从1700年前后英格兰的人口劣势之谜出发，沿中国丝织品、江南—湖广区域分工与英国海上贸易网络，解释比较优势、水运低成本和港口体系如何把有限国内规模放大为跨洲影响力。",
      coreClaims: [
        "约1700年英格兰和威尔士人口远少于法国；法国仍是欧洲强国，后来的英国全球影响力不是人口、岛屿地理或单一政策的必然结果。",
        "英国对华贸易从亚洲据点转口逐渐转向直接航行并趋于重复化；港口、清单、市场、信用和国家能力共同把商品交换组织成网络。",
        "比较优势比较机会成本；即使一方在两种产品上都具有绝对优势，有限时间仍可能使双方通过专业化与交换提高总产量。",
        "江南专业化、湖广粮食外运和英国采购中国丝织品属于跨时期历史综合链，不能伪装成一批可连续追踪的真实货物。",
        "水运低单位成本来自巨量载荷、固定成本分摊、标准化网络和以较慢航速降低推进能耗，但高装载率与稳定货流是兑现条件。",
        "稳定的平均提前期可以通过提前生产和下单纳入计划，但仍增加在途库存、资金占用和暴露时间；提前期波动主要推动安全库存与停线风险。",
        "港口通过货量聚集、装卸、集疏运、仓储、单证、监管与信息协同，把海上规模经济兑现为全程物流成本。"
      ],
      guardrails: [
        "1700年以前使用“英格兰”，1707年后才使用“大不列颠/英国”；历史人口只能表述为估算约数。",
        "不得把英国崛起简化为岛国宿命或海上贸易单因，也不得把法国描述为失败者或缺乏海洋能力。",
        "两种产品都更高效应称为同时具有绝对优势，不得误称为帕累托改进；江南—湖广模型数字不是历史统计。",
        "不得声称一批明代江苏刺绣已被完整追踪到英国；各段贸易、分工与运输证据必须保持边界。",
        "比较优势不为垄断、殖民、强制劳动与战争辩护；必须说明效率、分配和正当性是不同问题。",
        "海运超过八成是国际贸易货量口径，约七成才是价值口径；两种数字不得混用。",
        "不得把稳定地慢回答成完全没有成本，也不得把教学时间参数写成真实线路表现。",
        "重庆—上海水铁公1∶2∶6是区域测算，不是全国统一固定费率；24,188 TEU是设计箱位，不是实际装载量。"
      ],
      responsePolicy:
        "先沿当前页面区分史料、概念模型与路线复原，再回答因果问题；历史部分优先使用人口—商品—分工—网络链，现代部分再解释规模、可靠性与港口接口。涉及具体航线时简要衔接第二讲。"
    }
  },
  {
    number: 2,
    label: "第2讲",
    title: "一只集装箱如何走向世界？",
    status: "ready",
    slideStart: 48,
    slideEnd: 99,
    timing: PORT_MANAGEMENT_LESSON_TIMINGS[2],
    assistantBrief: {
      objective:
        "跟随教学箱C-01从重庆工厂到欧洲客户，理解出运、内河、换装、班轮、到门交付与空箱归还的完整过程。",
      coreClaims: [
        "货物、箱体与船舶有不同的旅程和循环，货物交付不等于箱体与船舶循环结束。",
        "本箱从内河船抵达上海，经堆场再装远洋船；陆侧分支是其他箱子的路径。",
        "挂靠不等于本箱中转，直达不等于不停港，换船会增加衔接条件。",
        "移动、作业与等待组成全程时间；14小时到达延误可能导致周班出发晚168小时。"
      ],
      guardrails: [
        "C-01、班期与40天时间账是教学设定，不是真实订单或服务承诺。",
        "VGM是装船必要条件之一，不保证箱子一定装船；监管、承运人与码头条件不能混为一体。",
        "船闸与升船机不同；生成背景不代表真实港口设备布局。",
        "2023年LL3港序和课程重建路径不是当前班表、实时AIS或导航轨迹。"
      ],
      responsePolicy:
        "先说明本箱当前位置、实际作业与衔接条件，再解释机制；由教师完整示范，不要求学生登录或提交活动。全球货类与通道在第三讲展开。"
    }
  },
  {
    number: 3,
    label: "第3讲",
    title: "世界货物如何流动？",
    status: "ready",
    slideStart: 100,
    slideEnd: 153,
    timing: PORT_MANAGEMENT_LESSON_TIMINGS[3],
    assistantBrief: {
      objective:
        "从货类与设施适配，理解全球运输方向、关键通道、服务组织及港口接口的价值。",
      coreClaims: [
        "货物性质、装运形态与大宗交易是不同分类视角；专业码头需要成套适配。",
        "集装箱、油气、矿石与粮食的贸易方向不同，不能合为单一班轮网络。",
        "霍尔木兹出口约束、红海绕航与巴拿马水资源约束具有不同机制。",
        "固定周班的循环由70天变为84天，简化模型配船由10艘增为12艘；不代表运价同比变化。"
      ],
      guardrails: [
        "绕好望角不能消除湾内油轮驶出霍尔木兹的约束，其他替代方式也有容量与设施条件。",
        "红海与巴拿马采用2023—2024历史案例；IMO页面为2026-09-09冻结快照，不作为即时新闻。",
        "生成场景与手工路线为教学示意；线宽不表示运量，航道分段数不表示服务数量。",
        "匿名舱位合作不对应当前联盟名单；港口角色可重叠，不做代际或吞吐量排行榜。"
      ],
      responsePolicy:
        "先从货物、地理、通道和组织中的当前层次回答，再联系港口接口。数字均按资料日期或教学设定解释；不发布活动，不自动转入仿真。"
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
  const resolvedKey=PORT_LBL_LEGACY_KEYS[slideKey]??slideKey;
  return PORT_MANAGEMENT_SLIDES.find((slide) => slide.slideKey === resolvedKey);
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

function formatVoyagePrompt(slide: PortManagementSlideSpec): string {
  if(slide.slideKey.includes("-lbl-"))return [
    "双讲LBL主线：教学货物为普通工业零件，使用40英尺干货箱C-01。",
    "教学旅程：重庆工厂—果园港—长江—上海水水换装—亚欧海运—鹿特丹—公路到杜伊斯堡附近客户—指定地点还空箱。",
    "对象边界：教学货物、箱体与船舶有不同循环。OOCL Spain及LL3仅用于2023年历史服务参考，不对应本票真实承运。",
    "第三讲扩展：货物与船舶码头适配、洲际联系、通道约束与服务组织。路线不作为实时AIS或导航，日期资料不冒充当前实况。"
  ].join("\n");
  if (slide.lesson === 1 && slide.index < 40) {
    return [
      "第一讲历史主线：从约1700年英格兰的人口劣势之谜出发，沿中国丝织品、江南—湖广区域分工和英国海上贸易网络解释影响力如何被放大。",
      "证据结构：人口与贸易档案属于史料；江南—湖广数字属于概念模型；粮食—丝绸—海港—英国属于跨时期历史综合链。",
      "叙事边界：当前场景尚未进入OOCL Spain现代航次；现代巨轮从本讲第40页才作为历史机制的现代镜像出现。"
    ].join("\n");
  }

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
    voyagePrompt: formatVoyagePrompt(slide),
    lessonPrompt: formatLessonPrompt(lesson.assistantBrief),
    slideIndex: slide.index,
    slideKey: slide.slideKey,
    slideTitle: slide.title,
    slidePrompt: formatSlidePrompt(slide)
  };
}
