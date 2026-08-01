import {
  PORT_MANAGEMENT_SOURCES,
  type PortManagementLessonSlidePosition,
  type PortManagementSlideSpec
} from "@edu/course-content";
import type { ReactElement, ReactNode } from "react";

export const PILOT_AUTHORED_TEACHING_SLIDE_KEYS = [
  "l1-course-cover",
  "l1-1700-wager",
  "l1-france-england-scale",
  "l1-china-direct-trade",
  "l1-canton-1727-manifest",
  "l1-value-density",
  "l1-london-redistribution",
  "l1-absolute-vs-comparative",
  "l1-jiangnan-huguang-model",
  "l1-half-time-output",
  "l1-opportunity-cost-table",
  "l1-reallocation-output",
  "l1-opportunity-cost-activity",
  "l1-regional-division-timeline",
  "l1-cash-crop-transition",
  "l1-water-distance",
  "l1-navy-state",
  "l1-industry-port-loop",
  "l1-water-cost-mechanisms",
  "l1-four-modes",
  "l1-port-interface",
  "l2-explain-every-choice",
  "l2-port-rotation",
  "l2-cargo-consolidation",
  "l2-feeder-mainline",
  "l2-hub-vs-gateway",
  "l2-transshipment",
  "l2-indian-ocean",
  "l2-why-chokepoint",
  "l2-canal-service-system",
  "l2-capacity-order-safety",
  "l2-disruption-brief",
  "l2-option-wait",
  "l2-option-network",
  "l2-decision-table",
  "l2-guoyuan-role",
  "l2-yangtze-corridor",
  "l2-three-gorges",
  "l2-inland-hidden-costs",
  "l3-four-port-tasks",
  "l3-no-taxonomy-first",
  "l3-first-generation",
  "l3-second-generation",
  "l3-third-generation",
  "l3-fourth-generation",
  "l3-generation-lens",
  "l3-shanghai-gateway",
  "l3-singapore-hub",
  "l3-piraeus-call",
  "l3-rotterdam-industry",
  "l3-multiple-roles",
  "l3-no-ranking",
  "l3-coastal-river-inland",
  "l3-gateway-transshipment",
  "l3-industrial-city-port",
  "l3-diagnosis-vessel",
  "l3-diagnosis-yard",
  "l3-diagnosis-hinterland",
  "l3-diagnosis-information",
  "l3-priority-investment"
] as const;

type PilotAuthoredTeachingSlideKey =
  (typeof PILOT_AUTHORED_TEACHING_SLIDE_KEYS)[number];

interface AuthoredSlideProps {
  spec: PortManagementSlideSpec;
  position: PortManagementLessonSlidePosition;
  diagram?: ReactNode;
}

function PublicContext({
  spec,
  inverse = false
}: {
  spec: PortManagementSlideSpec;
  inverse?: boolean;
}) {
  const { location, publicLabel, timeMarker } = spec.narrative;
  return (
    <div
      className={`authored-slide__context${inverse ? " authored-slide__context--inverse" : ""}`}
      aria-label="课件时空线索"
    >
      <span>{location}</span>
      {timeMarker && <span>{timeMarker}</span>}
      {publicLabel && <strong>{publicLabel}</strong>}
    </div>
  );
}

function SourceLine({
  spec,
  inverse = false
}: {
  spec: PortManagementSlideSpec;
  inverse?: boolean;
}) {
  const labels = spec.sourceIds
    ?.map((sourceId) => PORT_MANAGEMENT_SOURCES[sourceId]?.label)
    .filter(Boolean);
  const sourceText = labels?.length ? `来源：${labels.join("；")}` : "";
  const reconstructionText = spec.image ? "教学复原图" : "";
  const text = [sourceText, reconstructionText].filter(Boolean).join(" · ");
  if (!text) return <span aria-hidden="true" />;
  return (
    <span
      className={`authored-slide__source${inverse ? " authored-slide__source--inverse" : ""}`}
      title={labels?.length ? labels.join("；") : undefined}
    >
      {text}
    </span>
  );
}

function AuthoredFooter({
  spec,
  position,
  inverse = false
}: AuthoredSlideProps & { inverse?: boolean }) {
  return (
    <footer
      className={`authored-slide__footer${inverse ? " authored-slide__footer--inverse" : ""}`}
    >
      <SourceLine spec={spec} inverse={inverse} />
      <span>
        港口管理概论 · {position.localIndex}/{position.localTotal}
      </span>
    </footer>
  );
}

function EditorialHeader({
  spec,
  compact = false
}: {
  spec: PortManagementSlideSpec;
  compact?: boolean;
}) {
  return (
    <header
      className={`authored-slide__header${compact ? " authored-slide__header--compact" : ""}`}
    >
      <p>{spec.kicker}</p>
      <h2>{spec.title}</h2>
      {spec.lead && <div>{spec.lead}</div>}
    </header>
  );
}

function LightFrame({
  spec,
  position,
  composition,
  children,
  className = ""
}: AuthoredSlideProps & {
  composition: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`authored-slide authored-slide--light ${className}`.trim()}
      data-slide-composition={composition}
      data-slide-key={spec.slideKey}
    >
      <PublicContext spec={spec} />
      {children}
      <AuthoredFooter spec={spec} position={position} />
    </article>
  );
}

function ImageStoryFrame({
  spec,
  position,
  composition,
  children,
  className = ""
}: AuthoredSlideProps & {
  composition: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`authored-slide authored-slide--image-story ${className}`.trim()}
      data-slide-composition={composition}
      data-slide-key={spec.slideKey}
    >
      {spec.image && (
        <img
          className="authored-slide__background"
          src={spec.image}
          alt={spec.imageAlt ?? ""}
          style={{
            objectFit: spec.imageFit ?? "cover",
            objectPosition: spec.imagePosition ?? "center"
          }}
        />
      )}
      <div className="authored-slide__shade" />
      <PublicContext spec={spec} inverse />
      {children}
      <AuthoredFooter spec={spec} position={position} inverse />
    </article>
  );
}

function WagerOpeningSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="historical-wager"
      className="authored-slide--wager"
    >
      <div className="authored-wager__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-wager__choices" aria-label="英格兰与法国课堂投票">
        <section>
          <span>A</span>
          <h3>英格兰</h3>
          <p>人口较少 · 岛屿国家 · 商业港口集中</p>
        </section>
        <b>OR</b>
        <section>
          <span>B</span>
          <h3>法国</h3>
          <p>人口众多 · 欧洲强国 · 陆海资源兼备</p>
        </section>
      </div>
      <p className="authored-wager__prompt">先下注；随后沿一件丝织品追踪证据。</p>
      <div className="authored-wager__index">
        {String(position.localIndex).padStart(2, "0")} / {position.localTotal}
      </div>
    </ImageStoryFrame>
  );
}

function CourseOpeningCoverSlide({ spec }: AuthoredSlideProps) {
  const [lessonLine, teacherName, institution] = spec.bullets ?? [];
  return (
    <article
      className="authored-slide authored-slide--course-opening-cover"
      data-slide-composition="course-opening-cover"
      data-slide-key={spec.slideKey}
    >
      {spec.image && (
        <img
          className="authored-course-cover__background"
          src={spec.image}
          alt={spec.imageAlt ?? ""}
          style={{
            objectFit: spec.imageFit ?? "cover",
            objectPosition: spec.imagePosition ?? "center"
          }}
        />
      )}
      <div className="authored-course-cover__wash" />
      <div className="authored-course-cover__grain" aria-hidden="true" />
      <header className="authored-course-cover__brand">
        <span>CHONGQING JIAOTONG UNIVERSITY</span>
        <i aria-hidden="true" />
        <strong>{spec.kicker}</strong>
      </header>
      <div className="authored-course-cover__copy">
        <p>{lessonLine}</p>
        <h1>{spec.title}</h1>
        <blockquote>{spec.lead}</blockquote>
      </div>
      <footer className="authored-course-cover__teacher">
        <span>授课教师</span>
        <strong>{teacherName}</strong>
        <i aria-hidden="true" />
        <p>{institution}</p>
      </footer>
      <div className="authored-course-cover__folio" aria-hidden="true">
        01
      </div>
    </article>
  );
}

function ComparativeModelSlide({ spec, position }: AuthoredSlideProps) {
  const table = spec.table;
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="comparative-model-ledger"
      className="authored-slide--comparative-model"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-model">
        <div className="authored-model__days">
          <span>共同约束</span>
          <strong>各 100 个劳动日</strong>
          <p>时间总量相同，生产速度不同</p>
        </div>
        <div className="authored-model__table" role="table" aria-label={spec.title}>
          <div role="row">
            {table?.headers.map((header) => (
              <span key={header} role="columnheader">{header}</span>
            ))}
          </div>
          {table?.rows.map((row, rowIndex) => (
            <div key={row[0]} role="row" data-region={rowIndex === 0 ? "jiangnan" : "huguang"}>
              {row.map((cell) => (
                <span key={cell} role="cell">{cell}</span>
              ))}
            </div>
          ))}
        </div>
        <div className="authored-model__observation">
          <span>先观察</span>
          <strong>江南型地区在两种产品上都具有绝对优势。</strong>
          <p>下一步不比“谁更强”，而比多生产一匹丝分别要放弃多少粮。</p>
        </div>
      </div>
    </LightFrame>
  );
}

function DirectTradeEvolutionSlide({ spec, position }: AuthoredSlideProps) {
  const years = ["1600", "约1680", "1715后", "持续重复"];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="direct-trade-evolution"
      className="authored-slide--direct-trade"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-direct-trade">
        <div className="authored-direct-trade__route" aria-hidden="true">
          <svg viewBox="0 0 1240 260">
            <path d="M58 207C246 210 319 65 518 95C712 124 770 217 968 157C1082 122 1137 71 1192 50" />
            <circle cx="80" cy="201" r="12" />
            <circle cx="431" cy="89" r="12" />
            <circle cx="807" cy="190" r="12" />
            <circle cx="1175" cy="60" r="12" />
          </svg>
        </div>
        {(spec.steps ?? []).map((step, index) => {
          const [heading, body] = step.split("：");
          return (
            <section key={step}>
              <span>{years[index]}</span>
              <strong>{heading}</strong>
              {body && <p>{body}</p>}
            </section>
          );
        })}
        <div className="authored-direct-trade__answer">
          <span>组织能力的变化</span>
          <strong>偶发采购 → 直接航行 → 重复服务 → 网络记忆</strong>
        </div>
      </div>
    </LightFrame>
  );
}

function CantonManifestSlide({ spec, position }: AuthoredSlideProps) {
  const rows = spec.table?.rows ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="canton-manifest-ledger"
      className="authored-slide--manifest"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-manifest">
        <section className="authored-manifest__hero">
          <span>WOVEN SILKS</span>
          <strong>10,200</strong>
          <p>件织造丝绸</p>
          <small>1727年广州采购档案</small>
        </section>
        <section className="authored-manifest__ledger" aria-label={spec.title}>
          {rows.map((row, index) => (
            <div key={row[0]}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{row[0]}</strong>
              <b>{row[1]}</b>
              <p>{row[2]}</p>
            </div>
          ))}
        </section>
      </div>
      {spec.prompt && (
        <blockquote className="authored-manifest__question">{spec.prompt}</blockquote>
      )}
    </LightFrame>
  );
}

function ValueDensityHoldSlide({ spec, position }: AuthoredSlideProps) {
  const [low, high] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="cargo-value-density"
      className="authored-slide--value-density"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-value-density">
        <section className="authored-value-density__bulk">
          <span>占满船舱</span>
          <div aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => <i key={index} />)}
          </div>
          <h3>{low?.heading}</h3>
          <p>{low?.body}</p>
        </section>
        <div className="authored-value-density__distance">
          <span>可承受的运输距离</span>
          <i />
          <strong>货值 ÷ 重量</strong>
          <i />
        </div>
        <section className="authored-value-density__silk">
          <span>只占一角</span>
          <div aria-hidden="true"><i /></div>
          <h3>{high?.heading}</h3>
          <p>{high?.body}</p>
        </section>
      </div>
      <p className="authored-value-density__answer">
        丝绸能覆盖漫长航期、运费与保险，但价值越集中，风险也越集中。
      </p>
    </LightFrame>
  );
}

function LondonRedistributionSlide({ spec, position }: AuthoredSlideProps) {
  const stageLabels = ["查验", "拍卖", "消费", "再出口"];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="london-market-panorama"
      className="authored-slide--london-market"
    >
      <div className="authored-london-market__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-london-market__flow">
        {(spec.steps ?? []).map((step, index) => (
          <section key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stageLabels[index]}</strong>
            <p>{step.split("：")[1] ?? step}</p>
          </section>
        ))}
      </div>
      {spec.prompt && <blockquote className="authored-london-market__question">{spec.prompt}</blockquote>}
    </ImageStoryFrame>
  );
}

