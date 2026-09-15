import { live2dModels, type Live2DCharacter } from "./live2d-models";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AvatarCueState, SpeechVisemeCue } from "@edu/contracts";
import type { Application } from "pixi.js";
import type { Cubism4InternalModel, Live2DModel } from "pixi-live2d-display/cubism4";
import { setAvatarFraming, useAvatarFraming, useLive2DCharacter } from "./avatar-preference";
import { NaturalAvatarMotion } from "./natural-motion";
import { XiaomaiMouth } from "./xiaomai-mouth";
import { XiaomaiRig } from "./xiaomai-rig";
import { XiaomaiEyes } from "./xiaomai-eyes";
import { XiaomaiMotion, type XiaomaiAction } from "./xiaomai-motion";
import "./live2d.css";

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
import { XiaomaiPaintedHead } from './xiaomai-painted-head';

export interface Live2DAvatarPlayerProps {
  state: AvatarCueState;
  subtitle: string;
  readMouth?: () => number;
  readViseme?: () => SpeechVisemeCue["value"] | undefined;
  concealed?: boolean;
  fallback?: ReactNode;
  /** Used by the separate animation preview; classrooms use automatic state motion. */
  animationAction?: XiaomaiAction;
  /** Source-layer bake is the default; p0 is retained for visual comparison. */
  headProjection?: "p0" | "volume";
  previewEyeOpen?: number;
  characterOverride?: Live2DCharacter;
}

