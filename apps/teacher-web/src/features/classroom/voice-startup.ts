export const voiceStartupLabels = {
  model: "正在加载本地唤醒模型…",
  connection: "正在连接实时语音服务…",
  microphone: "正在请求麦克风权限与设备…",
  worklet: "正在加载麦克风音频处理器…",
  audio: "正在启动浏览器音频…"
} as const;
export type VoiceStartupStage = keyof typeof voiceStartupLabels;

/** Browser permission and audio promises may never settle. Abort promptly and
 * release a microphone that arrives after the user has cancelled or timed out. */
export function awaitVoiceStartup<T>(pending: Promise<T>, signal: AbortSignal, timeoutMs: number, message: string, releaseLate?: (value: T) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); };
    const fail = (error: unknown) => { if (!settled) { settled = true; cleanup(); reject(error); } };
    const abort = () => fail(new DOMException("录音启动已取消", "AbortError"));
    const timer = setTimeout(() => fail(new Error(message)), timeoutMs);
    pending.then(value => {
      if (settled) { releaseLate?.(value); return; }
      settled = true; cleanup(); resolve(value);
    }, fail);
    if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
  });
}

export function microphoneError(reason: unknown): Error {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  switch (error.name) {
    case "NotAllowedError": return new Error("浏览器或系统未允许麦克风访问。请在地址栏的网站权限及系统隐私设置中允许此浏览器使用麦克风。");
    case "NotFoundError": return new Error("当前浏览器没有可用麦克风。请连接输入设备；使用远程桌面时，还需启用麦克风重定向。");
    case "NotReadableError":
    case "AbortError": return new Error("浏览器无法启动麦克风设备。请检查系统输入设备、设备占用及远程桌面麦克风重定向，或在你使用的电脑上直接打开课堂网页。");
    case "OverconstrainedError": return new Error("麦克风不支持当前录音参数，请选择其他输入设备。");
    case "SecurityError": return new Error("浏览器安全设置禁止访问麦克风，请检查网站权限并使用受信任的 HTTPS 地址。");
    default: return error;
  }
}

export async function microphoneFailureDetails(reason: unknown, signal: AbortSignal): Promise<Error> {
  const error = microphoneError(reason);
  try {
    const permission = await awaitVoiceStartup(navigator.permissions.query({name: "microphone" as PermissionName}), signal, 1000, "permission status unavailable");
    const labels = {granted: "已允许", denied: "已阻止", prompt: "尚未授权，请处理浏览器的麦克风权限提示"};
    return new Error(`${error.message} 当前网站的麦克风权限：${labels[permission.state]}。`);
  } catch { return error; }
}