function AdvantageQuestionSlide({ spec, position }: AuthoredSlideProps) {
  const [absolute, comparative] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="advantage-two-questions"
      className="authored-slide--advantage-questions"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-advantage-questions">
        <section>
          <span>看速度</span>
          <strong>{absolute?.heading}</strong>
          <p>{absolute?.body}</p>
          <b>谁做得更多？</b>
        </section>
        <div className="authored-advantage-questions__constraint">
          <span>共同约束</span>
          <strong>100</strong>
          <p>个劳动日</p>
          <i aria-hidden="true" />
          <b>时间不能同时花两次</b>
        </div>
        <section>
          <span>看放弃</span>
          <strong>{comparative?.heading}</strong>
          <p>{comparative?.body}</p>
          <b>谁少牺牲一些？</b>
        </section>
      </div>
      {spec.prompt && <blockquote className="authored-advantage-questions__prompt">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function BaselineOutputSlide({ spec, position }: AuthoredSlideProps) {
  const rows = spec.table?.rows ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="baseline-production-ledger"
      className="authored-slide--baseline-output"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-baseline">
        <div className="authored-baseline__split">
          <strong>50</strong><span>天生产丝</span>
          <i aria-hidden="true">+</i>
          <strong>50</strong><span>天生产粮</span>
        </div>
        <div className="authored-baseline__regions">
          {rows.slice(0, 2).map((row) => (
            <section key={row[0]}>
              <h3>{row[0]}</h3>
              <p><strong>{row[1]}</strong><span>丝</span></p>
              <b>+</b>
              <p><strong>{row[2]}</strong><span>粮</span></p>
            </section>
          ))}
        </div>
        <div className="authored-baseline__total">
          <span>没有分工的基准总量</span>
          <strong>60匹丝</strong>
          <i>+</i>
          <strong>150石粮</strong>
          <small>总劳动日：200</small>
        </div>
      </div>
    </LightFrame>
  );
}

function OpportunityCostEquationSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="opportunity-cost-equations"
      className="authored-slide--opportunity-equations"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-opportunity-equations">
        <section>
          <span>江南型</span>
          <div><strong>1匹丝</strong><i>意味着放弃</i><b>2石粮</b></div>
          <p>丝的机会成本较低</p>
        </section>
        <div className="authored-opportunity-equations__verdict">
          <strong>2</strong>
          <span>＜</span>
          <strong>5</strong>
          <p>比较的是放弃量，不是总产量</p>
        </div>
        <section>
          <span>湖广型</span>
          <div><strong>1匹丝</strong><i>意味着放弃</i><b>5石粮</b></div>
          <p>粮的机会成本较低</p>
        </section>
      </div>
      {spec.prompt && <blockquote className="authored-opportunity-equations__prompt">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function ReallocationGainSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="reallocation-before-after"
      className="authored-slide--reallocation"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-reallocation">
        <section className="authored-reallocation__state authored-reallocation__state--before">
          <span>平均分配</span>
          <strong>60</strong><small>匹丝</small>
          <i>+</i>
          <strong>150</strong><small>石粮</small>
        </section>
        <div className="authored-reallocation__move">
          <span>总劳动日不变</span>
          <strong>重新配置</strong>
          <i aria-hidden="true">→</i>
          <p>江南70日丝＋30日粮<br />湖广100日粮</p>
        </div>
        <section className="authored-reallocation__state authored-reallocation__state--after">
          <span>按机会成本分工</span>
          <strong>70</strong><small>匹丝</small>
          <i>+</i>
          <strong>160</strong><small>石粮</small>
        </section>
        <div className="authored-reallocation__gain">
          <strong>+10匹丝</strong>
          <span>同时</span>
          <strong>+10石粮</strong>
          <p>增长来自时间用途改变，不是生产率突然提高。</p>
        </div>
      </div>
    </LightFrame>
  );
}

function OpportunityCostActivitySlide({ spec, position }: AuthoredSlideProps) {
  const hints = spec.steps ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="opportunity-cost-workspace"
      className="authored-slide--opportunity-activity"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-opportunity-activity">
        <div className="authored-opportunity-activity__target">
          <span>生产任务</span>
          <strong>≥ 70匹丝</strong>
          <p>同时保留尽可能多的粮</p>
        </div>
        <div className="authored-opportunity-activity__workspace">
          <section>
            <span>江南型 · 100日</span>
            <div><i style={{ width: "70%" }} /><b>丝？</b><b>粮？</b></div>
          </section>
          <section>
            <span>湖广型 · 100日</span>
            <div><i style={{ width: "15%" }} /><b>丝？</b><b>粮？</b></div>
          </section>
          <strong>在这里写出你的劳动日分配</strong>
        </div>
        <ol>
          {hints.map((hint, index) => (
            <li key={hint}><span>0{index + 1}</span>{hint}</li>
          ))}
        </ol>
      </div>
    </LightFrame>
  );
}

function RegionalDivisionTimelineSlide({ spec, position }: AuthoredSlideProps) {
  const steps = spec.steps ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="regional-history-two-streams"
      className="authored-slide--regional-history"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-regional-history">
        <div className="authored-regional-history__period">
          <strong>晚明</strong>
          <i />
          <strong>明清之际</strong>
          <i />
          <strong>18世纪</strong>
        </div>
        <section className="authored-regional-history__stream authored-regional-history__stream--china">
          <span>长江区域</span>
          <p>{steps[0]}</p>
          <p>{steps[1]}</p>
          <p>{steps[2]}</p>
        </section>
        <section className="authored-regional-history__stream authored-regional-history__stream--ocean">
          <span>远洋网络</span>
          <p>{steps[3]}</p>
        </section>
        <div className="authored-regional-history__convergence">
          <strong>两条历史进程在18世纪形成可解释的贸易网络</strong>
          <p>时间相互重叠，但不是同一批货物的连续追踪。</p>
        </div>
      </div>
    </LightFrame>
  );
}

function CashCropDecisionSlide({ spec, position }: AuthoredSlideProps) {
  const [grain, mulberry] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="land-use-decision"
      className="authored-slide--land-decision"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-land-decision">
        <section className="authored-land-decision__field authored-land-decision__field--grain">
          <span>同一块土地</span>
          <div aria-hidden="true">{Array.from({ length: 8 }).map((_, index) => <i key={index} />)}</div>
          <h3>{grain?.heading}</h3>
          <p>{grain?.body}</p>
          <strong>粮源安全</strong>
        </section>
        <div className="authored-land-decision__balance">
          <i aria-hidden="true" />
          <strong>相对收益</strong>
          <span>与风险一起比较</span>
        </div>
        <section className="authored-land-decision__field authored-land-decision__field--mulberry">
          <span>同一块土地</span>
          <div aria-hidden="true">{Array.from({ length: 5 }).map((_, index) => <i key={index} />)}</div>
          <h3>{mulberry?.heading}</h3>
          <p>{mulberry?.body}</p>
          <strong>市场收入</strong>
        </section>
        <p className="authored-land-decision__condition">
          专业化越深，越依赖外部粮源、价格信息与可靠水运。
        </p>
      </div>
    </LightFrame>
  );
}

function WaterDistanceSlide({ spec, position }: AuthoredSlideProps) {
  const steps = spec.steps ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="water-expands-market-radius"
      className="authored-slide--water-distance"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-water-distance">
        <div className="authored-water-distance__equation">
          <span>货流发生的门槛</span>
          <strong>分工收益</strong>
          <b>＞</b>
          <strong>运输成本</strong>
        </div>
        <div className="authored-water-distance__route">
          <section>
            <span>湖广</span>
            <strong>粮食</strong>
          </section>
          <i aria-hidden="true" />
          <section>
            <span>江南</span>
            <strong>丝织</strong>
          </section>
          <i aria-hidden="true" />
          <section>
            <span>海港</span>
            <strong>远洋市场</strong>
          </section>
        </div>
        <div className="authored-water-distance__mechanisms">
          {steps.map((step, index) => (
            <p key={step}>
              <span>0{index + 1}</span>
              {step}
            </p>
          ))}
        </div>
      </div>
      {spec.prompt && <blockquote className="authored-water-distance__prompt">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function NavyTradeTensionSlide({ spec, position }: AuthoredSlideProps) {
  const [protection, conflict] = spec.columns ?? [];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="naval-trade-tension"
      className="authored-slide--naval-tension"
    >
      <div className="authored-naval-tension__title">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <section className="authored-naval-tension__side authored-naval-tension__side--protection">
        <span>左侧航线</span>
        <h3>{protection?.heading}</h3>
        <p>{protection?.body}</p>
      </section>
      <section className="authored-naval-tension__side authored-naval-tension__side--conflict">
        <span>远方海面</span>
        <h3>{conflict?.heading}</h3>
        <p>{conflict?.body}</p>
      </section>
      {spec.prompt && <blockquote className="authored-naval-tension__question">{spec.prompt}</blockquote>}
    </ImageStoryFrame>
  );
}

function IndustrialPortLoopSlide({ spec, position }: AuthoredSlideProps) {
  const labels = ["既有网络", "工业化", "蒸汽与造船", "更大货流"];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="industrial-port-feedback"
      className="authored-slide--industrial-loop"
    >
      <div className="authored-industrial-loop__title">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-industrial-loop__cycle">
        {(spec.steps ?? []).map((step, index) => (
          <section key={step}>
            <span>0{index + 1}</span>
            <strong>{labels[index]}</strong>
            <p>{step}</p>
          </section>
        ))}
        <i aria-hidden="true">↻</i>
      </div>
      <p className="authored-industrial-loop__answer">
        不是单向起点，而是生产、运输与市场持续互相放大。
      </p>
    </ImageStoryFrame>
  );
}

function WaterCostMechanismSlide({ spec, position }: AuthoredSlideProps) {
  const columns = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="water-cost-cutaway"
      className="authored-slide--water-cutaway"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-water-cutaway">
        {spec.image && (
          <img
            src={spec.image}
            alt={spec.imageAlt ?? ""}
            style={{
              objectFit: spec.imageFit ?? "cover",
              objectPosition: spec.imagePosition ?? "center"
            }}
          />
        )}
        <div className="authored-water-cutaway__shade" />
        {columns.map((column, index) => (
          <section
            className={`authored-water-cutaway__callout authored-water-cutaway__callout--${index + 1}`}
            key={column.heading}
          >
            <span>0{index + 1}</span>
            <strong>{column.heading}</strong>
            <p>{column.body}</p>
          </section>
        ))}
        <div className="authored-water-cutaway__equation">
          <span>单位距离成本</span>
          <strong>大批量 × 低速 × 高装载率</strong>
        </div>
      </div>
      {spec.prompt && <blockquote className="authored-water-cutaway__prompt">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function HistoricalChannelSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="historical-panorama"
      className="authored-slide--historical-channel"
    >
      <div className="authored-story-copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
        <div className="authored-story-copy__evidence">
          {spec.bullets?.map((bullet, index) => (
            <p key={bullet}>
              <span>{index === 0 ? "不列颠" : "法兰西"}</span>
              {bullet}
            </p>
          ))}
        </div>
      </div>
      <div className="authored-story-copy__chapter">
        <span>HISTORICAL REWIND</span>
        <strong>从现代巨轮倒叙至帆船时代</strong>
      </div>
    </ImageStoryFrame>
  );
}

function ChannelComparisonSlide({ spec, position }: AuthoredSlideProps) {
  const [britain, france] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="channel-comparison"
      className="authored-slide--parchment"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-channel-compare">
        <section className="authored-channel-compare__side authored-channel-compare__side--britain">
          <span>01 · ISLAND PRESSURE</span>
          <h3>{britain?.heading}</h3>
          <p>{britain?.body}</p>
          {britain?.note && <strong>{britain.note}</strong>}
        </section>
        <div className="authored-channel-compare__water">
          <span>北海</span>
          <div>
            <i />
            <strong>英吉利海峡</strong>
            <i />
          </div>
          <span>大西洋</span>
        </div>
        <section className="authored-channel-compare__side authored-channel-compare__side--france">
          <span>02 · CONTINENTAL PRESSURE</span>
          <h3>{france?.heading}</h3>
          <p>{france?.body}</p>
          {france?.note && <strong>{france.note}</strong>}
        </section>
      </div>
      <p className="authored-channel-compare__question">
        共同拥有海岸、舰队与贸易，资源为何走向不同的配置路径？
      </p>
    </LightFrame>
  );
}

function WaterCostSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="evidence-led-data"
      className="authored-slide--water-cost"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-water-evidence">
        <section className="authored-water-evidence__share">
          <div className="authored-water-evidence__numbers">
            <div>
              <strong>17.25%</strong>
              <span>水运货运量占比</span>
              <i style={{ width: "31%" }} />
            </div>
            <b>却完成</b>
            <div>
              <strong>55.65%</strong>
              <span>货物周转量占比</span>
              <i style={{ width: "100%" }} />
            </div>
          </div>
          <p>{spec.stat?.detail}</p>
        </section>
        <section className="authored-water-evidence__ratio">
          <div>
            <span>重庆—上海集装箱单位运价区域测算</span>
            <strong>水路 : 铁路 : 公路</strong>
          </div>
          <ol aria-label="水铁公单位运价相对值">
            <li>
              <span>水路</span>
              <strong>1</strong>
              <i style={{ width: "16.67%" }} />
            </li>
            <li>
              <span>铁路</span>
              <strong>2</strong>
              <i style={{ width: "33.33%" }} />
            </li>
            <li>
              <span>公路</span>
              <strong>6</strong>
              <i style={{ width: "100%" }} />
            </li>
          </ol>
          <p>{spec.bullets?.[1]}</p>
        </section>
      </div>
      <div className="authored-water-evidence__takeaway">
        <span>观察</span>
        <strong>{spec.bullets?.[2]}</strong>
      </div>
    </LightFrame>
  );
}

function PortInterfaceSlide({ spec, position }: AuthoredSlideProps) {
  const bullets = spec.bullets ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="port-interface-flow"
      className="authored-slide--interface"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-interface">
        <svg
          viewBox="0 0 1320 390"
          role="img"
          aria-label="腹地、港口与海上航线连续接口示意"
        >
          <defs>
            <linearGradient id="interfaceSea" x1="0" x2="1">
              <stop offset="0" stopColor="#d7eee9" />
              <stop offset="1" stopColor="#0f7183" />
            </linearGradient>
            <marker
              id="interfaceArrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
            >
              <path d="M0 0L8 4L0 8Z" fill="#f0a247" />
            </marker>
          </defs>
          <path
            d="M52 252C170 235 264 202 350 202C474 202 532 248 645 243C770 238 837 174 946 177C1087 180 1188 226 1280 221"
            fill="none"
            stroke="url(#interfaceSea)"
            strokeLinecap="round"
            strokeWidth="54"
          />
          <path
            d="M76 236C227 208 288 176 390 183C510 191 567 229 671 221C778 213 847 153 957 158C1084 163 1170 205 1255 205"
            fill="none"
            markerEnd="url(#interfaceArrow)"
            stroke="#f0a247"
            strokeDasharray="10 16"
            strokeLinecap="round"
            strokeWidth="7"
          />
          <g className="authored-interface__node" transform="translate(60 150)">
            <circle cx="0" cy="70" r="48" />
            <text x="0" y="0">腹地</text>
            <text x="0" y="75">{bullets[0]}</text>
          </g>
          <g className="authored-interface__node" transform="translate(385 102)">
            <circle cx="0" cy="70" r="48" />
            <text x="0" y="0">闸口 · 监管</text>
            <text x="0" y="75">{bullets[2]}</text>
          </g>
          <g className="authored-interface__node" transform="translate(690 135)">
            <circle cx="0" cy="70" r="48" />
            <text x="0" y="0">堆场 · 泊位</text>
            <text x="0" y="75">{bullets[1]}</text>
          </g>
          <g className="authored-interface__node" transform="translate(1010 83)">
            <circle cx="0" cy="70" r="48" />
            <text x="0" y="0">船舶 · 航线</text>
            <text x="0" y="75">进入海上规模网络</text>
          </g>
        </svg>
        <div className="authored-interface__rails">
          <span>
            <b>实体连接</b>
            {bullets[3]}
          </span>
          <span>
            <b>信息连接</b>
            {bullets[4]}
          </span>
        </div>
      </div>
    </LightFrame>
  );
}

function PortRotationSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="liner-service-loop"
      className="authored-slide--port-rotation"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-port-rotation">
        <svg viewBox="0 0 1260 470" role="img" aria-label="84天班轮循环与五组挂港">
          <defs>
            <marker
              id="portRotationArrow"
              markerHeight="9"
              markerWidth="9"
              orient="auto"
              refX="8"
              refY="4.5"
            >
              <path d="M0 0L9 4.5L0 9Z" />
            </marker>
          </defs>
          <path
            className="authored-port-rotation__loop"
            d="M214 238C214 95 393 39 630 39C867 39 1046 95 1046 238C1046 381 867 437 630 437C393 437 214 381 214 238Z"
            markerEnd="url(#portRotationArrow)"
          />
          <path
            className="authored-port-rotation__return"
            d="M990 335C1121 327 1178 270 1175 199"
            markerEnd="url(#portRotationArrow)"
          />
        </svg>
        <div className="authored-port-rotation__clock">
          <span>一个完整服务循环</span>
          <strong>84</strong>
          <b>天</b>
          <p>去程、欧洲挂港与返程共享同一套船期</p>
        </div>
        {(spec.steps ?? []).map((step, index) => (
          <section
            className={`authored-port-rotation__stop authored-port-rotation__stop--${index + 1}`}
            key={step}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </section>
        ))}
      </div>
      <p className="authored-port-rotation__answer">
        班轮经营的对象不是一张单程船票，而是一条可以周而复始兑现的服务回路。
      </p>
    </LightFrame>
  );
}

function CargoConsolidationSlide({ spec, position }: AuthoredSlideProps) {
  const steps = spec.steps ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="cargo-consolidation-funnel"
      className="authored-slide--cargo-consolidation"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-cargo-consolidation">
        <div className="authored-cargo-consolidation__sources">
          {steps.slice(0, 3).map((step, index) => (
            <section key={step}>
              <span>货源 0{index + 1}</span>
              <strong>{step}</strong>
              <i aria-hidden="true" />
            </section>
          ))}
        </div>
        <div className="authored-cargo-consolidation__flow" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <section className="authored-cargo-consolidation__mainline">
          <span>MAINLINE SCALE</span>
          <div aria-hidden="true">
            {Array.from({ length: 24 }).map((_, index) => <i key={index} />)}
          </div>
          <strong>{steps[3]}</strong>
          <p>分散货源经过持续集聚，才足以支撑远洋段的大船与固定班期。</p>
        </section>
      </div>
      <p className="authored-cargo-consolidation__answer">
        多挂港不是简单绕路，而是把分散市场组织成可供大船承运的货流规模。
      </p>
    </LightFrame>
  );
}

function FeederMainlineSlide({ spec, position }: AuthoredSlideProps) {
  const [feeder, mainline, connection] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="feeder-mainline-network"
      className="authored-slide--feeder-mainline"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-feeder-mainline">
        <svg viewBox="0 0 1260 410" role="img" aria-label="支线在枢纽汇入远洋干线">
          <path className="authored-feeder-mainline__feeder" d="M58 70C214 70 252 135 391 203" />
          <path className="authored-feeder-mainline__feeder" d="M58 203H391" />
          <path className="authored-feeder-mainline__feeder" d="M58 336C214 336 252 271 391 203" />
          <path className="authored-feeder-mainline__mainline" d="M508 203H1210" />
          {[74, 203, 332].map((y) => <circle key={y} cx="58" cy={y} r="18" />)}
          <circle className="authored-feeder-mainline__hub" cx="448" cy="203" r="58" />
          {[700, 900, 1110].map((x) => <circle key={x} cx={x} cy="203" r="15" />)}
        </svg>
        <section className="authored-feeder-mainline__copy authored-feeder-mainline__copy--feeder">
          <span>区域覆盖</span>
          <strong>{feeder?.heading}</strong>
          <p>{feeder?.body}</p>
        </section>
        <section className="authored-feeder-mainline__copy authored-feeder-mainline__copy--hub">
          <span>衔接窗口</span>
          <strong>{connection?.heading}</strong>
          <p>{connection?.body}</p>
        </section>
        <section className="authored-feeder-mainline__copy authored-feeder-mainline__copy--mainline">
          <span>规模航段</span>
          <strong>{mainline?.heading}</strong>
          <p>{mainline?.body}</p>
        </section>
      </div>
      <p className="authored-feeder-mainline__answer">
        一只箱子的关键风险，常常不在航程中，而在两张时刻表交接的那一刻。
      </p>
    </LightFrame>
  );
}

function HubGatewaySlide({ spec, position }: AuthoredSlideProps) {
  const [hub, gateway] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="hub-gateway-two-sided-network"
      className="authored-slide--hub-gateway"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-hub-gateway">
        <section className="authored-hub-gateway__sea">
          <span>SEA-SIDE NETWORK</span>
          <div aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => <i key={index} />)}
          </div>
          <h3>{hub?.heading}</h3>
          <p>{hub?.body}</p>
          <b>{hub?.note}</b>
        </section>
        <div className="authored-hub-gateway__port">
          <span>PORT</span>
          <strong>同一个港口</strong>
          <i aria-hidden="true" />
          <p>价值来自它把哪一侧的连接组织得更强</p>
        </div>
        <section className="authored-hub-gateway__land">
          <span>LAND-SIDE NETWORK</span>
          <div aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => <i key={index} />)}
          </div>
          <h3>{gateway?.heading}</h3>
          <p>{gateway?.body}</p>
          <b>{gateway?.note}</b>
        </section>
      </div>
      {spec.prompt && <p className="authored-hub-gateway__question">{spec.prompt}</p>}
    </LightFrame>
  );
}

function TransshipmentPanoramaSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="transshipment-panorama"
      className="authored-slide--transshipment-panorama"
    >
      <div className="authored-transshipment__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-transshipment__flow">
        {(spec.steps ?? []).map((step, index) => (
          <section key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </section>
        ))}
      </div>
      <p className="authored-transshipment__answer">
        箱子没有进入本地市场，却在港内完成了航线、舱位与时刻表的重新匹配。
      </p>
    </ImageStoryFrame>
  );
}

function IndianOceanNextGateSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="ocean-navigation-chart"
      className="authored-slide--indian-ocean"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-indian-ocean">
        <svg viewBox="0 0 1260 400" role="img" aria-label="从马六甲穿越印度洋驶向苏伊士">
          <path className="authored-indian-ocean__coast" d="M40 45C156 89 213 147 241 247C264 331 315 376 402 388" />
          <path className="authored-indian-ocean__coast" d="M1031 5C971 93 964 184 1027 254C1086 321 1160 357 1247 381" />
          <path className="authored-indian-ocean__route" d="M225 293C423 315 601 271 765 185C873 128 944 92 1037 73" />
          <circle cx="225" cy="293" r="16" />
          <circle className="authored-indian-ocean__vessel" cx="625" cy="252" r="20" />
          <circle cx="1037" cy="73" r="16" />
        </svg>
        <div className="authored-indian-ocean__label authored-indian-ocean__label--past">
          <span>刚刚通过</span>
          <strong>马六甲</strong>
        </div>
        <div className="authored-indian-ocean__label authored-indian-ocean__label--now">
          <span>当前位置</span>
          <strong>印度洋</strong>
        </div>
        <div className="authored-indian-ocean__label authored-indian-ocean__label--next">
          <span>下一道门</span>
          <strong>苏伊士</strong>
        </div>
        <div className="authored-indian-ocean__conditions">
          {(spec.bullets ?? []).map((bullet, index) => (
            <span key={bullet}><i>0{index + 1}</i>{bullet}</span>
          ))}
        </div>
      </div>
      <p className="authored-indian-ocean__answer">
        航次是一条连续承诺：前一段的偏差，会改变后一段可用的窗口。
      </p>
    </LightFrame>
  );
}

function CanalServicePanoramaSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="canal-service-panorama"
      className="authored-slide--canal-service"
    >
      <div className="authored-canal-service__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-canal-service__stages">
        {(spec.steps ?? []).map((step, index) => (
          <section key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </section>
        ))}
      </div>
      <p className="authored-canal-service__answer">
        运河不是一条“水上的线”，而是一套容量有限、按规则兑现的连续服务。
      </p>
    </ImageStoryFrame>
  );
}

function CanalControlSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="canal-control-radar"
      className="authored-slide--canal-control"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-canal-control">
        <div className="authored-canal-control__rings" aria-hidden="true">
          <i />
          <i />
          <i />
          <strong>安全<br />通行</strong>
        </div>
        {(spec.columns ?? []).map((column, index) => (
          <section className={`authored-canal-control__item authored-canal-control__item--${index + 1}`} key={column.heading}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{column.heading}</h3>
            <p>{column.body}</p>
          </section>
        ))}
      </div>
      {spec.narrative.openQuestion && (
        <p className="authored-canal-control__question">{spec.narrative.openQuestion}</p>
      )}
    </LightFrame>
  );
}

function WaitUncertaintySlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="wait-uncertainty-cone"
      className="authored-slide--wait-option"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-wait-option">
        <svg viewBox="0 0 1260 290" role="img" aria-label="等待时间越长，恢复窗口的不确定范围越大">
          <defs>
            <linearGradient id="waitCone" x1="0" x2="1">
              <stop offset="0" stopColor="#d79237" stopOpacity=".16" />
              <stop offset="1" stopColor="#de6b58" stopOpacity=".6" />
            </linearGradient>
          </defs>
          <path d="M135 145L1150 32V258Z" fill="url(#waitCone)" />
          <path className="authored-wait-option__axis" d="M89 145H1194" />
          {[135, 443, 750, 1058].map((x) => <circle key={x} cx={x} cy="145" r="12" />)}
        </svg>
        <span className="authored-wait-option__now">现在</span>
        <span className="authored-wait-option__window">恢复窗口？</span>
        <strong className="authored-wait-option__unknown">等待不是静止：不确定性仍在扩张</strong>
        <div className="authored-wait-option__evidence">
          {(spec.columns ?? []).map((column, index) => (
            <section key={column.heading}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
    </LightFrame>
  );
}

function NetworkRewireSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="network-rewire"
      className="authored-slide--network-rewire"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-network-rewire">
        <svg viewBox="0 0 1260 390" role="img" aria-label="通过替代节点与航线重新组织中断网络">
          <path className="authored-network-rewire__normal" d="M88 195H390L589 92L807 195H1170" />
          <path className="authored-network-rewire__blocked" d="M390 195L589 298L807 195" />
          <path className="authored-network-rewire__urgent" d="M88 195C329 195 387 304 589 298C777 292 920 195 1170 195" />
          {[88, 390, 589, 807, 1170].map((x, index) => (
            <circle key={`${x}-${index}`} cx={x} cy={index === 2 ? 92 : 195} r="18" />
          ))}
          <circle className="authored-network-rewire__alternate" cx="589" cy="298" r="24" />
          <path className="authored-network-rewire__cross" d="M568 72L610 114M610 72L568 114" />
        </svg>
        <span className="authored-network-rewire__label authored-network-rewire__label--blocked">原节点受限</span>
        <span className="authored-network-rewire__label authored-network-rewire__label--alternate">替代节点</span>
        <span className="authored-network-rewire__label authored-network-rewire__label--urgent">紧急箱优先改接</span>
        <div className="authored-network-rewire__notes">
          {(spec.columns ?? []).map((column, index) => (
            <section key={column.heading}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
      <p className="authored-network-rewire__answer">
        韧性不是“还有一条路”，而是能否同时重排舱位、单证、责任与信息。
      </p>
    </LightFrame>
  );
}

function GuoyuanRoleSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="trimodal-inland-port"
      className="authored-slide--guoyuan-role"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-guoyuan-role">
        <div className="authored-guoyuan-role__inputs">
          <span>制造企业</span>
          <span>区域货源</span>
          <span>空箱与单证</span>
        </div>
        <div className="authored-guoyuan-role__port">
          <span>CHONGQING</span>
          <strong>果园港</strong>
          <p>把分散货流组织成可衔接的箱、车、船与时刻</p>
        </div>
        <div className="authored-guoyuan-role__modes">
          <span>长江水运</span>
          <span>铁路班列</span>
          <span>公路集疏运</span>
        </div>
        <div className="authored-guoyuan-role__output">
          <span>上海港</span>
          <strong>国际班轮网络</strong>
        </div>
        <div className="authored-guoyuan-role__roles">
          {(spec.columns ?? []).map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <strong>{column.heading}</strong>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
    </LightFrame>
  );
}

function YangtzeCorridorSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="yangtze-corridor-map"
      className="authored-slide--yangtze-corridor"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-yangtze-corridor">
        <svg viewBox="0 0 1260 410" role="img" aria-label="长江航道、港口节点与产业腹地关系">
          <path className="authored-yangtze-corridor__river" d="M34 234C174 131 276 300 414 212C560 119 633 285 777 201C918 119 1019 242 1226 155" />
          <path className="authored-yangtze-corridor__tributary" d="M284 240C263 160 232 104 178 61M724 220C735 151 775 98 840 62" />
          {[106, 373, 661, 944, 1188].map((x, index) => (
            <circle key={`${x}-${index}`} cx={x} cy={[198, 231, 229, 178, 168][index]} r="15" />
          ))}
        </svg>
        <span className="authored-yangtze-corridor__city authored-yangtze-corridor__city--1">重庆</span>
        <span className="authored-yangtze-corridor__city authored-yangtze-corridor__city--2">三峡</span>
        <span className="authored-yangtze-corridor__city authored-yangtze-corridor__city--3">武汉</span>
        <span className="authored-yangtze-corridor__city authored-yangtze-corridor__city--4">南京</span>
        <span className="authored-yangtze-corridor__city authored-yangtze-corridor__city--5">上海</span>
        <div className="authored-yangtze-corridor__layers">
          {(spec.bullets ?? []).map((bullet, index) => (
            <section key={bullet}>
              <span>0{index + 1}</span>
              <strong>{bullet}</strong>
            </section>
          ))}
        </div>
      </div>
      <p className="authored-yangtze-corridor__answer">
        水道提供连续性，节点决定货流怎样进入、换装并按时离开。
      </p>
    </LightFrame>
  );
}

function ThreeGorgesSlide({ spec, position }: AuthoredSlideProps) {
  const [changed, constrained] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="three-gorges-bottleneck"
      className="authored-slide--three-gorges"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-three-gorges">
        <section className="authored-three-gorges__changed">
          <span>通航条件</span>
          <strong>{changed?.heading}</strong>
          <p>{changed?.body}</p>
        </section>
        <div className="authored-three-gorges__dam" aria-label="三峡船闸与上下游水位示意">
          <i className="authored-three-gorges__water authored-three-gorges__water--high" />
          <i className="authored-three-gorges__water authored-three-gorges__water--low" />
          <b />
          <span>船闸</span>
          <strong>改善可达性</strong>
          <em>但能力仍有限</em>
        </div>
        <section className="authored-three-gorges__constraint">
          <span>网络瓶颈</span>
          <strong>{constrained?.heading}</strong>
          <p>{constrained?.body}</p>
        </section>
      </div>
      {spec.prompt && <p className="authored-three-gorges__question">{spec.prompt}</p>}
    </LightFrame>
  );
}

function InlandHiddenCostsSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="inland-schedule-clock"
      className="authored-slide--inland-costs"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-inland-costs">
        <div className="authored-inland-costs__clock" aria-label="远洋截关时间倒计时">
          <i />
          <i />
          <span>远洋截关</span>
          <strong>T − 0</strong>
          <b>错过一次，等待下一班</b>
        </div>
        {(spec.columns ?? []).map((column, index) => (
          <section className={`authored-inland-costs__item authored-inland-costs__item--${index + 1}`} key={column.heading}>
            <span>0{index + 1}</span>
            <h3>{column.heading}</h3>
            <p>{column.body}</p>
          </section>
        ))}
      </div>
      <p className="authored-inland-costs__answer">
        单段运价最低，不代表整条链成本最低；是否赶上窗口，决定下一次等待有多长。
      </p>
    </LightFrame>
  );
}

function RouteCluesSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="route-clue-map"
      className="authored-slide--route-clues"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-route-clues">
        <svg
          viewBox="0 0 1320 440"
          role="img"
          aria-label="LL3航线四类网络线索示意"
        >
          <path
            className="authored-route-clues__land"
            d="M40 62C172 4 319 28 365 113c25 46-4 97-50 136-34 29-39 81-5 121-110 20-224-26-273-115C5 196 9 112 40 62ZM714 42c149-45 318-6 421 91 69 65 112 146 157 188-78 60-181 83-272 52-69-24-125-74-163-130-45-66-99-116-177-140 2-27 11-46 34-61Z"
          />
          <path
            className="authored-route-clues__line"
            d="M176 293C310 348 390 337 505 294C611 255 672 216 766 204C866 191 932 147 1044 121C1113 105 1168 92 1235 74"
          />
          <circle cx="176" cy="293" r="12" />
          <circle cx="505" cy="294" r="12" />
          <circle cx="766" cy="204" r="12" />
          <circle cx="1044" cy="121" r="12" />
        </svg>
        {spec.columns?.map((column, index) => (
          <section
            className={`authored-route-clues__item authored-route-clues__item--${index + 1}`}
            key={column.heading}
          >
            <span>0{index + 1}</span>
            <h3>{column.heading}</h3>
            <p>{column.body}</p>
          </section>
        ))}
      </div>
    </LightFrame>
  );
}

function ChokepointSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="chokepoint-funnel"
      className="authored-slide--chokepoint"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-chokepoint">
        <svg
          viewBox="0 0 1320 305"
          role="img"
          aria-label="航线在狭窄通道收敛并向后传播延误"
        >
          <defs>
            <marker
              id="chokeArrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
            >
              <path d="M0 0L8 4L0 8Z" fill="#de6b58" />
            </marker>
          </defs>
          <path
            d="M22 41C227 74 366 110 530 134L717 134C884 106 1022 71 1298 37"
            fill="none"
            stroke="#dce8e9"
            strokeLinecap="round"
            strokeWidth="70"
          />
          <path
            d="M22 264C227 231 366 195 530 171L717 171C884 199 1022 234 1298 268"
            fill="none"
            stroke="#dce8e9"
            strokeLinecap="round"
            strokeWidth="70"
          />
          {[35, 94, 153, 212].map((y) => (
            <path
              d={`M72 ${y}C260 ${y + 4} 391 ${146 + (y - 123) * 0.13} 548 151H1260`}
              fill="none"
              key={y}
              markerEnd="url(#chokeArrow)"
              stroke="#de6b58"
              strokeLinecap="round"
              strokeWidth="6"
            />
          ))}
          <rect fill="#173e55" height="112" rx="14" width="116" x="566" y="96" />
          <text className="authored-chokepoint__label" x="624" y="141">
            有限
          </text>
          <text className="authored-chokepoint__label" x="624" y="176">
            通道
          </text>
        </svg>
        <ol>
          {spec.bullets?.map((bullet, index) => (
            <li key={bullet}>
              <span>0{index + 1}</span>
              <p>{bullet}</p>
            </li>
          ))}
        </ol>
      </div>
      <p className="authored-chokepoint__answer">
        风险发生在狭窄通道，后果沿整条班轮网络传播。
      </p>
    </LightFrame>
  );
}

function DisruptionBriefSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="disruption-brief"
      className="authored-slide--disruption"
    >
      <div className="authored-disruption__warning">
        <span>TEACHING SCENARIO</span>
        <strong>前方通行受限</strong>
      </div>
      <div className="authored-disruption__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
        <ol>
          {spec.bullets?.map((bullet, index) => (
            <li key={bullet}>
              <span>0{index + 1}</span>
              <p>{bullet}</p>
            </li>
          ))}
        </ol>
      </div>
    </ImageStoryFrame>
  );
}

