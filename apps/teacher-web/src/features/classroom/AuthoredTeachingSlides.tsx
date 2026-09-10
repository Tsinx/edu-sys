import {
  PORT_MANAGEMENT_SOURCES,
  PORT_LBL_SLIDES,
  type PortManagementLessonSlidePosition,
  type PortManagementSlideSpec
} from "@edu/course-content";
import type { ReactElement, ReactNode } from "react";

export const PILOT_AUTHORED_TEACHING_SLIDE_KEYS = [
  "l1-course-cover",
  "l1-1700-wager",
  "l1-population-gap",
  "l1-france-england-scale",
  "l1-silk-in-london",
  "l1-output-vs-influence",
  "l1-eic-charter",
  "l1-china-direct-trade",
  "l1-canton-1727-manifest",
  "l1-value-density",
  "l1-canton-london-route",
  "l1-london-redistribution",
  "l1-connects-not-makes",
  "l1-double-absolute-advantage",
  "l1-absolute-vs-comparative",
  "l1-jiangnan-huguang-model",
  "l1-half-time-output",
  "l1-opportunity-cost-table",
  "l1-reallocation-output",
  "l1-exchange-range",
  "l1-production-possibility-frontier",
  "l1-opportunity-cost-activity",
  "l1-trade-model-boundary",
  "l1-regional-division-timeline",
  "l1-jiangnan-specialization",
  "l1-silk-production-chain",
  "l1-cash-crop-transition",
  "l1-grain-origin-question",
  "l1-dongting-hankou-grain",
  "l1-yangtze-inland-trade",
  "l1-historical-composite-chain",
  "l1-water-distance",
  "l1-network-position",
  "l1-port-books",
  "l1-finance",
  "l1-navy-state",
  "l1-company-empire",
  "l1-industry-port-loop",
  "l1-population-not-limit",
  "l1-modern-mirror",
  "l1-scale-economies",
  "l1-water-cost-mechanisms",
  "l1-four-modes",
  "l1-maritime-share",
  "l1-time-has-price",
  "l1-port-interface",
  "l1-departure-cliffhanger",
  "l2-cover",
  "l2-log-restored",
  "l2-explain-every-choice",
  "l2-port-rotation",
  "l2-corridor-not-line",
  "l2-cargo-consolidation",
  "l2-feeder-mainline",
  "l2-hub-vs-gateway",
  "l2-singapore",
  "l2-transshipment",
  "l2-liner-network",
  "l2-route-classifications",
  "l2-malacca",
  "l2-indian-ocean",
  "l2-suez",
  "l2-why-chokepoint",
  "l2-canal-service-system",
  "l2-capacity-order-safety",
  "l2-risk-propagation",
  "l2-chokepoint-chain",
  "l2-reconstructed-route",
  "l2-disruption-brief",
  "l2-option-wait",
  "l2-option-cape",
  "l2-option-network",
  "l2-decision-table",
  "l2-container-origin",
  "l2-guoyuan-role",
  "l2-container-chain",
  "l2-yangtze-corridor",
  "l2-three-gorges",
  "l2-national-inland-network",
  "l2-inland-hidden-costs",
  "l2-whole-chain",
  "l2-resilience",
  "l2-europe-cliffhanger",
  "l3-cover",
  "l3-berthing-not-completion",
  "l3-four-port-tasks",
  "l3-value-beyond-quay",
  "l3-no-taxonomy-first",
  "l3-breakbulk-scene",
  "l3-first-generation",
  "l3-industrial-scene",
  "l3-second-generation",
  "l3-logistics-scene",
  "l3-third-generation",
  "l3-community-scene",
  "l3-fourth-generation",
  "l3-generation-lens",
  "l3-automation-question",
  "l3-four-port-map",
  "l3-shanghai-gateway",
  "l3-singapore-hub",
  "l3-piraeus-call",
  "l3-rotterdam-industry",
  "l3-multiple-roles",
  "l3-no-ranking",
  "l3-china-port-types",
  "l3-coastal-river-inland",
  "l3-gateway-transshipment",
  "l3-industrial-city-port",
  "l3-guoyuan-identities",
  "l3-hinterland-view",
  "l3-diagnosis-brief",
  "l3-diagnosis-vessel",
  "l3-diagnosis-yard",
  "l3-diagnosis-hinterland",
  "l3-diagnosis-information",
  "l3-priority-investment",
  "l3-whole-voyage-answer",
  "l3-next-lesson"
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

function PopulationGapSlide({ spec, position }: AuthoredSlideProps) {
  const evidence = spec.bullets ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="population-gap-proof"
      className="authored-slide--population-gap"
    >
      <header className="authored-population-gap__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div
        className="authored-population-gap__scale"
        aria-label="约1700年英格兰和威尔士与法国人口约数比较"
      >
        <section className="authored-population-gap__country authored-population-gap__country--england">
          <span>英格兰和威尔士</span>
          <div><strong>500</strong><b>万</b></div>
          <p>更小的国内市场与人口基础</p>
        </section>
        <div className="authored-population-gap__ratio" aria-hidden="true">
          <span>约</span>
          <strong>×4</strong>
          <i />
        </div>
        <section className="authored-population-gap__country authored-population-gap__country--france">
          <span>法国</span>
          <div><strong>2000</strong><b>万</b></div>
          <p>更大的国内市场与征税基础</p>
        </section>
      </div>
      <p className="authored-population-gap__method">{spec.stat?.detail}</p>
      <ol className="authored-population-gap__reading">
        {evidence.map((item, index) => (
          <li key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </li>
        ))}
      </ol>
    </LightFrame>
  );
}

function SilkInLondonSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="silk-arrival-story"
      className="authored-slide--silk-arrival"
    >
      <div className="authored-silk-arrival__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-silk-arrival__route" aria-hidden="true">
        <span>CHINA</span>
        <i />
        <strong>LONDON</strong>
      </div>
      <ol className="authored-silk-arrival__evidence">
        {(spec.bullets ?? []).map((item, index) => (
          <li key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </li>
        ))}
      </ol>
    </ImageStoryFrame>
  );
}

function InfluenceQuestionSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="influence-question-field"
      className="authored-slide--influence-question"
    >
      <header className="authored-influence-question__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div
        className="authored-influence-question__equation"
        aria-label="有限人口乘以待判断的能力形成全球影响力"
      >
        <section>
          <span>已知条件</span>
          <strong>有限人口</strong>
        </section>
        <b aria-hidden="true">×</b>
        <div aria-hidden="true">?</div>
        <b aria-hidden="true">=</b>
        <section>
          <span>待解释结果</span>
          <strong>全球影响力</strong>
        </section>
      </div>
      {spec.prompt && (
        <blockquote className="authored-influence-question__prompt">
          {spec.prompt}
        </blockquote>
      )}
      <ol className="authored-influence-question__hypotheses">
        {(spec.steps ?? []).map((step, index) => (
          <li key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </LightFrame>
  );
}

function CharterInstitutionSlide({ spec, position }: AuthoredSlideProps) {
  const [continuity, framework, extension] = spec.bullets ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="charter-institution"
      className="authored-slide--charter"
    >
      <header className="authored-charter__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <section className="authored-charter__year" aria-label={spec.stat?.label}>
        <span>ROYAL CHARTER</span>
        <strong>{spec.stat?.value}</strong>
        <p>{spec.stat?.label}</p>
      </section>
      <div className="authored-charter__machine">
        <div className="authored-charter__seal" aria-label="王室特许授予经营权">
          <i aria-hidden="true" />
          <span>王室特许</span>
          <b>经营权</b>
        </div>
        <div className="authored-charter__capabilities" aria-label="公司持续组织远航贸易的三项能力">
          {[
            ["01", "筹资"],
            ["02", "签约"],
            ["03", "船队"]
          ].map(([number, label], index) => (
            <div key={label}>
              <span><b>{number}</b>{label}</span>
              {index < 2 && <i aria-hidden="true" />}
            </div>
          ))}
        </div>
        <p>{continuity}</p>
      </div>
      <div className="authored-charter__balance">
        <section>
          <span>组织能力</span>
          <strong>{framework}</strong>
        </section>
        <i aria-hidden="true" />
        <section>
          <span>权力代价</span>
          <strong>{spec.stat?.detail}</strong>
          <p>{extension}</p>
        </section>
      </div>
    </LightFrame>
  );
}

function CantonLondonPassageSlide({
  spec,
  position,
  diagram
}: AuthoredSlideProps) {
  const [firstLeg, secondLeg, thirdLeg, boundary] = spec.bullets ?? [];
  return (
    <article
      className="authored-slide authored-slide--canton-passage"
    >
      <PublicContext spec={spec} inverse />
      <header className="authored-canton-passage__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <figure className="authored-canton-passage__chart">
        {diagram}
      </figure>
      <div className="authored-canton-passage__compass" aria-hidden="true">
        <span>N</span>
        <i />
      </div>
      <ol className="authored-canton-passage__log" aria-label="广州至伦敦的三个航段">
        {[firstLeg, secondLeg, thirdLeg].map((leg, index) => (
          <li key={leg}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{leg}</strong>
          </li>
        ))}
      </ol>
      <p className="authored-canton-passage__boundary">
        <span>证据边界</span>
        {boundary}
      </p>
      <AuthoredFooter spec={spec} position={position} inverse />
    </article>
  );
}

function ConnectionThesisSlide({ spec, position }: AuthoredSlideProps) {
  const actors = ["产地", "港口", "船舶", "账簿", "资本", "市场"];
  return (
    <article
      className="authored-slide authored-slide--connection-thesis"
    >
      <PublicContext spec={spec} inverse />
      <header className="authored-connection-thesis__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div
        className="authored-connection-thesis__network"
        aria-label="产地、港口、船舶、账簿、资本与市场被持续连接"
      >
        <i className="authored-connection-thesis__line" aria-hidden="true" />
        <ol>
          {actors.map((actor, index) => (
            <li key={actor}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{actor}</strong>
              <i aria-hidden="true" />
            </li>
          ))}
        </ol>
        <div>
          <strong>{spec.stat?.value}</strong>
          <p>{spec.stat?.label}</p>
        </div>
      </div>
      <blockquote className="authored-connection-thesis__claim">
        {spec.stat?.detail}
      </blockquote>
      <ol className="authored-connection-thesis__proof">
        {(spec.bullets ?? []).map((bullet, index) => (
          <li key={bullet}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{bullet}</strong>
          </li>
        ))}
      </ol>
      <AuthoredFooter spec={spec} position={position} inverse />
    </article>
  );
}

function AbsoluteAdvantageParadoxSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="absolute-advantage-paradox"
      className="authored-slide--advantage-paradox"
    >
      <header className="authored-advantage-paradox__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div
        className="authored-advantage-paradox__equation"
        aria-label="两种产品都生产得更快，是否意味着应当全部自己生产"
      >
        <section>
          <span>江南型地区</span>
          <div><b>丝</b><i aria-hidden="true" /><b>粮</b></div>
          <strong>都更快</strong>
        </section>
        <div aria-hidden="true">?=</div>
        <section>
          <span>直觉判断</span>
          <strong>全部自己做</strong>
          <p>不需要交换</p>
        </section>
      </div>
      {spec.prompt && (
        <blockquote className="authored-advantage-paradox__prompt">
          {spec.prompt}
        </blockquote>
      )}
      <ol className="authored-advantage-paradox__path">
        {(spec.steps ?? []).map((step, index) => (
          <li key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </LightFrame>
  );
}

function ExchangeBargainingRangeSlide({ spec, position }: AuthoredSlideProps) {
  const [lowerExit, possibleTrade, upperExit, boundary] = spec.bullets ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="exchange-bargaining-range"
      className="authored-slide--exchange-range"
    >
      <header className="authored-exchange-range__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div
        className="authored-exchange-range__axis"
        aria-label="每匹丝交换粮食的可行区间介于2石与5石之间"
      >
        <div className="authored-exchange-range__segment authored-exchange-range__segment--left">
          <span>{lowerExit}</span>
        </div>
        <div className="authored-exchange-range__segment authored-exchange-range__segment--middle">
          <span>{possibleTrade}</span>
        </div>
        <div className="authored-exchange-range__segment authored-exchange-range__segment--right">
          <span>{upperExit}</span>
        </div>
        <div className="authored-exchange-range__point authored-exchange-range__point--two">
          <strong>2</strong>
          <span>江南型机会成本</span>
        </div>
        <div className="authored-exchange-range__price">
          <span>成交条件</span>
          <strong>P</strong>
          <b>2 ＜ P ＜ 5</b>
        </div>
        <div className="authored-exchange-range__point authored-exchange-range__point--five">
          <strong>5</strong>
          <span>湖广型机会成本</span>
        </div>
      </div>
      <p className="authored-exchange-range__definition">
        {spec.stat?.label} · {spec.stat?.detail}
      </p>
      <blockquote className="authored-exchange-range__boundary">
        {boundary}
      </blockquote>
    </LightFrame>
  );
}

function ProductionFrontierSlide({
  spec,
  position,
  diagram
}: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="production-frontier-story"
      className="authored-slide--production-frontier"
    >
      <header className="authored-production-frontier__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <aside className="authored-production-frontier__constraint">
        <span>共同约束</span>
        <strong>200</strong>
        <b>个劳动日</b>
        <i aria-hidden="true" />
        <p>总时间不变<br />用途可以改变</p>
      </aside>
      <figure className="authored-production-frontier__chart">
        {diagram}
      </figure>
      <div className="authored-production-frontier__shift" aria-label="平均分配与重新分工的产出变化">
        <span>平均分配</span>
        <strong>60，150</strong>
        <i aria-hidden="true">→</i>
        <span>重新分工</span>
        <strong>70，160</strong>
      </div>
      <ol className="authored-production-frontier__reading">
        {(spec.bullets ?? []).map((bullet, index) => (
          <li key={bullet}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{bullet}</strong>
          </li>
        ))}
      </ol>
    </LightFrame>
  );
}

function TradeModelBoundarySlide({ spec, position }: AuthoredSlideProps) {
  const [canExplain, cannotReplace] = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="trade-model-boundary"
      className="authored-slide--trade-boundary"
    >
      <header className="authored-trade-boundary__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-trade-boundary__field">
        <section>
          <span>01 · {canExplain?.heading}</span>
          <strong>{canExplain?.body}</strong>
          <p>{canExplain?.note}</p>
        </section>
        <div aria-label="模型解释与历史判断之间的边界">
          <span>MODEL</span>
          <strong>≠</strong>
          <b>正当化</b>
        </div>
        <section>
          <span>02 · {cannotReplace?.heading}</span>
          <strong>{cannotReplace?.body}</strong>
          <p>{cannotReplace?.note}</p>
        </section>
      </div>
      {spec.prompt && (
        <blockquote className="authored-trade-boundary__question">
          {spec.prompt}
        </blockquote>
      )}
    </LightFrame>
  );
}

function JiangnanSpecializationSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="jiangnan-specialization-landscape"
      className="authored-slide--jiangnan-specialization"
    >
      <header className="authored-jiangnan-specialization__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <ol
        className="authored-jiangnan-specialization__conditions"
        aria-label="江南专业化生产的四项条件"
      >
        {(spec.bullets ?? []).map((bullet, index) => (
          <li key={bullet}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i aria-hidden="true" />
            <strong>{bullet}</strong>
          </li>
        ))}
      </ol>
      <blockquote className="authored-jiangnan-specialization__thesis">
        土地 × 家庭 × 市镇 × 水路
      </blockquote>
    </ImageStoryFrame>
  );
}

function SilkProductionThreadSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="silk-production-thread"
      className="authored-slide--silk-thread"
    >
      <header className="authored-silk-thread__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <ol className="authored-silk-thread__chain" aria-label="丝绸生产的连续工序">
        {(spec.steps ?? []).map((step, index) => (
          <li key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i aria-hidden="true" />
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
      <p className="authored-silk-thread__handoff">
        每一次交接，都要传递质量、数量与时间信息。
      </p>
    </ImageStoryFrame>
  );
}

function GrainDependencyQuestionSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="grain-dependency-question"
      className="authored-slide--grain-dependency"
    >
      <header className="authored-grain-dependency__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div
        className="authored-grain-dependency__equation"
        aria-label="专业化扩大时日常粮食需求仍然存在"
      >
        <section>
          <span>更多资源投向</span>
          <strong>丝绸生产</strong>
          <b aria-hidden="true">↑</b>
        </section>
        <div aria-hidden="true">≠</div>
        <section>
          <span>日常需求</span>
          <strong>粮食消失</strong>
          <b aria-hidden="true">0</b>
        </section>
      </div>
      {spec.prompt && (
        <blockquote className="authored-grain-dependency__prompt">
          {spec.prompt}
        </blockquote>
      )}
      <ol className="authored-grain-dependency__links" aria-label="支撑专业化持续的四项粮食能力">
        {(spec.steps ?? []).map((step, index) => (
          <li key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i aria-hidden="true" />
            <strong>{step}</strong>
          </li>
        ))}
      </ol>
    </LightFrame>
  );
}

function GrainConfluenceSlide({ spec, position }: AuthoredSlideProps) {
  const [gather, hankou, supply, rhythm] = spec.bullets ?? [];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="grain-confluence"
      className="authored-slide--grain-confluence"
    >
      <header className="authored-grain-confluence__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-grain-confluence__flow" aria-label="分散余粮经汉口转化为跨区域供给">
        <section>
          <span>01 · 洞庭湖区与支流</span>
          <strong>分散余粮</strong>
          <p>{gather}</p>
        </section>
        <i aria-hidden="true">→</i>
        <section>
          <span>02 · 交易节点</span>
          <strong>汉口</strong>
          <p>{hankou}</p>
        </section>
        <i aria-hidden="true">→</i>
        <section>
          <span>03 · 长江干线</span>
          <strong>跨区域供给</strong>
          <p>{supply}</p>
        </section>
      </div>
      <p className="authored-grain-confluence__rhythm">
        <span>运输节奏</span>{rhythm}
      </p>
    </ImageStoryFrame>
  );
}

function YangtzeCorridorFlowSlide({
  spec,
  position,
  diagram
}: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="yangtze-corridor-flow"
      className="authored-slide--yangtze-flow"
    >
      <header className="authored-yangtze-flow__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <figure className="authored-yangtze-flow__chart">
        {diagram}
      </figure>
      <ol className="authored-yangtze-flow__roles" aria-label="长江区域分工中的四个角色">
        {(spec.bullets ?? []).map((bullet, index) => (
          <li key={bullet}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{bullet}</strong>
          </li>
        ))}
      </ol>
      <p className="authored-yangtze-flow__boundary">
        路线示意 · 展示区域分工关系，不表示唯一粮源或单一路径
      </p>
    </LightFrame>
  );
}

function HistoricalCompositeChainSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <article
      className="authored-slide authored-slide--historical-chain"
    >
      <PublicContext spec={spec} inverse />
      <header className="authored-historical-chain__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <ol className="authored-historical-chain__route" aria-label="历史综合链的四段证据">
        {(spec.columns ?? []).map((column, index) => (
          <li key={column.heading}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i aria-hidden="true" />
            <strong>{column.heading}</strong>
            <p>{column.body}</p>
            <b>{column.note}</b>
          </li>
        ))}
      </ol>
      <blockquote className="authored-historical-chain__boundary">
        <span>四段证据共同解释一套网络机制</span>
        <strong>≠</strong>
        <span>同一批货物的连续追踪记录</span>
      </blockquote>
      <AuthoredFooter spec={spec} position={position} inverse />
    </article>
  );
}

function NetworkPositionSlide({ spec, position }: AuthoredSlideProps) {
  const [changingCargo, durableNetwork] = spec.columns ?? [];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="network-position-legacy"
      className="authored-slide--network-position"
    >
      <header className="authored-network-position__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-network-position__contrast">
        <section>
          <span>01 · {changingCargo?.heading}</span>
          <strong>会换</strong>
          <p>{changingCargo?.body}</p>
        </section>
        <i aria-hidden="true" />
        <section>
          <span>02 · {durableNetwork?.heading}</span>
          <strong>会留下</strong>
          <p>{durableNetwork?.body}</p>
        </section>
      </div>
      <p className="authored-network-position__assets">
        港口 · 商人 · 账簿 · 信用 · 船队 · 保护
      </p>
    </ImageStoryFrame>
  );
}

function RecordableNetworkSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <article
      className="authored-slide authored-slide--recordable-network"
    >
      {spec.image && (
        <img
          className="authored-recordable-network__image"
          src={spec.image}
          alt={spec.imageAlt ?? ""}
          style={{
            objectFit: spec.imageFit ?? "cover",
            objectPosition: spec.imagePosition ?? "center"
          }}
        />
      )}
      <div className="authored-recordable-network__wash" />
      <PublicContext spec={spec} />
      <header className="authored-recordable-network__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-recordable-network__fields" aria-label="港口账簿的五类基础记录字段">
        {["船名", "货物", "数量", "来源", "去向"].map((field, index) => (
          <span key={field}><b>{String(index + 1).padStart(2, "0")}</b>{field}</span>
        ))}
      </div>
      <ol className="authored-recordable-network__effects">
        {(spec.bullets ?? []).map((bullet, index) => (
          <li key={bullet}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{bullet}</strong>
            {index < (spec.bullets?.length ?? 0) - 1 && <i aria-hidden="true">→</i>}
          </li>
        ))}
      </ol>
      <AuthoredFooter spec={spec} position={position} />
    </article>
  );
}

function FutureCargoFinanceSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="future-cargo-finance"
      className="authored-slide--future-finance"
    >
      <header className="authored-future-finance__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-future-finance__bridge" aria-label="金融把今天的筹资与未来的货流和销售连接起来">
        <section>
          <span>今天</span>
          <strong>筹资投入</strong>
        </section>
        <div>
          <i aria-hidden="true" />
          <p>股份 · 信贷 · 保险 · 票据</p>
          <b>跨越远航时间与集中风险</b>
        </div>
        <section>
          <span>未来</span>
          <strong>货流与销售</strong>
        </section>
      </div>
      <ol className="authored-future-finance__cycle" aria-label="未来货流转化为今日资本的四个环节">
        {(spec.bullets ?? []).map((bullet, index) => (
          <li key={bullet}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{bullet}</strong>
            {index < (spec.bullets?.length ?? 0) - 1 && <i aria-hidden="true">→</i>}
          </li>
        ))}
      </ol>
    </ImageStoryFrame>
  );
}

function CompanyEmpireCostSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="company-empire-cost"
      className="authored-slide--company-empire"
    >
      <header className="authored-company-empire__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-company-empire__judgment" aria-label="网络效率与正当性是不同的评价轴">
        <span>高效网络</span>
        <strong>≠</strong>
        <span>正当网络</span>
      </div>
      <ol className="authored-company-empire__chain">
        {(spec.bullets ?? []).map((bullet, index) => (
          <li key={bullet}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <i aria-hidden="true" />
            <strong>{bullet}</strong>
          </li>
        ))}
      </ol>
      {spec.prompt && (
        <blockquote className="authored-company-empire__question">
          {spec.prompt}
        </blockquote>
      )}
    </LightFrame>
  );
}

function PopulationMultiplierConclusionSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <article
      className="authored-slide authored-slide--population-multiplier"
    >
      <PublicContext spec={spec} inverse />
      <header className="authored-population-multiplier__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-population-multiplier__equation" aria-label="有限国内规模经可扩张网络放大为跨洲影响力">
        <section><span>起点</span><strong>有限国内规模</strong></section>
        <b aria-hidden="true">×</b>
        <section><span>乘数</span><strong>可扩张网络</strong></section>
        <b aria-hidden="true">=</b>
        <section><span>结果</span><strong>跨洲影响力</strong></section>
      </div>
      <ol className="authored-population-multiplier__systems">
        {(spec.columns ?? []).map((column, index) => (
          <li key={column.heading}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{column.heading}</strong>
            <p>{column.body}</p>
          </li>
        ))}
      </ol>
      {spec.prompt && (
        <blockquote className="authored-population-multiplier__boundary">
          {spec.prompt}
        </blockquote>
      )}
      <AuthoredFooter spec={spec} position={position} inverse />
    </article>
  );
}

function ModernMirrorTransitionSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="modern-mirror-transition"
      className="authored-slide--modern-mirror"
    >
      <header className="authored-modern-mirror__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-modern-mirror__time" aria-label="从帆船时代转向2023年的集装箱时代">
        <span>帆船时代</span>
        <i aria-hidden="true" />
        <strong>2023</strong>
        <b>集装箱时代</b>
      </div>
      <ol className="authored-modern-mirror__changes">
        {(spec.bullets ?? []).map((bullet, index) => (
          <li key={bullet}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{bullet}</strong>
          </li>
        ))}
      </ol>
    </ImageStoryFrame>
  );
}

function MegashipScaleEconomySlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="megaship-scale-economy"
      className="authored-slide--megaship-scale"
    >
      <header className="authored-megaship-scale__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <section className="authored-megaship-scale__number" aria-label={spec.stat?.label}>
        <strong>{spec.stat?.value}</strong>
        <span>{spec.stat?.label}</span>
        <p>{spec.stat?.detail}</p>
      </section>
      <div className="authored-megaship-scale__caveat">
        <span>设计箱位</span><strong>≠</strong><span>实际装载量</span>
      </div>
      <ol className="authored-megaship-scale__conditions">
        {(spec.bullets ?? []).map((bullet, index) => (
          <li key={bullet}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{bullet}</strong>
          </li>
        ))}
      </ol>
    </ImageStoryFrame>
  );
}

function MaritimeTradeShareSlide({ spec, position }: AuthoredSlideProps) {
  const [volumeMeaning, valueMeaning, conclusion] = spec.bullets ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="maritime-trade-share"
      className="authored-slide--maritime-share"
    >
      <header className="authored-maritime-share__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-maritime-share__metrics" aria-label="国际贸易货量与贸易价值中海运所占比例">
        <section>
          <span>国际贸易货量</span>
          <strong>&gt;80%</strong>
          <p>{volumeMeaning}</p>
        </section>
        <div aria-hidden="true">/</div>
        <section>
          <span>国际贸易价值</span>
          <strong>≈70%</strong>
          <p>{valueMeaning}</p>
        </section>
      </div>
      <p className="authored-maritime-share__definition">{spec.stat?.detail}</p>
      <blockquote className="authored-maritime-share__conclusion">
        {conclusion}
      </blockquote>
    </LightFrame>
  );
}

function DepartureFourChecksSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="departure-four-checks"
      className="authored-slide--departure-checks"
    >
      <header className="authored-departure-checks__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <ol className="authored-departure-checks__list" aria-label="启航前的四项判断">
        {(spec.table?.rows ?? []).map((row, index) => (
          <li key={row[0]}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{row[0]}</strong>
            <p>{row[1]}</p>
          </li>
        ))}
      </ol>
      {spec.prompt && (
        <blockquote className="authored-departure-checks__next">
          {spec.prompt}
        </blockquote>
      )}
    </ImageStoryFrame>
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

function RouteQuestionCoverSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="route-question-cover"
      className="authored-slide--route-question-cover"
    >
      <div className="authored-route-cover__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-route-cover__equation" aria-label="班轮航线的四项约束">
        {[
          ["MARKET", "市场"],
          ["PORT", "港口"],
          ["PASSAGE", "通道"],
          ["PROMISE", "时间承诺"]
        ].map(([label, value], index) => (
          <section key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            {index < 3 && <b aria-hidden="true">×</b>}
          </section>
        ))}
      </div>
      <blockquote>
        航线不是地图上的最短线，<strong>而是一组可以反复兑现的选择。</strong>
      </blockquote>
      <div className="authored-route-cover__counter" aria-label={`第${position.localIndex}页，共${position.localTotal}页`}>
        <span>第二讲</span>
        <strong>{String(position.localIndex).padStart(2, "0")} / {String(position.localTotal).padStart(2, "0")}</strong>
      </div>
    </ImageStoryFrame>
  );
}

function AsiaPortLogSlide({ spec, position }: AuthoredSlideProps) {
  const ports = ["上海", "厦门", "南沙", "香港", "盐田", "盖梅", "新加坡"];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="asia-port-log"
      className="authored-slide--asia-port-log"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-asia-log">
        <svg viewBox="0 0 1350 390" role="img" aria-label="上海至新加坡的亚洲段官方挂港顺序">
          <defs>
            <marker id="asiaLogArrow" markerHeight="9" markerWidth="9" orient="auto" refX="8" refY="4.5">
              <path d="M0 0L9 4.5L0 9Z" />
            </marker>
          </defs>
          <path className="authored-asia-log__coast" d="M60 45C208 70 260 170 379 178C493 186 532 116 647 137C784 162 780 282 921 277C1061 272 1110 205 1290 248" />
          <path className="authored-asia-log__route" d="M78 92C229 85 278 193 402 204C526 215 563 144 682 161C817 181 826 296 966 295C1088 294 1174 257 1290 278" markerEnd="url(#asiaLogArrow)" />
          {[78, 300, 492, 682, 850, 1032, 1270].map((x, index) => (
            <circle className={index === 0 || index === 6 ? "authored-asia-log__terminal" : undefined} cx={x} cy={[92, 157, 190, 161, 245, 289, 274][index]} key={x} r={index === 0 || index === 6 ? 15 : 11} />
          ))}
        </svg>
        {ports.map((port, index) => (
          <section className={`authored-asia-log__port authored-asia-log__port--${index + 1}`} key={port}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{port}</strong>
          </section>
        ))}
        <div className="authored-asia-log__logic">
          <span>亚洲段的共同任务</span>
          <strong>持续聚集货源</strong>
          <i aria-hidden="true" />
          <strong>接入远洋干线</strong>
        </div>
      </div>
      <p className="authored-asia-log__boundary">官方港序 · 路线示意 · 非实时 AIS</p>
    </LightFrame>
  );
}

function CorridorFieldSlide({ spec, position }: AuthoredSlideProps) {
  const bullets = spec.bullets ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="corridor-field"
      className="authored-slide--corridor-field"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-corridor-field">
        <div className="authored-corridor-field__edge authored-corridor-field__edge--origin">
          <span>持续供货</span>
          <strong>腹地与节点</strong>
        </div>
        <svg viewBox="0 0 980 430" role="img" aria-label="多条航线、港口节点与货流共同形成运输走廊">
          <defs>
            <linearGradient id="corridorBand" x1="0" x2="1">
              <stop offset="0" stopColor="#d8eee8" />
              <stop offset="0.5" stopColor="#82c9c2" />
              <stop offset="1" stopColor="#0f7183" />
            </linearGradient>
            <marker id="corridorArrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M0 0L8 4L0 8Z" />
            </marker>
          </defs>
          <path className="authored-corridor-field__band" d="M22 214C190 106 325 123 479 206C643 294 770 316 958 215" />
          <path className="authored-corridor-field__lane authored-corridor-field__lane--one" d="M18 168C183 73 336 95 486 172C655 260 789 282 960 180" markerEnd="url(#corridorArrow)" />
          <path className="authored-corridor-field__lane authored-corridor-field__lane--two" d="M18 216C190 124 330 145 486 220C651 300 782 325 960 230" markerEnd="url(#corridorArrow)" />
          <path className="authored-corridor-field__lane authored-corridor-field__lane--three" d="M18 264C193 175 326 188 485 268C640 346 785 363 960 278" markerEnd="url(#corridorArrow)" />
          {[185, 405, 620, 806].map((x, index) => <circle cx={x} cy={[116, 164, 278, 308][index]} key={x} r="16" />)}
        </svg>
        <div className="authored-corridor-field__edge authored-corridor-field__edge--market">
          <span>稳定需求</span>
          <strong>市场与班期</strong>
        </div>
        <ol>
          {bullets.map((bullet, index) => (
            <li key={bullet}>
              <span>0{index + 1}</span>
              <strong>{bullet}</strong>
            </li>
          ))}
        </ol>
      </div>
      <p className="authored-corridor-field__answer">一条线可以被画出来；一条走廊必须被货流与服务长期维持。</p>
    </LightFrame>
  );
}

