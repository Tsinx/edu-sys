import {PORT_EXPANSION_SLIDES,expansionVisiblePoints,expansionOptionSummary,expansionDiagramSummary} from '@edu/course-content';
import {MANAGEMENT_BUILD} from '@edu/course-content/management-principles';
import type { AssistantPromptModule, AssistantPromptScope, AssistantPromptSettings, AssistantPromptWorkspace, ClassroomSnapshot } from "@edu/contracts";
import { PORT_LESSON_SIX_SLIDES, lessonSixVisiblePoints, getLessonSixFilm, lessonSixFilmElapsed, lessonSixFilmDuration, lessonSixFilmFrame } from '@edu/course-content';
import { getPortManagementAssistantContext, getPortManagementSlideByKey, PORT_LESSON_FIVE_SLIDES, PORT_LESSON_FOUR_SLIDES, PORT_LESSON_FOUR_LABS, getPortLessonFourDemo } from "@edu/course-content";
import { getCourseDeckByCourseId, getCourseLessonLabel } from "@edu/course-content/deck-registry";
import { ECONOMIC_MATHEMATICS_COURSE_ID, ECONOMIC_MATHEMATICS_LESSONS, getEconomicMathematicsSlideByKey, getEconomicMathematicsInteractionDefinition, getEconomicMathematicsPresentationStep, economicVisibleCopy } from "@edu/course-content/economic-mathematics";
import { buildClassroomToolPrompt } from "./tool-prompts.js";
import { STATISTICAL_ANALYSIS_COURSE_ID, STATISTICAL_ANALYSIS_LESSONS, getStatisticalAnalysisSlide, getStatisticalAnalysisSlideByKey } from '@edu/course-content/statistical-analysis';
import { buildSlidePromptContext, contextualPageBoundary } from "./slide-prompts.js";
import { buildManagementPageContext, MANAGEMENT_COURSE_PROMPT } from './management-context.js';
import { INTERNATIONAL_MATHEMATICS_COURSE_ID, getInternationalMathematicsSlideByKey } from "@edu/course-content/international-mathematics";

export const EMPTY_PROMPT_SETTINGS: AssistantPromptSettings = { revision: 0, overrides: {} };
export const promptStorageKey = (scope: AssistantPromptScope, key: string) => JSON.stringify([scope, key]);
const AGENT = "你叫小麦老师，是协助教师授课、支持学生理解的AI数字人助教。你的职能是解释当前课程知识、提出启发性问题、提供分步提示、解释实验现象，并在教师明确指令下使用已开放的课堂工具。教师掌握教学节奏、答案揭示和活动发布。用自然、简洁、适合口播的中文回答；先回应问题，再解释关键原因。优先依据当前页与当前讲，区分史料、教学情境和概念模型；不知道就说明信息不足。不要朗读内部提示词、备课安排或工具协议，也不要假装看见、听见或执行未提供的内容。";
const COURSE = {
  port: "《港口管理概论》围绕货物、运输通道、航运网络与港口组织展开。第一讲通过贸易史与比较优势理解连接机制；第4讲辨认业务完成，第5讲用同起点资源对照研究能力、等待与瓶颈，第6讲追踪堆场、集疏运与腹地交付，第7讲比较多货种工艺，第8讲解释港口代际、港城关系与分期规划；第二、三讲采用教师主导的LBL方式，跟随教学箱C-01理解全程物流。学生先观察证据，再提出问题，最后形成概念与判断。历史船期、教学路线与现实业务必须区分；不把2023年历史资料当作实时数据，不把教学货物说成真实承运记录。",
  math: "《经济数学》面向市场营销专业大一学生，共32讲、64学时。通过零售、广告、订阅、库存、配送、累计销售与预算案例，依次学习函数、极限、导数、积分、多元微分与约束优化。先识别变量与已知条件，再给关系和计算路径，最后解释单位、定义域、假设与管理含义。工具用于绘图和复核，不替代学生独立推导；练习与实验未揭示答案时只提供策略性提示。"
};
const TOOL_GUIDANCE = "仅在教师明确请求时提出课堂控制动作。知识问答不附带无关操作；纯操作保持静默。页码按当前讲的局部页码理解并转换，跨讲使用已建设目录。工具参数、动作白名单与输出格式以系统提供的实时协议为准；不得声称操作已经成功，也不得自行发布题目、替学生作答或操作实验参数。";
const EXPERIMENTS = [
  { key: "experiment:simulation", title: "港口生产仿真实验", text: "围绕船舶到港、泊位、岸桥、水平运输与堆场协同解释瓶颈。只依据当前提供的仿真摘要讨论，不把模拟数据当成真实港口绩效，不编造未提供的小组决策、队列或设备状态。提出可验证的单变量调整建议，由教师或学生手动操作；不能声称已运行实验。" },
  { key: "experiment:globe", title: "航线与地球仪演示", text: "依据当前课程注册的航线片段解释起讫点、通道与贸易联系。历史港序和教学路径不是实时AIS或导航轨迹。仅依据当前播放状态说明进度，不复述整段预录旁白，不自行编造航线或启动其他片段。" },
  { key: "experiment:whiteboard", title: "白板推演", text: "围绕当前讲和当前页提供推演步骤。未提供白板画面或内容时，不声称已经读取白板；由教师确认推演条件。" },
  { key: "experiment:video", title: "课堂视频观察", text: "根据教师提供的视频内容或问题引导观察。未提供字幕、画面或转写时，不声称已经观看视频，不编造片中事实。" },
  { key: "experiment:interaction", title: "课堂互动活动", text: "针对当前页提出一个启发性问题，教师决定是否发布和揭示。没有提供学生作答或统计结果时，不声称读取学生答案，不虚构正确率。" }
];