function DecisionMatrixSlide({ spec, position }: AuthoredSlideProps) {
  const table = spec.table;
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="decision-matrix"
      className="authored-slide--decision-matrix"
    >
      <EditorialHeader spec={spec} compact />
      {spec.prompt && (
        <div className="authored-decision-matrix__prompt">
          <span>决策原则</span>
          <strong>{spec.prompt}</strong>
        </div>
      )}
      {table && (
        <div
          className="authored-decision-matrix__grid"
          role="table"
          aria-label={spec.title}
        >
          <div className="authored-decision-matrix__row authored-decision-matrix__row--header" role="row">
            {table.headers.map((header) => (
              <span key={header} role="columnheader">
                {header}
              </span>
            ))}
          </div>
          {table.rows.map((row, rowIndex) => (
            <div
              className={`authored-decision-matrix__row authored-decision-matrix__row--${rowIndex + 1}`}
              key={row[0]}
              role="row"
            >
              {row.map((cell, cellIndex) => (
                <span key={`${cell}-${cellIndex}`} role="cell">
                  {cellIndex === 0 && <i>0{rowIndex + 1}</i>}
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="authored-decision-matrix__tradeoff">
        <span>任何选择都必须说明：</span>
        <strong>优化了什么，又放弃了什么？</strong>
      </div>
    </LightFrame>
  );
}

function FourPortTasksSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="four-port-voyage-roles"
      className="authored-slide--four-port-tasks"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-four-port-tasks">
        <svg viewBox="0 0 1260 410" role="img" aria-label="同一航次中的上海、新加坡、比雷埃夫斯和鹿特丹">
          <path d="M75 287C270 316 359 266 468 212C593 149 667 217 779 168C889 121 1022 105 1185 116" />
          {[116, 440, 783, 1138].map((x, index) => (
            <circle key={x} cx={x} cy={[290, 226, 167, 117][index]} r="18" />
          ))}
        </svg>
        {(spec.columns ?? []).map((column, index) => (
          <section className={`authored-four-port-tasks__port authored-four-port-tasks__port--${index + 1}`} key={column.heading}>
            <span>0{index + 1}</span>
            <h3>{column.heading}</h3>
            <p>{column.body}</p>
          </section>
        ))}
        <div className="authored-four-port-tasks__vessel">
          <span>同一艘船</span>
          <strong>任务随节点改变</strong>
        </div>
      </div>
      <p className="authored-four-port-tasks__answer">
        港口价值不能只看“装卸多少”，还要看它在网络中替谁完成哪一种任务。
      </p>
    </LightFrame>
  );
}

function FirstGenerationSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="first-generation-quay"
      className="authored-slide--generation-one"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-generation-one">
        <div className="authored-generation-one__sea">
          <span>海</span>
          <i aria-hidden="true" />
        </div>
        <div className="authored-generation-one__quay">
          <span>船岸接口</span>
          <strong>过岸</strong>
          <i aria-hidden="true" />
        </div>
        <div className="authored-generation-one__store">
          <span>港界</span>
          <strong>短存与交付</strong>
          <div aria-hidden="true">
            {Array.from({ length: 12 }).map((_, index) => <i key={index} />)}
          </div>
        </div>
        <ol>
          {(spec.bullets ?? []).map((bullet, index) => (
            <li key={bullet}><span>0{index + 1}</span><strong>{bullet}</strong></li>
          ))}
        </ol>
      </div>
      <p className="authored-generation-one__answer">
        第一代能力看似基础，却是所有港口价值的物理起点。
      </p>
    </LightFrame>
  );
}

function SecondGenerationSlide({ spec, position }: AuthoredSlideProps) {
  const [kept, added, risk] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="second-generation-industrial-layer"
      className="authored-slide--generation-two"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-generation-two">
        <div className="authored-generation-two__base">
          <span>第一层仍在</span>
          <strong>{kept?.heading}</strong>
          <p>{kept?.body}</p>
        </div>
        <div className="authored-generation-two__plant" aria-hidden="true">
          <i />
          <i />
          <i />
          <b />
        </div>
        <div className="authored-generation-two__added">
          <span>港边新增生产</span>
          <strong>{added?.heading}</strong>
          <p>{added?.body}</p>
        </div>
        <div className="authored-generation-two__risk">
          <span>能力扩张的代价</span>
          <strong>{risk?.heading}</strong>
          <p>{risk?.body}</p>
        </div>
        <div className="authored-generation-two__equation">
          海陆转换 <b>+</b> 临港生产 <b>=</b> 更深的产业耦合
        </div>
      </div>
    </LightFrame>
  );
}

function ThirdGenerationSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="third-generation-supply-chain"
      className="authored-slide--generation-three"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-generation-three">
        <svg viewBox="0 0 1260 400" role="img" aria-label="订单、仓储、多式联运、状态与总成本形成的物流组织链">
          <path d="M82 211C225 92 355 96 491 207C620 312 749 314 880 205C1009 96 1102 103 1182 201" />
          <path d="M82 211C225 330 355 326 491 207C620 96 749 96 880 205C1009 314 1102 305 1182 201" />
          {[82, 354, 628, 902, 1182].map((x, index) => (
            <circle key={x} cx={x} cy={[211, 112, 301, 112, 201][index]} r="23" />
          ))}
        </svg>
        {(spec.steps ?? []).map((step, index) => (
          <section className={`authored-generation-three__step authored-generation-three__step--${index + 1}`} key={step}>
            <span>0{index + 1}</span>
            <strong>{step}</strong>
          </section>
        ))}
        <div className="authored-generation-three__center">
          <span>港口的新角色</span>
          <strong>组织流程</strong>
          <p>不只管理港界内的货物</p>
        </div>
      </div>
      <p className="authored-generation-three__answer">
        第三代的关键不是“多一座仓库”，而是把多主体的交接变成一条可管理的服务链。
      </p>
    </LightFrame>
  );
}

function FourthGenerationSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="fourth-generation-governance"
      className="authored-slide--generation-four"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-generation-four">
        <div className="authored-generation-four__actors" aria-hidden="true">
          {["港口", "航运", "铁路", "公路", "海关", "城市", "产业"].map((actor, index) => (
            <span className={`authored-generation-four__actor authored-generation-four__actor--${index + 1}`} key={actor}>{actor}</span>
          ))}
        </div>
        <div className="authored-generation-four__core">
          <span>共享基础</span>
          <strong>规则 · 数据 · 信任</strong>
          <p>没有单一主体能够独自命令整个网络</p>
        </div>
        <div className="authored-generation-four__principles">
          {(spec.columns ?? []).map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
      <p className="authored-generation-four__answer">
        自动化可以提升单点效率；第四代能力要回答的是，多主体怎样共同作出更好的决定。
      </p>
    </LightFrame>
  );
}

function ShanghaiGatewaySlide({ spec, position }: AuthoredSlideProps) {
  const columns = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="shanghai-gateway-cross-section"
      className="authored-slide--shanghai-gateway"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-shanghai-gateway">
        <div className="authored-shanghai-gateway__sea">
          <span>远洋干线</span>
          <i /><i /><i />
          <b>海向</b>
        </div>
        <div className="authored-shanghai-gateway__port">
          <span>GATEWAY PORT</span>
          <strong>CNSHA</strong>
          <p>门户与规模接口</p>
        </div>
        <div className="authored-shanghai-gateway__land">
          <span>制造腹地</span>
          <i /><i /><i /><i />
          <b>陆向</b>
        </div>
        <div className="authored-shanghai-gateway__evidence">
          {columns.map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
      <p className="authored-shanghai-gateway__answer">
        规模不是码头自己的属性；它依赖腹地持续供货，也依赖远洋网络持续接货。
      </p>
    </LightFrame>
  );
}

function SingaporeHubSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="singapore-hub-wheel"
      className="authored-slide--singapore-hub"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-singapore-hub">
        <svg viewBox="0 0 700 510" role="img" aria-label="多条航线围绕新加坡枢纽连接">
          {([[-210,-140],[-235,0],[-190,155],[0,-220],[200,-145],[236,8],[185,165],[0,224]] as const).map(([x,y], index) => (
            <line key={index} x1="350" y1="255" x2={350 + x} y2={255 + y} />
          ))}
          {([[140,115],[115,255],[160,410],[350,35],[550,110],[586,263],[535,420],[350,479]] as const).map(([x,y], index) => (
            <circle key={index} cx={x} cy={y} r="16" />
          ))}
          <circle className="authored-singapore-hub__core" cx="350" cy="255" r="84" />
        </svg>
        <div className="authored-singapore-hub__label">
          <span>GLOBAL HUB</span>
          <strong>SGSIN</strong>
          <p>把航线之间的连接组织成可靠服务</p>
        </div>
        <div className="authored-singapore-hub__evidence">
          {(spec.columns ?? []).map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
      <p className="authored-singapore-hub__answer">
        枢纽价值来自“可接续性”：一只箱子有多少可靠的下一程可以选择。
      </p>
    </LightFrame>
  );
}

function RotterdamIndustrySlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="rotterdam-industrial-estuary"
      className="authored-slide--rotterdam-industry"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-rotterdam-industry">
        <div className="authored-rotterdam-industry__water">
          <span>北海航运</span>
          <i />
        </div>
        <div className="authored-rotterdam-industry__port">
          <span>NLRTM</span>
          <strong>海港—工业—内陆</strong>
          <div aria-hidden="true"><i /><i /><i /><i /></div>
        </div>
        <div className="authored-rotterdam-industry__rail">
          <i /><i /><i /><i /><i /><i />
          <span>欧洲内陆网络</span>
        </div>
        <div className="authored-rotterdam-industry__evidence">
          {(spec.columns ?? []).map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
      <p className="authored-rotterdam-industry__answer">
        一次装卸只是入口；产业需求、物流组织与治理约束共同决定港口的长期价值。
      </p>
    </LightFrame>
  );
}

function MultipleRolesSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="port-role-compass"
      className="authored-slide--multiple-roles"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-multiple-roles">
        <div className="authored-multiple-roles__core">
          <span>PORT</span>
          <strong>同一港口</strong>
          <p>角色可以叠加，但必须用连接与任务证明</p>
        </div>
        {(spec.columns ?? []).map((column, index) => (
          <section className={`authored-multiple-roles__role authored-multiple-roles__role--${index + 1}`} key={column.heading}>
            <span>0{index + 1}</span>
            <h3>{column.heading}</h3>
            <p>{column.body}</p>
          </section>
        ))}
        <svg viewBox="0 0 1260 470" aria-hidden="true">
          <circle cx="630" cy="235" r="145" />
          <path d="M630 90V20M775 235H1225M630 380V450M485 235H35" />
        </svg>
      </div>
    </LightFrame>
  );
}

function PortMatchActivitySlide({ spec, position }: AuthoredSlideProps) {
  const ports = ["上海", "新加坡", "比雷埃夫斯", "鹿特丹"];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="port-role-match-board"
      className="authored-slide--port-match"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-port-match">
        <div className="authored-port-match__ports">
          {ports.map((port, index) => (
            <section key={port}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{port}</strong>
              <i aria-hidden="true" />
            </section>
          ))}
        </div>
        <div className="authored-port-match__brief">
          <span>MISSION BRIEF</span>
          <strong>{spec.prompt}</strong>
          <p>先写任务条件，再选港口；没有条件的“最好”没有意义。</p>
        </div>
        <ol className="authored-port-match__method">
          {(spec.steps ?? []).map((step, index) => (
            <li key={step}><span>0{index + 1}</span><strong>{step}</strong></li>
          ))}
        </ol>
      </div>
    </LightFrame>
  );
}

function PortTypesTransectSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="coast-river-inland-transect"
      className="authored-slide--port-types"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-port-types">
        <svg viewBox="0 0 1260 430" role="img" aria-label="海岸、河口、内河三类港口空间剖面">
          <path className="authored-port-types__water" d="M5 293C149 261 275 268 397 288C529 310 646 320 774 283C904 245 1046 189 1255 198" />
          <path className="authored-port-types__land" d="M5 293C149 261 275 268 397 288C529 310 646 320 774 283C904 245 1046 189 1255 198V430H5Z" />
          {[215, 622, 1034].map((x, index) => <circle key={x} cx={x} cy={[276,308,207][index]} r="23" />)}
        </svg>
        <span className="authored-port-types__zone authored-port-types__zone--sea">海</span>
        <span className="authored-port-types__zone authored-port-types__zone--estuary">河口</span>
        <span className="authored-port-types__zone authored-port-types__zone--river">内河</span>
        {(spec.columns ?? []).map((column, index) => (
          <section className={`authored-port-types__type authored-port-types__type--${index + 1}`} key={column.heading}>
            <span>0{index + 1}</span>
            <h3>{column.heading}</h3>
            <p>{column.body}</p>
          </section>
        ))}
      </div>
      <p className="authored-port-types__answer">
        空间位置回答“港在哪里”，枢纽角色还要回答“它连接了什么”。
      </p>
    </LightFrame>
  );
}

function GatewayTransshipmentSlide({ spec, position }: AuthoredSlideProps) {
  const [gateway, transshipment] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="container-choice-gateway-transshipment"
      className="authored-slide--gateway-transshipment"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-gateway-transshipment">
        <div className="authored-gateway-transshipment__container" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
          <span>同一只箱子</span>
        </div>
        <section className="authored-gateway-transshipment__gateway">
          <span>进入腹地</span>
          <strong>{gateway?.heading}</strong>
          <p>{gateway?.body}</p>
          <i aria-hidden="true">→ 工厂 / 市场</i>
        </section>
        <section className="authored-gateway-transshipment__transfer">
          <span>继续海运</span>
          <strong>{transshipment?.heading}</strong>
          <p>{transshipment?.body}</p>
          <i aria-hidden="true">→ 下一艘船</i>
        </section>
      </div>
      {spec.prompt && <p className="authored-gateway-transshipment__question">{spec.prompt}</p>}
    </LightFrame>
  );
}

function IndustrialCitySlide({ spec, position }: AuthoredSlideProps) {
  const [industry, city] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="industrial-city-waterfront"
      className="authored-slide--industrial-city"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-industrial-city">
        <section className="authored-industrial-city__industry">
          <span>生产效率</span>
          <div aria-hidden="true"><i /><i /><i /><b /></div>
          <strong>{industry?.heading}</strong>
          <p>{industry?.body}</p>
        </section>
        <div className="authored-industrial-city__waterfront">
          <span>共享岸线</span>
          <strong>港口决策</strong>
          <p>收益与外部成本由谁获得、由谁承担？</p>
        </div>
        <section className="authored-industrial-city__city">
          <span>公共利益</span>
          <div aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <strong>{city?.heading}</strong>
          <p>{city?.body}</p>
        </section>
      </div>
      {spec.prompt && <p className="authored-industrial-city__question">{spec.prompt}</p>}
    </LightFrame>
  );
}

function YardDiagnosisSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="yard-congestion-diagnosis"
      className="authored-slide--diagnosis-yard"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-diagnosis-yard">
        <div className="authored-diagnosis-yard__stacks" aria-label="堆场箱区占用示意">
          {Array.from({ length: 48 }).map((_, index) => <i key={index} data-hot={index > 14 && index < 40 ? "true" : undefined} />)}
          <span>缓冲区失速</span>
        </div>
        <div className="authored-diagnosis-yard__feedback">
          <span>岸桥效率 ↓</span>
          <strong>堆场拥堵</strong>
          <span>车辆周转 ↓</span>
        </div>
        <div className="authored-diagnosis-yard__evidence">
          {(spec.columns ?? []).map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
      <p className="authored-diagnosis-yard__answer">
        堆场本来用来吸收波动；当箱子无法按计划离开，缓冲区本身就会变成瓶颈。
      </p>
    </LightFrame>
  );
}

function HinterlandDiagnosisSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="hinterland-queue-diagnosis"
      className="authored-slide--diagnosis-hinterland"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-diagnosis-hinterland">
        <div className="authored-diagnosis-hinterland__gate">
          <span>闸口</span>
          <strong>峰值拥堵</strong>
          <i aria-hidden="true" />
        </div>
        <div className="authored-diagnosis-hinterland__road" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, index) => <i key={index} />)}
        </div>
        <div className="authored-diagnosis-hinterland__rail" aria-hidden="true">
          <i /><i /><i /><i /><i />
        </div>
        <div className="authored-diagnosis-hinterland__control">
          <span>码头可控制</span>
          <strong>预约 · 场内调度</strong>
          <span>需要协同</span>
          <strong>道路 · 铁路班次</strong>
        </div>
        <div className="authored-diagnosis-hinterland__evidence">
          {(spec.columns ?? []).map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
    </LightFrame>
  );
}

function InformationDiagnosisSlide({ spec, position }: AuthoredSlideProps) {
  const stages = ["到港", "卸船", "堆存", "放行", "提箱"];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="information-delay-chain"
      className="authored-slide--diagnosis-information"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-diagnosis-information">
        <div className="authored-diagnosis-information__events">
          {stages.map((stage, index) => (
            <section className={index === 3 ? "is-broken" : ""} key={stage}>
              <span>0{index + 1}</span>
              <strong>{stage}</strong>
              <i aria-hidden="true" />
            </section>
          ))}
        </div>
        <div className="authored-diagnosis-information__delay">
          <span>缺失事件</span>
          <strong>放行信息未同步</strong>
          <p>设备空闲但不能作业，车辆到场却不能提箱</p>
        </div>
        <div className="authored-diagnosis-information__evidence">
          {(spec.columns ?? []).map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
            </section>
          ))}
        </div>
      </div>
      <p className="authored-diagnosis-information__answer">
        信息瓶颈看不见，却能把每一个“已经准备好”的物理环节重新变成等待。
      </p>
    </LightFrame>
  );
}

function PriorityInvestmentSlide({ spec, position }: AuthoredSlideProps) {
  const rows = spec.table?.rows ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="one-token-investment"
      className="authored-slide--priority-investment"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-priority-investment">
        <div className="authored-priority-investment__token">
          <span>ONLY ONE</span>
          <strong>1</strong>
          <p>枚优先投资令牌</p>
        </div>
        <div className="authored-priority-investment__options">
          {rows.map((row, index) => (
            <section key={row[0]}>
              <span>0{index + 1}</span>
              <h3>{row[0]}</h3>
              <p><b>主要改善</b>{row[1]}</p>
              <p><b>可能遗漏</b>{row[2]}</p>
            </section>
          ))}
        </div>
      </div>
      {spec.prompt && (
        <p className="authored-priority-investment__brief">
          <span>决策要求</span>
          <strong>{spec.prompt}</strong>
        </p>
      )}
    </LightFrame>
  );
}

function ServiceBoundarySlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="capability-staircase"
      className="authored-slide--service-boundary"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-capability-staircase">
        {spec.steps?.map((step, index) => (
          <section
            key={step}
            style={{
              height: `${150 + index * 62}px`,
              zIndex: spec.steps!.length - index
            }}
          >
            <span>0{index + 1}</span>
            <strong>{step}</strong>
            <i />
          </section>
        ))}
      </div>
      <div className="authored-capability-staircase__reading">
        <span>能力演化不是替换</span>
        <strong>服务边界扩大，船岸转换仍是底座。</strong>
      </div>
    </LightFrame>
  );
}

function GenerationLensSlide({ spec, position }: AuthoredSlideProps) {
  const rows = spec.table?.rows ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="generation-rings"
      className="authored-slide--generation-lens"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-generation-lens">
        <div className="authored-generation-lens__rings" aria-label="港口能力同心累积示意">
          {rows
            .slice()
            .reverse()
            .map((row, reverseIndex) => {
              const originalIndex = rows.length - 1 - reverseIndex;
              return (
                <div
                  className={`authored-generation-lens__ring authored-generation-lens__ring--${originalIndex + 1}`}
                  key={row[0]}
                >
                  <span>{row[0]}</span>
                  <strong>{row[1]}</strong>
                </div>
              );
            })}
          <div className="authored-generation-lens__core">
            <span>港口</span>
            <strong>能力组合</strong>
          </div>
        </div>
        <div className="authored-generation-lens__today">
          <div>
            <span>观察镜头</span>
            <span>今天是否仍需要</span>
          </div>
          {rows.map((row) => (
            <p key={row[0]}>
              <strong>{row[0]}</strong>
              <span>{row[2]}</span>
            </p>
          ))}
          <blockquote>“第几代”描述服务边界，不是港口排名。</blockquote>
        </div>
      </div>
    </LightFrame>
  );
}

function PiraeusPortraitSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="port-role-portrait"
      className="authored-slide--piraeus"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-piraeus">
        <div className="authored-piraeus__map">
          <svg
            viewBox="0 0 660 430"
            role="img"
            aria-label="比雷埃夫斯连接地中海区域市场的网络示意"
          >
            <path
              d="M39 61c88-48 180-38 246 13 32 24 71 34 113 29 45-5 91 16 111 55 17 33 7 65-17 88-31 29-74 36-113 27-43-10-72 9-95 42-31 45-89 63-143 40-42-17-70-57-74-101-4-39-31-62-58-83-35-27-25-80 30-110Z"
              fill="#dfe7dc"
            />
            <path
              d="M455 78c61-37 142-28 181 24-18 32-51 57-89 61-44 5-78-19-92-52-6-14-7-23 0-33Z"
              fill="#dfe7dc"
            />
            <path
              d="M89 371c103-31 191-32 278-5 83 25 161 25 241 0"
              fill="none"
              stroke="#8bb5c4"
              strokeLinecap="round"
              strokeWidth="13"
            />
            {[
              { label: "地中海", x: 120, y: 338 },
              { label: "亚得里亚海", x: 246, y: 121 },
              { label: "黑海方向", x: 540, y: 109 },
              { label: "东地中海", x: 513, y: 330 }
            ].map((node) => (
              <g key={node.label}>
                <circle cx={node.x} cy={node.y} fill="#fff" r="9" stroke="#477f91" strokeWidth="4" />
                <text className="authored-piraeus__map-label" x={node.x} y={node.y - 18}>
                  {node.label}
                </text>
              </g>
            ))}
            <path
              d="M332 236L120 338M332 236L246 121M332 236L540 109M332 236L513 330"
              fill="none"
              stroke="#d4873d"
              strokeDasharray="8 10"
              strokeWidth="5"
            />
            <circle cx="332" cy="236" fill="#d4873d" r="18" stroke="#fff" strokeWidth="6" />
            <text className="authored-piraeus__map-port" x="332" y="205">
              比雷埃夫斯
            </text>
          </svg>
          <p>区域网络示意 · 港口角色以官方资料与LL3历史港序为依据</p>
        </div>
        <div className="authored-piraeus__roles">
          {spec.columns?.map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <div>
                <h3>{column.heading}</h3>
                <p>{column.body}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </LightFrame>
  );
}

function VesselDiagnosisSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="diagnostic-path"
      className="authored-slide--diagnosis"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-diagnosis">
        <div className="authored-diagnosis__timeline" aria-label="船舶等待时间线">
          <span>计划靠泊</span>
          <i />
          <strong>等待</strong>
          <i />
          <span>实际靠泊</span>
        </div>
        <div className="authored-diagnosis__path">
          {spec.columns?.map((column, index) => (
            <section key={column.heading}>
              <span>0{index + 1}</span>
              <h3>{column.heading}</h3>
              <p>{column.body}</p>
              {index < (spec.columns?.length ?? 0) - 1 && <b aria-hidden="true">→</b>}
            </section>
          ))}
        </div>
        <p className="authored-diagnosis__boundary">
          <span>诊断原则</span>
          等待是结果信号；先补齐时间与作业证据，再定位根因。
        </p>
      </div>
    </LightFrame>
  );
}

type EditorialComposition =
  | "cover"
  | "visual"
  | "question"
  | "comparison"
  | "process"
  | "statement"
  | "table"
  | "matrix"
  | "activity"
  | "data"
  | "case"
  | "summary";

type EditorialTone = "ocean" | "teal" | "navy" | "amber" | "coral" | "paper";
type EditorialVisualPlacement = "left" | "right" | "top" | "bleed";

interface EditorialArtDirection {
  composition: EditorialComposition;
  tone: EditorialTone;
  visual?: EditorialVisualPlacement;
  dense?: boolean;
  reverse?: boolean;
}

