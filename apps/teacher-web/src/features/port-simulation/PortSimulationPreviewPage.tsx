import { TerminalStudio } from "./TerminalStudio";

export function PortSimulationPreviewPage() {
  let storage: Storage | null = null;
  try { storage = window.localStorage; } catch { /* The laboratory also works without persistent storage. */ }
  const legacy=typeof window!=='undefined'&&new URLSearchParams(window.location?.search??'').get('model')==='legacy';
  const facilities=typeof window!=='undefined'&&new URLSearchParams(window.location?.search??'').get('model')==='facilities';
  return <><nav className="port-class-lab-entry" aria-label="第11、12讲专用实验"><strong>课堂专用实验 · 各约30分钟</strong><a href="/port-class-lab.html?lesson=11">第11讲 · 绩效诊断与改善 ↗</a><a href="/port-class-lab.html?lesson=12">第12讲 · 信息中断与恢复 ↗</a><a href="/port-simulation-preview.html?course=full&model=facilities">逐箱设施专项实验 ↗</a><a href="/port-simulation-preview.html?course=full&model=legacy">旧版场次记录</a></nav><TerminalStudio storage={storage} storageScope={legacy?"preview":facilities?"preview-facilities-2":"preview-facilities-1"} sourceLabel="独立实验" /></>;
}
