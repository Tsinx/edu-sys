declare module "@openavatarchat-webui/helpers/ws" {
  export class WS {
    engine: WebSocket | undefined;
    constructor(url: string);
    on(eventName: string, callback: (...args: unknown[]) => void): this;
    send(data: string | Int8Array | Uint8Array): void;
    removeAllListeners(): void;
    stop(): void;
  }
}

declare module "@openavatarchat-webui/handlers/avatarHandler" {
  import type { WS } from "@openavatarchat-webui/helpers/ws";

  interface AvatarHandlerOptions {
    container: HTMLDivElement;
    assetsPath: string;
    ws: WS;
    downloadProgress?: (percent: number) => void;
    loadProgress?: (percent: number) => void;
    rendererType: "lam" | "";
  }

  export class AvatarHandler {
    curState: "Idle" | "Listening" | "Responding" | "Thinking";
    constructor(options: AvatarHandlerOptions);
    on(eventName: string, callback: (...args: unknown[]) => void): this;
    sendAudio(pcm: Int16Array, transport?: "base64" | "binary"): void;
    interrupt(needSendInterrupt?: boolean): void;
    exit(): void;
    removeAllListeners(): void;
  }
}
