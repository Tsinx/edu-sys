import { getPortManagementAssistantContext, getPortManagementSlideByKey, type PortManagementSlideSpec } from "@edu/course-content";
import type { CourseDeckDescriptor, CourseDeckSlideSummary } from "@edu/course-content/deck-registry";
import { ECONOMIC_MATHEMATICS_LESSONS, getEconomicMathematicsSlideByKey, type EconomicMathematicsSlideSpec } from "@edu/course-content/economic-mathematics";

// These are conceptual connections, not claims about whether the class has
// visited a page. Page-specific evidence is read from the authored courseware.
const PORT_CONNECTIONS: Record<string, string> = {
  "课程开场": "本讲从贸易怎样放大一个经济体的联系范围出发，把历史证据、分工模型与现代港口连接起来。港口的意义需要放在货物、市场和运输组织之间理解。",
  "1700年的赌局": "人口规模是一项初始条件，却不能直接推出后来的贸易影响力。把人口比较转为对港口、贸易网络、制度和国家能力的证据追问，避免用结局倒推历史必然性。",
  "沿丝织品寻找网络": "商品采购记录只能说明链条中的一个环节；运输、验收和销售还需要对应证据。由一件商品追问连接它的市场与组织，才可从单次买卖转向贸易网络。",
  "极端比较优势模型": "生产率高低回答谁做得更多，机会成本回答有限资源应怎样分配。先辨认资源约束和放弃的另一种产出，再讨论专业化与交换的可能收益；效率结论不等于分配公平或自愿交换。",
  "江南—湖广—海港": "区域专业化使粮食、丝织品和海港市场产生互补需求，水路运输使分散地区得以连接。跨时期材料能够支持机制分析，却不能拼成同一批货物的连续履历。",
  "英国如何放大贸易": "海外采购要形成持续网络，依赖货流、港口、航运、信用和国家组织能力的配合。解释这些条件如何相互支持，同时区分贸易效率、权利分配与殖民暴力的代价。",
  "现代镜像与港口结论": "从历史贸易网络转向现代大规模运输，核心仍是把分散生产与市场连接起来。大船的单位运输成本优势需要稳定货流与港口衔接才能兑现；海上规模经济不自动消除港内和腹地瓶颈。",
  "海外订单": "起点是客户的跨洲交付需求，随后才产生订舱、用箱、运输与港口服务。始终区分货主需要完成的交付与各服务主体承接的局部任务，用接力关系解释全程物流。",
  "出运准备": "订单并不直接变成可装船的箱子。标准化箱体、订舱、装箱、身份记录、质量信息和截止窗口共同形成交接条件；实物流与信息流需要衔接，单项手续满足不保证下一步必然完成。",
  "果园港与长江": "工厂货物借内河港接入长江，再到上海连接远洋服务。内河运输条件会影响抵达时间，抵达时间又影响下一程窗口；箱子保持身份连续，承运船舶和作业主体可以改变。",
  "集装箱码头": "水水换装把内河与远洋两个运输环节接起来，需要卸船、水平运输、堆存、提取与装船协同。堆场缓冲了不同作业节奏，也可能带来等待和翻箱；某台设备有空不等于整个作业链已经具备条件。",
  "班轮航次": "箱子装上船之后，开始参与船舶的挂港循环。挂靠不一定意味着本箱卸船，换船则增加连接机会与等待风险；解释航次、货物路径和班期窗口的区别，再联系网络覆盖与服务频率。",
  "交付与空箱": "到达目的港之后，货物还需通过陆路进入客户所在腹地。货物交付、集装箱归还和船舶继续营运是三个不同循环，因此到港不能直接等同于完成端到端交付。",
  "全程复盘": "把工厂、内河港、海港、远洋服务与客户重新放回同一链条。分析时间、成本和可靠性时，说明约束发生在哪个接口、如何向后传递，以及局部改善能否提高全程交付能力。",
  "货物与船舶": "上一讲跟随标准化集装箱，本节扩展到不同货物形态。货物性质影响承运船型与装卸方式，不能把集装箱工艺套用于所有货物；先识别货物，再解释所需服务。",
  "专业码头": "船型和货物差异进一步决定码头的设施、储存及作业组织需求。由具体货物的交接过程解释专业化，而不是仅用设备数量比较码头；判断适配关系时保留安全和工艺边界。",
  "全球货流": "全球贸易联系把不同货源地与市场连接起来，形成不同规模、方向和货类的海上运输需求。航线分组用于分析这些联系，不是唯一不变的分类标准，也不代表每票货都经过同一路径。",
  "通道与现实": "货流需要经过具体通道，地理条件、通行约束与事件扰动会改变可行路径。由局部约束讨论时间、成本和可靠性的传导，但不能把教学绕行或历史快照描述成当前真实航次。",
  "网络组织": "运输需求与通道条件给出约束，挂港、枢纽中转和班期安排则是服务组织的选择。覆盖面、频率、船舶规模与衔接等待相互影响，判断方案时应说明取舍与适用条件。",
  "港口价值": "汇合货物适配、通道约束与网络组织，港口价值体现为组织交接和连接腹地的能力。不能仅凭地理位置或单台自动化设备判断整体价值，需要解释其在全程网络中的作用。"
};