function SingaporeConnectivitySlide({ spec, position }: AuthoredSlideProps) {
  const bullets = spec.bullets ?? [];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="singapore-connectivity"
      className="authored-slide--singapore-connectivity"
    >
      <div className="authored-singapore-connectivity__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-singapore-connectivity__network" aria-label="新加坡枢纽价值的三项连接能力">
        <svg viewBox="0 0 760 430" aria-hidden="true">
          <path d="M370 212C238 140 153 90 40 53" />
          <path d="M370 212C232 222 134 246 31 316" />
          <path d="M370 212C510 123 611 92 730 65" />
          <path d="M370 212C529 229 622 281 738 360" />
          <circle className="authored-singapore-connectivity__core" cx="370" cy="212" r="77" />
          {["40,53", "31,316", "730,65", "738,360"].map((point) => {
            const [cx, cy] = point.split(",").map(Number);
            return <circle cx={cx} cy={cy} key={point} r="13" />;
          })}
        </svg>
        <div className="authored-singapore-connectivity__core-label">
          <span>SGSIN</span>
          <strong>连接</strong>
        </div>
        {bullets.map((bullet, index) => (
          <section className={`authored-singapore-connectivity__proof authored-singapore-connectivity__proof--${index + 1}`} key={bullet}>
            <span>0{index + 1}</span>
            <strong>{bullet}</strong>
          </section>
        ))}
      </div>
      <blockquote>位置只给出入口；<strong>可接续性</strong>才让港口留在全球网络中心。</blockquote>
    </ImageStoryFrame>
  );
}

function LinerNetworkStrataSlide({ spec, position }: AuthoredSlideProps) {
  const layers = [
    { code: "SCHEDULE", label: "航线层", copy: spec.bullets?.[0] },
    { code: "TRANSFER", label: "节点层", copy: spec.bullets?.[1] },
    { code: "SUPPLY", label: "腹地层", copy: spec.bullets?.[2] }
  ];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="liner-network-strata"
      className="authored-slide--liner-network-strata"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-liner-strata">
        <svg viewBox="0 0 900 500" role="img" aria-label="腹地、港口节点和班轮循环组成的三层网络">
          <defs>
            <marker id="linerStrataArrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M0 0L8 4L0 8Z" />
            </marker>
          </defs>
          <path className="authored-liner-strata__loop" d="M150 78C150 24 281 5 450 5C619 5 750 24 750 78C750 132 619 151 450 151C281 151 150 132 150 78Z" markerEnd="url(#linerStrataArrow)" />
          {[206, 330, 450, 574, 697].map((x) => <circle className="authored-liner-strata__call" cx={x} cy="78" key={x} r="11" />)}
          <path className="authored-liner-strata__portline" d="M92 257H808" />
          {[155, 330, 510, 690].map((x) => <circle className="authored-liner-strata__port" cx={x} cy="257" key={x} r="23" />)}
          <path className="authored-liner-strata__feeder" d="M154 434V352L155 280M70 434L155 352M238 434L155 352" />
          <path className="authored-liner-strata__feeder" d="M430 434L510 349V280M510 434V349M590 434L510 349" />
          <path className="authored-liner-strata__feeder" d="M690 434V280M626 434L690 355M760 434L690 355" />
          {[70, 154, 238, 430, 510, 590, 626, 690, 760].map((x) => <rect className="authored-liner-strata__cargo" height="24" key={x} width="24" x={x - 12} y="422" />)}
        </svg>
        <div className="authored-liner-strata__labels">
          {layers.map((layer, index) => (
            <section className={`authored-liner-strata__label authored-liner-strata__label--${index + 1}`} key={layer.code}>
              <span>{layer.code}</span>
              <strong>{layer.label}</strong>
              <p>{layer.copy?.replace(/^.*?：/u, "")}</p>
            </section>
          ))}
        </div>
        <div className="authored-liner-strata__promise">
          <span>同一服务承诺</span>
          <strong>供货 → 聚散 → 循环</strong>
        </div>
      </div>
      <p className="authored-liner-strata__answer">港序只记录船靠过哪里；网络解释每一次靠港为什么有货、有连接、有下一程。</p>
    </LightFrame>
  );
}

function RouteClassificationLensSlide({ spec, position }: AuthoredSlideProps) {
  const columns = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="route-classification-lens"
      className="authored-slide--route-classification-lens"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-route-lens">
        <svg viewBox="0 0 760 520" aria-hidden="true">
          <circle className="authored-route-lens__orbit authored-route-lens__orbit--outer" cx="380" cy="260" r="218" />
          <circle className="authored-route-lens__orbit authored-route-lens__orbit--inner" cx="380" cy="260" r="126" />
          <path d="M380 260L188 98" />
          <path d="M380 260L610 139" />
          <path d="M380 260L375 500" />
          <circle className="authored-route-lens__core" cx="380" cy="260" r="82" />
        </svg>
        <div className="authored-route-lens__core-copy">
          <span>SAME NETWORK</span>
          <strong>同一海运网络</strong>
        </div>
        {columns.map((column, index) => (
          <section className={`authored-route-lens__view authored-route-lens__view--${index + 1}`} key={column.heading}>
            <span>视角 0{index + 1}</span>
            <h3>{column.heading}</h3>
            <p>{column.body}</p>
          </section>
        ))}
      </div>
      <div className="authored-route-lens__equation">
        <span>分类结果</span><b>=</b><strong>研究对象</strong><b>×</b><strong>分类口径</strong>
      </div>
      <p className="authored-route-lens__boundary">“五大”或“六大”可以服务不同问题，但不能被说成唯一固定标准。</p>
    </LightFrame>
  );
}

function MalaccaConvergenceSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="malacca-convergence"
      className="authored-slide--malacca-convergence"
    >
      <div className="authored-malacca-convergence__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-malacca-convergence__chart">
        <svg viewBox="0 0 820 430" role="img" aria-label="多方向船流在马六甲有限水域汇聚">
          <defs>
            <marker id="malaccaArrow" markerHeight="9" markerWidth="9" orient="auto" refX="8" refY="4.5">
              <path d="M0 0L9 4.5L0 9Z" />
            </marker>
          </defs>
          {[55, 125, 205, 295, 372].map((y, index) => (
            <path d={`M20 ${y}C210 ${y + (index - 2) * 24} 338 ${182 + index * 7} 515 213`} key={y} markerEnd="url(#malaccaArrow)" />
          ))}
          <path className="authored-malacca-convergence__exit" d="M565 213C650 218 720 248 800 305" markerEnd="url(#malaccaArrow)" />
          <rect className="authored-malacca-convergence__gate" height="168" rx="18" width="66" x="514" y="130" />
        </svg>
        <div className="authored-malacca-convergence__gate-copy">
          <span>LIMITED WATER</span>
          <strong>马六甲</strong>
        </div>
        <section className="authored-malacca-convergence__density">
          <span>上游</span>
          <strong>高密度交通</strong>
        </section>
        <section className="authored-malacca-convergence__impact">
          <span>下游</span>
          <strong>影响扩散到更大网络</strong>
        </section>
      </div>
      <blockquote>咽喉的影响范围，<strong>远大于地图上最窄的那一段。</strong></blockquote>
    </ImageStoryFrame>
  );
}

function SuezSharedDependencySlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="suez-shared-dependency"
      className="authored-slide--suez-shared-dependency"
    >
      <div className="authored-suez-dependency__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-suez-dependency__duality" aria-label="苏伊士运河同时压缩航程并集中船期依赖">
        <section>
          <span>VALUE</span>
          <strong>压缩航程</strong>
          <p>亚洲—欧洲获得一条高价值捷径</p>
        </section>
        <div>
          <i aria-hidden="true" />
          <b>同一服务系统</b>
          <i aria-hidden="true" />
        </div>
        <section>
          <span>EXPOSURE</span>
          <strong>集中依赖</strong>
          <p>大量班期共享同一个容量与秩序约束</p>
        </section>
      </div>
      <blockquote>苏伊士越有价值，<strong>它的服务波动越容易成为网络事件。</strong></blockquote>
    </ImageStoryFrame>
  );
}

function RiskPropagationWaveSlide({ spec, position }: AuthoredSlideProps) {
  const steps = spec.steps ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="risk-propagation-wave"
      className="authored-slide--risk-propagation-wave"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-risk-wave">
        <svg viewBox="0 0 1380 460" role="img" aria-label="局部通道中断沿船期、港口、中转和库存逐级传播">
          <defs>
            <linearGradient id="riskWaveStroke" x1="0" x2="1">
              <stop offset="0" stopColor="#de6b58" />
              <stop offset="0.48" stopColor="#d68a39" />
              <stop offset="1" stopColor="#173e55" />
            </linearGradient>
          </defs>
          <path className="authored-risk-wave__baseline" d="M35 230H1345" />
          <path className="authored-risk-wave__pulse" d="M35 230C130 230 146 190 210 190C278 190 294 295 365 295C444 295 456 120 548 120C650 120 653 348 765 348C876 348 882 70 1012 70C1144 70 1157 393 1345 393" />
          {[82, 330, 595, 895, 1240].map((x, index) => (
            <circle className={`authored-risk-wave__node authored-risk-wave__node--${index + 1}`} cx={x} cy={[230, 272, 174, 169, 350][index]} key={x} r={index === 0 ? 24 : 16} />
          ))}
        </svg>
        {steps.map((step, index) => (
          <section className={`authored-risk-wave__step authored-risk-wave__step--${index + 1}`} key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
            <i>{["局部", "船期", "港口", "中转", "供应链"][index]}</i>
          </section>
        ))}
        <div className="authored-risk-wave__scale">
          <span>发生位置</span>
          <i aria-hidden="true" />
          <strong>影响范围持续扩大</strong>
        </div>
      </div>
      <p className="authored-risk-wave__question">哪一段可以被更早、更可信的信息削弱？</p>
    </LightFrame>
  );
}

function ChokepointConstraintChainSlide({ spec, position }: AuthoredSlideProps) {
  const bullets = spec.bullets ?? [];
  const outcomes = ["等待形成", "冲击扩散", "恢复分化"];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="chokepoint-constraint-chain"
      className="authored-slide--constraint-chain"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-constraint-chain">
        <div className="authored-constraint-chain__origin">
          <span>LOCAL EVENT</span>
          <strong>通行受限</strong>
        </div>
        <svg viewBox="0 0 1060 360" aria-hidden="true">
          <defs>
            <marker id="constraintArrow" markerHeight="9" markerWidth="9" orient="auto" refX="8" refY="4.5">
              <path d="M0 0L9 4.5L0 9Z" />
            </marker>
          </defs>
          <path d="M30 180H1010" markerEnd="url(#constraintArrow)" />
          {[180, 520, 860].map((x) => <circle cx={x} cy="180" key={x} r="76" />)}
        </svg>
        {bullets.map((bullet, index) => {
          const [cause = bullet] = bullet.split("决定");
          return (
            <section className={`authored-constraint-chain__link authored-constraint-chain__link--${index + 1}`} key={bullet}>
              <span>约束 0{index + 1}</span>
              <strong>{cause}</strong>
              <i aria-hidden="true">↓</i>
              <p>{outcomes[index]}</p>
            </section>
          );
        })}
        <div className="authored-constraint-chain__reach">
          <span>NETWORK EFFECT</span>
          <strong>港口窗口 · 中转关系 · 腹地库存</strong>
        </div>
      </div>
      <p className="authored-constraint-chain__answer">“堵船”只描述了表面；完整解释必须说清等待、传播范围与恢复条件。</p>
    </LightFrame>
  );
}

