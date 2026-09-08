import {
  StreamingJsonDialogueError,
  StreamingJsonDialogueExtractor,
  studyAssistantResponseEnvelopeSchema,
  type AssistantTurnInput,
  type StudyAssistantResponseEnvelope,
  type StudySession
} from "@edu/contracts";
import {
  getPortManagementAssistantContext,
  getPortManagementLessonSlidePosition,
  getPortManagementReadyLessons
} from "@edu/course-content";
import type {
  AssistantChatMessage,
  AssistantJsonStreamProvider
} from "../assistant/provider.js";

export interface StudyDialogueDelta {
  delta: string;
  accumulated: string;
}

export interface StudyAssistantTurnStream {
  deltas: AsyncGenerator<StudyDialogueDelta>;
  result: Promise<StudyAssistantResponseEnvelope>;
}

interface ConversationTurn {
  user: string;
  assistant: string;
}

function buildSystemPrompt(session: StudySession): string {
  const assistantContext = getPortManagementAssistantContext(
    session.globalIndex
  );
  const position = getPortManagementLessonSlidePosition(
    session.globalIndex
  )!;
  const readyLessons = getPortManagementReadyLessons()
    .map((lesson) => {
      const localTotal =
        (lesson.slideEnd ?? 0) - (lesson.slideStart ?? 1) + 1;
      return `${lesson.label}“${lesson.title}”：第1—${localTotal}页`;
    })
    .join("；");

  return [
    "你是重庆交通大学《港口管理概论》的课下学习助教澜舟，直接服务正在独立学习的大学生。",
    "你必须只返回一个JSON对象，禁止Markdown、代码围栏、前后缀或额外说明。",
    "顶层键必须按以下顺序输出：dialogue、actions、schema、version。",
    "dialogue必须是可直接显示为字幕并朗读的中文；默认120—300字，先回答当前问题，再给一个有助于理解的因果联系。",
    "actions只能使用以下个人学习导航动作：",
    '- {"type":"study.slides.next"}',
    '- {"type":"study.slides.previous"}',
    '- {"type":"study.slides.go_to","lesson":1到16的整数,"slide":讲内页码}',
    '- {"type":"study.lesson.go_to","lesson":1到16的整数}',
    "只有用户明确要求翻页或切换课次时才生成动作；普通知识问答必须返回空数组。",
    `已建设课次：${readyLessons}。第4—16讲待建设，不得虚构标题、页码或内容。`,
    `用户只说“第X页”时，默认指当前第${position.lessonNumber}讲第X页。`,
    "所有导航动作必须等待完整JSON通过Schema校验后才会执行；不得在dialogue中声称动作已经执行。",
    "回答以当前页为第一依据、本讲知识包为第二依据；跨讲问题只作简短衔接。",
    "必须区分真实资料、教学情境和概念模型；未知数据不得编造，待建设内容必须明确说明尚未配置。",
    "不要把备课提示、内部事实约束、JSON动作名或全局页码朗读给学生。",
    'schema固定为"edu.study.assistant.response"，version固定为"1.0"。',
    '合法示例：{"dialogue":"水运通过大批量承载和较低推进能耗压低单位距离成本。","actions":[],"schema":"edu.study.assistant.response","version":"1.0"}',
    `当前课程：${session.courseTitle}`,
    `当前课次：${assistantContext.lessonLabel}“${assistantContext.lessonTitle}”`,
    `当前页面：第${position.localIndex}/${position.localTotal}页，标题“${assistantContext.slideTitle}”`,
    `<voyage_context>${assistantContext.voyagePrompt}</voyage_context>`,
    `<lesson_context>${assistantContext.lessonPrompt}</lesson_context>`,
    `<slide_context key="${assistantContext.slideKey}">${assistantContext.slidePrompt}</slide_context>`
  ].join("\n");
}

export class StudyAssistantOrchestrator {
  private readonly history = new Map<string, ConversationTurn[]>();

  constructor(
    private readonly provider: AssistantJsonStreamProvider
  ) {}

  startTurn(
    session: StudySession,
    input: AssistantTurnInput,
    signal?: AbortSignal
  ): StudyAssistantTurnStream {
    const extractor = new StreamingJsonDialogueExtractor<StudyAssistantResponseEnvelope>({
      parseEnvelope: (value) =>
        studyAssistantResponseEnvelopeSchema.parse(value)
    });
    const messages: AssistantChatMessage[] = [
      { role: "system", content: buildSystemPrompt(session) }
    ];
    for (const turn of this.history.get(session.id) ?? []) {
      messages.push(
        { role: "user", content: turn.user },
        {
          role: "assistant",
          content: JSON.stringify({
            dialogue: turn.assistant,
            actions: [],
            schema: "edu.study.assistant.response",
            version: "1.0"
          })
        }
      );
    }
    messages.push({ role: "user", content: input.text });

    let resolveResult!: (value: StudyAssistantResponseEnvelope) => void;
    let rejectResult!: (reason: unknown) => void;
    const result = new Promise<StudyAssistantResponseEnvelope>(
      (resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
      }
    );
    const deltas = this.consumeProvider(
      session.id,
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
    extractor: StreamingJsonDialogueExtractor<StudyAssistantResponseEnvelope>,
    resolveResult: (value: StudyAssistantResponseEnvelope) => void,
    rejectResult: (reason: unknown) => void,
    signal?: AbortSignal
  ): AsyncGenerator<StudyDialogueDelta> {
    try {
      for await (const content of this.provider.streamJson({
        messages,
        signal
      })) {
        const delta = extractor.push(content);
        if (delta) {
          yield { delta, accumulated: extractor.dialogue };
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
            : new Error("课下学习助手流处理失败");
      rejectResult(normalized);
      throw normalized;
    }
  }
}
