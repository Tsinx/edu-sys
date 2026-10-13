import { useCallback, useEffect, useRef, useState } from 'react';
import { toggleScreenFullscreen as toggleNative } from './presentation-fullscreen-api';

interface FullscreenOptions {
  documentTarget?: boolean;
  onError: (message: string) => void;
  locale?: 'zh-CN' | 'en';
}

/** Two independent display modes; neither replaces the mounted teaching tree. */
export function usePresentationFullscreen<T extends HTMLElement = HTMLDivElement>(options: FullscreenOptions) {
  const containerRef = useRef<T>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasFullscreen = useRef(false);
  const [isPageFullscreen, setIsPageFullscreen] = useState(false);
  const [isScreenFullscreen, setIsScreenFullscreen] = useState(false);
  const stateRef = useRef({ page: false, screen: false });
  stateRef.current = { page: isPageFullscreen, screen: isScreenFullscreen };
  const target = useCallback(() => optionsRef.current.documentTarget ? document.documentElement : containerRef.current, []);
  const reportError = useCallback((entering: boolean) => {
    const en = optionsRef.current.locale === 'en';
    optionsRef.current.onError(entering
      ? en ? 'Screen fullscreen was not allowed. Click again in the browser, or use Page fullscreen.' : '浏览器未允许屏幕全屏，请在浏览器中再次点击，或使用“网页全屏”。'
      : en ? 'Unable to exit screen fullscreen. Use the browser fullscreen controls.' : '未能退出屏幕全屏，请使用浏览器的全屏控制。');
  }, []);
  const rememberFocus = useCallback(() => {
    if (!stateRef.current.page && !stateRef.current.screen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }, []);

  useEffect(() => {
    const update = () => setIsScreenFullscreen(Boolean(target() && document.fullscreenElement === target()));
    update();
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, [target]);

  const exitScreenFullscreen = useCallback(async () => {
    if (!target() || document.fullscreenElement !== target()) return;
    try { await document.exitFullscreen(); } catch { reportError(false); }
  }, [target, reportError]);

  const toggleScreenFullscreen = useCallback(async () => {
    const element = target();
    if (!element) return;
    const entering = document.fullscreenElement !== element;
    if (entering) rememberFocus();
    try { await toggleNative(document, element); } catch { reportError(entering); }
  }, [target, rememberFocus, reportError]);

  const togglePageFullscreen = useCallback(() => {
    // Exit the browser's screen mode first; the page mode underneath is retained.
    if (stateRef.current.screen) return;
    if (!stateRef.current.page) rememberFocus();
    setIsPageFullscreen(active => !active);
  }, [rememberFocus]);

  const exitFullscreen = useCallback(async () => {
    setIsPageFullscreen(false);
    await exitScreenFullscreen();
  }, [exitScreenFullscreen]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
      if (stateRef.current.screen) void exitScreenFullscreen();
      else if (stateRef.current.page) { event.preventDefault(); setIsPageFullscreen(false); }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [exitScreenFullscreen]);

  useEffect(() => {
    if (!isPageFullscreen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [isPageFullscreen]);

  const isFullscreen = isPageFullscreen || isScreenFullscreen;
  const fullscreenClassName = [isFullscreen ? 'presentation-fullscreen' : '', isPageFullscreen ? 'presentation-page-fullscreen' : ''].filter(Boolean).join(' ');
  useEffect(() => {
    const element = target();
    if (optionsRef.current.documentTarget) {
      document.documentElement.classList.toggle('presentation-fullscreen', isFullscreen);
      document.documentElement.classList.toggle('presentation-page-fullscreen', isPageFullscreen);
    }
    if (isFullscreen && !wasFullscreen.current) {
      if (element === document.documentElement) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      } else element?.focus({ preventScroll: true });
    } else if (!isFullscreen && wasFullscreen.current) {
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus({ preventScroll: true });
      previousFocusRef.current = null;
    }
    wasFullscreen.current = isFullscreen;
    window.dispatchEvent(new Event('resize'));
    return () => {
      if (optionsRef.current.documentTarget) document.documentElement.classList.remove('presentation-fullscreen', 'presentation-page-fullscreen');
    };
  }, [isFullscreen, isPageFullscreen, target]);

  return { containerRef, isFullscreen, isPageFullscreen, isScreenFullscreen, fullscreenClassName,
    togglePageFullscreen, toggleScreenFullscreen, exitFullscreen };
}

export type FullscreenControls = Pick<ReturnType<typeof usePresentationFullscreen>,
  'isPageFullscreen' | 'isScreenFullscreen' | 'togglePageFullscreen' | 'toggleScreenFullscreen'>;