const EDITORIAL_ART_DIRECTIONS = {
  "l1-population-gap": { composition: "data", tone: "amber", visual: "right" },
  "l1-france-england-scale": { composition: "comparison", tone: "paper" },
  "l1-silk-in-london": { composition: "visual", tone: "amber", visual: "bleed" },
  "l1-output-vs-influence": { composition: "question", tone: "navy" },
  "l1-eic-charter": { composition: "statement", tone: "navy" },
  "l1-china-direct-trade": { composition: "process", tone: "teal" },
  "l1-canton-1727-manifest": { composition: "table", tone: "amber", dense: true },
  "l1-value-density": { composition: "comparison", tone: "amber" },
  "l1-canton-london-route": { composition: "visual", tone: "navy", visual: "top" },
  "l1-london-redistribution": { composition: "process", tone: "teal" },
  "l1-connects-not-makes": { composition: "statement", tone: "navy" },
  "l1-double-absolute-advantage": { composition: "question", tone: "teal" },
  "l1-absolute-vs-comparative": { composition: "comparison", tone: "teal" },
  "l1-half-time-output": { composition: "table", tone: "amber" },
  "l1-opportunity-cost-table": { composition: "table", tone: "teal", dense: true },
  "l1-reallocation-output": { composition: "table", tone: "teal", dense: true },
  "l1-exchange-range": { composition: "statement", tone: "teal" },
  "l1-production-possibility-frontier": { composition: "visual", tone: "navy", visual: "top" },
  "l1-opportunity-cost-activity": { composition: "activity", tone: "amber" },
  "l1-trade-model-boundary": { composition: "statement", tone: "coral" },
  "l1-regional-division-timeline": { composition: "process", tone: "paper" },
  "l1-jiangnan-specialization": { composition: "visual", tone: "teal", visual: "bleed" },
  "l1-silk-production-chain": { composition: "visual", tone: "amber", visual: "bleed" },
  "l1-cash-crop-transition": { composition: "comparison", tone: "amber" },
  "l1-grain-origin-question": { composition: "question", tone: "navy" },
  "l1-dongting-hankou-grain": { composition: "visual", tone: "teal", visual: "bleed" },
  "l1-yangtze-inland-trade": { composition: "visual", tone: "teal", visual: "top" },
  "l1-historical-composite-chain": { composition: "summary", tone: "navy", visual: "right" },
  "l1-water-distance": { composition: "process", tone: "teal" },
  "l1-network-position": { composition: "visual", tone: "navy", visual: "bleed" },
  "l1-port-books": { composition: "visual", tone: "amber", visual: "left" },
  "l1-finance": { composition: "visual", tone: "navy", visual: "right" },
  "l1-navy-state": { composition: "comparison", tone: "coral" },
  "l1-company-empire": { composition: "statement", tone: "coral" },
  "l1-industry-port-loop": { composition: "process", tone: "teal" },
  "l1-population-not-limit": { composition: "summary", tone: "navy", visual: "right" },
  "l1-modern-mirror": { composition: "cover", tone: "ocean", visual: "bleed" },
  "l1-scale-economies": { composition: "data", tone: "ocean", visual: "right" },
  "l1-water-cost-mechanisms": { composition: "process", tone: "teal", dense: true },
  "l1-maritime-share": { composition: "data", tone: "ocean" },
  "l1-time-has-price": { composition: "case", tone: "amber" },
  "l1-departure-cliffhanger": { composition: "cover", tone: "ocean", visual: "bleed" },

  "l2-cover": { composition: "cover", tone: "ocean", visual: "bleed" },
  "l2-log-restored": { composition: "visual", tone: "ocean", visual: "right" },
  "l2-port-rotation": { composition: "process", tone: "teal", dense: true },
  "l2-corridor-not-line": { composition: "statement", tone: "teal", visual: "left" },
  "l2-cargo-consolidation": { composition: "process", tone: "teal" },
  "l2-feeder-mainline": { composition: "comparison", tone: "navy" },
  "l2-hub-vs-gateway": { composition: "comparison", tone: "amber" },
  "l2-singapore": { composition: "visual", tone: "ocean", visual: "bleed" },
  "l2-transshipment": { composition: "process", tone: "teal" },
  "l2-liner-network": { composition: "visual", tone: "navy", visual: "left" },
  "l2-route-classifications": { composition: "summary", tone: "paper" },
  "l2-malacca": { composition: "visual", tone: "ocean", visual: "bleed" },
  "l2-indian-ocean": { composition: "process", tone: "navy" },
  "l2-suez": { composition: "visual", tone: "amber", visual: "right" },
  "l2-canal-service-system": { composition: "process", tone: "amber", dense: true },
  "l2-capacity-order-safety": { composition: "matrix", tone: "navy" },
  "l2-risk-propagation": { composition: "visual", tone: "coral", visual: "left" },
  "l2-chokepoint-chain": { composition: "summary", tone: "coral" },
  "l2-reconstructed-route": { composition: "visual", tone: "navy", visual: "top" },
  "l2-option-wait": { composition: "case", tone: "amber" },
  "l2-option-cape": { composition: "visual", tone: "coral", visual: "right" },
  "l2-option-network": { composition: "comparison", tone: "teal" },
  "l2-container-origin": { composition: "visual", tone: "ocean", visual: "bleed" },
  "l2-guoyuan-role": { composition: "case", tone: "teal" },
  "l2-container-chain": { composition: "visual", tone: "teal", visual: "left" },
  "l2-yangtze-corridor": { composition: "process", tone: "teal" },
  "l2-three-gorges": { composition: "comparison", tone: "amber" },
  "l2-national-inland-network": { composition: "visual", tone: "navy", visual: "top" },
  "l2-inland-hidden-costs": { composition: "matrix", tone: "amber", dense: true },
  "l2-whole-chain": { composition: "visual", tone: "teal", visual: "left" },
  "l2-resilience": { composition: "matrix", tone: "coral", visual: "right" },
  "l2-europe-cliffhanger": { composition: "cover", tone: "ocean", visual: "bleed" },

  "l3-cover": { composition: "cover", tone: "ocean", visual: "bleed" },
  "l3-berthing-not-completion": { composition: "question", tone: "navy" },
  "l3-four-port-tasks": { composition: "comparison", tone: "teal", dense: true },
  "l3-value-beyond-quay": { composition: "visual", tone: "ocean", visual: "bleed" },
  "l3-breakbulk-scene": { composition: "visual", tone: "amber", visual: "left" },
  "l3-first-generation": { composition: "process", tone: "amber" },
  "l3-industrial-scene": { composition: "visual", tone: "amber", visual: "right" },
  "l3-second-generation": { composition: "comparison", tone: "amber" },
  "l3-logistics-scene": { composition: "visual", tone: "teal", visual: "left" },
  "l3-third-generation": { composition: "process", tone: "teal" },
  "l3-community-scene": { composition: "visual", tone: "navy", visual: "right" },
  "l3-fourth-generation": { composition: "comparison", tone: "navy" },
  "l3-automation-question": { composition: "question", tone: "coral" },
  "l3-four-port-map": { composition: "visual", tone: "ocean", visual: "top" },
  "l3-shanghai-gateway": { composition: "case", tone: "teal" },
  "l3-singapore-hub": { composition: "case", tone: "ocean" },
  "l3-rotterdam-industry": { composition: "case", tone: "amber" },
  "l3-multiple-roles": { composition: "matrix", tone: "teal", dense: true },
  "l3-no-ranking": { composition: "activity", tone: "navy" },
  "l3-china-port-types": { composition: "visual", tone: "teal", visual: "top" },
  "l3-coastal-river-inland": { composition: "comparison", tone: "teal" },
  "l3-gateway-transshipment": { composition: "comparison", tone: "navy" },
  "l3-industrial-city-port": { composition: "comparison", tone: "amber" },
  "l3-guoyuan-identities": { composition: "visual", tone: "teal", visual: "bleed" },
  "l3-hinterland-view": { composition: "visual", tone: "teal", visual: "left" },
  "l3-diagnosis-brief": { composition: "visual", tone: "coral", visual: "bleed" },
  "l3-diagnosis-yard": { composition: "case", tone: "coral" },
  "l3-diagnosis-hinterland": { composition: "case", tone: "amber" },
  "l3-diagnosis-information": { composition: "case", tone: "navy" },
  "l3-priority-investment": { composition: "activity", tone: "coral" },
  "l3-whole-voyage-answer": { composition: "summary", tone: "teal", visual: "right" },
  "l3-next-lesson": { composition: "cover", tone: "ocean", visual: "bleed" }
} as const satisfies Record<string, EditorialArtDirection>;

const PORT_CASE_SIGNATURES: Record<
  string,
  { code: string; eyebrow: string; role: string }
> = {
  "l3-shanghai-gateway": {
    code: "CNSHA",
    eyebrow: "GATEWAY PORT",
    role: "门户与规模接口"
  },
  "l3-singapore-hub": {
    code: "SGSIN",
    eyebrow: "GLOBAL HUB",
    role: "转运与网络组织"
  },
  "l3-rotterdam-industry": {
    code: "NLRTM",
    eyebrow: "INDUSTRIAL GATEWAY",
    role: "产业与腹地连接"
  }
};

const DIAGNOSIS_CASE_SIGNATURES: Record<
  string,
  { number: string; code: string; role: string }
> = {
  "l3-diagnosis-yard": {
    number: "02",
    code: "YARD",
    role: "堆场 · 缓冲区失速"
  },
  "l3-diagnosis-hinterland": {
    number: "03",
    code: "HINTERLAND",
    role: "陆侧 · 接口失配"
  },
  "l3-diagnosis-information": {
    number: "04",
    code: "INFORMATION",
    role: "协同 · 信息链断点"
  }
};

export const AUTHORED_TEACHING_SLIDE_KEYS: readonly string[] = [
  ...PILOT_AUTHORED_TEACHING_SLIDE_KEYS,
  ...Object.keys(EDITORIAL_ART_DIRECTIONS).filter(
    (slideKey) =>
      !PILOT_AUTHORED_TEACHING_SLIDE_KEYS.includes(
        slideKey as PilotAuthoredTeachingSlideKey
      )
  )
];

function EditorialVisual({
  spec,
  diagram,
  className = ""
}: {
  spec: PortManagementSlideSpec;
  diagram?: ReactNode;
  className?: string;
}) {
  if (!spec.image && !diagram) return null;
  return (
    <figure className={`editorial-slide__visual ${className}`.trim()}>
      {spec.image ? (
        <img
          src={spec.image}
          alt={spec.imageAlt ?? ""}
          style={{
            objectFit: spec.imageFit ?? "cover",
            objectPosition: spec.imagePosition ?? "center"
          }}
        />
      ) : (
        diagram
      )}
    </figure>
  );
}

function EditorialEvidenceList({
  items,
  ordered = false
}: {
  items: readonly string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <List className="editorial-slide__evidence-list">
      {items.map((item, index) => (
        <li key={item}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <p>{item}</p>
        </li>
      ))}
    </List>
  );
}

