import {
  getPortManagementLessonSlidePosition,
  getPortManagementSlide,
  PORT_MANAGEMENT_SOURCES,
  type PortManagementLessonSlidePosition,
  type PortManagementSlideSpec,
  type PortSlideDiagram
} from "@edu/course-content";
import type {
  ClassroomActivity,
  SlideFrame,
  SlideInteractionState,
  SlideInteractionValues
} from "@edu/contracts";
import {
  BarChart3,
  CheckCircle2,
  FlaskConical,
  MessageSquareText,
  PlaySquare,
  Presentation
} from "lucide-react";
import { lazy, Suspense } from "react";
import { renderAuthoredTeachingSlide } from "./AuthoredTeachingSlides";
import { SlideViewport } from "./SlideViewport";
import { PortLblStage } from "../port-lbl/PortLblStage";
import { PORT_LBL_SLIDES } from "@edu/course-content";

const EconomicMathematicsSlideStage = lazy(() =>
  import("../economic-mathematics/EconomicMathematicsSlideStage").then(
    (module) => ({ default: module.EconomicMathematicsSlideStage })
  )
);

const ECONOMIC_MATHEMATICS_DECK_ID = "deck-economic-mathematics-2026";

function StudentContextStrip({ spec }: { spec: PortManagementSlideSpec }) {
  const { location, publicLabel, timeMarker } = spec.narrative;
  const labelClass =
    publicLabel === "教学情境"
      ? " course-slide__context-tag--scenario"
      : publicLabel === "路线示意"
        ? " course-slide__context-tag--route"
        : "";

  return (
    <aside className="course-slide__context" aria-label="课件时空线索">
      <div className="course-slide__context-location">
        <strong>{location}</strong>
        {timeMarker && <span>{timeMarker}</span>}
      </div>
      {publicLabel && (
        <span className={`course-slide__context-tag${labelClass}`}>
          {publicLabel}
        </span>
      )}
    </aside>
  );
}

function ArrowHead() {
  return (
    <defs>
      <marker
        id="courseDiagramArrow"
        markerHeight="8"
        markerWidth="8"
        orient="auto"
        refX="7"
        refY="4"
      >
        <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
      </marker>
    </defs>
  );
}

function VoyageRouteDiagram({ location }: { location: string }) {
  const nodes = [
    { label: "上海", x: 92, y: 260 },
    { label: "新加坡", x: 210, y: 330 },
    { label: "苏伊士", x: 385, y: 225 },
    { label: "比雷埃夫斯", x: 458, y: 173 },
    { label: "汉堡", x: 548, y: 92 },
    { label: "鹿特丹", x: 570, y: 132 }
  ];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="LL3亚欧航线矢量示意">
      <ArrowHead />
      <path
        className="course-diagram__land"
        d="M38 90C108 48 185 58 227 103c26 28 8 62-27 80-50 26-53 81-17 103-58 4-109-17-145-57zM319 72c56-42 143-45 203-12 35 19 65 54 96 68-39 22-75 44-91 80-19 41-80 67-139 45-42-16-72-48-84-92zM514 247c55-9 112 15 143 58-29 47-89 64-144 39-38-17-56-53-44-76z"
      />
      <path
        className="course-diagram__route"
        d="M92 260 C145 291 169 323 210 330 C286 340 314 273 385 225 C419 203 432 184 458 173 C498 156 526 112 548 92 C558 104 565 117 570 132"
        markerEnd="url(#courseDiagramArrow)"
      />
      {nodes.map((node) => {
        const active = location.includes(node.label);
        return (
          <g
            className={active ? "course-diagram__node course-diagram__node--active" : "course-diagram__node"}
            key={node.label}
            transform={`translate(${node.x} ${node.y})`}
          >
            <circle r={active ? 12 : 8} />
            <text y={-18} textAnchor="middle">{node.label}</text>
          </g>
        );
      })}
      <text className="course-diagram__caption" x="24" y="398">
        依据OOCL 2023年LL3官方挂港顺序制作 · 路线示意，非实时AIS
      </text>
    </svg>
  );
}