function ReconstructedRouteEvidenceSlide({ spec, position, diagram }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="reconstructed-route-evidence"
      className="authored-slide--reconstructed-route"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-reconstructed-route">
        <figure aria-label="LL3亚欧航线教学路线示意">{diagram}</figure>
        <div className="authored-reconstructed-route__ledger">
          <section>
            <span>DOCUMENTED · 官方港序</span>
            <strong>亚洲段</strong>
            <p>上海 · 厦门 · 南沙 · 香港 · 盐田 · 盖梅 · 新加坡</p>
          </section>
          <section>
            <span>DOCUMENTED · 官方港序</span>
            <strong>欧洲段</strong>
            <p>比雷埃夫斯 · 汉堡 · 鹿特丹 · 泽布吕赫 · 瓦伦西亚</p>
          </section>
          <section className="authored-reconstructed-route__cycle">
            <span>SERVICE LOOP</span>
            <strong>84 天</strong>
            <p>去程、欧洲挂港与返程重新接回上海</p>
          </section>
        </div>
      </div>
      <div className="authored-reconstructed-route__boundary">
        <span>事实层</span><strong>港名与顺序</strong><b>≠</b><span>复原层</span><strong>逐段地理路径</strong>
        <em>路线示意 · 非实时 AIS</em>
      </div>
    </LightFrame>
  );
}

function CapeDetourTradeoffSlide({ spec, position }: AuthoredSlideProps) {
  const [gain, cost] = spec.columns ?? [];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="cape-detour-tradeoff"
      className="authored-slide--cape-detour"
    >
      <div className="authored-cape-detour__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-cape-detour__arc" aria-hidden="true">
        <svg viewBox="0 0 760 410">
          <defs>
            <marker id="capeArrow" markerHeight="10" markerWidth="10" orient="auto" refX="9" refY="5">
              <path d="M0 0L10 5L0 10Z" />
            </marker>
          </defs>
          <path d="M50 88C166 90 225 119 305 210C400 318 505 352 710 320" markerEnd="url(#capeArrow)" />
          <circle cx="50" cy="88" r="14" />
          <circle cx="710" cy="320" r="14" />
        </svg>
        <span>绕开单一通道</span>
        <strong>更长路径</strong>
      </div>
      <div className="authored-cape-detour__balance">
        <section>
          <span>GAIN · {gain?.heading}</span>
          <strong>{gain?.body}</strong>
          <p>路径可控性 ↑</p>
        </section>
        <b aria-hidden="true">↔</b>
        <section>
          <span>COST · {cost?.heading}</span>
          <strong>{cost?.body}</strong>
          <p>航程 · 燃料 · 时间 · 船队周转 ↑</p>
        </section>
      </div>
      <blockquote>绕航不是“免费避险”，而是用更多系统资源购买路径可控性。</blockquote>
    </ImageStoryFrame>
  );
}

function ContainerOriginSwitchSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="container-origin-switch"
      className="authored-slide--container-origin"
    >
      <div className="authored-container-origin__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-container-origin__subject">
        <span>FOLLOW THE CARGO</span>
        <strong>教学集装箱</strong>
        <i aria-hidden="true" />
        <p>镜头跟随对象从“海船”切换为“箱子”</p>
      </div>
      <div className="authored-container-origin__rails" aria-label="海船航次与教学集装箱链条的边界">
        <section>
          <span>海船航次</span>
          <strong>上海 → 欧洲</strong>
          <p>OOCL Spain 没有驶入重庆</p>
        </section>
        <b aria-hidden="true">≠</b>
        <section>
          <span>教学箱链条</span>
          <strong>重庆 → 上海 → 欧洲</strong>
          <p>供应链在海船离港前已经开始</p>
        </section>
      </div>
      <blockquote>海运网络不从海岸才开始；<strong>它从货源被组织的地方开始。</strong></blockquote>
    </ImageStoryFrame>
  );
}

function ContainerRelayChainSlide({ spec, position }: AuthoredSlideProps) {
  const stages = spec.steps ?? [];
  const labels = ["制造", "集结", "内河", "换装", "远洋"];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="container-relay-chain"
      className="authored-slide--container-relay"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-container-relay">
        <svg viewBox="0 0 1400 390" role="img" aria-label="教学集装箱从重庆工厂经果园港和长江到上海加入亚欧班轮">
          <defs>
            <linearGradient id="relayPath" x1="0" x2="1">
              <stop offset="0" stopColor="#d68a39" />
              <stop offset="0.5" stopColor="#118d8a" />
              <stop offset="1" stopColor="#173e55" />
            </linearGradient>
            <marker id="relayArrow" markerHeight="9" markerWidth="9" orient="auto" refX="8" refY="4.5">
              <path d="M0 0L9 4.5L0 9Z" />
            </marker>
          </defs>
          <path className="authored-container-relay__terrain" d="M32 250C177 197 273 252 395 242C542 230 609 130 744 151C884 173 947 248 1065 223C1184 198 1267 136 1370 122" />
          <path className="authored-container-relay__path" d="M58 237C201 188 283 239 409 227C548 214 622 118 753 140C888 163 951 231 1074 207C1194 184 1261 123 1360 109" markerEnd="url(#relayArrow)" />
          {[58, 355, 690, 1010, 1330].map((x, index) => (
            <g className="authored-container-relay__box" key={x} transform={`translate(${x - 29} ${[208, 205, 111, 181, 82][index]})`}>
              <rect height="52" rx="4" width="58" />
              <path d="M12 6V46M28 6V46M44 6V46" />
            </g>
          ))}
        </svg>
        {stages.map((stage, index) => (
          <section className={`authored-container-relay__stage authored-container-relay__stage--${index + 1}`} key={stage}>
            <span>{String(index + 1).padStart(2, "0")} · {labels[index]}</span>
            <strong>{stage}</strong>
          </section>
        ))}
        <div className="authored-container-relay__handoffs">
          <span>责任交接</span><i /><span>单证同步</span><i /><span>时刻衔接</span>
        </div>
      </div>
      <p className="authored-container-relay__boundary">移动的主语始终是教学集装箱；每一次换装都可能决定它能否赶上下一张时刻表。</p>
    </LightFrame>
  );
}

function NationalWaterwaySkeletonSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="national-waterway-skeleton"
      className="authored-slide--waterway-skeleton"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-waterway-skeleton">
        <svg viewBox="0 0 930 500" role="img" aria-label="四纵四横两网国家高等级航道概念骨架示意">
          <defs>
            <marker id="waterwayArrow" markerHeight="9" markerWidth="9" orient="auto" refX="8" refY="4.5">
              <path d="M0 0L9 4.5L0 9Z" />
            </marker>
          </defs>
          {[175, 345, 515, 685].map((x) => <path className="authored-waterway-skeleton__vertical" d={`M${x} 55V430`} key={x} />)}
          {[115, 215, 315, 415].map((y, index) => <path className={index === 1 ? "authored-waterway-skeleton__horizontal authored-waterway-skeleton__horizontal--yangtze" : "authored-waterway-skeleton__horizontal"} d={`M85 ${y}H820`} key={y} />)}
          <g className="authored-waterway-skeleton__mesh" transform="translate(690 52)">
            {[0, 35, 70, 105].map((v) => <path d={`M${v} 0V105`} key={`v${v}`} />)}
            {[0, 35, 70, 105].map((h) => <path d={`M0 ${h}H105`} key={`h${h}`} />)}
          </g>
          <g className="authored-waterway-skeleton__mesh" transform="translate(705 342)">
            {[0, 35, 70, 105].map((v) => <path d={`M${v} 0V105`} key={`v${v}`} />)}
            {[0, 35, 70, 105].map((h) => <path d={`M0 ${h}H105`} key={`h${h}`} />)}
          </g>
          <path className="authored-waterway-skeleton__guoyuan" d="M116 246C286 214 455 215 642 215C725 215 779 204 862 177" markerEnd="url(#waterwayArrow)" />
          <circle cx="116" cy="246" r="14" />
          <circle cx="862" cy="177" r="14" />
        </svg>
        <div className="authored-waterway-skeleton__label authored-waterway-skeleton__label--vertical"><strong>四纵</strong><span>南北联系</span></div>
        <div className="authored-waterway-skeleton__label authored-waterway-skeleton__label--horizontal"><strong>四横</strong><span>东西干线</span></div>
        <div className="authored-waterway-skeleton__label authored-waterway-skeleton__label--mesh"><strong>两网</strong><span>高密度区域网络</span></div>
        <div className="authored-waterway-skeleton__guoyuan-label"><span>果园港</span><i>→</i><strong>长江通道</strong><i>→</i><span>上海港</span></div>
        <div className="authored-waterway-skeleton__reading">
          {(spec.bullets ?? []).map((bullet, index) => <p key={bullet}><span>0{index + 1}</span>{bullet}</p>)}
        </div>
      </div>
      <p className="authored-waterway-skeleton__boundary">官方框架 · 教学骨架示意；它表达网络组织关系，不是工程或导航图。</p>
    </LightFrame>
  );
}

function WholeChainPromiseSlide({ spec, position }: AuthoredSlideProps) {
  const stages = ["重庆货源", "果园港", "长江", "上海", "亚洲挂港", "海峡与运河", "欧洲港口"];
  const roles = ["腹地", "节点", "走廊", "节点", "网络", "咽喉", "节点"];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="whole-chain-promise"
      className="authored-slide--whole-chain"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-whole-chain">
        <div className="authored-whole-chain__zones" aria-hidden="true"><span>内陆</span><span>海陆接口</span><span>远洋</span></div>
        <svg viewBox="0 0 1420 390" role="img" aria-label="重庆货源经果园港、长江、上海、亚洲挂港和两大咽喉抵达欧洲港口的全链条">
          <defs>
            <marker id="wholeChainArrow" markerHeight="10" markerWidth="10" orient="auto" refX="9" refY="5"><path d="M0 0L10 5L0 10Z" /></marker>
          </defs>
          <path className="authored-whole-chain__river" d="M35 252C185 194 278 267 405 239C550 207 580 143 720 169C851 194 912 259 1053 220C1182 184 1260 117 1382 137" />
          <path className="authored-whole-chain__route" d="M45 242C185 185 280 254 405 227C548 196 589 133 722 157C854 181 920 246 1054 208C1184 171 1252 106 1370 125" markerEnd="url(#wholeChainArrow)" />
          {[45, 250, 455, 688, 900, 1130, 1355].map((x, index) => <circle cx={x} cy={[242, 221, 210, 151, 237, 185, 124][index]} key={x} r={index === 0 || index === 6 ? 18 : 13} />)}
        </svg>
        {stages.map((stage, index) => (
          <section className={`authored-whole-chain__stage authored-whole-chain__stage--${index + 1}`} key={stage}>
            <span>{roles[index]}</span><strong>{stage}</strong>
          </section>
        ))}
        <div className="authored-whole-chain__promise"><span>ONE PROMISE</span><strong>同一交付承诺</strong><p>时间 · 状态 · 责任连续传递</p></div>
      </div>
      <p className="authored-whole-chain__question">请指出：哪一段是走廊？哪一处是咽喉？哪些节点把腹地接入远洋网络？</p>
    </LightFrame>
  );
}

