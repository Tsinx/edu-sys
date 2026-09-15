import { compileClassroomPrompt } from "./prompts.js";
import type { AssistantPromptSettings } from "@edu/contracts";
import {
  StreamingJsonDialogueError,
  StreamingJsonDialogueExtractor,
  type AssistantResponseEnvelope,
  type AssistantTurnInput,
  type ClassroomSnapshot
} from "@edu/contracts";
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
  assistant: AssistantResponseEnvelope;
}


export class ClassroomAssistantOrchestrator {
  private readonly history = new Map<string, ConversationTurn[]>();
  private readonly historyContext = new Map<string, string>();

  constructor(
    private readonly provider: AssistantJsonStreamProvider,
    private readonly getPromptSettings: () => AssistantPromptSettings = () => ({ revision: 0, overrides: {} })
  ) {}

  startTurn(
    snapshot: ClassroomSnapshot,
    input: AssistantTurnInput,
    signal?: AbortSignal
  ): AssistantTurnStream {
    const extractor = new StreamingJsonDialogueExtractor();
    const systemPrompt = compileClassroomPrompt(snapshot, this.getPromptSettings()).compiled;
    if (this.historyContext.get(snapshot.session.id) !== systemPrompt) this.history.delete(snapshot.session.id);
    this.historyContext.set(snapshot.session.id, systemPrompt);
    const messages: AssistantChatMessage[] = [
      {
        role: "system",
        content: systemPrompt
      }
    ];
    for (const turn of this.history.get(snapshot.session.id) ?? []) {
      messages.push(
        { role: "user", content: turn.user },
        {
          role: "assistant",
          content: JSON.stringify({
            replyKind: turn.assistant.replyKind,
            dialogue: turn.assistant.dialogue,
            actions: turn.assistant.actions,
            schema: turn.assistant.schema,
            version: turn.assistant.version
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
      let emittedLength = 0;
      for await (const content of this.provider.streamJson({
        messages,
        signal
      })) {
        extractor.push(content);
        // Only an explicit leading answer decision may enter TTS before the
        // response is complete. Legacy/misordered envelopes wait for validation.
        const answerFirst = /^\s*\{\s*"replyKind"\s*:\s*"answer"\s*,/u.test(extractor.rawJson);
        const delta = extractor.dialogue.slice(emittedLength);
        if (answerFirst && delta) {
          emittedLength = extractor.dialogue.length;
          yield {
            delta,
            accumulated: extractor.dialogue
          };
        }
      }
      const parsed = extractor.finish();
      const shouldSpeak = parsed.replyKind === "answer" ||
        (parsed.replyKind === undefined && parsed.actions.length === 0);
      const envelope: AssistantResponseEnvelope = {
        ...parsed, replyKind: shouldSpeak ? "answer" : "control", dialogue: shouldSpeak ? parsed.dialogue : ""
      };
      // Old providers may still include an acknowledgement with their actions.
      // It is suppressed even if it arrived before the action array.
      const remaining = envelope.dialogue.slice(emittedLength);
      if (remaining) yield { delta: remaining, accumulated: envelope.dialogue };
      const turns = [...(this.history.get(sessionId) ?? []), { user: userText, assistant: envelope }];
      if (!signal?.aborted && this.historyContext.get(sessionId) === messages[0]?.content) {
        this.history.set(sessionId, turns.slice(-6));
      }
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