function RouteLayersDiagram() {
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="走廊航线节点腹地关系示意">
      <ArrowHead />
      <g className="course-diagram__layer">
        <rect x="64" y="44" width="572" height="82" rx="22" />
        <text x="92" y="78">走廊</text>
        <text x="92" y="105">稳定货流与市场联系形成高密度方向</text>
      </g>
      <g className="course-diagram__layer course-diagram__layer--secondary">
        <rect x="64" y="166" width="572" height="82" rx="22" />
        <text x="92" y="200">班轮与节点</text>
        <text x="92" y="227">干线、支线、枢纽与门户组织运力</text>
      </g>
      <g className="course-diagram__layer course-diagram__layer--tertiary">
        <rect x="64" y="288" width="572" height="82" rx="22" />
        <text x="92" y="322">腹地</text>
        <text x="92" y="349">工厂、城市与内陆运输持续提供货源</text>
      </g>
      <path className="course-diagram__connector" d="M350 126V160" markerEnd="url(#courseDiagramArrow)" />
      <path className="course-diagram__connector" d="M350 248V282" markerEnd="url(#courseDiagramArrow)" />
    </svg>
  );
}

function ChokepointDiagram() {
  const items = [
    ["局部受限", "容量 / 安全"],
    ["船舶等待", "时刻表偏移"],
    ["港口冲突", "泊位 / 中转"],
    ["供应链承压", "库存 / 交付"]
  ];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="海运咽喉风险传播链">
      <ArrowHead />
      {items.map(([title, note], index) => {
        const x = 38 + index * 166;
        return (
          <g className="course-diagram__chain" key={title} transform={`translate(${x} 132)`}>
            <rect width="130" height="142" rx="23" />
            <text x="65" y="58" textAnchor="middle">{title}</text>
            <text className="course-diagram__small" x="65" y="92" textAnchor="middle">{note}</text>
            {index < items.length - 1 && (
              <path
                className="course-diagram__connector"
                d="M134 71H158"
                markerEnd="url(#courseDiagramArrow)"
              />
            )}
          </g>
        );
      })}
      <text className="course-diagram__caption" x="36" y="340">
        风险发生在局部，后果通过船期、港口与库存关系传播
      </text>
    </svg>
  );
}

function ChinaInlandDiagram() {
  const nodes = [
    { label: "重庆 / 果园港", x: 90, y: 290 },
    { label: "三峡", x: 230, y: 245 },
    { label: "武汉", x: 375, y: 205 },
    { label: "上海", x: 585, y: 132 }
  ];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="重庆经长江至上海的集装箱链条示意">
      <ArrowHead />
      <path
        className="course-diagram__river"
        d="M72 310C150 281 178 270 230 245s91-5 145-40 118-19 210-73"
        markerEnd="url(#courseDiagramArrow)"
      />
      {nodes.map((node) => (
        <g className="course-diagram__node" key={node.label} transform={`translate(${node.x} ${node.y})`}>
          <circle r="9" />
          <text y="-20" textAnchor="middle">{node.label}</text>
        </g>
      ))}
      <g className="course-diagram__mode" transform="translate(78 346)">
        <rect width="500" height="42" rx="18" />
        <text x="250" y="28" textAnchor="middle">
          工厂 → 内河港 → 长江水运 → 上海换装 → 亚欧班轮
        </text>
      </g>
    </svg>
  );
}