const MATH_CONNECTIONS: Record<number, string> = {
  1: "先把业务记录转为输入、输出及定义域，再讨论数量关系。价格影响销量，销量与价格共同进入收益，收益扣除成本才形成利润；不同目标不能混用。后续极限与导数都以明确的函数关系为基础。",
  2: "已有函数关系仍不足以描述某点附近的趋势。极限区分接近过程与点值，连续性再把二者联系起来；这为研究瞬时变化提供基础。替换表达式和使用定理都需要检查条件。",
  3: "从两个输入之间的平均变化出发，通过极限研究局部变化率。求导法则帮助稳定计算，链式法则追踪中间环节，高阶导数和微分进一步描述变化趋势与局部近似。导数的单位与原函数不同。",
  4: "能求导之后，还要判断何时能用、怎样解释。通过区间条件、符号变化、端点及可行域连接局部变化与整体判断；边际量和弹性服务不同问题，不能把某个一阶条件直接当成完整决策结论。",
  5: "前面的导数从总量得到变化率，这里反向寻找与变化率相符的函数。积分常数反映仅凭变化率无法确定基准水平；换元和分部积分可联系链式法则与乘积求导来理解，并用求导复核。",
  6: "原函数与变化率的关系进一步用于累计量。先辨认每一小段的贡献，再理解求和与极限；积分变量、上下限和单位必须一致。累计销量、收益与消费者剩余具有不同业务含义，不能相互替代。",
  7: "业务结果往往由多个因素共同决定，因此从一条函数曲线扩展到响应面。偏导描述其他因素不变时的局部影响，全微分组合小变动，链式与隐函数关系则追踪路径或约束；局部近似不等于任意大变化。",
  8: "多因素敏感性为决策提供信息，但最优判断还需要目标、可行域和验证条件。区分无约束与受约束问题，把候选解、边界比较、情景检验与管理解释连接起来；教学参数下的建议不能泛化为真实市场固定规则。"
};

