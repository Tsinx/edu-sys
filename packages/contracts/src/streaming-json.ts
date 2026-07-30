import { z } from "zod";
import {
  assistantResponseEnvelopeSchema,
  type AssistantResponseEnvelope
} from "./index.js";

export class StreamingJsonDialogueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamingJsonDialogueError";
  }
}

type StringRole = "key" | "dialogue" | "other";

const simpleEscapeCharacters: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t"
};

/**
 * Incrementally extracts only the decoded value of the top-level `dialogue`
 * JSON string. Other fields are scanned but never returned to the caller.
 *
 * The complete payload is still parsed and validated by finish() before any
 * control action is trusted or executed.
 */
export class StreamingJsonDialogueExtractor {
  private readonly maxBytes: number;
  private raw = "";
  private depth = 0;
  private inString = false;
  private stringRole: StringRole = "other";
  private stringIsTopLevelValue = false;
  private escaping = false;
  private unicodeEscape: string | undefined;
  private keyBuffer = "";
  private currentKey: string | undefined;
  private expectingTopLevelKey = false;
  private awaitingTopLevelValue = false;
  private dialogueSeen = false;
  private dialogueClosed = false;
  private extractedDialogue = "";
  private pendingHighSurrogate = "";
  private finished = false;

  constructor(options: { maxBytes?: number } = {}) {
    this.maxBytes = options.maxBytes ?? 64 * 1024;
  }

  push(chunk: string): string {
    if (this.finished) {
      throw new StreamingJsonDialogueError(
        "流式 JSON 已结束，不能继续追加数据"
      );
    }
    if (!chunk) return "";

    this.raw += chunk;
    if (new TextEncoder().encode(this.raw).byteLength > this.maxBytes) {
      throw new StreamingJsonDialogueError(
        `助手 JSON 超过 ${this.maxBytes} 字节限制`
      );
    }

    let emitted = "";
    for (const character of chunk) {
      if (this.inString) {
        emitted += this.consumeStringCharacter(character);
        continue;
      }

      if (character === '"') {
        this.startString();
        continue;
      }

      if (/\s/u.test(character)) continue;

      if (character === "{" || character === "[") {
        if (this.depth === 1 && this.awaitingTopLevelValue) {
          this.awaitingTopLevelValue = false;
        }
        this.depth += 1;
        if (this.depth === 1 && character === "{") {
          this.expectingTopLevelKey = true;
        }
        continue;
      }

      if (character === "}" || character === "]") {
        this.depth = Math.max(0, this.depth - 1);
        continue;
      }

      if (
        this.depth === 1 &&
        character === ":" &&
        this.currentKey !== undefined
      ) {
        this.awaitingTopLevelValue = true;
        continue;
      }

      if (this.depth === 1 && character === ",") {
        this.currentKey = undefined;
        this.awaitingTopLevelValue = false;
        this.expectingTopLevelKey = true;
        continue;
      }

      if (this.depth === 1 && this.awaitingTopLevelValue) {
        if (this.currentKey === "dialogue") {
          throw new StreamingJsonDialogueError(
            "助手 JSON 的 dialogue 必须是字符串"
          );
        }
        this.awaitingTopLevelValue = false;
      }
    }

    this.extractedDialogue += emitted;
    return emitted;
  }

  finish(): AssistantResponseEnvelope {
    if (this.finished) {
      throw new StreamingJsonDialogueError("流式 JSON 已经结束");
    }
    this.finished = true;

    if (
      this.inString ||
      this.escaping ||
      this.unicodeEscape !== undefined
    ) {
      throw new StreamingJsonDialogueError("助手 JSON 在字符串中意外结束");
    }
    if (!this.dialogueSeen || !this.dialogueClosed) {
      throw new StreamingJsonDialogueError(
        "助手 JSON 缺少完整的 dialogue 字符串"
      );
    }
    if (this.pendingHighSurrogate) {
      throw new StreamingJsonDialogueError(
        "助手 JSON 的 dialogue 包含不完整的 Unicode 转义"
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.raw);
    } catch (error) {
      throw new StreamingJsonDialogueError(
        `助手返回的完整 JSON 无法解析：${(error as Error).message}`
      );
    }

    let envelope: AssistantResponseEnvelope;
    try {
      envelope = assistantResponseEnvelopeSchema.parse(parsed);
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.issues[0]?.message ?? "结构不符合协议"
          : (error as Error).message;
      throw new StreamingJsonDialogueError(
        `助手返回的完整 JSON 未通过协议校验：${message}`
      );
    }

    if (envelope.dialogue !== this.extractedDialogue) {
      throw new StreamingJsonDialogueError(
        "流式 dialogue 与完整 JSON 校验结果不一致"
      );
    }
    return envelope;
  }