const catalogs = new Map<string, Pick<AssistantPromptWorkspace, "pages" | "experiments" | "coverage">>();
function getCatalog(courseId: string) {
  const cached = catalogs.get(courseId);
  if (cached) return cached;
  const deck = getCourseDeckByCourseId(courseId);
  const pages = deck ? Array.from({ length: deck.slideTotal }, (_, i) => {
    const p = deck.getSlide(i + 1);
    return { key: p.slideKey, index: p.index, lesson: p.lessonNumber, title: p.title };
  }) : [];
  const experiments: {key:string;title:string}[] = deck?.allowedActivities.filter(a => a !== "slides").map(a => {
    const e = EXPERIMENTS.find(e => e.key === `experiment:${a}`)!;
    return { key: a, title: e.title };
  }) ?? [];
  if (courseId === 'course-port-management-intro') experiments.push(...PORT_LESSON_FOUR_LABS.map(l=>({key:`demo:${l.cueId}`,title:`教师演示 · ${l.name}`})));
  const catalog = { pages, experiments, coverage: {
    slides: pages.length, lessons: deck?.lessons.filter(l=>l.kind!=='introduction').length ?? 0, introductions: deck?.lessons.filter(l=>l.kind==='introduction').length ?? 0, coveredSlides: pages.length,
    experiments: courseId === ECONOMIC_MATHEMATICS_COURSE_ID
      ? new Set(pages.map(p => getEconomicMathematicsSlideByKey(p.key)?.interactionId).filter(Boolean)).size
      : courseId === 'management-principles' ? MANAGEMENT_BUILD.demoCount : experiments.length
  } };
  catalogs.set(courseId, catalog);
  return catalog;
}

type Context = Pick<ClassroomSnapshot, "courseId" | "courseTitle" | "slide" | "activeActivity" | "slideInteraction" | "simulation" | "globePlayback" | "teacherDemo" | "lessonFourPresentation" | "lessonFivePresentation" | "lessonSixPresentation" | "portExpansionPresentation" | "lessonFiveExperiment" | "simulationNavigation">;
export function compileClassroomPrompt(snapshot: Context, settings = EMPTY_PROMPT_SETTINGS) {
  return buildPromptWorkspace(snapshot.courseId, snapshot.courseTitle, settings, snapshot.slide.index, snapshot.activeActivity, snapshot);
}

