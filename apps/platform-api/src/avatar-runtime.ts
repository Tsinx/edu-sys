import type { LamRuntimeStatus } from "@edu/contracts";

interface OpenAvatarInitConfig {
  chat_mode?: unknown;
  avatar_config?: {
    avatar_type?: unknown;
    avatar_assets_path?: unknown;
    ws_session_route?: unknown;
  };
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function fetchWithTimeout(url: string, timeoutMs = 2_500): Promise<Response> {
  return fetch(url, {
    signal: AbortSignal.timeout(timeoutMs)
  });
}

export async function getLamRuntimeStatus(
  baseUrl: string,
  publicUrl = baseUrl
): Promise<LamRuntimeStatus> {
  const checkedAt = new Date().toISOString();
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPublicUrl = publicUrl.replace(/\/+$/, "");

  try {
    const liveness = await fetchWithTimeout(joinUrl(normalizedBaseUrl, "/liveness"));
    if (!liveness.ok) {
      return {
        service: "openavatarchat",
        renderer: "lam",
        avatar: "barbara",
        status: "warming",
        version: null,
        uiUrl: null,
        assetUrl: null,
        websocketUrl: null,
        checkedAt,
        message: "OpenAvatarChat 进程已响应，但 LAM 尚未完成预热。"
      };
    }

    const readiness = await fetchWithTimeout(joinUrl(normalizedBaseUrl, "/readiness"));
    if (!readiness.ok) {
      return {
        service: "openavatarchat",
        renderer: "lam",
        avatar: "barbara",
        status: "warming",
        version: null,
        uiUrl: null,
        assetUrl: null,
        websocketUrl: null,
        checkedAt,
        message: "OpenAvatarChat 正在加载 LAM 模型。"
      };
    }

    const [initResponse, versionResponse] = await Promise.all([
      fetchWithTimeout(joinUrl(normalizedBaseUrl, "/openavatarchat/initconfig")),
      fetchWithTimeout(joinUrl(normalizedBaseUrl, "/version"))
    ]);
    if (!initResponse.ok) {
      throw new Error(`initconfig returned ${initResponse.status}`);
    }
    const initConfig = (await initResponse.json()) as OpenAvatarInitConfig;
    const avatarType = initConfig.avatar_config?.avatar_type;
    const assetPath = initConfig.avatar_config?.avatar_assets_path;
    const websocketPath = initConfig.avatar_config?.ws_session_route;
    if (
      initConfig.chat_mode !== "ws" ||
      avatarType !== "lam" ||
      typeof assetPath !== "string" ||
      typeof websocketPath !== "string"
    ) {
      return {
        service: "openavatarchat",
        renderer: "lam",
        avatar: "barbara",
        status: "incompatible",
        version: null,
        uiUrl: joinUrl(normalizedPublicUrl, "/ui/index.html"),
        assetUrl: null,
        websocketUrl: null,
        checkedAt,
        message: "OpenAvatarChat 已启动，但当前配置不是课堂需要的 WS + LAM。"
      };
    }

    let version: string | null = null;
    if (versionResponse.ok) {
      const versionPayload = (await versionResponse.json()) as { version?: unknown };
      version =
        typeof versionPayload.version === "string" ? versionPayload.version : null;
    }
    const websocketBase = normalizedPublicUrl.replace(/^http/i, "ws");

    return {
      service: "openavatarchat",
      renderer: "lam",
      avatar: "barbara",
      status: "ready",
      version,
      uiUrl: joinUrl(normalizedPublicUrl, "/ui/index.html"),
      assetUrl: `/openavatarchat-runtime${assetPath}`,
      websocketUrl: joinUrl(websocketBase, websocketPath),
      checkedAt,
      message: "OpenAvatarChat LAM 已预热，Barbara 资源和会话接口可用。"
    };
  } catch (error) {
    const offline =
      error instanceof TypeError ||
      (error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError"));
    return {
      service: "openavatarchat",
      renderer: "lam",
      avatar: "barbara",
      status: offline ? "offline" : "error",
      version: null,
      uiUrl: null,
      assetUrl: null,
      websocketUrl: null,
      checkedAt,
      message: offline
        ? "OpenAvatarChat LAM 未启动或尚未监听服务端口。"
        : `LAM 状态检查失败：${error instanceof Error ? error.message : "未知错误"}`
    };
  }
}