function ChinaWaterwayNetworkDiagram() {
  const groups = [
    {
      heading: "四纵",
      subtitle: "跨流域通道",
      items: ["京杭运河", "江淮干线", "浙赣粤通道", "汉湘桂通道"]
    },
    {
      heading: "四横",
      subtitle: "跨区域通道",
      items: [
        "长江干线及主要支流",
        "西江干线及主要支流",
        "淮河干线及主要支流",
        "黑龙江及主要支流"
      ]
    },
    {
      heading: "两网",
      subtitle: "高密度航道网",
      items: ["长江三角洲航道网", "珠江三角洲航道网"]
    }
  ];

  return (
    <svg
      viewBox="0 0 700 420"
      role="img"
      aria-label="四纵四横两网国家高等级航道结构与果园港接入长江示意"
    >
      {groups.map((group, groupIndex) => (
        <g
          className="course-diagram__waterway-panel"
          key={group.heading}
          transform={`translate(${18 + groupIndex * 226} 18)`}
        >
          <rect height="292" rx="22" width="208" />
          <text className="course-diagram__waterway-heading" x="18" y="40">
            {group.heading}
          </text>
          <text className="course-diagram__waterway-subtitle" x="76" y="39">
            {group.subtitle}
          </text>
          {group.items.map((item, itemIndex) => (
            <g
              className={
                item.startsWith("长江干线")
                  ? "course-diagram__waterway-item course-diagram__waterway-item--active"
                  : "course-diagram__waterway-item"
              }
              key={item}
              transform={`translate(15 ${68 + itemIndex * 50})`}
            >
              <rect height="38" rx="12" width="178" />
              <text x="89" y="25" textAnchor="middle">
                {item}
              </text>
            </g>
          ))}
        </g>
      ))}
      <g className="course-diagram__waterway-focus" transform="translate(18 330)">
        <rect height="66" rx="20" width="660" />
        <text x="330" y="30" textAnchor="middle">
          果园港 → 长江干线及主要支流 → 上海港 → 亚欧班轮
        </text>
        <text className="course-diagram__waterway-note" x="330" y="51" textAnchor="middle">
          果园港由“四横”中的长江通道接入沿海远洋网络
        </text>
      </g>
    </svg>
  );
}

function PortInterfaceDiagram() {
  const items = [
    ["腹地", "工厂 / 城市"],
    ["集疏运", "公铁水"],
    ["港口", "换装 / 存储"],
    ["航线", "班轮网络"]
  ];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="港口海陆转换系统示意">
      <ArrowHead />
      <path className="course-diagram__connector course-diagram__connector--wide" d="M90 210H620" markerEnd="url(#courseDiagramArrow)" />
      {items.map(([title, note], index) => (
        <g className="course-diagram__interface" key={title} transform={`translate(${38 + index * 164} 135)`}>
          <rect width="130" height="150" rx="24" />
          <text x="65" y="62" textAnchor="middle">{title}</text>
          <text className="course-diagram__small" x="65" y="96" textAnchor="middle">{note}</text>
        </g>
      ))}
      <text className="course-diagram__caption" x="36" y="350">
        货物、责任、单证与信息在接口处同时改变状态
      </text>
    </svg>
  );
}

function PortGenerationsDiagram() {
  const layers = [
    ["第一代", "海陆转换"],
    ["第二代", "产业增值"],
    ["第三代", "物流组织"],
    ["第四代", "网络协同"]
  ];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="港口代际能力累积示意">
      {layers.map(([title, note], index) => (
        <g className="course-diagram__generation" key={title} transform={`translate(${78 + index * 136} ${278 - index * 54})`}>
          <rect width={140 + index * 6} height={92 + index * 8} rx="22" />
          <text x="20" y="38">{title}</text>
          <text className="course-diagram__small" x="20" y="68">{note}</text>
        </g>
      ))}
      <path className="course-diagram__growth" d="M92 335C227 278 376 222 610 98" />
      <text className="course-diagram__caption" x="36" y="392">
        新能力叠加在基础能力之上，不构成先进程度排行榜
      </text>
    </svg>
  );
}

