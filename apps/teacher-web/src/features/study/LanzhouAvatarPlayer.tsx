import type {
  AvatarCueClip,
  AvatarCuePack,
  AvatarCueState
} from "@edu/contracts";
import { AlertCircle, AudioLines, CheckCircle2, Ear, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  chooseAvatarCue,
  chooseIdleMicroCue,
  getIdleBaselineCue,
  idleMicroDelayMs
} from "./study-utils";

interface LanzhouAvatarPlayerProps {
  cuePack?: AvatarCuePack;
  state: AvatarCueState;
  subtitle: string;
  onOneShotEnded?: () => void;
}

const stateLabels: Record<AvatarCueState, string> = {
  idle: "待命",
  listening: "正在听你说",
  thinking: "正在整理回答",
  speaking: "正在讲解",
  affirming: "已完成回答",
  goodbye: "本次学习结束"
};

function StateIcon({ state }: { state: AvatarCueState }) {
  if (state === "listening") return <Ear size={15} />;
  if (state === "thinking") return <LoaderCircle className="spin" size={15} />;
  if (state === "speaking") return <AudioLines size={15} />;
  if (state === "affirming") return <CheckCircle2 size={15} />;
  return <span className="lanzhou-avatar__status-dot" />;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function useLowBandwidthPreference() {
  const [lowBandwidth, setLowBandwidth] = useState(false);
  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (!connection) return;
    const update = () => setLowBandwidth(
      connection.saveData === true || /(^|-)2g$/u.test(connection.effectiveType ?? "")
    );
    update();
    connection.addEventListener("change", update);
    return () => connection.removeEventListener("change", update);
  }, []);
  return lowBandwidth;
}

export function LanzhouAvatarPlayer({
  cuePack,
  state,
  subtitle,
  onOneShotEnded
}: LanzhouAvatarPlayerProps) {
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0);
  const activeLayerRef = useRef<0 | 1>(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const previousClipRef = useRef<string | undefined>(undefined);
  const previousIdleMicroRef = useRef<string | undefined>(undefined);
  const onOneShotEndedRef = useRef(onOneShotEnded);
  const reducedMotion = useReducedMotion();
  const lowBandwidth = useLowBandwidthPreference();
  const hasApprovedClips = cuePack?.status === "ready" && cuePack.clips.length > 0;
  const poster = cuePack?.poster ?? "/avatar/lanzhou/v1/poster.webp";

  const playClip = useCallback((clip: AvatarCueClip, onEnded?: () => void) => {
    const nextLayer = activeLayerRef.current === 0 ? 1 : 0;
    const nextVideo = nextLayer === 0 ? videoARef.current : videoBRef.current;
    if (!nextVideo) return;
    nextVideo.src = clip.src;
    nextVideo.loop = clip.loop;
    nextVideo.currentTime = 0;
    nextVideo.oncanplay = () => {
      nextVideo.oncanplay = null;
      void nextVideo.play().then(() => {
        previousClipRef.current = clip.id;
        activeLayerRef.current = nextLayer;
        setActiveLayer(nextLayer);
      }).catch(() => setVideoFailed(true));
    };
    nextVideo.onended = clip.loop ? null : (onEnded ?? null);
    nextVideo.onerror = () => setVideoFailed(true);
    nextVideo.load();
  }, []);

  useEffect(() => {
    if (!hasApprovedClips || reducedMotion || lowBandwidth || videoFailed || !cuePack) return;
    let cancelled = false;
    let idleTimer: number | undefined;

    if (state === "idle") {
      const baseline = getIdleBaselineCue(cuePack.clips);
      const microActions = cuePack.clips.filter(
        (clip) => clip.state === "idle" && !clip.loop && clip.id !== baseline?.id
      );
      if (!baseline) return;

      const scheduleMicroAction = () => {
        if (cancelled || microActions.length === 0) return;
        idleTimer = window.setTimeout(() => {
          if (cancelled) return;
          const micro = chooseIdleMicroCue(
            cuePack.clips,
            previousIdleMicroRef.current
          );
          if (!micro) return;
          previousIdleMicroRef.current = micro.id;
          playClip(micro, () => {
            if (cancelled) return;
            playClip(baseline);
            scheduleMicroAction();
          });
        }, idleMicroDelayMs());
      };

      playClip(baseline);
      scheduleMicroAction();
    } else {
      const clip = chooseAvatarCue(cuePack.clips, state, previousClipRef.current);
      if (clip) {
        playClip(
          clip,
          clip.loop ? undefined : () => onOneShotEndedRef.current?.()
        );
      }
    }

    return () => {
      cancelled = true;
      if (idleTimer !== undefined) window.clearTimeout(idleTimer);
      for (const video of [videoARef.current, videoBRef.current]) {
        if (!video) continue;
        video.oncanplay = null;
        video.onended = null;
        video.onerror = null;
      }
    };
  }, [cuePack, hasApprovedClips, lowBandwidth, playClip, reducedMotion, state, videoFailed]);

  useEffect(() => {
    const inactiveVideo = activeLayer === 0 ? videoBRef.current : videoARef.current;
    const timer = window.setTimeout(() => inactiveVideo?.pause(), 300);
    return () => window.clearTimeout(timer);
  }, [activeLayer]);

  onOneShotEndedRef.current = onOneShotEnded;
  const posterOnly = !hasApprovedClips || reducedMotion || lowBandwidth || videoFailed;

  return (
    <section className={`lanzhou-avatar lanzhou-avatar--${state}`} aria-label="小麦老师港航助教">
      <div className="lanzhou-avatar__visual">
        <img
          className={posterOnly ? "lanzhou-avatar__poster lanzhou-avatar__poster--visible" : "lanzhou-avatar__poster"}
          src={poster}
          alt="虚构港航助教小麦老师的半写实角色预览"
        />
        {[0, 1].map((layer) => (
          <video
            key={layer}
            ref={layer === 0 ? videoARef : videoBRef}
            className={`lanzhou-avatar__video${activeLayer === layer && !posterOnly ? " lanzhou-avatar__video--active" : ""}`}
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
        ))}
        <div className="lanzhou-avatar__identity">
          <strong>小麦老师</strong>
          <span>港航学习助教 · 虚构AI形象</span>
        </div>
        <span className="lanzhou-avatar__state">
          <StateIcon state={state} /> {stateLabels[state]}
        </span>
      </div>

      <div className="lanzhou-avatar__subtitle" aria-live="polite">
        <span>小麦老师</span>
        <p>{subtitle || "你可以针对当前页提问，也可以让我帮你翻页。"}</p>
      </div>

      {cuePack?.status === "preview" && (
        <p className="lanzhou-avatar__disclosure">
          <AlertCircle size={13} /> {cuePack.disclosure}
        </p>
      )}
      {videoFailed && (
        <p className="lanzhou-avatar__disclosure">
          <AlertCircle size={13} /> 动作视频无法解码，已自动切换静态海报。
        </p>
      )}
      {lowBandwidth && cuePack?.status === "ready" && (
        <p className="lanzhou-avatar__disclosure">
          <AlertCircle size={13} /> 已按节省流量设置使用静态海报，字幕和音频继续可用。
        </p>
      )}
    </section>
  );
}
