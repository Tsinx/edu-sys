import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AvatarCueState } from "@edu/contracts";
import type { Application } from "pixi.js";
import type { Cubism4InternalModel, Live2DModel } from "pixi-live2d-display/cubism4";
import { setAvatarFraming, useAvatarFraming } from "./avatar-preference";
import { NaturalAvatarMotion } from "./natural-motion";
import "./live2d.css";

const modelUrl = "/avatar/live2d/haru/Haru.model3.json";
let coreLoading: Promise<void> | undefined;
function loadCore() {
  if ((window as Window & { Live2DCubismCore?: unknown }).Live2DCubismCore) return Promise.resolve();
  if (!coreLoading) coreLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/avatar/live2d/core/live2dcubismcore.min.js";
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => { clearTimeout(timer); script.remove(); coreLoading = undefined; reject(new Error("Live2D 运行库未能加载")); };
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = fail;
    document.head.append(script);
  });
  return coreLoading;
}

const labels: Record<AvatarCueState, string> = {
  idle: "准备就绪", listening: "正在聆听", thinking: "正在思考", speaking: "正在讲解", affirming: "讲解完成", goodbye: "下次见"
};
export interface Live2DAvatarPlayerProps {
  state: AvatarCueState;
  subtitle: string;
  readMouth?: () => number;
  concealed?: boolean;
  fallback?: ReactNode;
}