function PortNetworkDiagram() {
  const nodes = [
    { label: "货物", x: 92, y: 206 },
    { label: "航线", x: 235, y: 92 },
    { label: "港口", x: 350, y: 210 },
    { label: "腹地", x: 505, y: 100 },
    { label: "治理", x: 592, y: 278 },
    { label: "信息", x: 255, y: 330 }
  ];
  const edges = [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [2, 5], [3, 4], [4, 5], [0, 5]];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="货物航线港口腹地治理网络示意">
      {edges.map(([from, to]) => {
        const start = nodes[from!]!;
        const end = nodes[to!]!;
        return <line className="course-diagram__edge" key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
      })}
      {nodes.map((node, index) => (
        <g className={index === 2 ? "course-diagram__network-node course-diagram__network-node--core" : "course-diagram__network-node"} key={node.label} transform={`translate(${node.x} ${node.y})`}>
          <circle r={index === 2 ? 56 : 43} />
          <text textAnchor="middle" y="7">{node.label}</text>
        </g>
      ))}
    </svg>
  );
}

function ResilienceDiagram() {
  const nodes = [
    { label: "预见", x: 350, y: 72 },
    { label: "吸收", x: 566, y: 210 },
    { label: "适应", x: 350, y: 348 },
    { label: "恢复", x: 134, y: 210 }
  ];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="网络韧性循环">
      <ArrowHead />
      <path className="course-diagram__resilience" d="M350 72C473 72 566 117 566 210S473 348 350 348 134 303 134 210 227 72 350 72" markerEnd="url(#courseDiagramArrow)" />
      {nodes.map((node) => (
        <g className="course-diagram__network-node" key={node.label} transform={`translate(${node.x} ${node.y})`}>
          <circle r="44" />
          <text textAnchor="middle" y="7">{node.label}</text>
        </g>
      ))}
      <text className="course-diagram__core-label" x="350" y="200" textAnchor="middle">韧性</text>
      <text className="course-diagram__small" x="350" y="230" textAnchor="middle">不是永不受阻</text>
    </svg>
  );
}

function EnglandFrance1700Diagram() {
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="1700年前后英格兰和威尔士与法国人口规模比较">
      <path
        className="course-diagram__land"
        d="M86 74c28-23 64-20 82 7 17 26 7 55-4 80-10 24-4 53 13 73-26 24-64 17-81-10-14-22-6-45 0-67 7-27-29-57-10-83Zm233 24c64-38 153-31 209 18 47 41 69 103 47 160-20 54-80 77-137 68-58-9-105-49-124-100-19-49-32-111 5-146Z"
      />
      <path className="course-diagram__river" d="M205 36V366" opacity=".28" />
      <g className="course-diagram__node" transform="translate(130 206)">
        <circle r="14" />
        <text textAnchor="middle" y="-30">英格兰和威尔士</text>
      </g>
      <g className="course-diagram__node" transform="translate(440 220)">
        <circle r="14" />
        <text textAnchor="middle" y="-30">法国</text>
      </g>
      <g transform="translate(58 300)">
        <rect fill="#173f53" height="34" rx="17" width="118" />
        <text fill="#fff" fontSize="22" fontWeight="900" textAnchor="middle" x="59" y="24">约500万</text>
      </g>
      <g transform="translate(300 300)">
        <rect fill="#d38b32" height="34" rx="17" width="276" />
        <text fill="#fff" fontSize="22" fontWeight="900" textAnchor="middle" x="138" y="24">约2000万</text>
      </g>
      <text className="course-diagram__caption" x="48" y="394">
        历史估算约数 · 面积不代表领土精确比例
      </text>
    </svg>
  );
}

function CantonLondonTradeDiagram() {
  const nodes = [
    { label: "广州", x: 590, y: 235 },
    { label: "马六甲方向", x: 500, y: 310 },
    { label: "印度洋", x: 364, y: 290 },
    { label: "好望角", x: 245, y: 350 },
    { label: "伦敦", x: 110, y: 105 }
  ];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="17至18世纪广州到伦敦远洋贸易路线复原">
      <ArrowHead />
      <path
        className="course-diagram__land"
        d="M57 48c71-28 145-17 183 22 33 34 29 77 3 111-29 37-48 81-42 128-71 13-143-17-175-72-25-43-11-87 17-121 17-21-10-49 14-68Zm289 27c93-44 221-21 294 47 42 39 42 91 9 126-28 29-73 36-112 20-44-18-84-9-116 22-52 51-129 48-172 3-39-41-29-103 15-139 30-25 38-58 82-79Z"
      />
      <path
        className="course-diagram__route"
        d="M590 235C554 271 532 301 500 310C449 325 410 291 364 290C317 289 283 327 245 350C188 333 139 239 110 105"
        markerEnd="url(#courseDiagramArrow)"
      />
      {nodes.map((node) => (
        <g className="course-diagram__node" key={node.label} transform={`translate(${node.x} ${node.y})`}>
          <circle r="9" />
          <text textAnchor="middle" y="-18">{node.label}</text>
        </g>
      ))}
      <text className="course-diagram__caption" x="28" y="402">
        基于时代航海条件的路线复原 · 不代表单船逐日轨迹
      </text>
    </svg>
  );
}

