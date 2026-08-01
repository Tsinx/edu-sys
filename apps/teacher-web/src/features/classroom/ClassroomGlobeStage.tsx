import type { ClassroomSnapshot } from "@edu/contracts";
import {
  getPortManagementGlobeCue,
  PORT_MANAGEMENT_SOURCES,
  type PortManagementGlobeCueStep
} from "@edu/course-content";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  InteractiveEarthGlobe,
  type GlobeLocation,
  type GlobeRoute,
  type GlobeShippingLanePath,
  type GlobeShippingLaneState,
  type InteractiveEarthGlobeHandle
} from "../globe/InteractiveEarthGlobe";
import {
  GLOBAL_MARITIME_LOCATIONS,
  loadGlobalShippingLanes
} from "../globe/global-maritime-preset";
import openingTradeRouteData from "../globe/data/opening-trade-route.json";
import { SlideViewport } from "./SlideViewport";
import "../globe/interactive-earth-globe.css";

interface OpeningRouteData {
  disclaimer: string;
  route: {
    id: string;
    label: string;
    color: string;
    points: Array<readonly [number, number]>;
  };
  audit: {
    pass: boolean;
    nonNavigableLandIntersections: number;
  };
}

interface ClassroomGlobeStageProps {
  snapshot: ClassroomSnapshot;
  role: "teacher" | "student";
  lamConnected: boolean;
  narrationBusy?: boolean;
  onNarrateStep?: (
    step: PortManagementGlobeCueStep,
    narrationId: string
  ) => void;
  onAdvance?: (runId: string, stepIndex: number) => void;
}

const OPENING_ROUTE_DATA =
  openingTradeRouteData as unknown as OpeningRouteData;

const CINEMATIC_LOCATIONS: readonly GlobeLocation[] = [
  {
    id: "england",
    name: "英格兰及威尔士 · 约500万",
    latitude: 52.4,
    longitude: -1.4,
    kind: "city",
    color: "#f0b65f"
  },
  {
    id: "france",
    name: "法国 · 约2000万",
    latitude: 46.8,
    longitude: 2.2,
    kind: "city",
    color: "#71d9ec"
  },
  {
    id: "canton",
    name: "广州港区",
    latitude: 22.65,
    longitude: 113.65,
    kind: "port",
    color: "#f1b45b"
  },
  {
    id: "malacca",
    name: "马六甲",
    latitude: 2.5,
    longitude: 101.45,
    kind: "chokepoint"
  },
  {
    id: "cape-good-hope",
    name: "好望角",
    latitude: -34.36,
    longitude: 18.47,
    kind: "chokepoint"
  },
  {
    id: "dover",
    name: "多佛",
    latitude: 51.05,
    longitude: 1.35,
    kind: "chokepoint"
  },
  {
    id: "london",
    name: "伦敦",
    latitude: 51.5,
    longitude: -0.1,
    kind: "port",
    color: "#f0b65f"
  },
  {
    id: "bristol",
    name: "布里斯托尔",
    latitude: 51.45,
    longitude: -2.59,
    kind: "port",
    showLabel: false
  },
  {
    id: "amsterdam",
    name: "阿姆斯特丹",
    latitude: 52.37,
    longitude: 4.9,
    kind: "port",
    showLabel: false
  },
  {
    id: "lisbon",
    name: "里斯本",
    latitude: 38.72,
    longitude: -9.14,
    kind: "port",
    showLabel: false
  }
];

const HISTORICAL_ROUTE: GlobeRoute = {
  id: OPENING_ROUTE_DATA.route.id,
  label: OPENING_ROUTE_DATA.route.label,
  color: OPENING_ROUTE_DATA.route.color,
  animated: true,
  interpolation: "piecewise-geodesic",
  points: OPENING_ROUTE_DATA.route.points.map(
    ([longitude, latitude]) => ({ latitude, longitude })
  )
};