function ResilienceCapabilityLoopSlide({ spec, position }: AuthoredSlideProps) {
  const columns = spec.columns ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="resilience-capability-loop"
      className="authored-slide--resilience-loop"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-resilience-loop">
        <svg viewBox="0 0 760 520" role="img" aria-label="预见、吸收、适应、恢复构成的网络韧性能力循环">
          <defs>
            <marker id="resilienceArrow" markerHeight="10" markerWidth="10" orient="auto" refX="9" refY="5"><path d="M0 0L10 5L0 10Z" /></marker>
          </defs>
          <path d="M380 45C550 45 675 120 675 260C675 400 550 475 380 475C210 475 85 400 85 260C85 120 210 45 380 45Z" markerEnd="url(#resilienceArrow)" />
          {["380,45", "675,260", "380,475", "85,260"].map((point) => { const [cx, cy] = point.split(",").map(Number); return <circle cx={cx} cy={cy} key={point} r="37" />; })}
          <circle className="authored-resilience-loop__core" cx="380" cy="260" r="102" />
        </svg>
        <div className="authored-resilience-loop__core-copy"><span>DISRUPTION</span><strong>受阻</strong><p>不是失败终点，而是能力检验</p></div>
        {columns.map((column, index) => (
          <section className={`authored-resilience-loop__capability authored-resilience-loop__capability--${index + 1}`} key={column.heading}>
            <span>0{index + 1}</span><strong>{column.heading}</strong><p>{column.body}</p>
          </section>
        ))}
        <blockquote>韧性不是不受阻；<strong>是受阻后仍能看见、缓冲、调整并重新同步。</strong></blockquote>
      </div>
      <p className="authored-resilience-loop__question">哪一种能力最依赖港口之间共享可信状态？</p>
    </LightFrame>
  );
}

function EuropePortQuestionSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="europe-port-question"
      className="authored-slide--europe-port-question"
    >
      <div className="authored-europe-question__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-europe-question__handoff">
        <section><span>VOYAGE 02</span><strong>路线回答</strong><p>船怎样抵达</p></section>
        <b aria-hidden="true">→</b>
        <section><span>VOYAGE 03</span><strong>港口回答</strong><p>怎样服务 · 创造何种价值</p></section>
      </div>
      <blockquote>同一艘船，为什么在不同港口创造不同价值？</blockquote>
      <div className="authored-europe-question__counter"><span>NEXT · PORT</span><strong>{String(position.localIndex).padStart(2, "0")} / {String(position.localTotal).padStart(2, "0")}</strong></div>
    </ImageStoryFrame>
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
  const rows = table?.rows ?? [];
  const metrics = table?.headers.slice(1, 4) ?? [];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="decision-fork-landscape"
      className="authored-slide--decision-matrix"
    >
      <EditorialHeader spec={spec} compact />
      {spec.prompt && (
        <div className="authored-decision-matrix__prompt">
          <span>先把目标放上桌</span>
          <strong>{spec.prompt}</strong>
        </div>
      )}
      <div className="authored-decision-fork" aria-label="等待、绕行与调整网络三条决策路径">
        <svg viewBox="0 0 1420 500" aria-hidden="true">
          <defs>
            <marker id="decisionForkArrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M0 0L8 4L0 8Z" />
            </marker>
          </defs>
          <path className="authored-decision-fork__path authored-decision-fork__path--1" d="M235 252C405 252 420 86 675 83" markerEnd="url(#decisionForkArrow)" />
          <path className="authored-decision-fork__path authored-decision-fork__path--2" d="M235 252C455 252 585 252 810 252" markerEnd="url(#decisionForkArrow)" />
          <path className="authored-decision-fork__path authored-decision-fork__path--3" d="M235 252C405 252 420 418 675 421" markerEnd="url(#decisionForkArrow)" />
        </svg>
        <div className="authored-decision-fork__origin">
          <span>OPTIMIZE</span>
          <strong>成本</strong>
          <b>可靠性</b>
          <em>客户服务</em>
        </div>
        {rows.map((row, rowIndex) => (
          <section
            className={`authored-decision-fork__route authored-decision-fork__route--${rowIndex + 1}`}
            key={row[0]}
          >
            <header>
              <span>路径 {String(rowIndex + 1).padStart(2, "0")}</span>
              <strong>{row[0]}</strong>
            </header>
            <dl>
              {row.slice(1, 4).map((value, metricIndex) => (
                <div key={`${row[0]}-${metrics[metricIndex]}`}>
                  <dt>{metrics[metricIndex]}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p>
              <span>核心风险</span>
              <strong>{row[4]}</strong>
            </p>
          </section>
        ))}
      </div>
      <div className="authored-decision-matrix__tradeoff">
        <span>任何选择都必须说明：</span>
        <strong>优化了什么，又放弃了什么？</strong>
      </div>
    </LightFrame>
  );
}

function PortValueQuestionCoverSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="port-value-question-cover"
      className="authored-slide--port-value-cover"
    >
      <div className="authored-port-value-cover__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-port-value-cover__equation" aria-label="靠泊、连接与价值的关系">
        <section><span>ARRIVAL</span><strong>靠泊</strong></section>
        <b aria-hidden="true">≠</b>
        <section><span>DELIVERY</span><strong>交付完成</strong></section>
        <i aria-hidden="true">→</i>
        <section><span>PORT VALUE</span><strong>组织整条链</strong></section>
      </div>
      <blockquote>港口的价值，不由船是否贴上码头决定，<strong>而由海陆系统能否继续运转决定。</strong></blockquote>
      <div className="authored-port-value-cover__counter"><span>第三讲</span><strong>{String(position.localIndex).padStart(2, "0")} / {String(position.localTotal).padStart(2, "0")}</strong></div>
    </ImageStoryFrame>
  );
}

function BerthingBeginningSlide({ spec, position }: AuthoredSlideProps) {
  const stages = ["靠泊", "卸下", "暂存", "转运", "放行", "进入腹地"];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="berthing-is-beginning"
      className="authored-slide--berthing-beginning"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-berthing-chain">
        <svg viewBox="0 0 1380 330" role="img" aria-label="船舶靠泊后集装箱仍需经过卸下、暂存、转运、放行和腹地连接">
          <defs>
            <marker id="berthingArrow" markerHeight="9" markerWidth="9" orient="auto" refX="8" refY="4.5"><path d="M0 0L9 4.5L0 9Z" /></marker>
          </defs>
          <path d="M70 165H1320" markerEnd="url(#berthingArrow)" />
          {[70, 320, 570, 820, 1070, 1320].map((x, index) => <circle className={index === 0 ? "authored-berthing-chain__start" : undefined} cx={x} cy="165" key={x} r={index === 0 ? 31 : 19} />)}
        </svg>
        {stages.map((stage, index) => (
          <section className={`authored-berthing-chain__stage authored-berthing-chain__stage--${index + 1}`} key={stage}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong>
            {index === 0 && <p>只是起点</p>}
          </section>
        ))}
        <div className="authored-berthing-chain__clock"><span>岸桥很快</span><strong>≠</strong><span>箱子很快离港</span></div>
      </div>
      {spec.prompt && <blockquote className="authored-berthing-chain__question">{spec.prompt}</blockquote>}
    </LightFrame>
  );
}

function ValueBeyondQuaySlide({ spec, position }: AuthoredSlideProps) {
  const bullets = spec.bullets ?? [];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="value-beyond-quay"
      className="authored-slide--value-beyond-quay"
    >
      <div className="authored-value-beyond__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-value-beyond__radius" aria-label="港口交付价值从海侧作业延伸到治理协同">
        <svg viewBox="0 0 760 520" aria-hidden="true">
          {[82, 145, 208, 272].map((r) => <circle cx="380" cy="260" key={r} r={r} />)}
          <path d="M380 260L650 142" />
        </svg>
        <div className="authored-value-beyond__core"><span>QUAY</span><strong>船边</strong></div>
        {bullets.map((bullet, index) => (
          <section className={`authored-value-beyond__layer authored-value-beyond__layer--${index + 1}`} key={bullet}>
            <span>0{index + 1}</span><strong>{bullet}</strong>
          </section>
        ))}
      </div>
      <blockquote>装卸发生在码头；<strong>价值兑现的边界一直延伸到腹地与治理。</strong></blockquote>
    </ImageStoryFrame>
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
  const zones = ["海侧", "港内", "陆侧", "协同"];
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="one-token-port-system"
      className="authored-slide--priority-investment"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-priority-landscape" aria-label="从海侧、港内、陆侧到协同机制的四个投资落点">
        <svg viewBox="0 0 1440 560" aria-hidden="true">
          <path className="authored-priority-landscape__water" d="M8 340C118 310 198 315 292 340C380 364 455 362 548 337" />
          <path className="authored-priority-landscape__quay" d="M548 337H793V440" />
          <path className="authored-priority-landscape__rail" d="M792 440H1415" />
          <path className="authored-priority-landscape__data" d="M330 116C572 37 866 37 1110 116C1240 159 1306 231 1355 311" />
          {[348, 676, 994, 1282].map((x) => <circle cx={x} cy={x === 676 ? 337 : x === 994 ? 440 : x === 1282 ? 359 : 327} key={x} r="12" />)}
        </svg>
        <div className="authored-priority-landscape__token">
          <span>ONLY ONE</span>
          <strong>1</strong>
          <p>枚优先投资令牌</p>
          <i>只能落下一处</i>
        </div>
        {rows.map((row, index) => (
          <section
            className={`authored-priority-landscape__option authored-priority-landscape__option--${index + 1}`}
            key={row[0]}
          >
            <span>{String(index + 1).padStart(2, "0")} · {zones[index]}</span>
            <h3>{row[0]}</h3>
            <dl>
              <div><dt>释放</dt><dd>{row[1]}</dd></div>
              <div><dt>仍遗漏</dt><dd>{row[2]}</dd></div>
            </dl>
          </section>
        ))}
        <div className="authored-priority-landscape__legend">
          <span>海</span><b>码头</b><strong>堆场</strong><em>腹地</em><i>共同信息层</i>
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
                  <div className="authored-generation-lens__ring-label">
                    <span>{row[0]}</span>
                    <strong>{row[1]}</strong>
                  </div>
                </div>
              );
            })}
          <div className="authored-generation-lens__core">
            <span>港口</span>
            <strong>能力组合</strong>
          </div>
        </div>
        <div className="authored-generation-lens__today">
          <div className="authored-generation-lens__scan-title">
            <span>TODAY · CAPABILITY SCAN</span>
            <strong>今天的港口仍需要什么？</strong>
          </div>
          <svg
            className="authored-generation-lens__constellation"
            viewBox="0 0 680 410"
            aria-hidden="true"
          >
            <path d="M335 221L178 130M335 221L501 116M335 221L174 319M335 221L505 314" />
            <path className="authored-generation-lens__orbit" d="M178 130C263 44 420 45 501 116M174 319C267 390 414 390 505 314" />
          </svg>
          <div className="authored-generation-lens__hub" aria-label="当代港口能力组合">
            <span>TODAY</span>
            <strong>组合使用</strong>
          </div>
          {rows.map((row, index) => (
            <section
              className={`authored-generation-lens__capability authored-generation-lens__capability--${index + 1}`}
              key={row[0]}
            >
              <i aria-hidden="true" />
              <span>{row[0]}</span>
              <h3>{row[1]}</h3>
              <strong>{row[2]}</strong>
            </section>
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

function BreakbulkSceneSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="breakbulk-act-one"
      className="authored-slide--breakbulk-act"
    >
      <div className="authored-breakbulk-act__number" aria-hidden="true">
        <span>ACT</span>
        <strong>01</strong>
      </div>
      <div className="authored-breakbulk-act__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-breakbulk-act__crossing" aria-label="传统件杂货过岸链条">
        <section><span>01</span><strong>船舱</strong><small>货物分散存放</small></section>
        <i aria-hidden="true" />
        <section><span>02</span><strong>吊具与人力</strong><small>逐票识别与搬运</small></section>
        <i aria-hidden="true" />
        <section><span>03</span><strong>码头前沿</strong><small>短存、交付、再组织</small></section>
      </div>
      <blockquote className="authored-breakbulk-act__question">
        如果只完成过岸，港口创造了什么价值？
      </blockquote>
    </ImageStoryFrame>
  );
}

function IndustrialSceneSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="industrial-act-two"
      className="authored-slide--industrial-act"
    >
      <div className="authored-industrial-act__copy">
        <span>ACT 02 · PORT-SIDE PRODUCTION</span>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-industrial-act__exchange" aria-label="港口与临港工业之间的物流交换">
        <section>
          <span>海侧输入</span>
          <strong>矿石 · 原油 · 粮食</strong>
          <small>大批量、连续到港</small>
        </section>
        <div aria-hidden="true"><b>PORT</b><i /><b>PLANT</b></div>
        <section>
          <span>产业输出</span>
          <strong>钢材 · 化工品 · 食品</strong>
          <small>加工后进入市场</small>
        </section>
      </div>
    </ImageStoryFrame>
  );
}