const MATH_ROLES: Record<EconomicMathematicsSlideSpec["kind"], string> = {
  scene: "从业务情境提出需要解释的数量问题，区分已知信息与仍缺的条件。",
  evidence: "观察材料中的差异与模式，区分数据支持的判断与尚待验证的解释。",
  question: "明确问题和必要条件，提供思考方向，不替学生抢先完成后续解答。",
  definition: "把业务语言转成准确概念，说明符号、单位、适用条件及其与前面问题的关系。",
  derivation: "解释每一步关系为什么成立，把本步所用条件与前面概念接起来，不只朗读公式。",
  "worked-example": "用本页已给材料展示建模、计算与解释之间的联系，指出关键检查方法。",
  exercise: "支持独立作答；只提示变量、关系或检查方向，不报最终数值和完整推导。",
  solution: "核对本页已公开的解答，解释关键步骤与条件，并指出可迁移的方法。",
  "error-audit": "追溯错误来自哪个概念或条件，说明错误为何影响结果以及怎样复核。",
  interaction: "先解释操纵变量、观察量和关系，再依据实际参数讨论现象；答案揭示由教师控制。",
  "manager-brief": "把数学结果翻译为有条件的业务判断，同时说明假设、单位、局限与取舍。",
  transition: "说明当前知识解决了什么问题，以及下一环节为何需要继续研究。"
};

const compact = (value: string | undefined, maximum = 420) => {
  const text = (value ?? "").replace(/\s+/gu, " ").trim();
  return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
};
export const contextualPageBoundary = (text: string) => text.replace(
  "仅使用本页与已列来源解释。",
  "优先依据本页与已列来源解释，可联系已提供的前置材料说明机制和影响。"
);
const label = (slide: CourseDeckSlideSummary, deck: CourseDeckDescriptor) =>
  `第${slide.lessonNumber}讲第${deck.getLessonPosition(slide.index)!.localIndex}页“${slide.title}”`;

function previousContext(deck: CourseDeckDescriptor, slide: CourseDeckSlideSummary, math: boolean) {
  const previous: string[] = [];
  // At most two nearby, public antecedents. Do not import prior answer sheets
  // or dynamic lab results: their reveal state is not known here.
  for (let index = slide.index - 1; index >= Math.max(1, slide.index - 4) && previous.length < 2; index--) {
    const candidate = deck.getSlide(index);
    if (candidate.lessonNumber !== slide.lessonNumber) break;
    const mathCandidate = math ? getEconomicMathematicsSlideByKey(candidate.slideKey) : undefined;
    if (mathCandidate && (mathCandidate.interactionId || ["exercise", "solution", "question"].includes(mathCandidate.kind))) continue;
    const facts = mathCandidate
      ? [mathCandidate.lead, ...(mathCandidate.body ?? []), mathCandidate.formula, ...(mathCandidate.data ?? [])].filter(Boolean).join("；")
      : candidate.summary;
    previous.unshift(`${label(candidate, deck)}：${compact(facts) || "提供本节的主题背景。"}`);
  }
  if (previous.length) return previous.join("\n");
  const priorLesson = deck.lessons.find(l => l.number === slide.lessonNumber - 1);
  return priorLesson
    ? `本讲开篇或附近页面没有可安全复用的材料。可联系上一讲主题“${priorLesson.title}”，但不要推断学生已经掌握，也不引用其练习答案。`
    : "这是课程开篇，或附近页面没有可安全复用的材料。先从本页情境和已知条件建立共同起点，不假定学生已完成前置学习。";
}