const LONDON_NETWORK_ROUTES: readonly GlobeRoute[] = [
  ["bristol", 51.45, -2.59],
  ["amsterdam", 52.37, 4.9],
  ["lisbon", 38.72, -9.14]
].map(([id, latitude, longitude]) => ({
  id: `london-${id}`,
  label: `伦敦—${id}`,
  color: "#72ddec",
  animated: true,
  interpolation: "piecewise-geodesic",
  points: [
    { latitude: 51.5, longitude: -0.1 },
    { latitude: Number(latitude), longitude: Number(longitude) }
  ]
}));
const EMPTY_ROUTES: readonly GlobeRoute[] = [];
const EMPTY_LOCATIONS: readonly GlobeLocation[] = [];
const EMPTY_SHIPPING_LANES: readonly GlobeShippingLanePath[] = [];

interface MissionBriefingFact {
  label: string;
  value: string;
}

interface MissionBriefing {
  code: string;
  region: string;
  title: string;
  objective: string;
  image: string;
  imageAlt: string;
  accent: string;
  facts: readonly MissionBriefingFact[];
  activeLocationColors: Readonly<Record<string, string>>;
}

const COURSE_ASSET_ROOT = "/course-assets/port-management";

const MISSION_BRIEFINGS: Record<
  PortManagementGlobeCueStep["visual"],
  MissionBriefing
> = {
  emergence: {
    code: "MISSION 01",
    region: "英吉利海峡 · 1700",
    title: "追踪影响力的来源",
    objective: "从人口差距出发，沿商品、航线和港口寻找反常证据。",
    image: `${COURSE_ASSET_ROOT}/story-l1-english-channel-rewind.png`,
    imageAlt: "英吉利海峡两岸港口与帆船时代的教学复原图",
    accent: "#f2b45e",
    facts: [
      { label: "初始下注", value: "LOCKED" },
      { label: "证据档案", value: "0 / 5" }
    ],
    activeLocationColors: {}
  },
  channel: {
    code: "EVIDENCE 01",
    region: "英吉利海峡",
    title: "规模参照",
    objective: "先确认两国的真实起点，再检验规模是否决定影响力。",
    image: `${COURSE_ASSET_ROOT}/story-l1-english-channel-rewind.png`,
    imageAlt: "英格兰与法国隔海相望的教学复原图",
    accent: "#f3b45b",
    facts: [
      { label: "英格兰及威尔士", value: "约 500 万" },
      { label: "法国", value: "约 2000 万" }
    ],
    activeLocationColors: {
      england: "#ffbd59",
      france: "#55d7ff"
    }
  },
  silk: {
    code: "EVIDENCE 02",
    region: "广州 → 伦敦",
    title: "高货值货物",
    objective: "识别什么样的商品能够承担漫长而昂贵的早期跨洋运输。",
    image: `${COURSE_ASSET_ROOT}/story-l1-london-chinese-silk.png`,
    imageAlt: "中国丝织品进入伦敦市场的教学复原图",
    accent: "#ff8d6b",
    facts: [
      { label: "1727 广州采购", value: "10,200 件" },
      { label: "货物特征", value: "轻而贵" }
    ],
    activeLocationColors: { canton: "#ff8d6b" }
  },
  "historical-route": {
    code: "EVIDENCE 03",
    region: "欧亚远洋通道",
    title: "航路复原",
    objective: "依次穿过关键海上通道，把一件商品送入伦敦市场。",
    image: `${COURSE_ASSET_ROOT}/story-l1-ocean-convoy.png`,
    imageAlt: "帆船护航穿越远洋通道的教学复原图",
    accent: "#42d5c3",
    facts: [
      { label: "01", value: "广州" },
      { label: "02", value: "马六甲" },
      { label: "03", value: "好望角" },
      { label: "04—05", value: "多佛 · 伦敦" }
    ],
    activeLocationColors: {
      canton: "#ffb452",
      malacca: "#3de0c6",
      "cape-good-hope": "#75bfff",
      dover: "#c68cff",
      london: "#ff779f"
    }
  },
  "london-network": {
    code: "EVIDENCE 04",
    region: "伦敦港与市场",
    title: "把一次交换变成网络",
    objective: "观察港口、市场、信用与重复航线如何共同放大一次贸易。",
    image: `${COURSE_ASSET_ROOT}/story-l1-london-port-warehouse.png`,
    imageAlt: "伦敦港仓储与商业活动的教学复原图",
    accent: "#c792ff",
    facts: [
      { label: "港口", value: "记录" },
      { label: "市场", value: "交换" },
      { label: "信用", value: "融资" },
      { label: "航线", value: "重复" }
    ],
    activeLocationColors: {
      london: "#ffbd59",
      bristol: "#66d9ff",
      amsterdam: "#67e3c1",
      lisbon: "#c792ff"
    }
  },
  "global-network": {
    code: "EVIDENCE 05",
    region: "现代全球主干航线",
    title: "连接成为基础设施",
    objective: "把历史航路与今天的全球生产分工放在同一张地球上观察。",
    image: `${COURSE_ASSET_ROOT}/story-l1-shanghai-dawn.png`,
    imageAlt: "现代大型集装箱船与上海港的教学复原图",
    accent: "#55e6a5",
    facts: [
      { label: "国际贸易货量", value: "> 80%" },
      { label: "网络作用", value: "连接分工" }
    ],
    activeLocationColors: {
      shanghai: "#ffbd59",
      singapore: "#55e6a5",
      rotterdam: "#55d7ff",
      "los-angeles-long-beach": "#ff779f"
    }
  },
  question: {
    code: "MISSION REVIEW",
    region: "证据板 · 第一讲",
    title: "重新审视最初的下注",
    objective: "用五份证据解释：为什么国内规模不是全球影响力的上限。",
    image: `${COURSE_ASSET_ROOT}/story-l1-british-port-books.png`,
    imageAlt: "英国港口账簿与贸易记录的教学复原图",
    accent: "#f2b45e",
    facts: [
      { label: "证据档案", value: "5 / 5" },
      { label: "初始判断", value: "REVIEW" }
    ],
    activeLocationColors: {
      england: "#ffbd59",
      france: "#55d7ff",
      canton: "#ff8d6b",
      london: "#c792ff"
    }
  }
};

