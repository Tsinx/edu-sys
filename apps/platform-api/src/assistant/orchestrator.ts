import {
  StreamingJsonDialogueError,
  StreamingJsonDialogueExtractor,
  type AssistantResponseEnvelope,
  type AssistantTurnInput,
  type ClassroomSnapshot
} from "@edu/contracts";
import {
  getPortManagementAssistantContext,
  getPortManagementLessonSlidePosition,
  getPortManagementReadyLessons,
  getPortManagementSlideByKey,
  PORT_MANAGEMENT_GLOBE_CUES
} from "@edu/course-content";
import type {
  AssistantChatMessage,
  AssistantJsonStreamProvider
} from "./provider.js";

export interface AssistantDialogueDelta {
  delta: string;
  accumulated: string;
}

export interface AssistantTurnStream {
  deltas: AsyncGenerator<AssistantDialogueDelta>;
  result: Promise<AssistantResponseEnvelope>;
}

interface ConversationTurn {
  user: string;
  assistant: string;
}

function buildSystemPrompt(snapshot: ClassroomSnapshot): string {
  const assistantContext = getPortManagementAssistantContext(
    snapshot.slide.index
  );
  const slidePosition = getPortManagementLessonSlidePosition(
    snapshot.slide.index
  )!;
  const readyLessonMap = getPortManagementReadyLessons()
    .map(
      (lesson) => {
        const localTotal =
          (lesson.slideEnd ?? 0) - (lesson.slideStart ?? 1) + 1;
        return `${lesson.label}“${lesson.title ?? "待建设"}”：学生可见第1—${localTotal}页，内部全局第${lesson.slideStart ?? "-"}—${lesson.slideEnd ?? "-"}页`;
      }
    )
    .join("；");
  const globeCueMap = PORT_MANAGEMENT_GLOBE_CUES.map(
    (cue) =>
      `${cue.id}（${cue.title}，仅可从${cue.startSlideKey}启动）`
  ).join("；");
  const openingCue = PORT_MANAGEMENT_GLOBE_CUES.find(
    (cue) => cue.id === "l1-opening-trade-influence"
  );
  const openingStartSlide = openingCue
    ? getPortManagementSlideByKey(openingCue.startSlideKey)
    : undefined;

  return [
    "你是课堂中的港航教学助手，服务教师李行之。",
    "你必须只返回一个 JSON 对象，禁止 Markdown、代码围栏、前后缀或额外说明。",
    "顶层键必须按以下顺序输出：dialogue、actions、schema、version。",
    'dialogue 必须是可直接朗读给课堂听众的简洁中文字符串；不要在 dialogue 中朗读 JSON、动作名或控制参数。',
    "actions 必须是数组，只能使用以下动作：",
    '- {"type":"slides.next"}',
    '- {"type":"slides.previous"}',
    `- {"type":"slides.go_to","slide":1到${snapshot.slide.total}的整数}`,
    '- {"type":"lesson.go_to","lesson":1到16的整数}',
    '- {"type":"activity.switch","activity":"slides|globe|simulation|whiteboard|video|interaction"}',
    '- {"type":"globe.play_cue","cueId":"课程注册表中的固定cue ID"}',
    '- {"type":"globe.pause"}',
    '- {"type":"globe.resume"}',
    '- {"type":"globe.restart"}',
    `可用地球仪cue：${globeCueMap}。`,
    `教师在正式封面说“助教，开始第一讲”时，只用一句简短过渡语并跳转到英法下注页${openingStartSlide ? `（内部全局第${openingStartSlide.index}页）` : ""}，不得直接播放地球仪。`,
    "只有当前页为 l1-1700-wager，且教师说“开始追踪证据”“沿丝绸航线寻找证据”或语义等价的明确口令时，才选择 globe.play_cue 的 l1-opening-trade-influence；不得生成经纬度、持续时间、字幕或任意相机轨迹。",
    "地球仪逐段讲解词由课程注册表预先编写，LLM不得复述整段动画讲稿，也不得声称动画已播放完成。",
    "slides.go_to 的 slide 只接受内部全局页码；学生和教师看到的是每讲独立页码，生成动作前必须完成换算。",
    `用户只说“第X页”时，默认指当前第${slidePosition.lessonNumber}讲的第X页；本讲内部全局页码 = ${slidePosition.lessonStart} + X - 1。`,
    "用户明确说“第N讲第X页”时，先按已建设课次映射换算；待建设讲次或越界页码不得生成跳转动作。",
    "不需要控制课堂时返回空数组。不要声称已经执行动作，只说明你准备做什么或直接回答。",
    `可跳转的已建设课次：${readyLessonMap}。第4到16讲尚未建设，不得为其虚构标题、页码或教学内容。`,
    "回答课程问题时以当前页为第一依据、当前讲知识包为第二依据；跨讲问题只作简短衔接，并说明在哪一讲展开。",
    "页面上下文会标明真实资料、教学情境或概念模型。教学情境必须说“在本教学情境中”，不得改写成真实船舶事故、真实货物或实时班期。",
    "航次港序是2023年历史快照；依据港序绘制的逐段路线是教学示意，不得声称为实时AIS轨迹。",
    "未知数据、未提供的案例事实和未建设课程内容必须明确说明不知道或尚未配置，不得编造。",
    'schema 固定为 "edu.classroom.assistant.response"，version 固定为 "1.0"。',
    '合法示例：{"dialogue":"港口通常由水域、陆域和连接设施构成。","actions":[],"schema":"edu.classroom.assistant.response","version":"1.0"}',
    `当前课程：${snapshot.courseTitle}`,
    `当前章节：${snapshot.chapterTitle}`,
    `当前活动：${snapshot.activeActivity}`,
    `当前 Slides：第 ${slidePosition.localIndex}/${slidePosition.localTotal} 页（内部全局第 ${snapshot.slide.index}/${snapshot.slide.total} 页），标题“${snapshot.slide.title}”`,
    `当前课次：${snapshot.slide.lessonTitle}；单元：${snapshot.slide.section}`,
    `课堂状态：${snapshot.session.status}`,
    `<voyage_context id="oocl-spain-ll3-2023">`,
    assistantContext.voyagePrompt,
    "</voyage_context>",
    `<lesson_context number="${assistantContext.lessonNumber}" title="${assistantContext.lessonTitle}">`,
    assistantContext.lessonPrompt,
    "</lesson_context>",
    `<slide_context index="${assistantContext.slideIndex}" local_index="${slidePosition.localIndex}" local_total="${slidePosition.localTotal}" key="${assistantContext.slideKey}" title="${assistantContext.slideTitle}">`,
    assistantContext.slidePrompt,
    "</slide_context>"
  ].join("\n");
}