function ComparativeAdvantageDiagram() {
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="江南湖广概念模型的生产可能性边界">
      <ArrowHead />
      <path className="course-diagram__connector" d="M90 338V54M90 338H638" />
      <text fill="#294d5e" fontSize="17" fontWeight="850" x="20" y="64">粮（石）</text>
      <text fill="#294d5e" fontSize="17" fontWeight="850" x="590" y="378">丝（匹）</text>
      <path
        d="M90 72L530 244L618 338"
        fill="none"
        stroke="#0d8c87"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="8"
      />
      <text className="course-diagram__small" x="254" y="113">先把江南劳动日转向丝：斜率 −2</text>
      <text className="course-diagram__small" x="490" y="306">再转湖广：斜率 −5</text>
      <g transform="translate(354 208)">
        <circle fill="#d56d59" r="11" stroke="#fff" strokeWidth="5" />
        <text fill="#8d463b" fontSize="16" fontWeight="850" x="-70" y="32">平均分配 60，150</text>
      </g>
      <g transform="translate(398 185)">
        <circle fill="#efaa3c" r="13" stroke="#fff" strokeWidth="5" />
        <text fill="#9a6213" fontSize="16" fontWeight="900" x="20" y="-13">重新分工 70，160</text>
      </g>
      <path d="M354 208L398 185" fill="none" markerEnd="url(#courseDiagramArrow)" stroke="#efaa3c" strokeWidth="4" />
      <text className="course-diagram__caption" x="90" y="402">
        概念模型：总劳动日不变，重新配置使产出从边界内点移动到边界
      </text>
    </svg>
  );
}

function JiangnanHuguangTradeDiagram() {
  const nodes = [
    { label: "洞庭湖区", x: 130, y: 278 },
    { label: "汉口", x: 270, y: 220 },
    { label: "江南", x: 490, y: 180 },
    { label: "海港", x: 610, y: 132 }
  ];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="洞庭湖经汉口沿长江至江南和海港的区域分工示意">
      <ArrowHead />
      <path
        className="course-diagram__land"
        d="M55 91c106-59 234-54 326-18 87 35 178 22 259 72 40 25 33 82-5 107-84 56-180 39-264 71-82 31-196 30-276-22-70-45-105-132-40-210Z"
      />
      <path
        className="course-diagram__river"
        d="M108 290C182 276 218 245 270 220C344 184 414 206 490 180C538 164 567 143 610 132"
        markerEnd="url(#courseDiagramArrow)"
      />
      {nodes.map((node) => (
        <g className="course-diagram__node" key={node.label} transform={`translate(${node.x} ${node.y})`}>
          <circle r="10" />
          <text textAnchor="middle" y="-20">{node.label}</text>
        </g>
      ))}
      <g className="course-diagram__mode" transform="translate(74 338)">
        <rect height="44" rx="18" width="552" />
        <text textAnchor="middle" x="276" y="29">
          粮食向东流动 · 丝织品与高价值商品进入更大市场
        </text>
      </g>
    </svg>
  );
}