const CINEMATIC_LOCATION_IDS: Record<
  PortManagementGlobeCueStep["visual"],
  readonly string[]
> = {
  emergence: [],
  channel: ["england", "france"],
  silk: ["canton"],
  "historical-route": [
    "canton",
    "malacca",
    "cape-good-hope",
    "dover",
    "london"
  ],
  "london-network": ["london", "bristol", "amsterdam", "lisbon"],
  "global-network": [],
  question: ["england", "france", "canton", "london"]
};

function locationsForStep(
  visual: PortManagementGlobeCueStep["visual"]
): readonly GlobeLocation[] {
  if (visual === "global-network") {
    return GLOBAL_MARITIME_LOCATIONS;
  }
  const visibleIds = new Set(CINEMATIC_LOCATION_IDS[visual]);
  const cinematicLocations = CINEMATIC_LOCATIONS.filter((location) =>
    visibleIds.has(location.id)
  );
  return visual === "question"
    ? [...GLOBAL_MARITIME_LOCATIONS, ...cinematicLocations]
    : cinematicLocations;
}

function elapsedInStep(snapshot: ClassroomSnapshot, now: number) {
  const playback = snapshot.globePlayback;
  const liveElapsed =
    playback.status === "playing" && playback.stepStartedAt
      ? Math.max(0, now - new Date(playback.stepStartedAt).getTime())
      : 0;
  return playback.stepElapsedMs + liveElapsed;
}