  get dialogue(): string {
    return this.extractedDialogue;
  }

  get rawJson(): string {
    return this.raw;
  }

  private startString() {
    this.inString = true;
    this.escaping = false;
    this.unicodeEscape = undefined;
    this.stringIsTopLevelValue =
      this.depth === 1 && this.awaitingTopLevelValue;

    if (this.depth === 1 && this.expectingTopLevelKey) {
      this.stringRole = "key";
      this.keyBuffer = "";
      this.expectingTopLevelKey = false;
      return;
    }

    if (
      this.stringIsTopLevelValue &&
      this.currentKey === "dialogue"
    ) {
      if (this.dialogueSeen) {
        throw new StreamingJsonDialogueError(
          "助手 JSON 只能包含一个 dialogue 键"
        );
      }
      this.dialogueSeen = true;
      this.stringRole = "dialogue";
      return;
    }

    this.stringRole = "other";
  }

  private consumeStringCharacter(character: string): string {
    if (this.unicodeEscape !== undefined) {
      if (!/^[0-9a-f]$/iu.test(character)) {
        throw new StreamingJsonDialogueError(
          "助手 JSON 包含无效的 Unicode 转义"
        );
      }
      this.unicodeEscape += character;
      if (this.unicodeEscape.length < 4) return "";

      const decoded = String.fromCharCode(
        Number.parseInt(this.unicodeEscape, 16)
      );
      this.unicodeEscape = undefined;
      this.escaping = false;
      return this.appendDecodedStringCharacter(decoded);
    }

    if (this.escaping) {
      if (character === "u") {
        this.unicodeEscape = "";
        return "";
      }
      const decoded = simpleEscapeCharacters[character];
      if (decoded === undefined) {
        throw new StreamingJsonDialogueError(
          `助手 JSON 包含无效转义：\\${character}`
        );
      }
      this.escaping = false;
      return this.appendDecodedStringCharacter(decoded);
    }

    if (character === "\\") {
      this.escaping = true;
      return "";
    }

    if (character === '"') {
      this.inString = false;
      if (this.stringRole === "key") {
        this.currentKey = this.keyBuffer;
      } else if (this.stringRole === "dialogue") {
        this.dialogueClosed = true;
      }
      if (this.stringIsTopLevelValue) {
        this.awaitingTopLevelValue = false;
      }
      this.stringRole = "other";
      this.stringIsTopLevelValue = false;
      return "";
    }

    return this.appendDecodedStringCharacter(character);
  }

  private appendDecodedStringCharacter(character: string): string {
    if (this.stringRole === "key") {
      this.keyBuffer += character;
      return "";
    }
    if (this.stringRole !== "dialogue") return "";

    if (character.length > 1) {
      if (this.pendingHighSurrogate) {
        throw new StreamingJsonDialogueError(
          "助手 JSON 的 dialogue 包含无效的 Unicode 代理对"
        );
      }
      return character;
    }

    const codePoint = character.charCodeAt(0);
    if (this.pendingHighSurrogate) {
      if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
        const combined = `${this.pendingHighSurrogate}${character}`;
        this.pendingHighSurrogate = "";
        return combined;
      }
      throw new StreamingJsonDialogueError(
        "助手 JSON 的 dialogue 包含无效的 Unicode 代理对"
      );
    }
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      this.pendingHighSurrogate = character;
      return "";
    }
    if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
      throw new StreamingJsonDialogueError(
        "助手 JSON 的 dialogue 包含孤立的 Unicode 低位代理"
      );
    }
    return character;
  }
}