export function buildSlidePromptContext(deck: CourseDeckDescriptor, slide: CourseDeckSlideSummary,
  portSlide: PortManagementSlideSpec | undefined, mathSlide: EconomicMathematicsSlideSpec | undefined, withheld: boolean) {
  const position = deck.getLessonPosition(slide.index)!;
  const mathLesson = mathSlide ? ECONOMIC_MATHEMATICS_LESSONS.find(l => l.number === mathSlide.lesson)! : undefined;
  const lessonQuestion = mathLesson?.coreQuestion ?? getPortManagementAssistantContext(slide.index).lessonPrompt.split("\n")[0]!.replace(/^教学目标：/u, "");
  const role = mathSlide ? MATH_ROLES[mathSlide.kind]
    : portSlide?.layout === "cover" ? "建立本讲问题与观察对象，为后续证据和概念提供入口。"
      : portSlide?.layout === "question" || portSlide?.layout === "activity" ? "围绕本页问题辨认已知条件和证据缺口，先提供分析方向。"
        : portSlide?.layout === "summary" ? "把本讲证据和概念合成完整解释，区分结论、条件与尚未解决的问题。"
          : `在“${slide.section}”中解释本页材料的机制，并说明它在全程联系中的作用。`;
  const evidence = mathSlide ? (withheld ? slide.summary : [mathSlide.lead, ...(mathSlide.body ?? []), mathSlide.formula, ...(mathSlide.data ?? []), mathSlide.prompt].filter(Boolean).join("；"))
    : [portSlide?.lead, ...(portSlide?.bullets ?? []), ...(portSlide?.steps ?? []),
      ...(portSlide?.columns?.map(c => `${c.heading}：${c.body}${c.note ? `；${c.note}` : ""}`) ?? []),
      portSlide?.stat ? `${portSlide.stat.value}；${portSlide.stat.label}；${portSlide.stat.detail ?? ""}` : "",
      portSlide?.table ? `${portSlide.table.headers.join(" / ")}；${portSlide.table.rows.map(r => r.join(" / ")).join("；")}` : "", portSlide?.prompt].filter(Boolean).join("；");
  const next = slide.index < deck.slideTotal ? deck.getSlide(slide.index + 1) : undefined;
  const nextMath = mathSlide && next ? getEconomicMathematicsSlideByKey(next.slideKey) : undefined;
  const forward = !next ? "这是已建设课件的最后一页。可总结方法与适用条件，不虚构尚未建设的后续页面。"
    : next.lessonNumber !== slide.lessonNumber ? `本讲到此收束；下一讲主题为“${next.lessonTitle}”。仅作主题衔接，不把下一讲结论当作当前已知。`
      : nextMath ? `按课件编排，后续环节的作用是：${MATH_ROLES[nextMath.kind]}这里只提供环节作用，未提供下一页题干、数值、公式和解答，不得提前补出。`
        : `后续衔接${label(next, deck)}。它属于“${next.section}”；这里只用标题指明讨论方向，不把后续情境说成已经发生的事实。`;
  const support = [
    "【本页定位】", `${label(slide, deck)}；本讲共${position.localTotal}页；小节：${slide.section}。`,
    `本讲要解决的问题：${lessonQuestion}`, `本页作用：${role}`,
    "【问题从何而来】", previousContext(deck, slide, Boolean(mathSlide)),
    "这些是课件编排中的前置材料，不等于本班已经学习或掌握。只在与当前提问相关时引用。",
    "【本页材料与概念联系】", `材料性质：${mathSlide?.sourceLabel ?? portSlide?.narrative.publicLabel ?? portSlide?.narrative.evidence ?? "以本页来源为准"}。`, compact(evidence, 1300) || slide.title,
    `知识联系：${mathSlide ? MATH_CONNECTIONS[mathSlide.unit] : PORT_CONNECTIONS[slide.section] ?? "联系本讲目标，解释当前材料支持的判断及其适用条件。"}`,
    "【后续如何使用】", forward,
    mathLesson ? `能力落点：${mathLesson.exerciseCapability}` : "综合判断要说明局部环节如何影响后续衔接，并区分必要条件、充分条件与尚需的信息。",
    "【综合回答方式】",
    "先直接回答当前问题；需要展开时，串起一项前置条件、本页机制及一个有条件的影响或应用。简单提问简答，综合问题再分层展开；不要逐段朗读本提示或机械复述所有邻页。",
    withheld ? "本页答案尚未揭示。综合回答也只能提供分析方向，不得利用相邻页面、单元联系或实验推断泄露最终答案。" : "推理必须指明依据；区分已提供事实、教学模型和条件性推断，不把页序相邻直接当作因果关系。"
  ].join("\n");
  return { support, defaultText: `${support}\n【本页专属约束】\n${contextualPageBoundary(mathSlide?.assistantCue ?? portSlide?.assistantCue ?? "依据本页及已提供的关联材料解释，不编造缺失的事实或数据。")}` };
}
