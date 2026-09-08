export interface AssistantChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AssistantJsonStreamRequest {
  messages: AssistantChatMessage[];
  signal?: AbortSignal;
}

export interface AssistantJsonStreamProvider {
  readonly name: string;
  streamJson(
    request: AssistantJsonStreamRequest
  ): AsyncIterable<string>;
}

export class AssistantProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "PROVIDER_UNAVAILABLE"
      | "PROVIDER_RESPONSE_INVALID" =
      "PROVIDER_UNAVAILABLE"
  ) {
    super(message);
    this.name = "AssistantProviderError";
  }
}

interface OpenAiCompatibleProviderOptions {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  fetchImplementation?: typeof fetch;
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

function endpointFromBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/u, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

async function* readSseData(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 256 * 1024) throw new AssistantProviderError("模型返回的数据帧过大。", "PROVIDER_RESPONSE_INVALID");
      buffer = buffer.replace(/\r\n/gu, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = block
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) yield data;
        boundary = buffer.indexOf("\n\n");
      }

      if (done) break;
    }

    const trailing = buffer
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (trailing) yield trailing;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export class OpenAiCompatibleAssistantProvider
  implements AssistantJsonStreamProvider
{
  readonly name = "openai-compatible-json-stream";
  private readonly apiKey?: string;
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: OpenAiCompatibleProviderOptions = {}) {
    this.apiKey =
      options.apiKey ??
      process.env.EDU_ASSISTANT_API_KEY ??
      process.env.DASHSCOPE_API_KEY;
    this.apiUrl =
      options.apiUrl ??
      process.env.EDU_ASSISTANT_API_URL ??
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.model =
      options.model ??
      process.env.EDU_ASSISTANT_MODEL ??
      "qwen-plus";
    this.fetchImplementation =
      options.fetchImplementation ?? globalThis.fetch;
  }

  async *streamJson(
    request: AssistantJsonStreamRequest
  ): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new AssistantProviderError(
        "课堂助手模型尚未配置。请设置 EDU_ASSISTANT_API_KEY 或 DASHSCOPE_API_KEY。"
      );
    }

    let response: Response;
    try {
      if (request.messages.reduce((sum,item)=>sum+item.content.length,0) > 60_000) {
        throw new AssistantProviderError("教学上下文过长，请缩短问题后再试。");
      }
      response = await this.fetchImplementation(
        endpointFromBaseUrl(this.apiUrl),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: this.model,
            messages: request.messages,
            stream: true,
            temperature: 0.2,
            max_tokens: 2048,
            response_format: { type: "json_object" }
          }),
          signal: AbortSignal.any([AbortSignal.timeout(120_000), ...(request.signal ? [request.signal] : [])])
        }
      );
    } catch (error) {
      if (request.signal?.aborted) throw error;
      throw new AssistantProviderError(
        `课堂助手模型连接失败：${(error as Error).message}`
      );
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new AssistantProviderError(
        `课堂助手模型返回 ${response.status}${
          detail ? `：${detail}` : ""
        }`
      );
    }
    if (!response.body) {
      throw new AssistantProviderError(
        "课堂助手模型未返回流式响应体",
        "PROVIDER_RESPONSE_INVALID"
      );
    }

    let outputCharacters=0;
    for await (const data of readSseData(response.body)) {
      if (data === "[DONE]") break;

      let chunk: ChatCompletionChunk;
      try {
        chunk = JSON.parse(data) as ChatCompletionChunk;
      } catch {
        throw new AssistantProviderError(
          "课堂助手模型返回了无法解析的 SSE 数据",
          "PROVIDER_RESPONSE_INVALID"
        );
      }
      const content = chunk.choices?.[0]?.delta?.content;
      if (typeof content === "string" && content) {
        outputCharacters+=content.length;
        if(outputCharacters>64_000) throw new AssistantProviderError("模型响应超出单次限制。","PROVIDER_RESPONSE_INVALID");
        yield content;
      }
    }
  }
}
