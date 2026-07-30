import {
  getPortManagementLessonSlidePosition,
  getPortManagementSlide,
  PORT_MANAGEMENT_SOURCES,
  type PortManagementLessonSlidePosition,
  type PortManagementSlideSpec,
  type PortSlideDiagram
} from "@edu/course-content";
import type { ClassroomActivity, SlideFrame } from "@edu/contracts";
import {
  BarChart3,
  CheckCircle2,
  FlaskConical,
  MessageSquareText,
  PlaySquare,
  Presentation
} from "lucide-react";
import { SlideViewport } from "./SlideViewport";

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
      data-slide-key={spec.slideKey}
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
      data-slide-key={spec.slideKey}
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

export function SlideStage({ frame }: { frame: SlideFrame }) {
  const spec = getPortManagementSlide(frame.index);
  const position =
    getPortManagementLessonSlidePosition(frame.index) ??
    getPortManagementLessonSlidePosition(spec.index)!;
  return (
    <SlideViewport
      label={`Slides 固定画布：${frame.title}，第${position.lessonNumber}讲第${position.localIndex}页，共${position.localTotal}页`}
    >
      {spec.layout === "cover" ? (
        <CoverSlide spec={spec} position={position} />
      ) : (
        <StandardSlide spec={spec} position={position} />
      )}
    </SlideViewport>
  );
}

const activityDetails: Record<
  Exclude<ClassroomActivity, "slides">,
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
  activity: Exclude<ClassroomActivity, "slides">;
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