function LogisticsSceneSlide({ spec, position }: AuthoredSlideProps) {
  const services = ["拆拼箱", "仓储分拨", "运输衔接", "客户与信息"];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="logistics-act-three"
      className="authored-slide--logistics-act"
    >
      <div className="authored-logistics-act__copy">
        <span>ACT 03 · THE BOX ENTERS A NETWORK</span>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-logistics-act__console" aria-label="集装箱供应链服务网络">
        <div className="authored-logistics-act__core">
          <span>CONTAINER</span>
          <strong>箱</strong>
          <small>不只过岸</small>
        </div>
        {services.map((service, index) => (
          <section key={service}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{service}</strong>
          </section>
        ))}
      </div>
    </ImageStoryFrame>
  );
}

function CommunitySceneSlide({ spec, position }: AuthoredSlideProps) {
  const actors = ["港口", "航运", "海关", "铁路", "公路", "城市", "产业"];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="community-act-four"
      className="authored-slide--community-act"
    >
      <div className="authored-community-act__copy">
        <span>ACT 04 · SHARED NETWORK</span>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-community-act__orbit" aria-label="港口共同体协同网络">
        <div className="authored-community-act__core">
          <span>共同对象</span>
          <strong>同一条货流</strong>
          <small>状态 · 规则 · 时序</small>
        </div>
        {actors.map((actor, index) => (
          <span className={`authored-community-act__actor authored-community-act__actor--${index + 1}`} key={actor}>
            {actor}
          </span>
        ))}
      </div>
    </ImageStoryFrame>
  );
}

function AutomationLayerQuestionSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="automation-layer-question"
      className="authored-slide--automation-layer"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-automation-layer__equation" aria-label="自动设备不等于完整的第四代港口能力">
        <section><span>设备能力</span><strong>自动化</strong></section>
        <b>≠</b>
        <section><span>网络能力</span><strong>第四代港口</strong></section>
      </div>
      <div className="authored-automation-layer__stack">
        <section className="is-filled">
          <span>01</span><strong>设备层</strong><p>岸桥、水平运输、堆场与识别自动运行</p>
        </section>
        <section>
          <span>02</span><strong>组织层</strong><p>跨企业流程、数据语义和异常协同</p>
        </section>
        <section>
          <span>03</span><strong>治理层</strong><p>共同规则、责任边界、港群与城市协调</p>
        </section>
      </div>
      {spec.prompt && (
        <blockquote className="authored-automation-layer__prompt">{spec.prompt}</blockquote>
      )}
    </LightFrame>
  );
}

function FourPortVoyageMapSlide({ spec, position, diagram }: AuthoredSlideProps) {
  const ports = [
    ["CNSHA", "上海", "门户与规模"],
    ["SGSIN", "新加坡", "转运与连接"],
    ["GRPIR", "比雷埃夫斯", "综合港调用"],
    ["NLRTM", "鹿特丹", "工业与腹地"]
  ];
  return (
    <article
      className="authored-slide authored-slide--four-port-voyage"
    >
      <PublicContext spec={spec} inverse />
      <header className="authored-four-port-voyage__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-four-port-voyage__map">
        {diagram}
        <div className="authored-four-port-voyage__scan" aria-hidden="true" />
      </div>
      <div className="authored-four-port-voyage__ports">
        {ports.map(([code, name, role], index) => (
          <section key={code}>
            <span>{String(index + 1).padStart(2, "0")} · {code}</span>
            <strong>{name}</strong>
            <small>{role}</small>
          </section>
        ))}
      </div>
      <div className="authored-four-port-voyage__lens">
        <span>同船比较</span>
        <strong>海向连接 × 腹地 × 产业 × 服务 × 治理</strong>
      </div>
      <AuthoredFooter spec={spec} position={position} inverse />
    </article>
  );
}

function ChinaPortNetworkPositionSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="china-port-network-position"
      className="authored-slide--china-port-position"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-china-port-position__field">
        <svg viewBox="0 0 1120 420" role="img" aria-label="沿海、河口与内河港口的空间和网络关系示意">
          <defs>
            <marker id="chinaPortArrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
              <path d="M0 0L8 4L0 8Z" />
            </marker>
          </defs>
          <path className="authored-china-port-position__sea" d="M30 76C181 43 310 69 426 115C535 159 620 156 717 112C847 53 963 48 1090 79V420H30Z" />
          <path className="authored-china-port-position__river" d="M1083 73C935 102 866 164 780 205C673 256 585 275 445 291C313 306 184 335 52 387" markerEnd="url(#chinaPortArrow)" />
          <path className="authored-china-port-position__hinterland" d="M965 38C882 111 848 190 805 319" />
          <g transform="translate(930 80)"><circle r="32" /><text textAnchor="middle" y="6">沿海港</text></g>
          <g transform="translate(720 218)"><circle r="32" /><text textAnchor="middle" y="6">河口港</text></g>
          <g transform="translate(338 316)"><circle r="32" /><text textAnchor="middle" y="6">河港</text></g>
        </svg>
        <div className="authored-china-port-position__network-labels">
          <section><span>空间关系</span><strong>沿海 · 河口 · 内河</strong></section>
          <section><span>网络关系</span><strong>枢纽 · 门户 · 支线</strong></section>
        </div>
        <blockquote>位置描述“在哪里、连向哪里”，不是行政级别，也不是先进程度。</blockquote>
      </div>
    </LightFrame>
  );
}

function GuoyuanMultipleIdentitiesSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="guoyuan-multiple-identities"
      className="authored-slide--guoyuan-identities"
    >
      <div className="authored-guoyuan-identities__copy">
        <span>CHONGQING · GUOYUAN PORT</span>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-guoyuan-identities__target" aria-hidden="true">
        <i /><i /><span>果园港</span>
      </div>
      <div className="authored-guoyuan-identities__cards">
        {spec.columns?.map((column, index) => (
          <section key={column.heading}>
            <span>{String(index + 1).padStart(2, "0")} · {column.heading}</span>
            <strong>{column.body}</strong>
          </section>
        ))}
      </div>
    </ImageStoryFrame>
  );
}

function HinterlandBoundarySlide({ spec, position, diagram }: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="hinterland-beyond-fence"
      className="authored-slide--hinterland-boundary"
    >
      <EditorialHeader spec={spec} compact />
      <div className="authored-hinterland-boundary__body">
        <figure>
          {diagram}
          <span>港界</span>
        </figure>
        <div className="authored-hinterland-boundary__outside">
          <p>港口竞争力有一部分<br /><strong>不在港口里面</strong></p>
          <ol>
            {spec.bullets?.map((bullet, index) => (
              <li key={bullet}><span>{String(index + 1).padStart(2, "0")}</span><strong>{bullet}</strong></li>
            ))}
          </ol>
        </div>
      </div>
    </LightFrame>
  );
}

function DiagnosisBriefSceneSlide({ spec, position }: AuthoredSlideProps) {
  const signals = [
    ["VESSEL", "船舶等待"],
    ["YARD", "堆场占用"],
    ["GATE", "闸口拥堵"],
    ["DOCS", "单证延迟"]
  ];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="diagnosis-brief-scene"
      className="authored-slide--diagnosis-brief-scene"
    >
      <div className="authored-diagnosis-brief__alarm">
        <span>TEACHING SCENARIO · SYSTEM ALERT</span>
        <strong>只允许先解决一项</strong>
      </div>
      <div className="authored-diagnosis-brief__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-diagnosis-brief__signals" aria-label="四类并发症状">
        {signals.map(([code, label], index) => (
          <section key={code}>
            <span>{String(index + 1).padStart(2, "0")} · {code}</span>
            <strong>{label}</strong>
            <i aria-hidden="true" />
          </section>
        ))}
      </div>
    </ImageStoryFrame>
  );
}

function WholeVoyageAnswerSlide({ spec, position }: AuthoredSlideProps) {
  return (
    <article
      className="authored-slide authored-slide--whole-voyage-answer"
    >
      <PublicContext spec={spec} inverse />
      <header className="authored-whole-voyage-answer__heading">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </header>
      <div className="authored-whole-voyage-answer__route" aria-label="三讲完整因果链">
        <svg viewBox="0 0 1420 300" aria-hidden="true">
          <path d="M62 176C252 40 390 261 597 126C795 -4 892 272 1105 132C1203 68 1297 75 1362 121" />
        </svg>
        {spec.steps?.map((step, index) => (
          <section className={step === "港口" ? "is-port" : ""} key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </section>
        ))}
      </div>
      <div className="authored-whole-voyage-answer__verdict">
        <span>PORT IS AN INTERFACE</span>
        <strong>港口不是航次的终点，而是海陆系统交换价值的接口。</strong>
      </div>
      <AuthoredFooter spec={spec} position={position} inverse />
    </article>
  );
}