function MissionBriefingPanel({ step }: { step: PortManagementGlobeCueStep }) {
  const briefing = MISSION_BRIEFINGS[step.visual];
  return (
    <aside
      className="cinematic-globe__briefing"
      aria-label={`${briefing.code}：${briefing.title}`}
    >
      <div className="cinematic-globe__briefing-image">
        <img src={briefing.image} alt={briefing.imageAlt} />
        <span>{briefing.region}</span>
        <strong>教学复原图</strong>
        <i aria-hidden="true" />
      </div>
      <div className="cinematic-globe__briefing-body">
        <header>
          <span>{briefing.code}</span>
          <i aria-hidden="true" />
          <strong>EVIDENCE TRACKING</strong>
        </header>
        <h3>{briefing.title}</h3>
        <p>{briefing.objective}</p>
        <div className="cinematic-globe__briefing-facts">
          {briefing.facts.map((fact) => (
            <span key={`${fact.label}-${fact.value}`}>
              <small>{fact.label}</small>
              <strong>{fact.value}</strong>
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function ClassroomGlobeStage({
  snapshot,
  role,
  lamConnected,
  narrationBusy = false,
  onNarrateStep,
  onAdvance
}: ClassroomGlobeStageProps) {
  const globeRef = useRef<InteractiveEarthGlobeHandle>(null);
  const narratedStepRef = useRef("");
  const advancedStepRef = useRef("");
  const [now, setNow] = useState(Date.now());
  const [shippingLanes, setShippingLanes] = useState<
    readonly GlobeShippingLanePath[]
  >([]);
  const [shippingLaneState, setShippingLaneState] =
    useState<GlobeShippingLaneState>("loading");
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const cue = snapshot.globePlayback.cueId
    ? getPortManagementGlobeCue(snapshot.globePlayback.cueId)
    : undefined;
  const step = cue?.steps[snapshot.globePlayback.stepIndex];
  const briefing = step ? MISSION_BRIEFINGS[step.visual] : undefined;
  const stepIdentity = `${snapshot.globePlayback.runId ?? "idle"}:${
    snapshot.globePlayback.stepIndex
  }`;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 180);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      step?.visual !== "global-network" &&
      step?.visual !== "question"
    ) {
      return;
    }
    let active = true;
    setShippingLaneState("loading");
    void loadGlobalShippingLanes()
      .then((paths) => {
        if (!active) return;
        setShippingLanes(paths);
        setShippingLaneState("ready");
      })
      .catch(() => {
        if (active) setShippingLaneState("error");
      });
    return () => {
      active = false;
    };
  }, [step?.visual]);

  useEffect(() => {
    if (!step) return;
    const timer = window.setTimeout(() => {
      globeRef.current?.focusCoordinate(step.focus, step.focus.distance);
    }, 160);
    return () => window.clearTimeout(timer);
  }, [stepIdentity, step]);

  useEffect(() => {
    if (
      role !== "teacher" ||
      !step ||
      !onNarrateStep ||
      narratedStepRef.current === stepIdentity
    ) {
      return;
    }
    if (lamConnected && narrationBusy) return;
    narratedStepRef.current = stepIdentity;
    onNarrateStep(step, `globe-${stepIdentity}`);
  }, [
    lamConnected,
    narrationBusy,
    onNarrateStep,
    role,
    step,
    stepIdentity
  ]);

  const elapsedMs = step ? elapsedInStep(snapshot, now) : 0;
  const progress = step
    ? Math.min(1, elapsedMs / step.durationMs)
    : 0;

  useEffect(() => {
    if (
      role !== "teacher" ||
      !step ||
      !onAdvance ||
      !snapshot.globePlayback.runId ||
      snapshot.globePlayback.status !== "playing" ||
      elapsedMs < step.durationMs ||
      narrationBusy ||
      advancedStepRef.current === stepIdentity
    ) {
      return;
    }
    advancedStepRef.current = stepIdentity;
    onAdvance(
      snapshot.globePlayback.runId,
      snapshot.globePlayback.stepIndex
    );
  }, [
    elapsedMs,
    narrationBusy,
    onAdvance,
    role,
    snapshot.globePlayback.runId,
    snapshot.globePlayback.status,
    snapshot.globePlayback.stepIndex,
    step,
    stepIdentity
  ]);

  const locations = useMemo(
    () => (step ? locationsForStep(step.visual) : EMPTY_LOCATIONS),
    [step]
  );
  const routes = useMemo<readonly GlobeRoute[]>(
    () =>
      step?.visual === "historical-route"
        ? [HISTORICAL_ROUTE]
        : step?.visual === "london-network"
          ? LONDON_NETWORK_ROUTES
          : EMPTY_ROUTES,
    [step?.visual]
  );
  const showGlobalNetwork =
    step?.visual === "global-network" || step?.visual === "question";
  const visibleShippingLanes = showGlobalNetwork
    ? shippingLanes
    : EMPTY_SHIPPING_LANES;
  const sourceText = step?.sourceIds
    .map((sourceId) => PORT_MANAGEMENT_SOURCES[sourceId]?.label)
    .filter(Boolean)
    .join("；");

  if (!cue || !step) {
    return (
      <SlideViewport label="地球仪证据追踪固定画布">
        <article className="cinematic-globe cinematic-globe--empty">
          <strong>地球仪证据追踪尚未启动</strong>
          <span>请先进入“1700：如果只能押一个国家”问题页，再启动证据追踪。</span>
        </article>
      </SlideViewport>
    );
  }

  return (
    <SlideViewport label={`地球仪证据追踪：${step.title}`}>
      <article
        className={`cinematic-globe cinematic-globe--${step.visual}`}
        data-cue-id={cue.id}
        data-cue-step={step.id}
        style={
          {
            "--cinematic-accent": briefing?.accent ?? "#f2b45e"
          } as CSSProperties
        }
      >
        <InteractiveEarthGlobe
          ref={globeRef}
          className="cinematic-globe__earth"
          locations={locations}
          routes={routes}
          shippingLanes={visibleShippingLanes}
          shippingLaneState={
            showGlobalNetwork ? shippingLaneState : "ready"
          }
          shippingLaneDetail="major"
          activeLocationIds={step.activeLocationIds}
          activeLocationColor={briefing?.accent}
          activeLocationColors={briefing?.activeLocationColors}
          initialFocus={step.focus}
          minDistance={1.85}
          maxDistance={4.35}
          autoRotate={step.visual === "emergence"}
          autoRotateSpeed={0.2}
          forceFallback={reducedMotion}
          showControls={false}
          showGraticule
          showLabels={step.visual !== "emergence"}
          mapMode="natural"
          showMapModeToggle={false}
          showRouteModeToggle={false}
          routeView={showGlobalNetwork ? "global" : "featured"}
          eyebrow=""
          title=""
          interactionHint=""
          attribution="NASA Blue Marble"
          featuredRouteAttribution="SeaRoute 5 km · 路线复原"
          shippingLaneAttribution="Global Shipping Lanes v1.3.1 · 非实时AIS"
          ariaLabel="第一讲电影化地球仪"
        />

        <div className="cinematic-globe__vignette" aria-hidden="true" />
        {reducedMotion && (
          <span className="cinematic-globe__fallback-label">
            减少动态效果 · 平面地球
          </span>
        )}
        {step.visual === "emergence" && (
          <div className="cinematic-globe__year" key={stepIdentity}>
            <span>THE WORLD IN</span>
            <strong>1700</strong>
          </div>
        )}
        <header className="cinematic-globe__story" key={`story-${stepIdentity}`}>
          <span>{step.eyebrow}</span>
          <h2>{step.title}</h2>
        </header>
        <MissionBriefingPanel step={step} />

        <div className="cinematic-globe__status">
          <span>
            {String(snapshot.globePlayback.stepIndex + 1).padStart(2, "0")}
            {" / "}
            {String(cue.steps.length).padStart(2, "0")}
          </span>
          <div aria-hidden="true">
            <i style={{ width: `${progress * 100}%` }} />
          </div>
          <strong>
            {snapshot.globePlayback.status === "paused"
              ? "已暂停"
              : "证据追踪"}
          </strong>
        </div>

        <section
          className="cinematic-globe__caption"
          aria-live="polite"
        >
          <div>
            <span>
              {step.publicLabel ?? "课程问题"}
            </span>
            <p>{step.caption}</p>
          </div>
          <strong className={lamConnected ? "" : "is-offline"}>
            {lamConnected ? "LAM 分段讲解" : "LAM未连接，仅字幕"}
          </strong>
        </section>

        <footer className="cinematic-globe__source">
          <span>{sourceText ? `来源：${sourceText}` : "课程引导问题"}</span>
          {step.visual === "historical-route" && (
            <strong>
              路线示意 · 陆地相交审计
              {OPENING_ROUTE_DATA.audit.pass ? "通过" : "未通过"}
            </strong>
          )}
        </footer>
      </article>
    </SlideViewport>
  );
}