function HistoricalTradeChainDiagram() {
  const items = [
    ["湖广", "粮食", "区域分工史料"],
    ["江南", "丝织", "区域经济史料"],
    ["中国海港", "远洋接口", "路线复原"],
    ["伦敦", "采购与市场", "贸易档案"]
  ];
  return (
    <svg viewBox="0 0 700 420" role="img" aria-label="粮食丝织海港和英国市场的历史综合链">
      <ArrowHead />
      {items.map(([place, role, evidence], index) => {
        const x = 28 + index * 168;
        return (
          <g className="course-diagram__chain" key={place} transform={`translate(${x} 118)`}>
            <rect height="152" rx="22" width="136" />
            <text textAnchor="middle" x="68" y="48">{place}</text>
            <text className="course-diagram__small" textAnchor="middle" x="68" y="82">{role}</text>
            <text fill="#b5762c" fontSize="13" fontWeight="800" textAnchor="middle" x="68" y="119">{evidence}</text>
            {index < items.length - 1 && (
              <path
                className="course-diagram__connector"
                d="M140 76H160"
                markerEnd="url(#courseDiagramArrow)"
              />
            )}
          </g>
        );
      })}
      <text className="course-diagram__caption" x="34" y="334">
        四段证据共同解释一套网络机制，不代表同一批货物的连续追踪记录
      </text>
    </svg>
  );
}

function CourseDiagram({
  type,
  spec
}: {
  type: PortSlideDiagram;
  spec: PortManagementSlideSpec;
}) {
  if (type === "voyage-route") {
    return <VoyageRouteDiagram location={spec.narrative.location} />;
  }
  if (type === "england-france-1700") return <EnglandFrance1700Diagram />;
  if (type === "canton-london-trade") return <CantonLondonTradeDiagram />;
  if (type === "comparative-advantage") {
    return <ComparativeAdvantageDiagram />;
  }
  if (type === "jiangnan-huguang-trade") {
    return <JiangnanHuguangTradeDiagram />;
  }
  if (type === "historical-trade-chain") {
    return <HistoricalTradeChainDiagram />;
  }
  if (type === "route-layers") return <RouteLayersDiagram />;
  if (type === "chokepoint-chain") return <ChokepointDiagram />;
  if (type === "china-inland") return <ChinaInlandDiagram />;
  if (type === "china-waterway-network") {
    return <ChinaWaterwayNetworkDiagram />;
  }
  if (type === "port-interface") return <PortInterfaceDiagram />;
  if (type === "port-generations") return <PortGenerationsDiagram />;
  if (type === "resilience") return <ResilienceDiagram />;
  return <PortNetworkDiagram />;
}

function SlideHeader({
  spec,
  position
}: {
  spec: PortManagementSlideSpec;
  position: PortManagementLessonSlidePosition;
}) {
  const longTitle = spec.title.length > 18;
  return (
    <header
      className={`course-slide__header${longTitle ? " course-slide__header--long" : ""}`}
    >
      <div>
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
      </div>
      <div className="course-slide__identity">
        <span>{spec.lessonTitle}</span>
        <strong>{String(position.localIndex).padStart(2, "0")}</strong>
      </div>
    </header>
  );
}

function SlideSources({ spec }: { spec: PortManagementSlideSpec }) {
  const sourceLabels = spec.sourceIds
    ?.map((sourceId) => PORT_MANAGEMENT_SOURCES[sourceId]?.label)
    .filter(Boolean);
  const sourceText = sourceLabels?.length
    ? `来源：${sourceLabels.join("；")}`
    : "";
  const reconstructionText = spec.image ? "教学复原图" : "";
  const displayText = [sourceText, reconstructionText].filter(Boolean).join(" · ");

  if (!displayText) return null;

  return (
    <span
      className="course-slide__sources"
      title={sourceLabels?.length ? sourceLabels.join("；") : undefined}
    >
      {displayText}
    </span>
  );
}

function SlideFooter({
  spec,
  position
}: {
  spec: PortManagementSlideSpec;
  position: PortManagementLessonSlidePosition;
}) {
  return (
    <footer className="course-slide__footer">
      <SlideSources spec={spec} />
      <span>
        港口管理概论 · {position.localIndex}/{position.localTotal}
      </span>
    </footer>
  );
}