export function Live2DAvatarPlayer(props: Live2DAvatarPlayerProps) {
  const selectedCharacter = useLive2DCharacter();
  const character = props.characterOverride ?? selectedCharacter;
  const profile = live2dModels[character];
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
    let nextDraw = 0;
    let deltaSeconds = 0;
    let mouth: XiaomaiMouth | undefined;
    let eyes: XiaomaiEyes | undefined;
    let rig: XiaomaiRig | undefined;
    let painted: XiaomaiPaintedHead | undefined;
    let hideMouth=false;
    const xiaomaiMotion = new XiaomaiMotion();
    const naturalMotion = new NaturalAvatarMotion();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const release = () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      mouth?.destroy(); mouth = undefined;
      eyes?.destroy(); eyes = undefined;
      rig?.destroy(); rig = undefined;
      painted?.destroy();painted=undefined;
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
      app = new PIXI.Application({ width: 320, height: 380, backgroundAlpha: 0, antialias: character !== "xiaomai", autoStart: false, sharedTicker: false, resolution: character === "xiaomai" ? 1 : Math.min(devicePixelRatio || 1, 2), autoDensity: true });
      app.view.setAttribute("aria-label", `${profile.label} Live2D 数字人`);
      app.view.setAttribute("role", "img");
      app.view.addEventListener("webglcontextlost", contextLost);
      element.append(app.view);
      const loaded = await cubism.Live2DModel.from(profile.url, {
        autoUpdate: false, autoInteract: false, motionPreload: cubism.MotionPreloadStrategy.NONE, idleMotionGroup: "__classroom_idle__"
      }) as Live2DModel<Cubism4InternalModel>;
      if (disposed || failed || !app) { loaded.destroy({ children: true, texture: true, baseTexture: true }); return; }
      model = loaded;
      app.stage.addChild(model);
      if (character === "xiaomai") {
        rig = new XiaomaiRig(model.internalModel);
        mouth = new XiaomaiMouth(element);
        eyes = new XiaomaiEyes(element);
        painted=new XiaomaiPaintedHead();app.stage.addChild(painted.container);await painted.ready;
        await eyes.ready;
        if (disposed || failed || !app) return;
        const core = model.internalModel.coreModel;
        const originalOpacity = core.getDrawableOpacity.bind(core);
        const mouthIndices = [core.getDrawableIndex("Mouth_Open"), core.getDrawableIndex("Mouth_Closed")];
        core.getDrawableOpacity = index => current.current.headProjection!=="p0" || hideMouth && mouthIndices.includes(index) ? 0 : originalOpacity(index);
      }
      const fit = () => {
        if (!app || !model || disposed) return;
        const width = element.clientWidth || 320, height = element.clientHeight || 380;
        app.renderer.resize(width, height);
        // Per-model composition preserves the hairline and frames the upper body.
        // Each asset supplies its own full-body or half-body framing proportions.
        const portrait = framingRef.current === "portrait";
        const visibleFraction = portrait ? profile.portrait : profile.bust;
        const scale = Math.min(width / (model.internalModel.width * (portrait ? profile.portraitWidth : profile.bustWidth)), Math.max(1, height - 30) / (model.internalModel.height * visibleFraction));
        model.scale.set(scale);
        model.position.set((width - model.internalModel.width * scale) / 2, 16 - model.internalModel.height * scale * profile.top);
        mouth?.fit(model.x, model.y, scale * model.internalModel.width / 1024);
        eyes?.fit(model.x, model.y, scale * model.internalModel.width / 1024);
        painted?.fit(model.x, model.y, scale * model.internalModel.width / 1024);
      };
      fitRef.current = fit;
      fit(); observer = new ResizeObserver(fit); observer.observe(element);
      model.internalModel.on("beforeModelUpdate", () => {
        if (!model) return;
        const state = current.current.state;
        const core = model.internalModel.coreModel;
        const mouthLevel = state === "speaking" ? (current.current.readMouth?.() ?? 0) : 0;
        if (character === "xiaomai") {
          const pose = xiaomaiMotion.update(deltaSeconds, state, reduced.matches, mouthLevel, current.current.animationAction);
          pose.volume=current.current.headProjection!=="p0"?1:0;
          if(current.current.previewEyeOpen!==undefined)pose.eyeOpen=current.current.previewEyeOpen;
          if(!pose.volume)rig?.update(pose);
          painted?.update(pose,state==="speaking");eyes?.update(pose); mouth?.setPose(pose);
          const expression=state!=="speaking" && pose.expressionOpen>.05;
          hideMouth=state==="speaking"||expression;
          mouth?.update(expression?"F":current.current.readViseme?.(), expression?.08:mouthLevel, deltaSeconds, state === "speaking"||expression, pose.smile);
          core.setParameterValueById("ParamEyeLOpen", pose.eyeOpen);
          core.setParameterValueById("ParamEyeROpen", pose.eyeOpen);
          core.setParameterValueById("ParamMouthOpenY", expression?1:mouthLevel);
          return;
        }
        const pose = naturalMotion.update(deltaSeconds, state, reduced.matches);
        core.setParameterValueById("ParamEyeLOpen", pose.eyeOpen);
        core.setParameterValueById("ParamEyeROpen", pose.eyeOpen);
        core.setParameterValueById("ParamMouthOpenY", mouthLevel);
        core.setParameterValueById("ParamEyeBallX", pose.eyeX);
        core.setParameterValueById("ParamEyeBallY", 0);
        core.setParameterValueById("ParamAngleX", pose.x);
        core.setParameterValueById("ParamAngleY", pose.y);
        core.setParameterValueById("ParamAngleZ", pose.z);
        core.setParameterValueById("ParamBodyAngleX", -0.25);
        core.setParameterValueById("ParamBodyAngleY", 0);
        core.setParameterValueById("ParamBodyAngleZ", 0.15);
        if (character === "haru") {
          core.setParameterValueById("ParamArmLA", 1);
          core.setParameterValueById("ParamArmRA", 1);
          core.setParameterValueById("ParamArmLB", 0);
          core.setParameterValueById("ParamArmRB", 0);
        }
        core.setParameterValueById("ParamBreath", pose.breath);
        core.setParameterValueById("ParamBustY", 0);
        core.setParameterValueById("ParamBrowLY", pose.brow);
        core.setParameterValueById("ParamBrowRY", pose.brow);
        core.setParameterValueById("ParamMouthForm", pose.smile);
      });
      const render = (now: number) => {
        if (disposed || !app || !model) return;
        frame = requestAnimationFrame(render);
        if (document.hidden || current.current.concealed || element.clientWidth <= 0) { previous = 0; nextDraw = 0; return; }
        // High-refresh screens do not need to render a classroom avatar above 60 FPS.
        if (now + 0.5 < nextDraw) return;
        if (!nextDraw) nextDraw = now;
        nextDraw += 1000 / 60;
        if (nextDraw < now) nextDraw = now + 1000 / 60;
        const delta = previous ? Math.min(50, now - previous) : 0; previous = now;
        deltaSeconds = delta / 1000;
        // Keep lip-sync and state updates alive when decorative motion is reduced.
        model.update(delta);
        try { app.renderer.render(app.stage); } catch { fail(); }
      };
      setStatus("ready"); frame = requestAnimationFrame(render);
    })().catch(fail);
    return () => {
      disposed = true; fitRef.current = undefined; release();
    };
  }, [attempt, character, profile]);
  return <section className="live2d-avatar" aria-label="Live2D 数字人" data-status={status}>
    <div className="live2d-avatar__canvas" ref={host} hidden={status === "error"}/>
    {status === "loading" && <p className="live2d-avatar__loading" role="status">正在加载数字人…</p>}
    {status === "error" && <div className="live2d-avatar__fallback">{props.fallback}<p role="status">Live2D 暂不可用，已使用备用形象。<button onClick={() => setAttempt(value => value + 1)}>重试</button></p></div>}
    {status !== "error" && <><div className="live2d-avatar__state"><span/>{labels[props.state]}</div>
    <div className="live2d-avatar__framing" role="group" aria-label="数字人取景">
      <button type="button" aria-pressed={framing === "bust"} onClick={() => setAvatarFraming("bust")}>胸像</button>
      <button type="button" aria-pressed={framing === "portrait"} onClick={() => setAvatarFraming("portrait")}>头像</button>
    </div>
    <details className="live2d-avatar__credits"><summary>{profile.label} · Live2D</summary><p>{profile.sampleArtwork ? "本内容使用 Live2D Inc. 拥有版权的示例素材，依其条款使用；本内容由作者独立创作。" : "小麦老师为本项目定制形象，使用 Live2D Cubism 呈现。"}</p><a href="/avatar/live2d/NOTICE.txt" target="_blank" rel="noreferrer">素材与运行库许可</a></details></>}
  </section>;
}