export function Live2DAvatarPlayer(props: Live2DAvatarPlayerProps) {
  const framing = useAvatarFraming();
  const framingRef = useRef(framing); framingRef.current = framing;
  const fitRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => { fitRef.current?.(); }, [framing]);
  const host = useRef<HTMLDivElement>(null);
  const current = useRef(props); current.current = props;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = host.current!;
    let disposed = false;
    let failed = false;
    let app: Application | undefined;
    let model: Live2DModel<Cubism4InternalModel> | undefined;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    let previous = 0;
    let deltaSeconds = 0;
    const naturalMotion = new NaturalAvatarMotion();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const release = () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      if (app) {
        app.view.removeEventListener("webglcontextlost", contextLost);
        app.destroy(true, { children: true, texture: true, baseTexture: true });
        app = undefined;
      }
    };
    const fail = () => { if (!disposed) { failed = true; release(); setStatus("error"); } };
    const contextLost = (event: Event) => { event.preventDefault(); fail(); };
    setStatus("loading");
    void (async () => {
      await loadCore();
      const [PIXI, cubism] = await Promise.all([import("pixi.js"), import("pixi-live2d-display/cubism4")]);
      if (disposed) return;
      app = new PIXI.Application({ width: 320, height: 380, backgroundAlpha: 0, antialias: true, autoStart: false, sharedTicker: false, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true });
      app.view.setAttribute("aria-label", "Haru Live2D 数字人");
      app.view.setAttribute("role", "img");
      app.view.addEventListener("webglcontextlost", contextLost);
      element.append(app.view);
      const loaded = await cubism.Live2DModel.from(modelUrl, {
        autoUpdate: false, autoInteract: false, motionPreload: cubism.MotionPreloadStrategy.NONE, idleMotionGroup: "__classroom_idle__"
      }) as Live2DModel<Cubism4InternalModel>;
      if (disposed || failed || !app) { loaded.destroy({ children: true, texture: true, baseTexture: true }); return; }
      model = loaded;
      app.stage.addChild(model);
      const fit = () => {
        if (!app || !model || disposed) return;
        const width = element.clientWidth || 320, height = element.clientHeight || 380;
        app.renderer.resize(width, height);
        // Haru-specific composition: preserve the hairline and crop below the chest/shoulders.
        // The original full-body asset stays intact; only the camera framing changes.
        const portrait = framingRef.current === "portrait";
        const visibleFraction = portrait ? 0.19 : 0.30;
        const scale = Math.min(width / (model.internalModel.width * (portrait ? 0.33 : 0.50)), (height - 30) / (model.internalModel.height * visibleFraction));
        model.scale.set(scale);
        model.position.set((width - model.internalModel.width * scale) / 2, 16 - model.internalModel.height * scale * 0.045);
      };
      fitRef.current = fit;
      fit(); observer = new ResizeObserver(fit); observer.observe(element);
      model.internalModel.on("beforeModelUpdate", () => {
        if (!model) return;
        const state = current.current.state;
        const core = model.internalModel.coreModel;
        const pose = naturalMotion.update(deltaSeconds, state, reduced.matches);
        core.setParameterValueById("ParamEyeLOpen", pose.eyeOpen);
        core.setParameterValueById("ParamEyeROpen", pose.eyeOpen);
        core.setParameterValueById("ParamEyeBallX", pose.eyeX);
        core.setParameterValueById("ParamEyeBallY", 0);
        core.setParameterValueById("ParamAngleX", pose.x);
        core.setParameterValueById("ParamAngleY", pose.y);
        core.setParameterValueById("ParamAngleZ", pose.z);
        core.setParameterValueById("ParamBodyAngleX", -0.25);
        core.setParameterValueById("ParamBodyAngleY", 0);
        core.setParameterValueById("ParamBodyAngleZ", 0.15);
        core.setParameterValueById("ParamArmLA", 1);
        core.setParameterValueById("ParamArmRA", 1);
        core.setParameterValueById("ParamArmLB", 0);
        core.setParameterValueById("ParamArmRB", 0);
        core.setParameterValueById("ParamBreath", pose.breath);
        core.setParameterValueById("ParamBustY", 0);
        core.setParameterValueById("ParamBrowLY", pose.brow);
        core.setParameterValueById("ParamBrowRY", pose.brow);
        core.setParameterValueById("ParamMouthForm", pose.smile);
        core.setParameterValueById("ParamMouthOpenY", state === "speaking" ? (current.current.readMouth?.() ?? 0) : 0);
      });
      const render = (now: number) => {
        if (disposed || !app || !model) return;
        const delta = previous ? Math.min(50, now - previous) : 0; previous = now;
        if (!document.hidden && !current.current.concealed && element.clientWidth > 0) {
          deltaSeconds = delta / 1000;
          // Keep lip-sync and state updates alive when decorative motion is reduced.
          model.update(delta);
          try { app.renderer.render(app.stage); } catch { fail(); return; }
        }
        frame = requestAnimationFrame(render);
      };
      setStatus("ready"); frame = requestAnimationFrame(render);
    })().catch(fail);
    return () => {
      disposed = true; fitRef.current = undefined; release();
    };
  }, [attempt]);
  return <section className="live2d-avatar" aria-label="Live2D 数字人" data-status={status}>
    <div className="live2d-avatar__canvas" ref={host} hidden={status === "error"}/>
    {status === "loading" && <p className="live2d-avatar__loading" role="status">正在加载数字人…</p>}
    {status === "error" && <div className="live2d-avatar__fallback">{props.fallback}<p role="status">Live2D 暂不可用，已使用备用形象。<button onClick={() => setAttempt(value => value + 1)}>重试</button></p></div>}
    {status !== "error" && <><div className="live2d-avatar__state"><span/>{labels[props.state]}</div>
    <div className="live2d-avatar__framing" role="group" aria-label="数字人取景">
      <button type="button" aria-pressed={framing === "bust"} onClick={() => setAvatarFraming("bust")}>胸像</button>
      <button type="button" aria-pressed={framing === "portrait"} onClick={() => setAvatarFraming("portrait")}>头像</button>
    </div>
    <details className="live2d-avatar__credits"><summary>Haru · Live2D</summary><p>本内容使用 Live2D Inc. 拥有版权的示例素材，依其条款使用；本内容由作者独立创作。</p><a href="/avatar/live2d/NOTICE.txt" target="_blank" rel="noreferrer">素材与运行库许可</a></details></>}
  </section>;
}