export class ClassroomAssistantOrchestrator {
  private readonly history = new Map<string, ConversationTurn[]>();

  constructor(
    private readonly provider: AssistantJsonStreamProvider
  ) {}

  startTurn(
    snapshot: ClassroomSnapshot,
    input: AssistantTurnInput,
    signal?: AbortSignal
  ): AssistantTurnStream {
    const extractor = new StreamingJsonDialogueExtractor();
    const messages: AssistantChatMessage[] = [
      {
        role: "system",
        content: buildSystemPrompt(snapshot)
      }
    ];
    for (const turn of this.history.get(snapshot.session.id) ?? []) {
      messages.push(
        { role: "user", content: turn.user },
        {
          role: "assistant",
          content: JSON.stringify({
            dialogue: turn.assistant,
            actions: [],
            schema: "edu.classroom.assistant.response",
            version: "1.0"
          })
        }
      );
    }
    messages.push({
      role: "user",
      content: input.text
    });

    let resolveResult!: (result: AssistantResponseEnvelope) => void;
    let rejectResult!: (error: unknown) => void;
    const result = new Promise<AssistantResponseEnvelope>(
      (resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
      }
    );

    const deltas = this.consumeProvider(
      snapshot.session.id,
      input.text,
      messages,
      extractor,
      resolveResult,
      rejectResult,
      signal
    );
    return { deltas, result };
  }

  private async *consumeProvider(
    sessionId: string,
    userText: string,
    messages: AssistantChatMessage[],
    extractor: StreamingJsonDialogueExtractor,
    resolveResult: (result: AssistantResponseEnvelope) => void,
    rejectResult: (error: unknown) => void,
    signal?: AbortSignal
  ): AsyncGenerator<AssistantDialogueDelta> {
    try {
      for await (const content of this.provider.streamJson({
        messages,
        signal
      })) {
        const delta = extractor.push(content);
        if (delta) {
          yield {
            delta,
            accumulated: extractor.dialogue
          };
        }
      }
      const envelope = extractor.finish();
      const turns = this.history.get(sessionId) ?? [];
      turns.push({ user: userText, assistant: envelope.dialogue });
      this.history.set(sessionId, turns.slice(-6));
      resolveResult(envelope);
    } catch (error) {
      const normalized =
        error instanceof StreamingJsonDialogueError
          ? error
          : error instanceof Error
            ? error
            : new Error("课堂助手流处理失败");
      rejectResult(normalized);
      throw normalized;
    }
  }
}