function NextLessonProductionSlide({ spec, position }: AuthoredSlideProps) {
  const stages = ["泊位计划", "岸桥分配", "堆场组织", "集卡调度"];
  return (
    <ImageStoryFrame
      spec={spec}
      position={position}
      composition="next-lesson-production"
      className="authored-slide--next-production"
    >
      <div className="authored-next-production__chapter" aria-hidden="true">
        <span>NEXT</span><strong>04</strong>
      </div>
      <div className="authored-next-production__copy">
        <p>{spec.kicker}</p>
        <h2>{spec.title}</h2>
        {spec.lead && <strong>{spec.lead}</strong>}
      </div>
      <div className="authored-next-production__chain" aria-label="下一讲码头生产链">
        {stages.map((stage, index) => (
          <section key={stage}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage}</strong>
          </section>
        ))}
      </div>
    </ImageStoryFrame>
  );
}

export const AUTHORED_TEACHING_SLIDE_KEYS: readonly string[] = [
  ...PILOT_AUTHORED_TEACHING_SLIDE_KEYS.filter(key=>key.startsWith("l1-")),
  ...PORT_LBL_SLIDES.map(page=>page.slideKey)
];

// Every current slide below has a dedicated, page-specific composition.


function ReliabilityCaseSlide({
  spec,
  position
}: AuthoredSlideProps) {
  return (
    <LightFrame
      spec={spec}
      position={position}
      composition="reliability-route-compare"
      className="authored-slide--reliability"
    >
      <EditorialHeader spec={spec} compact />
      <div className="editorial-reliability">
        <div className="editorial-reliability__axis" aria-hidden="true">
          {["下单日", "第10天", "第20天", "第30天", "第40天"].map((label, index) => (
            <span className={`editorial-reliability__axis-mark editorial-reliability__axis-mark--${index + 1}`} key={label}>
              {label}
            </span>
          ))}
        </div>
        <div className="editorial-reliability__routes">
          {spec.table?.rows.map((row, index) => (
            <section
              className={index === 0 ? "editorial-reliability__route editorial-reliability__route--stable" : "editorial-reliability__route editorial-reliability__route--volatile"}
              key={row[0]}
            >
              <header>
                <span>路线 {row[0]}</span>
                <strong>{row[1]}</strong>
                <small>平均提前期</small>
              </header>
              <div className="editorial-reliability__track" aria-label={`路线${row[0]}到货窗口`}>
                <div className="editorial-reliability__window">
                  <span>{index === 0 ? "窗口集中" : "窗口分散"}</span>
                  <strong>{row[2]}</strong>
                </div>
                <i className="editorial-reliability__mean" aria-hidden="true" />
              </div>
              <p>{row[3]}</p>
            </section>
          ))}
        </div>
        <div className="editorial-reliability__reading" aria-label="时间与波动的判断链">
          <span>读图顺序</span>
          {spec.bullets?.map((bullet, index) => (
            <div key={bullet}>
              <strong>{bullet}</strong>
              {index < (spec.bullets?.length ?? 0) - 1 && <i aria-hidden="true">→</i>}
            </div>
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


const authoredRenderers: Record<
  PilotAuthoredTeachingSlideKey,
  (props: AuthoredSlideProps) => ReactElement
> = {
  "l1-course-cover": CourseOpeningCoverSlide,
  "l1-1700-wager": WagerOpeningSlide,
  "l1-population-gap": PopulationGapSlide,
  "l1-france-england-scale": ChannelComparisonSlide,
  "l1-silk-in-london": SilkInLondonSlide,
  "l1-output-vs-influence": InfluenceQuestionSlide,
  "l1-eic-charter": CharterInstitutionSlide,
  "l1-china-direct-trade": DirectTradeEvolutionSlide,
  "l1-canton-1727-manifest": CantonManifestSlide,
  "l1-value-density": ValueDensityHoldSlide,
  "l1-canton-london-route": CantonLondonPassageSlide,
  "l1-london-redistribution": LondonRedistributionSlide,
  "l1-connects-not-makes": ConnectionThesisSlide,
  "l1-double-absolute-advantage": AbsoluteAdvantageParadoxSlide,
  "l1-absolute-vs-comparative": AdvantageQuestionSlide,
  "l1-jiangnan-huguang-model": ComparativeModelSlide,
  "l1-half-time-output": BaselineOutputSlide,
  "l1-opportunity-cost-table": OpportunityCostEquationSlide,
  "l1-reallocation-output": ReallocationGainSlide,
  "l1-exchange-range": ExchangeBargainingRangeSlide,
  "l1-production-possibility-frontier": ProductionFrontierSlide,
  "l1-opportunity-cost-activity": OpportunityCostActivitySlide,
  "l1-trade-model-boundary": TradeModelBoundarySlide,
  "l1-regional-division-timeline": RegionalDivisionTimelineSlide,
  "l1-jiangnan-specialization": JiangnanSpecializationSlide,
  "l1-silk-production-chain": SilkProductionThreadSlide,
  "l1-cash-crop-transition": CashCropDecisionSlide,
  "l1-grain-origin-question": GrainDependencyQuestionSlide,
  "l1-dongting-hankou-grain": GrainConfluenceSlide,
  "l1-yangtze-inland-trade": YangtzeCorridorFlowSlide,
  "l1-historical-composite-chain": HistoricalCompositeChainSlide,
  "l1-water-distance": WaterDistanceSlide,
  "l1-network-position": NetworkPositionSlide,
  "l1-port-books": RecordableNetworkSlide,
  "l1-finance": FutureCargoFinanceSlide,
  "l1-navy-state": NavyTradeTensionSlide,
  "l1-company-empire": CompanyEmpireCostSlide,
  "l1-industry-port-loop": IndustrialPortLoopSlide,
  "l1-population-not-limit": PopulationMultiplierConclusionSlide,
  "l1-modern-mirror": ModernMirrorTransitionSlide,
  "l1-scale-economies": MegashipScaleEconomySlide,
  "l1-water-cost-mechanisms": WaterCostMechanismSlide,
  "l1-four-modes": WaterCostSlide,
  "l1-maritime-share": MaritimeTradeShareSlide,
  "l1-time-has-price": ReliabilityCaseSlide,
  "l1-port-interface": PortInterfaceSlide,
  "l1-departure-cliffhanger": DepartureFourChecksSlide,
  "l2-cover": RouteQuestionCoverSlide,
  "l2-log-restored": AsiaPortLogSlide,
  "l2-explain-every-choice": RouteCluesSlide,
  "l2-port-rotation": PortRotationSlide,
  "l2-corridor-not-line": CorridorFieldSlide,
  "l2-cargo-consolidation": CargoConsolidationSlide,
  "l2-feeder-mainline": FeederMainlineSlide,
  "l2-hub-vs-gateway": HubGatewaySlide,
  "l2-singapore": SingaporeConnectivitySlide,
  "l2-transshipment": TransshipmentPanoramaSlide,
  "l2-liner-network": LinerNetworkStrataSlide,
  "l2-route-classifications": RouteClassificationLensSlide,
  "l2-malacca": MalaccaConvergenceSlide,
  "l2-indian-ocean": IndianOceanNextGateSlide,
  "l2-suez": SuezSharedDependencySlide,
  "l2-why-chokepoint": ChokepointSlide,
  "l2-canal-service-system": CanalServicePanoramaSlide,
  "l2-capacity-order-safety": CanalControlSlide,
  "l2-risk-propagation": RiskPropagationWaveSlide,
  "l2-chokepoint-chain": ChokepointConstraintChainSlide,
  "l2-reconstructed-route": ReconstructedRouteEvidenceSlide,
  "l2-disruption-brief": DisruptionBriefSlide,
  "l2-option-wait": WaitUncertaintySlide,
  "l2-option-cape": CapeDetourTradeoffSlide,
  "l2-option-network": NetworkRewireSlide,
  "l2-decision-table": DecisionMatrixSlide,
  "l2-container-origin": ContainerOriginSwitchSlide,
  "l2-guoyuan-role": GuoyuanRoleSlide,
  "l2-container-chain": ContainerRelayChainSlide,
  "l2-yangtze-corridor": YangtzeCorridorSlide,
  "l2-three-gorges": ThreeGorgesSlide,
  "l2-national-inland-network": NationalWaterwaySkeletonSlide,
  "l2-inland-hidden-costs": InlandHiddenCostsSlide,
  "l2-whole-chain": WholeChainPromiseSlide,
  "l2-resilience": ResilienceCapabilityLoopSlide,
  "l2-europe-cliffhanger": EuropePortQuestionSlide,
  "l3-cover": PortValueQuestionCoverSlide,
  "l3-berthing-not-completion": BerthingBeginningSlide,
  "l3-four-port-tasks": FourPortTasksSlide,
  "l3-value-beyond-quay": ValueBeyondQuaySlide,
  "l3-no-taxonomy-first": ServiceBoundarySlide,
  "l3-breakbulk-scene": BreakbulkSceneSlide,
  "l3-first-generation": FirstGenerationSlide,
  "l3-industrial-scene": IndustrialSceneSlide,
  "l3-second-generation": SecondGenerationSlide,
  "l3-logistics-scene": LogisticsSceneSlide,
  "l3-third-generation": ThirdGenerationSlide,
  "l3-community-scene": CommunitySceneSlide,
  "l3-fourth-generation": FourthGenerationSlide,
  "l3-generation-lens": GenerationLensSlide,
  "l3-automation-question": AutomationLayerQuestionSlide,
  "l3-four-port-map": FourPortVoyageMapSlide,
  "l3-shanghai-gateway": ShanghaiGatewaySlide,
  "l3-singapore-hub": SingaporeHubSlide,
  "l3-piraeus-call": PiraeusPortraitSlide,
  "l3-rotterdam-industry": RotterdamIndustrySlide,
  "l3-multiple-roles": MultipleRolesSlide,
  "l3-no-ranking": PortMatchActivitySlide,
  "l3-china-port-types": ChinaPortNetworkPositionSlide,
  "l3-coastal-river-inland": PortTypesTransectSlide,
  "l3-gateway-transshipment": GatewayTransshipmentSlide,
  "l3-industrial-city-port": IndustrialCitySlide,
  "l3-guoyuan-identities": GuoyuanMultipleIdentitiesSlide,
  "l3-hinterland-view": HinterlandBoundarySlide,
  "l3-diagnosis-brief": DiagnosisBriefSceneSlide,
  "l3-diagnosis-vessel": VesselDiagnosisSlide,
  "l3-diagnosis-yard": YardDiagnosisSlide,
  "l3-diagnosis-hinterland": HinterlandDiagnosisSlide,
  "l3-diagnosis-information": InformationDiagnosisSlide,
  "l3-priority-investment": PriorityInvestmentSlide,
  "l3-whole-voyage-answer": WholeVoyageAnswerSlide,
  "l3-next-lesson": NextLessonProductionSlide
};

export function renderAuthoredTeachingSlide(
  spec: PortManagementSlideSpec,
  position: PortManagementLessonSlidePosition,
  diagram?: ReactNode
): ReactElement | null {
  const renderer =
    authoredRenderers[spec.slideKey as PilotAuthoredTeachingSlideKey];
  if (renderer) return renderer({ spec, position, diagram });
  // Deliberately do not fall back to the generic Editorial* compositions.
  // A new slide must receive a page-specific renderer before it can enter the deck.
  return null;
}
