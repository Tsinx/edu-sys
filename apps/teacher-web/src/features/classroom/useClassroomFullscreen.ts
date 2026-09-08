import { useCallback, useEffect, useRef, useState } from "react";

interface FullscreenOptions {
  canTurnPages: boolean;
  pageIndex: number;
  pageTotal: number;
  onPageTurn: (direction: "previous_slide" | "next_slide") => Promise<unknown>;
  onError: (message: string) => void;
}

/** Keep the stage and its existing avatar session in the same fullscreen tree. */
export function useClassroomFullscreen(options: FullscreenOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pageTurnPendingRef = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      if (active) {
        containerRef.current?.focus({ preventScroll: true });
      } else if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus({ preventScroll: true });
        previousFocusRef.current = null;
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = optionsRef.current;
      if (containerRef.current && document.fullscreenElement === containerRef.current &&
        event.key === "Escape" && !event.defaultPrevented && !event.isComposing) {
        void document.exitFullscreen().catch(() => current.onError("未能退出全屏，请使用浏览器的全屏控制。"));
        return;
      }
      if (
        !containerRef.current || document.fullscreenElement !== containerRef.current ||
        !current.canTurnPages || event.defaultPrevented || event.isComposing ||
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
      ) return;

      const target = event.target;
      if (target instanceof Element && target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), ' +
        '[role="slider"], [role="spinbutton"], [role="textbox"], ' +
        '[role="combobox"], [role="menu"], [role="tablist"], [role="dialog"]'
      )) return;

      event.preventDefault();
      if (event.repeat || pageTurnPendingRef.current) return;
      const backwards = event.key === "ArrowLeft";
      if (backwards ? current.pageIndex <= 1 : current.pageIndex >= current.pageTotal) return;
      pageTurnPendingRef.current = true;
      void current.onPageTurn(backwards ? "previous_slide" : "next_slide")
        .catch(() => current.onError("翻页失败，请重试。"))
        .finally(() => { pageTurnPendingRef.current = false; });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (containerRef.current && document.fullscreenElement === containerRef.current) {
      await document.exitFullscreen();
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current) {
        previousFocusRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement : null;
        await containerRef.current.requestFullscreen();
      }
    } catch {
      optionsRef.current.onError("当前浏览器未允许全屏显示。");
    }
  }, []);

  return { containerRef, isFullscreen, toggleFullscreen, exitFullscreen };
}