function EditorialColumns({ spec }: { spec: PortManagementSlideSpec }) {
  if (!spec.columns?.length) return null;
  return (
    <div
      className="editorial-slide__columns"
      data-column-count={Math.min(spec.columns.length, 6)}
    >
      {spec.columns.map((column, index) => (
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

function EditorialTable({ spec }: { spec: PortManagementSlideSpec }) {
  if (!spec.table) return null;
  return (
    <div
      className="editorial-slide__table"
      data-column-count={Math.min(spec.table.headers.length, 6)}
      role="table"
      aria-label={spec.title}
    >
      <div className="editorial-slide__table-row editorial-slide__table-row--header" role="row">
        {spec.table.headers.map((header) => (
          <span key={header} role="columnheader">
            {header}
          </span>
        ))}
      </div>
      {spec.table.rows.map((row, rowIndex) => (
        <div className="editorial-slide__table-row" key={`${row[0]}-${rowIndex}`} role="row">
          {row.map((cell, cellIndex) => (
            <span key={`${cell}-${cellIndex}`} role="cell">
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function EditorialCoverSlide({
  spec,
  position
}: AuthoredSlideProps) {
  return (
    <article
      className="authored-slide editorial-slide editorial-slide--cover editorial-slide--tone-ocean"
      data-slide-composition="editorial-cover"
      data-slide-key={spec.slideKey}
    >
      {spec.image && (
        <img
          className="editorial-slide__cover-image"
          src={spec.image}
          alt={spec.imageAlt ?? ""}
        />
      )}
      <div className="editorial-slide__cover-shade" />
      <PublicContext spec={spec} inverse />
      <div className="editorial-slide__cover-copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
        <span>{spec.lessonTitle} · 李行之</span>
      </div>
      <div className="editorial-slide__cover-index">
        {String(position.localIndex).padStart(2, "0")} / {position.localTotal}
      </div>
      <AuthoredFooter spec={spec} position={position} inverse />
    </article>
  );
}

function EditorialVisualSlide({
  spec,
  position,
  diagram,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  const visualPlacement = direction.visual ?? "left";
  const bodyItems = spec.bullets ?? spec.steps ?? [];
  const hasVisibleBody =
    bodyItems.length > 0 || Boolean(spec.columns?.length) || Boolean(spec.prompt);
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition={`editorial-visual-${visualPlacement}`}
      className={`editorial-slide editorial-slide--visual editorial-slide--visual-${visualPlacement} editorial-slide--tone-${direction.tone}${hasVisibleBody ? "" : " editorial-slide--visual-only"}${direction.dense ? " editorial-slide--dense" : ""}`}
    >
      {visualPlacement === "bleed" && spec.image && (
        <img
          className="editorial-slide__visual-backdrop"
          src={spec.image}
          alt={spec.imageAlt ?? ""}
        />
      )}
      {visualPlacement === "bleed" && <div className="editorial-slide__visual-shade" />}
      <EditorialHeader spec={spec} compact />
      <div className="editorial-slide__visual-layout">
        {visualPlacement !== "bleed" && (
          <EditorialVisual spec={spec} diagram={diagram} />
        )}
        <div className="editorial-slide__visual-copy">
          {bodyItems.length > 0 && <EditorialEvidenceList items={bodyItems} />}
          <EditorialColumns spec={spec} />
          {spec.prompt && <blockquote>{spec.prompt}</blockquote>}
        </div>
      </div>
    </LightFrame>
  );
}

function EditorialQuestionSlide({
  spec,
  position,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  const items = spec.steps ?? spec.bullets ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="editorial-question"
      className={`editorial-slide editorial-slide--question editorial-slide--tone-${direction.tone}`}
    >
      <EditorialHeader spec={spec} />
      <div className="editorial-slide__question-mark" aria-hidden="true">?</div>
      {spec.prompt && <blockquote className="editorial-slide__question-prompt">{spec.prompt}</blockquote>}
      {items.length > 0 && (
        <div className="editorial-slide__question-options">
          {items.map((item, index) => (
            <p key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item}
            </p>
          ))}
        </div>
      )}
      <EditorialColumns spec={spec} />
    </LightFrame>
  );
}

function EditorialComparisonSlide({
  spec,
  position,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="editorial-comparison"
      className={`editorial-slide editorial-slide--comparison editorial-slide--tone-${direction.tone}${direction.reverse ? " editorial-slide--reverse" : ""}${direction.dense ? " editorial-slide--dense" : ""}`}
    >
      <EditorialHeader spec={spec} compact />
      <EditorialColumns spec={spec} />
      {spec.prompt && <blockquote className="editorial-slide__comparison-prompt">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function EditorialProcessSlide({
  spec,
  position,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  const items =
    spec.steps ??
    spec.bullets ??
    spec.columns?.map((column) => `${column.heading}｜${column.body}`) ??
    [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="editorial-process"
      className={`editorial-slide editorial-slide--process editorial-slide--tone-${direction.tone}${direction.dense ? " editorial-slide--dense" : ""}`}
    >
      <EditorialHeader spec={spec} compact />
      <div className="editorial-slide__process-rail">
        {items.map((item, index) => {
          const [heading, body] = item.split("｜");
          return (
            <section key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{heading}</strong>
              {body && <p>{body}</p>}
            </section>
          );
        })}
      </div>
      {spec.prompt && <blockquote className="editorial-slide__process-prompt">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function EditorialStatementSlide({
  spec,
  position,
  diagram,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="editorial-statement"
      className={`editorial-slide editorial-slide--statement editorial-slide--tone-${direction.tone}`}
    >
      <EditorialHeader spec={spec} compact />
      <div className="editorial-slide__statement-layout">
        {diagram && <EditorialVisual spec={spec} diagram={diagram} />}
        <div>
          {spec.stat && (
            <div className="editorial-slide__statement-stat">
              <strong>{spec.stat.value}</strong>
              <span>{spec.stat.label}</span>
              {spec.stat.detail && <p>{spec.stat.detail}</p>}
            </div>
          )}
          {spec.slideKey === "l1-exchange-range" && (
            <div
              className="editorial-slide__range-axis"
              aria-label="0.5至1之间是双方都愿意接受的互利交换区间"
            >
              <span>
                <strong>0.5</strong>
                重庆基地机会成本
              </span>
              <b>双方都愿意交换</b>
              <span>
                <strong>1.0</strong>
                欧洲基地机会成本
              </span>
            </div>
          )}
          {spec.bullets && <EditorialEvidenceList items={spec.bullets} />}
          <EditorialColumns spec={spec} />
          {spec.prompt && <blockquote>{spec.prompt}</blockquote>}
        </div>
      </div>
    </LightFrame>
  );
}

function EditorialTableSlide({
  spec,
  position,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="editorial-table"
      className={`editorial-slide editorial-slide--table editorial-slide--tone-${direction.tone}${direction.dense ? " editorial-slide--dense" : ""}`}
    >
      <EditorialHeader spec={spec} compact />
      <EditorialTable spec={spec} />
      {spec.prompt && <blockquote className="editorial-slide__table-prompt">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function EditorialMatrixSlide({
  spec,
  position,
  diagram,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="editorial-matrix"
      className={`editorial-slide editorial-slide--matrix editorial-slide--tone-${direction.tone}${direction.dense ? " editorial-slide--dense" : ""}`}
    >
      <EditorialHeader spec={spec} compact />
      <div className="editorial-slide__matrix-layout">
        {diagram && <EditorialVisual spec={spec} diagram={diagram} />}
        <EditorialColumns spec={spec} />
        {spec.bullets && <EditorialEvidenceList items={spec.bullets} />}
      </div>
      {spec.prompt && <blockquote className="editorial-slide__matrix-prompt">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function EditorialActivitySlide({
  spec,
  position,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  const items = spec.steps ?? spec.bullets ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="editorial-activity"
      className={`editorial-slide editorial-slide--activity editorial-slide--tone-${direction.tone}`}
    >
      <EditorialHeader spec={spec} compact />
      {spec.prompt && (
        <blockquote className="editorial-slide__activity-prompt">{spec.prompt}</blockquote>
      )}
      <EditorialTable spec={spec} />
      {items.length > 0 && <EditorialEvidenceList items={items} ordered />}
      <EditorialColumns spec={spec} />
    </LightFrame>
  );
}

function EditorialDataSlide({
  spec,
  position,
  diagram,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="editorial-data"
      className={`editorial-slide editorial-slide--data editorial-slide--tone-${direction.tone}${direction.visual ? ` editorial-slide--data-${direction.visual}` : ""}`}
    >
      <EditorialHeader spec={spec} compact />
      <div className="editorial-slide__data-layout">
        {(spec.image || diagram) && <EditorialVisual spec={spec} diagram={diagram} />}
        <div>
          {spec.stat && (
            <div className="editorial-slide__data-stat">
              <strong>{spec.stat.value}</strong>
              <span>{spec.stat.label}</span>
              {spec.stat.detail && <p>{spec.stat.detail}</p>}
            </div>
          )}
          {spec.bullets && <EditorialEvidenceList items={spec.bullets} />}
        </div>
      </div>
    </LightFrame>
  );
}

function ReliabilityCaseSlide({
  spec,
  position,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="reliability-route-compare"
      className={`editorial-slide editorial-slide--reliability editorial-slide--tone-${direction.tone}`}
    >
      <EditorialHeader spec={spec} compact />
      <div className="editorial-reliability">
        <div className="editorial-reliability__routes">
          {spec.table?.rows.map((row, index) => (
            <section
              className={index === 0 ? "editorial-reliability__route editorial-reliability__route--stable" : "editorial-reliability__route editorial-reliability__route--volatile"}
              key={row[0]}
            >
              <div>
                <span>路线 {row[0]}</span>
                <strong>{row[1]}</strong>
                <small>平均提前期</small>
              </div>
              <i aria-hidden="true" />
              <div>
                <span>到货波动</span>
                <strong>{row[2]}</strong>
                <small>{index === 0 ? "窗口集中" : "窗口分散"}</small>
              </div>
              <p>{row[3]}</p>
            </section>
          ))}
        </div>
        <div className="editorial-reliability__evidence">
          {spec.bullets?.map((bullet, index) => (
            <p key={bullet}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {bullet}
            </p>
          ))}
        </div>
      </div>
      {spec.prompt && (
        <blockquote className="editorial-reliability__prompt">
          {spec.prompt}
        </blockquote>
      )}
    </LightFrame>
  );
}

function EditorialCaseSlide({
  spec,
  position,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  if (spec.slideKey === "l1-time-has-price") {
    return <ReliabilityCaseSlide spec={spec} position={position} direction={direction} />;
  }

  const diagnosisSignature = DIAGNOSIS_CASE_SIGNATURES[spec.slideKey];
  if (diagnosisSignature) {
    return (
      <LightFrame
        spec={spec}
        position={position}
        composition="editorial-diagnosis-case"
        className={`editorial-slide editorial-slide--diagnosis-case editorial-slide--tone-${direction.tone}`}
      >
        <EditorialHeader spec={spec} compact />
        <div className="editorial-slide__diagnosis-signature">
          <span>DIAGNOSIS CUT</span>
          <strong>{diagnosisSignature.number}</strong>
          <b>{diagnosisSignature.code}</b>
          <p>{diagnosisSignature.role}</p>
        </div>
        <div className="editorial-slide__diagnosis-evidence">
          <EditorialColumns spec={spec} />
        </div>
      </LightFrame>
    );
  }

  const portSignature = PORT_CASE_SIGNATURES[spec.slideKey];
  if (portSignature) {
    return (
      <LightFrame
        spec={spec}
        position={position}
        composition="editorial-port-case"
        className={`editorial-slide editorial-slide--port-case editorial-slide--tone-${direction.tone}`}
      >
        <EditorialHeader spec={spec} compact />
        <div className="editorial-slide__port-signature">
          <span>{portSignature.eyebrow}</span>
          <strong>{portSignature.code}</strong>
          <p>{portSignature.role}</p>
        </div>
        <div className="editorial-slide__port-evidence">
          <EditorialColumns spec={spec} />
        </div>
      </LightFrame>
    );
  }

  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="editorial-case"
      className={`editorial-slide editorial-slide--case editorial-slide--tone-${direction.tone}`}
    >
      <EditorialHeader spec={spec} compact />
      <div className="editorial-slide__case-rule">
        <span>CASE EVIDENCE</span>
        <strong>{spec.narrative.publicLabel ?? "概念模型"}</strong>
      </div>
      <EditorialColumns spec={spec} />
      {spec.bullets && <EditorialEvidenceList items={spec.bullets} />}
      {spec.prompt && <blockquote className="editorial-slide__case-prompt">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function EditorialSummarySlide({
  spec,
  position,
  diagram,
  direction
}: AuthoredSlideProps & { direction: EditorialArtDirection }) {
  return (
    <article
      className={`authored-slide editorial-slide editorial-slide--summary editorial-slide--tone-${direction.tone}`}
      data-slide-composition="editorial-summary"
      data-slide-key={spec.slideKey}
    >
      <PublicContext spec={spec} inverse />
      <div className="editorial-slide__summary-copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
        {spec.prompt && <blockquote>{spec.prompt}</blockquote>}
      </div>
      <div className="editorial-slide__summary-evidence">
        {diagram && <EditorialVisual spec={spec} diagram={diagram} />}
        {spec.bullets && <EditorialEvidenceList items={spec.bullets} />}
        {spec.steps && <EditorialEvidenceList items={spec.steps} ordered />}
        <EditorialColumns spec={spec} />
      </div>
      <AuthoredFooter spec={spec} position={position} inverse />
    </article>
  );
}

function EditorialDeckSlide(
  props: AuthoredSlideProps & { direction: EditorialArtDirection }
) {
  const { direction } = props;
  switch (direction.composition) {
    case "cover":
      return <EditorialCoverSlide {...props} />;
    case "visual":
      return <EditorialVisualSlide {...props} />;
    case "question":
      return <EditorialQuestionSlide {...props} />;
    case "comparison":
      return <EditorialComparisonSlide {...props} />;
    case "process":
      return <EditorialProcessSlide {...props} />;
    case "statement":
      return <EditorialStatementSlide {...props} />;
    case "table":
      return <EditorialTableSlide {...props} />;
    case "matrix":
      return <EditorialMatrixSlide {...props} />;
    case "activity":
      return <EditorialActivitySlide {...props} />;
    case "data":
      return <EditorialDataSlide {...props} />;
    case "case":
      return <EditorialCaseSlide {...props} />;
    case "summary":
      return <EditorialSummarySlide {...props} />;
  }
}

const authoredRenderers: Record<
  PilotAuthoredTeachingSlideKey,
  (props: AuthoredSlideProps) => ReactElement
> = {
  "l1-course-cover": CourseOpeningCoverSlide,
  "l1-1700-wager": WagerOpeningSlide,
  "l1-france-england-scale": ChannelComparisonSlide,
  "l1-china-direct-trade": DirectTradeEvolutionSlide,
  "l1-canton-1727-manifest": CantonManifestSlide,
  "l1-value-density": ValueDensityHoldSlide,
  "l1-london-redistribution": LondonRedistributionSlide,
  "l1-absolute-vs-comparative": AdvantageQuestionSlide,
  "l1-jiangnan-huguang-model": ComparativeModelSlide,
  "l1-half-time-output": BaselineOutputSlide,
  "l1-opportunity-cost-table": OpportunityCostEquationSlide,
  "l1-reallocation-output": ReallocationGainSlide,
  "l1-opportunity-cost-activity": OpportunityCostActivitySlide,
  "l1-regional-division-timeline": RegionalDivisionTimelineSlide,
  "l1-cash-crop-transition": CashCropDecisionSlide,
  "l1-water-distance": WaterDistanceSlide,
  "l1-navy-state": NavyTradeTensionSlide,
  "l1-industry-port-loop": IndustrialPortLoopSlide,
  "l1-water-cost-mechanisms": WaterCostMechanismSlide,
  "l1-four-modes": WaterCostSlide,
  "l1-port-interface": PortInterfaceSlide,
  "l2-explain-every-choice": RouteCluesSlide,
  "l2-port-rotation": PortRotationSlide,
  "l2-cargo-consolidation": CargoConsolidationSlide,
  "l2-feeder-mainline": FeederMainlineSlide,
  "l2-hub-vs-gateway": HubGatewaySlide,
  "l2-transshipment": TransshipmentPanoramaSlide,
  "l2-indian-ocean": IndianOceanNextGateSlide,
  "l2-why-chokepoint": ChokepointSlide,
  "l2-canal-service-system": CanalServicePanoramaSlide,
  "l2-capacity-order-safety": CanalControlSlide,
  "l2-disruption-brief": DisruptionBriefSlide,
  "l2-option-wait": WaitUncertaintySlide,
  "l2-option-network": NetworkRewireSlide,
  "l2-decision-table": DecisionMatrixSlide,
  "l2-guoyuan-role": GuoyuanRoleSlide,
  "l2-yangtze-corridor": YangtzeCorridorSlide,
  "l2-three-gorges": ThreeGorgesSlide,
  "l2-inland-hidden-costs": InlandHiddenCostsSlide,
  "l3-four-port-tasks": FourPortTasksSlide,
  "l3-no-taxonomy-first": ServiceBoundarySlide,
  "l3-first-generation": FirstGenerationSlide,
  "l3-second-generation": SecondGenerationSlide,
  "l3-third-generation": ThirdGenerationSlide,
  "l3-fourth-generation": FourthGenerationSlide,
  "l3-generation-lens": GenerationLensSlide,
  "l3-shanghai-gateway": ShanghaiGatewaySlide,
  "l3-singapore-hub": SingaporeHubSlide,
  "l3-piraeus-call": PiraeusPortraitSlide,
  "l3-rotterdam-industry": RotterdamIndustrySlide,
  "l3-multiple-roles": MultipleRolesSlide,
  "l3-no-ranking": PortMatchActivitySlide,
  "l3-coastal-river-inland": PortTypesTransectSlide,
  "l3-gateway-transshipment": GatewayTransshipmentSlide,
  "l3-industrial-city-port": IndustrialCitySlide,
  "l3-diagnosis-vessel": VesselDiagnosisSlide,
  "l3-diagnosis-yard": YardDiagnosisSlide,
  "l3-diagnosis-hinterland": HinterlandDiagnosisSlide,
  "l3-diagnosis-information": InformationDiagnosisSlide,
  "l3-priority-investment": PriorityInvestmentSlide
};

export function renderAuthoredTeachingSlide(
  spec: PortManagementSlideSpec,
  position: PortManagementLessonSlidePosition,
  diagram?: ReactNode
): ReactElement | null {
  const renderer =
    authoredRenderers[spec.slideKey as PilotAuthoredTeachingSlideKey];
  if (renderer) return renderer({ spec, position, diagram });
  const direction =
    EDITORIAL_ART_DIRECTIONS[
      spec.slideKey as keyof typeof EDITORIAL_ART_DIRECTIONS
    ];
  return direction
    ? <EditorialDeckSlide spec={spec} position={position} diagram={diagram} direction={direction} />
    : null;
}