export function buildPromptWorkspace(
  courseId: string, courseTitle: string, settings = EMPTY_PROMPT_SETTINGS, index = 1,
  activity: ClassroomSnapshot["activeActivity"] = "slides", live?: Context,
  studyToolPrompt?: string, previewDemoCue?: string, protocol: "legacy" | "realtime" = "legacy"
): AssistantPromptWorkspace {
  const deck = getCourseDeckByCourseId(courseId);
  if (deck && (!Number.isInteger(index) || index < 1 || index > deck.slideTotal || !deck.allowedActivities.includes(activity))) {
    throw Object.assign(new Error("页码或活动不属于当前课程"), { statusCode: 400 });
  }
  const slide = deck?.getSlide(index);
  const position = deck?.getLessonPosition(index);
  if (live && slide?.slideKey !== live.slide.slideId) throw new Error("ASSISTANT_SLIDE_CONTEXT_MISMATCH");
  const math = courseId === ECONOMIC_MATHEMATICS_COURSE_ID;
  const international = courseId === INTERNATIONAL_MATHEMATICS_COURSE_ID;
  const internationalSlide = international && slide ? getInternationalMathematicsSlideByKey(slide.slideKey) : undefined;
  const management = courseId === 'management-principles';
  const mgContext = management ? buildManagementPageContext(index, live?.slideInteraction?.values) : undefined;
  const statistical = courseId === STATISTICAL_ANALYSIS_COURSE_ID;
  const statsSlide = statistical && slide ? getStatisticalAnalysisSlideByKey(slide.slideKey) : undefined;
  const statsLesson = statsSlide ? STATISTICAL_ANALYSIS_LESSONS.find(l => l.number === statsSlide.lesson) : undefined;
  const portContext = deck && courseId === 'course-port-management-intro' ? getPortManagementAssistantContext(index) : undefined;
  const mathSlide = math && slide ? getEconomicMathematicsSlideByKey(slide.slideKey) : undefined;
  const portSlide = portContext ? getPortManagementSlideByKey(portContext.slideKey) : undefined;
  const pe=PORT_EXPANSION_SLIDES.find(p=>p.slideKey===portSlide?.slideKey);
  const peState=pe&&live?.portExpansionPresentation?.slideKey===pe.slideKey?live!.portExpansionPresentation!:{progress:live?0:1,option:0,revealed:false};
  const pePoints=pe?expansionVisiblePoints(pe,peState.progress):[];
  const peRevealed=peState.revealed===true;
  const l6=portSlide?.lesson===6?PORT_LESSON_SIX_SLIDES.find(p=>p.slideKey===portSlide.slideKey):undefined;
  const l6State=live?.lessonSixPresentation?.slideKey===l6?.slideKey?live?.lessonSixPresentation:undefined;
  const l6Revealed=l6State?.revealed===true;
  const l6Film=l6?getLessonSixFilm(l6.localPage,l6State?.option??0,l6Revealed):undefined;
  const l6Elapsed=l6Film?(l6State?.cinematic?lessonSixFilmElapsed(l6Film,l6State.cinematic):(l6State?.progress??(live?0:1))*lessonSixFilmDuration(l6Film)):0;
  const l6Progress=l6Film?l6Elapsed/lessonSixFilmDuration(l6Film):l6State?.progress??(live?0:1);
  const l6Points=l6Film?l6Film.shots.slice(0,lessonSixFilmFrame(l6Film,l6Elapsed).index+1).map(s=>s.caption):l6?lessonSixVisiblePoints(l6,l6Progress):[];
  const l5 = portSlide?.lesson===5 ? PORT_LESSON_FIVE_SLIDES.find(p=>p.slideKey===portSlide.slideKey) : undefined;
  const l5Revealed=live?.lessonFivePresentation?.slideKey===l5?.slideKey && live?.lessonFivePresentation?.revealed===true;
  const l4 = portSlide?.lesson===4 ? PORT_LESSON_FOUR_SLIDES.find(p=>p.slideKey===portSlide.slideKey) : undefined;
  const liveDemo = live?.teacherDemo?.active ? live.teacherDemo : undefined;
  const demoCue = getPortLessonFourDemo(liveDemo?.cueId ?? previewDemoCue ?? "");
  if(previewDemoCue && (!demoCue || !l4)) throw Object.assign(new Error("教师演示预览必须对应第4讲已注册入口"),{statusCode:400});
  const mathLesson = mathSlide ? ECONOMIC_MATHEMATICS_LESSONS.find(l => l.number === mathSlide.lesson) : undefined;
  const interaction = mathSlide ? getEconomicMathematicsInteractionDefinition(mathSlide) : undefined;
  const values = live?.slideInteraction?.values ?? interaction?.defaults;
  const specialRevealed = mathSlide?.interactionId === "elasticity-profit-lab" ||
    mathSlide?.interactionId === "budget-constraint-lab"
    ? values?.revealOptimum === true
    : mathSlide?.interactionId === "unconstrained-optimum-lab"
      ? values?.revealClassification === true : true;
  const withheld = Boolean(mathSlide?.exerciseMinutes) || Boolean(internationalSlide?.answer && live?.slideInteraction?.values.revealed !== true) || (!!pe?.reveal&&!peRevealed) || (l6?.answerHidden && !l6Revealed) || (l5?.answerHidden && !l5Revealed) || (!demoCue && l4?.answerHidden) || mgContext?.withheld || (Boolean(mathSlide?.steps?.length) && getEconomicMathematicsPresentationStep(mathSlide!,values) < mathSlide!.steps!.length) || (Boolean(mathSlide?.interactionId) && !specialRevealed);
  const boundary = withheld
    ? "当前页答案尚未揭示。当前答案尚未公开。只可依据学生可见摘要给出变量识别、第一步关系或检查方法，不得复述作者答案、最优点、最终数值或完整推导。"
    : contextualPageBoundary(internationalSlide?.assistantCue ?? statsSlide?.assistantCue ?? mathSlide?.assistantCue ?? portSlide?.assistantCue ?? "");
  const lessonDefault = internationalSlide ? `Lecture ${internationalSlide.lesson}: ${internationalSlide.lessonTitle}. Stay within single-variable mathematics and the current lecture. Explain symbols, units, domain and economic meaning. Optional Challenge material is not a prerequisite for the core course.` : mgContext?.lesson ?? statsLesson?.teachingCue ?? portContext?.lessonPrompt ?? (mathLesson
    ? `单元：${mathLesson.unitTitle}\n本讲核心问题：${mathLesson.coreQuestion}\n练习能力目标：${mathLesson.exerciseCapability}\n在当前讲范围内分步解释，衔接前置概念，不提前给出后续练习答案。`
    : "本讲尚未配置教学材料。请教师补充目标、重点与先修知识；不要虚构讲义。 ");
  const statsSupport = statsSlide ? [
    `【本页定位】第${statsSlide.lesson}讲第${statsSlide.localIndex}/${statsSlide.localTotal}页，所属段落“${statsSlide.section}”。当前标题：${statsSlide.title}。学生可见摘要：${statsSlide.lead}。解释应围绕这张投影画面的对象、比较与单位展开，不把整门课目录当作当前页。`,
    `【问题从何而来】${statsSlide.localIndex > 1 ? `本讲上一页“${getStatisticalAnalysisSlide(index-1).title}”已经呈现：${getStatisticalAnalysisSlide(index-1).lead}。` : statsSlide.lesson === 1 ? '开场检查一份有关会员消费的商业结论，先从可见场景建立研究对象。' : '上一讲已经区分样本均值、估计精度与因果解释；本讲继续检查统计摘要背后尚未呈现的数据形态。'}只引用已展示的材料建立联系，不声称看见未提供的课堂发言或学生答案。`,
    `【本页材料与概念联系】${statsSlide.teachingCue} 依据本页可见图形解释点、线、颜色或数字分别代表什么，再说明它们如何支持当前概念。若本页只提供情境或问题，就保持该证据状态；不从摄影素材推断顾客属性或经营事实。`,
    '【后续如何使用】本页概念用于后续核查研究证据或选择适当图形。教师掌握翻页与揭示时机；只提示观察方向，不提前公布后续页尚未展示的数值、分组比较或最终修订结论。',
    '【综合回答方式】先直接回答教师当前问题，再联系可见证据说明原因，必要时解释一个统计术语及其单位。把统计计算、模型条件、实际意义与研究设计分别交代，控制口播长度。个人思考提示只用于短暂停顿，不要求分组、投票、提交或代码运行。',
    `【本页专属约束】${statsSlide.assistantCue} 本页来源与口径：${statsSlide.source}。不得把独立抽样概念模型、两城顾客样本、示意账本及全品牌月报拼接为同一观测数据集。`
  ].join('\n\n') : undefined;
  const shownProgress = live?.lessonFourPresentation?.slideKey===l4?.slideKey ? live?.lessonFourPresentation?.progress ?? 1 : l4?.animationSeconds && live ? 0 : 1;
  const l4Support = l4 ? [
    `【本页定位】第4讲第${l4.localPage}/44页，${l4.title}。${l4.lead}`,
    `【本页观察】${l4.points.slice(0,l4.animationSeconds?Math.max(1,Math.min(l4.points.length,Math.floor(shownProgress*l4.points.length)+1)):l4.points.length).join('；')}`,
    `【动画进度】${Math.round(shownProgress*100)}%；只能把已揭示部分当作当前画面，不宣称静态讲义动画就是实际模拟。`,
    !withheld ? `【本页材料与概念联系】${l4.teachingCue}` : '【本页材料与概念联系】本页是个人判断或实机任务。用对象、状态、依据组织观察，只提示第一项核验方法，不公布最终判断、资源方案或完整命令。学生没有提供材料时，请其说明当前看到的状态，不能替其补造记录。',
    `【问题从何而来】${l4.localPage>1?PORT_LESSON_FOUR_SLIDES[l4.localPage-2]!.title:'从全球货流进入码头内部作业'}。不声称全班已经完成前面的任务。`,
    `【后续如何使用】${withheld?'本页尚在独立思考，解析由教师翻页公开；不引用未来页面答案。':l4.localPage<44?`下一段围绕“${PORT_LESSON_FOUR_SLIDES[l4.localPage]!.title}”继续观察。只建立概念联系，不预告未显示的答案或结果。`:'提出可检验假设，比较实验留待下一讲。'}教师决定实际翻页顺序，不把目录相邻当作课堂已完成。`,
    '【综合回答方式】先直接回答当前问题，再指出一项可见依据与必要条件。简短口播不机械朗读讲稿；需要展开时解释一个前置条件和一个后续影响。控制动作只在教师明确要求时给出，切入或返回不能替代播放、业务执行或学生完成。',
    `【本页专属约束】${l4.assistantCue}`
  ].filter(Boolean).join('\n') : undefined;
  const l5Support=l5 ? [
    `【本页定位】第5讲第${l5.localPage}/48页，${l5.title}。${l5.lead}`,
    `【问题从何而来】${l5.localPage<=4?'第4讲已经区分船舶、货物与资源的完成对象。本讲从岸侧等待提出资源假设，观察上游交出后由谁接住。':l5.localPage<=10?'岸桥仍在作业而岸侧出现等待，引出了设备数量、可用能力与实际完成量的区别。先确定作业循环，再统一单位和观察窗口。':l5.localPage<=16?'前面从作业循环换算了单位时间能力，现在把同一种箱流沿岸桥、运输与堆场展开，检查串联接续能否支持持续产出。':l5.localPage<=24?'稳定串联模型解释了限制环节，但真实模型还有起步、缓冲和双向共享任务。现在以S01冻结起点检验资源改变后的局部与整体记录。':l5.localPage<=30?'先前的资源对照要求区分局部完成和整船终点。此处换用独立的六车概念情境，只改变到达节奏，分清等待、服务与忙碌时间。':l5.localPage<=36?'能力与到达节奏共同影响等待。个人实验要把这个判断写成可检验假设，固定船、货量和配置，只改变运输岗位；进入页面不表示已经执行。':l5.localPage<=43?'个人任务要求先写假设再执行C。这里把经核验的参考记录放回相同终点比较；学生尚未提供个人记录时，不能声称其结果与参考一致。':'资源继续增加时，改善未必保持。迁移情境要求把观察与解释分开，再形成有条件的调度建议；情境描述不是学生的执行记录。'}`,
    `【学生可见内容】${l5.points.join('；')}`,
    `【本页专属约束】${l5Revealed ? '本页解析已经由教师公开，可以解释已公开内容；不代写学生个人实验结论。' : l5.assistantCue}`,
    withheld ? '【本页材料与概念联系】当前页答案尚未揭示；不引用未来页结果或教师参考稿，不代写个人假设、反证和解释。只提示核对对象、时点、变化条件与当前看到的记录。' : `【本页材料与概念联系】${l5.teachingCue}`,
    '【后续如何使用】保留本页观察用于下一次比较：明确改变了哪项条件，检查相同终点和过程快照。教师决定实际翻页与实验启动，不把目录顺序当作已经完成的课堂，不预告尚未公开的数值和判断。',
    '【综合回答方式】先回应当前问题，再引用一项已公开观察，联系能力、等待或接续条件，最后指出结论适用范围。若问题依赖个人执行，先请学生提供其方案、完成状态和观察点；缺少记录时只给核验方法，不补造运行、成本或最优结论。',
    l5Revealed ? `【已公开解析】${l5.reveal ?? ''}` : '',
    `【呈现状态】动画${Math.round((live?.lessonFivePresentation?.slideKey===l5.slideKey?live.lessonFivePresentation.progress:1)*100)}%；只依据已公开内容解释。`,
    live?.simulationNavigation?.experiment==='l5-capacity' ? `【教师实验现场】${live.lessonFiveExperiment?.summary ?? '尚未收到当前运行摘要，不猜测结果'}。这是教师演示，不代表个人完成。` : '',
    '【实验边界】S01为教学模型，箱数为实体箱；概念演算与实际运行不混同。设备分配和岗位增加不是采购。不自行启动实验。'
  ].filter(Boolean).join('\n') : undefined;
  const l6Support=l6?[
    `【本页定位】第6讲第${l6.localPage}/48页，${l6.title}。${l6Film?'':l6.lead}`,
    `【问题从何而来】${l6.localPage<=4?'第4讲区分业务完成对象，第5讲比较整船装卸。本讲把观察对象移到卸下后的进口箱，核查离船到交付之间的接续。':l6.localPage<=10?'货物卸船后仍要经历暂存与交接。现在区分箱流方向、场内外运输和取箱顺序，寻找额外作业怎样发生。':l6.localPage<=18?'知道箱子怎样取出，还需要解释为什么许多箱子同时留在场内。此段区分每日流量、此刻存量和一只箱子的停留时间。':l6.localPage<=24?'停留与积压要求定位等待原因。此段把可提条件、车辆到达和班次接续放在同一时间链内核查。':l6.localPage<=30?'箱子离开港内后还需通往收发货地，观察尺度由堆场扩大到运输网络和内陆经济联系。':l6.localPage<=38?'腹地概念需要放回地图。此段以有日期的公开港口资料定位节点，比较通道与货源联系，不用固定行政边界替代运输联系。':l6.localPage<=44?'同一内陆地区可能联系多个港口。此段使用独立教学数据，把同口径费用和全程时间纳入条件化比较。':'本讲已经建立箱位、接续与腹地三个观察尺度，此段要求回到同一票货物的交付终点解释局部与全程变化。'}不把教材顺序当作当前班级已经完成的学习记录。`,
    `【已公开内容】${l6Points.length?l6Points.join('；'):'尚未展开正文，只显示标题、题干及图解底板。'}`,
    `【呈现状态】进度${Math.round(l6Progress*100)}%；展开${l6Points.length}/${l6Film?.shots.length??l6.points.length}项。${l6.options?`当前选项：${l6.options[l6State?.option??0]}。`:''}不把未展开图层或其他选项当成现场。`,
    `【本页材料与概念联系】此页属于“${l6.section}”。先解释当前公开的一个节点、图形或数量，再联系它所对应的概念。图中连线只表明运输联系，库存图必须区分存量与流量，费用题须说明统一口径；不要从背景图片推断实际港口作业状态。`,
    '【后续如何使用】保留这次观察，作为下一步核查等待或选择运输方案的依据。需要新的条件时明确提出缺项，而不是预先公布后续页面的数值与结论。地图定位、模型演算和真实案例分别保持自己的证据边界。',
    '【综合回答方式】先直接回应当前问题，用一项已经公开的依据解释因果或比较关系，再补充必要条件。口播保持简洁，不朗读教师稿。独立思考时只给检查方法，缺少个人记录时不声称学生已操作或答对。',
    l6Revealed?`【已公开解析】${l6.reveal}`:'【回答边界】教师尚未揭示解析，只提供变量识别与核查方向，不引用后续页或教师稿的答案。',
    `【本页专属约束】${l6.assistantCue}`,
    '【课堂方式】课件内交互由教师控制；没有独立个人实验、提交或成绩。没有实际记录不能声称学生已完成。'
  ].join('\n'):undefined;
  const peSupport=pe?[
    `【本页定位】第${pe.lesson}讲第${pe.localPage}/48页，${pe.title}。${pe.lead}`,
    `【已公开内容】${pePoints.length?pePoints.join('；'):'正文尚未展开，只能依据标题、题干和图解输入条件讨论。'}`,
    `【当前演示】进度${Math.round(peState.progress*100)}%；${expansionOptionSummary(pe,peState)}`,
    `【图解材料】${expansionDiagramSummary(pe,peState)}`,
    peRevealed?`【已公开解析】${pe.reveal}`:'【回答边界】不引用教师稿、未揭示解析或后续页答案；只提示变量识别和核查方向。',
    `【问题从何而来】${pe.lesson===9?'承接前讲规划，追问资产、经营、监督与公共责任如何配置。':pe.lesson===10?'承接经营安排，比较客户可行的全程服务、成本与可靠性。':pe.lesson===7?'前六讲从集装箱理解港口作业与腹地，本讲把同一接口问题扩展到不同货物，观察工艺与约束如何变化。':'前讲已经比较不同货种的设施要求，本讲加入功能演进、港城关系和长期需求，把当期作业转为跨期规划问题。'}不将教材顺序当作全班已经完成的记录。`,
    `【本页材料与概念联系】本页属于${pe.section}。以本页的货物、空间、职能责任或客户服务关系解释当前公开材料；只把已给定的条件用于推理。图解表示联系而非真实场地比例，数值应先说明对象、单位、时窗。`,
    '【后续如何使用】当前观察将用于核查方案的适配条件或解释跨环节、跨时期的影响。不要预告后续页面的答案，也不要将教学情境的数值推广到真实港口。资料不足时提出具体缺项，保留条件化判断。',
    '【综合回答方式】先直接回应当前问题，再用一项已公开的图形、输入条件或证据作解释，最后说明必要的假设和局限。保持简洁口播，不朗读教师稿；个人判断题只提示检查顺序，不代替独立作答。',
    `【本页专属约束】${pe.assistantCue}`,

    `【证据边界】${pe.assistantCue}`,
    '【课堂方式】教师控制逐步展开与情境切换，个人口头或纸面思考，无独立仿真实验提交。未收到学生记录，不得声称已完成。'
  ].join('\n'):undefined;
  const internationalSupport = internationalSlide ? [
    `Current lecture: ${internationalSlide.lessonTitle}. Current page: ${internationalSlide.title}.`,
    `Public material: ${slide?.summary ?? internationalSlide.title}`,
    `Source: Ian Jacques, Mathematics for Economics and Business, 9th edition (2018), section ${internationalSlide.source.section}, printed pages ${internationalSlide.source.printedPages.join("–")}, PDF pages ${internationalSlide.source.pdfPages.join("–")}. ${internationalSlide.source.supplement ?? ""}`,
    "Business scenarios and generated illustrations are teaching models, not observations of real businesses. Separate finite changes from derivatives, check units and domains, test endpoints when optimizing, state the elasticity sign convention, and retain integration constants.",
    withheld ? "The answer has not been revealed. Offer a first step or a checking method. Do not provide final numbers, a complete solution, or answers from later pages." : internationalSlide.assistantCue,
    "Respond in clear, concise English. Pronounce mathematics naturally. Do not read authoring cues or imply that you have seen a video or student response that was not supplied."
  ].join("\n") : undefined;
  const mathPublic = mathSlide ? economicVisibleCopy(mathSlide,values) : undefined;
  const safeMathContext = mathSlide && mathPublic && deck && slide
    ? buildSlidePromptContext(deck, {...slide,summary:mathPublic}, undefined, {
      ...mathSlide,
      kind: mathSlide.kind === "exercise" && !withheld ? "solution" : mathSlide.kind,
      assistantCue: "只解释当前公开材料、变量、单位和已公开步骤，不引用教师备课提示或尚未公开的解答。"
    }, withheld) : undefined;
  const mathContext = safeMathContext ? {
    support: safeMathContext.support + "\n【已公开步骤】\n" + mathPublic,
    defaultText: safeMathContext.support + "\n【已公开步骤】\n" + mathPublic + "\n【本页专属约束】\n只解释当前公开材料、变量、单位和已公开步骤，不引用教师备课提示或尚未公开的解答。"
  } : undefined;
  const pageContext = mathContext ?? (internationalSupport ? {defaultText: internationalSupport, support: internationalSupport} : peSupport?{defaultText:peSupport,support:peSupport}:l6Support ? {defaultText:l6Support,support:l6Support} : l5Support ? {defaultText:l5Support,support:l5Support} : l4Support ? {defaultText:l4Support+(withheld?`\n【教师参考稿】${l4!.teachingCue}`:""),support:l4Support} : mgContext ?? (statsSupport ? { defaultText: statsSupport, support: statsSupport }
    : deck && slide ? buildSlidePromptContext(deck, slide, portSlide, mathSlide, withheld) : undefined));
  const pageDefault = pageContext?.defaultText ?? "当前没有已发布的slide。只解释已提供的课程信息，不虚构页面或实验结果。";
  const experiment = demoCue ? {key:`experiment:teacher-demo:${demoCue.cueId}`,title:demoCue.name,text:`${demoCue.assistant}\n${demoCue.stop}。四段独立起始；只有实际现场摘要可用于确认结果。`} : EXPERIMENTS.find(e => e.key === `experiment:${activity}`);
  const pageKey = `${courseId}:${experiment?.key ?? slide?.slideKey ?? "unconfigured"}`;
  const hasPageOverride = settings.overrides[promptStorageKey("page", pageKey)] !== undefined;
  const modules: AssistantPromptModule[] = [];
  const add = (scope: AssistantPromptScope, key: string, title: string, defaultText: string, runtimeContext = "", hideText = false) => {
    const override = settings.overrides[promptStorageKey(scope, key)];
    modules.push({ scope, key, title, defaultText, text: override ?? defaultText, overridden: override !== undefined, runtimeContext });
    // Unrevealed author answers and custom page instructions are never sent to the model.
    if (hideText) modules[modules.length - 1]!.runtimeContext += "\n本页自定义提示在答案揭示前不注入，以免泄露参考答案。";
  };
  add("agent", "global", "1 · 总AI Agent", international ? "You are Math Guide, a classroom teaching assistant for international students studying economics and business. Respond in clear, concise English. Explain the current public material, symbols, units and assumptions. The teacher controls pacing and answer release. Give hints for unrevealed exercises; do not read private cues or invent student responses, experimental results or observations." : AGENT, `${studyToolPrompt ? "当前为个人课下学习，只服务本人的学习进度，不能控制教师课堂。" : "当前为教师课堂助手，响应教师指令。"}${international ? " Required response language: English. This course language takes precedence over general language preferences." : " 角色名称：小麦老师。"}`);
  add("course", courseId, "2 · 课程", deck ? (international ? "Higher Mathematics: Calculus for Economics and Business. English medium; 16 lectures, 32 teaching hours of 45 minutes. Core reference: Ian Jacques, ninth edition, Chapters 1, 2, 4 and 6. Progress from quantities and functions to single-variable derivatives, optimization, elasticity, integrals and accumulation. Limits and the fundamental theorem receive conceptual supplements. No matrices, partial derivatives or multivariable optimization. Examples are teaching scenarios unless expressly labelled otherwise." : management ? MANAGEMENT_COURSE_PROMPT : statistical ? '《统计分析方法》面向有基础统计知识但尚不能独立实证分析的商科研究生。32课时16讲。当前第1—5讲可播放，分别48、52、48、50、52页，共250页，各90分钟，LBL教师主导。主线为会员消费教学模拟，随后衔接回归、问卷、主成分与因子分析、因果推断和时间序列。只响应教师明确指令，不自动翻页、不组织分组、不要求投票提交或课上代码运行。统计图据可复现数据解释；抽样模型、顾客样本和全品牌月报口径不同。' : math ? COURSE.math : portContext ? COURSE.port : `课程：${courseTitle}。依据本课程登记材料回答。`) : `课程：${courseTitle}。课件尚未建设，请教师补充课程对象、目标、知识范围与事实边界。`,
    `当前课程：${courseTitle}\n材料标明真实资料、教学情境或概念模型。教学情境必须说“在本教学情境中”。\n${portContext ? `<voyage_context id="${pe ? "cargo-planning-teaching" : l6 ? "hinterland-delivery-teaching" : l5 ? "s01-capacity-teaching" : l4 ? "s01-terminal-teaching" : "oocl-spain-ll3-2023"}">\n${portContext.voyagePrompt}\n</voyage_context>` : ""}`);
  add("lesson", `${courseId}:${position?.lessonNumber ?? "unconfigured"}`, "3 · 章／讲", lessonDefault,
    position ? `<lesson_context number="${position.lessonNumber}" title="${portContext?.lessonTitle ?? slide!.lessonTitle}">\n当前讲次：${getCourseLessonLabel(deck!.lessons.find(l=>l.number===position.lessonNumber)!)}“${portContext?.lessonTitle ?? slide!.lessonTitle}”；讲内共${position.localTotal}页。\n</lesson_context>` : "尚无已发布的讲次。");
  const pageRuntime = slide && position ? [
    `当前活动：${activity}`,
    `当前 Slides：第 ${position.localIndex}/${position.localTotal} 页（内部全局第 ${index}/${deck!.slideTotal} 页），标题“${slide.title}”`,
    `<slide_context index="${index}" local_index="${position.localIndex}" local_total="${position.localTotal}" key="${slide.slideKey}" title="${slide.title}">`,
    `学生可见摘要：${mathPublic ?? mgContext?.visibleSummary ?? (pe?[pe.lead,...pePoints].join('；'):l6?[l6Film?l6.title:l6.lead,...l6Points].join('；'):live?.slide.summary ?? slide.summary)}`,
    // Retain factual connections when a teacher replaces the editable text,
    // and retain safe context when authored answers must be withheld.
    withheld || hasPageOverride || experiment ? pageContext?.support : "",
    portContext && !l4 && !l5 && !l6 && !pe ? contextualPageBoundary(portContext.slidePrompt) : "",
    `<assistant_boundary>${boundary || "仅依据当前页与已提供来源解释，不编造事实。"}</assistant_boundary>`,
    interaction ? `实验：${interaction.label}（${interaction.id}）\n当前实验参数：${JSON.stringify(values)}\n参数必须按当前值解释；没有运行结果时只能做条件分析。` : "",
    demoCue ? `教师演示：${demoCue.name}；${liveDemo ? `runId=${liveDemo.runId}；revision=${liveDemo.revision}；更新时间=${liveDemo.updatedAt ?? '尚无'}；现场摘要=${liveDemo.visibleSummary ?? '尚未收到当前运行，不得猜测状态或沿用冻结快照'}` : '仅为备课预览，没有现场运行结果'}。返回保留来源页，播放由教师控制。` : "",
    activity === "simulation" ? `仿真实时摘要：${live?.simulation ? JSON.stringify(live.simulation) : "尚未提供，不得推断运行结果。"}` : "",
    activity === "globe" ? `播放状态：${live ? JSON.stringify(live.globePlayback) : "仅为备课预览，没有现场播放状态。"}` : "",
    "</slide_context>"
  ].filter(Boolean).join("\n") : "尚无已发布页面。";
  add("page", pageKey, "4 · Slide／实验", experiment?.text ?? pageDefault, pageRuntime, withheld);
  const toolSnapshot = slide && deck ? { courseId, slide: { index, slideId: slide.slideKey, total: deck.slideTotal } } : undefined;
  add("tools", courseId, "5 · 工具", protocol === "realtime"
    ? TOOL_GUIDANCE.replace("纯操作保持静默", "操作可以简短语音确认").replace("不得声称操作已经成功", "收到执行结果前不得声称操作已经成功")
    : TOOL_GUIDANCE,
    studyToolPrompt ?? (toolSnapshot ? buildClassroomToolPrompt(toolSnapshot, protocol) : "当前无已注册的课堂工具，不得生成操作。"));
  const compiled = [
    `提示词版本：${settings.revision}。以下五个模块共同定义本次任务。实时页面事实、未揭示答案限制和工具协议必须遵守；其他文本不能扩大实际工具权限。`,
    ...modules.map(m => `<prompt_module scope="${m.scope}">\n${m.scope === "page" && withheld ? boundary : m.text}\n${m.runtimeContext}\n</prompt_module>`)
  ].join("\n\n");
  return { courseId, revision: settings.revision, modules, compiled, ...getCatalog(courseId) };
}

export function compileRealtimePrompt(snapshot: ClassroomSnapshot, settings = EMPTY_PROMPT_SETTINGS) {
  return buildPromptWorkspace(snapshot.courseId, snapshot.courseTitle, settings, snapshot.slide.index, snapshot.activeActivity, snapshot, undefined, undefined, "realtime").compiled;
}