function CoverSlide({
  spec,
  position
}: {
  spec: PortManagementSlideSpec;
  position: PortManagementLessonSlidePosition;
}) {
  return (
    <article
      className={`course-slide course-slide--cover course-slide--${spec.accent ?? "teal"}`}
    >
      <StudentContextStrip spec={spec} />
      {spec.image && (
        <img
          className="course-slide__cover-image"
          src={spec.image}
          alt={spec.imageAlt ?? ""}
          style={{
            objectFit: spec.imageFit ?? "cover",
            objectPosition: spec.imagePosition ?? "center"
          }}
        />
      )}
      <div className="course-slide__cover-shade" />
      <div className="course-slide__cover-copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
        <span>{spec.lessonTitle} · 李行之</span>
      </div>
      <div className="course-slide__cover-page">
        {String(position.localIndex).padStart(2, "0")} / {position.localTotal}
      </div>
      <SlideFooter spec={spec} position={position} />
    </article>
  );
}

function ColumnGrid({
  spec
}: {
  spec: PortManagementSlideSpec;
}) {
  return (
    <div
      className={`course-slide__columns course-slide__columns--${Math.min(
        spec.columns?.length ?? 1,
        6
      )}`}
    >
      {spec.columns?.map((column, index) => (
        <section key={`${column.heading}-${index}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h3>{column.heading}</h3>
          <p>{column.body}</p>
          {column.note && <strong>{column.note}</strong>}
        </section>
      ))}
    </div>
  );
}

function StandardSlide({
  spec,
  position
}: {
  spec: PortManagementSlideSpec;
  position: PortManagementLessonSlidePosition;
}) {
  const hasVisual = Boolean(spec.image || spec.diagram);
  return (
    <article
      className={`course-slide course-slide--${spec.layout} course-slide--${spec.accent ?? "teal"}`}
    >
      <StudentContextStrip spec={spec} />
      <SlideHeader spec={spec} position={position} />

      <div className={`course-slide__body ${hasVisual ? "course-slide__body--with-image" : ""}`}>
        {hasVisual && (
          <figure
            className={`course-slide__visual${
              spec.image?.includes("ship-scale")
                ? " course-slide__visual--focus-right"
                : ""
            }${spec.diagram ? " course-slide__visual--diagram" : ""}`}
          >
            {spec.image ? (
              <img
                src={spec.image}
                alt={spec.imageAlt ?? ""}
                style={{
                  objectFit: spec.imageFit ?? "cover",
                  objectPosition: spec.imagePosition ?? "center"
                }}
              />
            ) : spec.diagram ? (
              <CourseDiagram type={spec.diagram} spec={spec} />
            ) : null}
          </figure>
        )}

        <div className="course-slide__content">
          {spec.lead && <p className="course-slide__lead">{spec.lead}</p>}
          {spec.stat && (
            <div className="course-slide__stat">
              <strong>{spec.stat.value}</strong>
              <span>{spec.stat.label}</span>
              {spec.stat.detail && <p>{spec.stat.detail}</p>}
            </div>
          )}
          {spec.prompt && <blockquote>{spec.prompt}</blockquote>}
          {spec.bullets && (
            <ul className="course-slide__bullets">
              {spec.bullets.map((bullet) => (
                <li key={bullet}>
                  <CheckCircle2 size={27} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
          {spec.steps && (
            <ol className="course-slide__steps">
              {spec.steps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                </li>
              ))}
            </ol>
          )}
          {spec.columns && <ColumnGrid spec={spec} />}
          {spec.table && (
            <table className="course-slide__table">
              <thead>
                <tr>
                  {spec.table.headers.map((header) => <th key={header}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {spec.table.rows.map((row, rowIndex) => (
                  <tr key={`${row[0]}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${cell}-${cellIndex}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SlideFooter spec={spec} position={position} />
    </article>
  );
}

export function SlideStage({
  frame,
  interaction = null,
  readOnly = true,
  onInteractionPatch,
  onInteractionReset
}: {
  frame: SlideFrame;
  interaction?: SlideInteractionState | null;
  readOnly?: boolean;
  onInteractionPatch?: (patch: SlideInteractionValues) => void;
  onInteractionReset?: () => void;
}) {
  if (frame.deckId === ECONOMIC_MATHEMATICS_DECK_ID) {
    return (
      <Suspense
        fallback={
          <SlideViewport label={`正在装载经济数学课件：${frame.title}`}>
            <div className="econmath-slide econmath-slide--loading">正在装载本讲手工课件…</div>
          </SlideViewport>
        }
      >
        <EconomicMathematicsSlideStage
          frame={frame}
          interaction={interaction}
          onInteractionPatch={onInteractionPatch}
          onInteractionReset={onInteractionReset}
          readOnly={readOnly}
        />
      </Suspense>
    );
  }
  const spec = getPortManagementSlide(frame.index);
  const lblPage = PORT_LBL_SLIDES.find(page=>page.slideKey===spec.slideKey);
  if(lblPage)return <PortLblStage key={lblPage.slideKey} page={lblPage} readOnly={readOnly}/>;
  const position =
    getPortManagementLessonSlidePosition(frame.index) ??
    getPortManagementLessonSlidePosition(spec.index)!;
  const authoredSlide = renderAuthoredTeachingSlide(
    spec,
    position,
    spec.diagram ? <CourseDiagram type={spec.diagram} spec={spec} /> : undefined
  );
  return (
    <SlideViewport
      label={`Slides 固定画布：${frame.title}，第${position.lessonNumber}讲第${position.localIndex}页，共${position.localTotal}页`}
    >
      {authoredSlide ?? (spec.layout === "cover" ? (
        <CoverSlide spec={spec} position={position} />
      ) : (
        <StandardSlide spec={spec} position={position} />
      ))}
    </SlideViewport>
  );
}

const activityDetails: Record<
  Exclude<ClassroomActivity, "slides" | "globe">,
  { title: string; description: string; icon: typeof FlaskConical; items: string[] }
> = {
  simulation: {
    title: "港口生产模拟实验",
    description: "模拟器将以受控沙箱形式装载在课堂主舞台，不离开当前课堂。",
    icon: FlaskConical,
    items: ["船舶到港计划", "岸桥作业分配", "堆场容量与周转"]
  },
  whiteboard: {
    title: "课堂白板",
    description: "教师批注会形成课堂事件，并可关联回当前课件页。",
    icon: Presentation,
    items: ["自由书写", "图形与箭头", "保存为课堂记录"]
  },
  video: {
    title: "课程视频",
    description: "视频播放进度与暂停状态由课堂运行时统一同步。",
    icon: PlaySquare,
    items: ["港口现场案例", "作业流程演示", "字幕与关键帧"]
  },
  interaction: {
    title: "学生互动",
    description: "投票、提问和讨论在同一主舞台完成，结束后回到原课件页。",
    icon: MessageSquareText,
    items: ["即时投票", "随机点名", "课堂讨论"]
  }
};

export function ActivityStage({
  activity,
  frame
}: {
  activity: Exclude<ClassroomActivity, "slides" | "globe">;
  frame: SlideFrame;
}) {
  const detail = activityDetails[activity];
  const Icon = detail.icon;
  return (
    <SlideViewport label={`${detail.title}固定活动画布`}>
      <article className="teaching-slide activity-placeholder-slide">
        <div className="activity-placeholder-slide__icon"><Icon size={74} /></div>
        <p>CLASSROOM ACTIVITY · {activity.toUpperCase()}</p>
        <h2>{detail.title}</h2>
        <span>{detail.description}</span>
        <div className="activity-placeholder-grid">
          {detail.items.map((item, index) => (
            <div key={item}>
              <strong>0{index + 1}</strong>
              <h3>{item}</h3>
            </div>
          ))}
        </div>
        <footer>
          <BarChart3 size={24} />
          当前课堂运行版本 {frame.versionId}
        </footer>
      </article>
    </SlideViewport>
  );
}
