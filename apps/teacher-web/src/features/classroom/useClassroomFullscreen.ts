import { useEffect, useRef } from "react";
import { usePresentationFullscreen } from './usePresentationFullscreen';

interface FullscreenOptions {
  canTurnPages: boolean;
  pageIndex: number;
  pageTotal: number;
  onPageTurn: (direction: "previous_slide" | "next_slide") => Promise<unknown>;
  onError: (message: string) => void;
  locale?: 'zh-CN' | 'en';
}

/** Keep the stage and its existing avatar session in the same fullscreen tree. */
export function useClassroomFullscreen(options: FullscreenOptions) {
  const fullscreen = usePresentationFullscreen({ onError: options.onError, locale: options.locale });
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const pageTurnPendingRef = useRef(false);
  const fullscreenRef = useRef(false);
  fullscreenRef.current = fullscreen.isFullscreen;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = optionsRef.current;
      if (
        !fullscreenRef.current ||
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

  return { ...fullscreen, toggleFullscreen: fullscreen.toggleScreenFullscreen };
}
