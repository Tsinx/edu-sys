import React from 'react';
import { AppWindow, Expand, Shrink } from 'lucide-react';
import type { FullscreenControls } from './usePresentationFullscreen';

export function FullscreenButtons({ controls, locale }: { controls: FullscreenControls; locale?: 'zh-CN' | 'en' }) {
  const t = (zh: string, en: string) => locale === 'en' ? en : zh;
  const pageLabel = controls.isPageFullscreen ? t('退出网页全屏', 'Exit page fullscreen') : t('网页全屏', 'Page fullscreen');
  const screenLabel = controls.isScreenFullscreen ? t('退出屏幕全屏', 'Exit screen fullscreen') : t('屏幕全屏', 'Screen fullscreen');
  return <>
    <button type="button" aria-label={pageLabel} aria-pressed={controls.isPageFullscreen} disabled={controls.isScreenFullscreen}
      title={controls.isScreenFullscreen ? t('请先退出屏幕全屏', 'Exit screen fullscreen first') : controls.isPageFullscreen ? t('退出网页全屏 · Esc', 'Exit page fullscreen · Esc') : t('网页全屏 · 保留浏览器地址栏', 'Page fullscreen · Keep browser chrome')}
      onClick={controls.togglePageFullscreen}><AppWindow size={18}/><span>{pageLabel}</span></button>
    <button type="button" aria-label={screenLabel} aria-pressed={controls.isScreenFullscreen}
      title={controls.isScreenFullscreen ? t('退出屏幕全屏 · Esc', 'Exit screen fullscreen · Esc') : t('屏幕全屏 · 隐藏浏览器地址栏', 'Screen fullscreen · Hide browser chrome')}
      onClick={() => void controls.toggleScreenFullscreen()}>{controls.isScreenFullscreen ? <Shrink size={18}/> : <Expand size={18}/>}<span>{screenLabel}</span></button>
  </>;
}
