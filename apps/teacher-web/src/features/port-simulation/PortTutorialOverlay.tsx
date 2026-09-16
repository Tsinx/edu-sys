import { useEffect, useLayoutEffect, useId, useRef, useState, type RefObject } from "react";
import { BookOpen, Check, Hand, MousePointer2, RotateCcw, X } from "lucide-react";
import { PORT_COURSE_UNITS, type PortCourseUnit, type PortTutorialView } from "@edu/port-simulation-core";
import type { PortSceneHandle } from "./PortOperationsScene";
import { tutorialElement } from "./port-tutorial-targets";
import { useTouchInput } from "./useTouchInput";

export function PortTutorialOffer({ unit, onStart, onSkip }: { unit?: PortCourseUnit; onStart: (unit: PortCourseUnit) => void; onSkip: () => void }) {
  const [selected, setSelected] = useState<PortCourseUnit>(unit ?? "arrival");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current!; if (!el.open) el.showModal(); return () => { if (el.open) el.close(); }; }, []);
  return <dialog ref={dialog} className="port-tutorial-offer" aria-labelledby="port-tutorial-question" onCancel={e => { e.preventDefault(); onSkip(); }}>
    <div className="port-tutorial-emblem"><Hand size={28}/></div><span className="port-eyebrow">LEARN BY DOING · 操作教学</span>
    <h2 id="port-tutorial-question">是否先学习本段操作？</h2><p>跟着高亮与手势，亲自选择对象并安排去向；平板可直接点选目标。教学使用独立现场，原来的练习会留在原处。</p>
    {!unit && <fieldset><legend>选择要学习的操作</legend><div className="port-tutorial-catalog">{PORT_COURSE_UNITS.filter(u => u.id !== "full").map(u => <button key={u.id} aria-pressed={selected === u.id} onClick={() => setSelected(u.id as PortCourseUnit)}>{u.title}</button>)}</div></fieldset>}
    <div className="port-tutorial-offer-actions"><button className="primary" autoFocus onClick={() => onStart(selected)}><BookOpen size={17}/>开始操作教学</button><button onClick={onSkip}>跳过，直接练习</button></div><small>可随时退出；虚拟手势只示范，业务由你亲自操作。</small>
  </dialog>;
}

type Rect = { x: number; y: number; width: number; height: number; key: string };
function overlap(a: Rect, b: Rect) { return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)); }
export function PortTutorialOverlay({ tutorial, root, scene, status, feedback, onReveal, onContinue, onExit, onRestart, onResources }: {
  tutorial: PortTutorialView; root: RefObject<HTMLElement | null>; scene: RefObject<PortSceneHandle | null>;
  status: string; feedback: string; onReveal: () => void; onContinue: () => void; onExit: () => void; onRestart: () => void; onResources: () => void;
}) {
  const touchInput = useTouchInput();
  const [rects, setRects] = useState<Rect[]>([]), [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight, cardHeight: 252 });
  const [hint, setHint] = useState<{ key: string; x: number; y: number } | null>(null);
  const [replay, setReplay] = useState(0), [ghost, setGhost] = useState(true), [expanded, setExpanded] = useState(false), [compact, setCompact] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const card = useRef<HTMLElement>(null), maskId = `tutorial-${useId().replace(/:/g, "")}`, step = tutorial.current;
  const key = step?.id ?? "complete";
  const stateKey = `${key}:${step?.phase}:${step?.gesture}:${step?.targets.join("|")}`;
  const [interacting,setInteracting]=useState(false);
  const reveal = () => { onReveal(); setReplay(n => n + 1); };
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReduced(media.matches); media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useLayoutEffect(() => {
    setGhost(false); setExpanded(false); setRects([]); setHint(null);
    const timer = step?.gesture === "drag" ? undefined : window.setTimeout(() => setGhost(false), 3300);
    const play = window.setTimeout(() => setGhost(true), 220);
    // Allow the selected tab and drawer to mount before revealing its actual control.
    const scroll = window.setTimeout(() => {
      const host = root.current;
      if (!host || !step) return;
      const priority = step.targets.find(k => k.startsWith("document:") || k.startsWith("batch-document:")) ?? step.targets.find(k => !k.endsWith("reference"));
      const element = priority ? tutorialElement(host, priority) : undefined;
      element?.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    }, 120);
    return () => { clearTimeout(timer); clearTimeout(scroll); clearTimeout(play); };
  }, [stateKey, replay]);
  useEffect(()=>{
    const host=root.current;if(!host)return;
    let timer:number|undefined;
    const begin=(e:Event)=>{if(card.current?.contains(e.target as Node))return;clearTimeout(timer);setInteracting(true);setGhost(false);};
    const end=()=>{clearTimeout(timer);timer=window.setTimeout(()=>{setInteracting(false);if(step?.gesture==="drag")setGhost(true);},1200);};
    host.addEventListener("pointerdown",begin,true);host.addEventListener("dragstart",begin,true);
    window.addEventListener("pointerup",end);window.addEventListener("pointercancel",end);window.addEventListener("dragend",end);
    return()=>{clearTimeout(timer);host.removeEventListener("pointerdown",begin,true);host.removeEventListener("dragstart",begin,true);window.removeEventListener("pointerup",end);window.removeEventListener("pointercancel",end);window.removeEventListener("dragend",end);setInteracting(false);};
  },[stateKey,root]);
  useEffect(() => {
    let frame = 0, previous = "", lastMeasure = 0;
    const measure = () => {
      const host = root.current, width = window.innerWidth, height = window.innerHeight;
      if (!host) return;
      const next: Rect[] = [];
      const source=step?.sceneGesture&&!touchInput&&width>900?scene.current?.project(step.sceneGesture.source):null;
      const sceneDestinations=step?.sceneGesture?.destinations.map(id=>({id,point:scene.current?.project(id)})).filter(d=>d.point?.visible)??[];
      const useScene=!!source?.visible&&sceneDestinations.length>0;
      if(useScene){next.push({key:`scene:${step!.sceneGesture!.source}`,x:source!.x-25,y:source!.y-25,width:50,height:50});for(const d of sceneDestinations)next.push({key:`scene:destination:${d.id}`,x:d.point!.x-26,y:d.point!.y-26,width:52,height:52});}
      for (const target of step?.targets ?? []) {
        if(useScene && (target==="ship-drag" || target.startsWith("destination:")))continue;
        const el = tutorialElement(host, target);
        if (!el) continue;
        const b = el.getBoundingClientRect();
        let left = Math.max(5, b.left), top = Math.max(5, b.top), right = Math.min(width - 5, b.right), bottom = Math.min(height - 5, b.bottom);
        // A scrolled-out control inside a drawer must never receive a false spotlight.
        for (let parent = el.parentElement; parent && parent !== host; parent = parent.parentElement) {
          const css = getComputedStyle(parent);
          if (/(auto|scroll|hidden|clip)/.test(css.overflowY + css.overflowX)) { const p = parent.getBoundingClientRect(); left = Math.max(left, p.left); right = Math.min(right, p.right); top = Math.max(top, p.top); bottom = Math.min(bottom, p.bottom); }
        }
        if (right - left > 12 && bottom - top > 12) next.push({ key: target, x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) });
      }
      if (step?.focus && !next.length) {
        const p = scene.current?.project(step.focus);
        if (p?.visible) next.push({ key: `scene:${step.focus}`, x: p.x - 22, y: p.y - 22, width: 44, height: 44 });
      }
      const gestureTarget = step?.targets.includes("clock:resume") ? "clock:resume" : step?.gesture === "context" ? "ship-open" : step?.targets.find(t => t.startsWith("document:") || t.startsWith("batch-document:")) ?? step?.targets[0];
      const container = gestureTarget ? tutorialElement(host, gestureTarget) : null;
      const control = step?.gesture === "input" ? container?.querySelector("input:not(:disabled),select:not(:disabled),button:not(:disabled)") ?? container : step?.id === "ledger" || step?.id === "cargo-check" ? container?.querySelector("button") ?? container : container;
      const controlRect = control?.getBoundingClientRect();
      const point = useScene ? {key,x:source!.x,y:source!.y} : controlRect && controlRect.top >= 0 && controlRect.bottom <= height ? { key, x: Math.round(controlRect.left + controlRect.width / 2), y: Math.round(controlRect.top + controlRect.height / 2) } : next[0] ? { key, x: next[0].x + next[0].width / 2, y: next[0].y + next[0].height / 2 } : null;
      const cardHeight = card.current?.offsetHeight ?? 252;
      const encoded = JSON.stringify({ next, point, width, height, cardHeight });
      if (encoded !== previous) { previous = encoded; setRects(next); setHint(point); setSize({ width, height, cardHeight }); }
    };
    const animate = (now: number) => { if (now - lastMeasure >= 50) { lastMeasure = now; measure(); } frame = requestAnimationFrame(animate); };
    frame = requestAnimationFrame(animate);
    // Scroll events include nested workbench drawers; update anchors before the next slow WebGL frame.
    document.addEventListener("scroll", measure, true); window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); };
  }, [stateKey, root, scene, replay, touchInput]);
  const narrow = size.width <= 600, w = Math.min(narrow ? size.width - 24 : 338, size.width - 24), h = size.cardHeight;
  const candidates = [
    { key: "bl", x: 16, y: Math.max(12, size.height - h - (root.current?.dataset.stageFullscreen === "true" ? 84 : 18)), width: w, height: h },
    { key: "tl", x: 16, y: narrow ? 88 : 106, width: w, height: h },
    { key: "tr", x: size.width - w - 16, y: 106, width: w, height: h },
    { key: "br", x: size.width - w - 16, y: Math.max(12, size.height - h - 84), width: w, height: h },
  ];
  const position = candidates.reduce((best, p) => rects.filter(r=>r.key!=="clock:resume").reduce((n, r) => n + overlap(p, r), 0) < rects.filter(r=>r.key!=="clock:resume").reduce((n, r) => n + overlap(best, r), 0) ? p : best, candidates[0]!);
  const destination = step?.gesture === "drag" ? rects.find(r => r.key.startsWith("scene:destination:") || r.key.startsWith("yard-target:") || r.key.startsWith("destination:")) : undefined;
  const start = hint?.key === key ? hint : null;
  const end = destination ? { x: destination.x + destination.width / 2, y: destination.y + destination.height / 2 } : start;
  const gestures = { click: "点击高亮位置", context: touchInput ? "点选操作按钮" : "右键 / 操作按钮", input: "核对后填写", drag: touchInput ? "选择对象 → 点选目标" : "按住 → 拖动 → 松开", observe: "查看真实反馈" };
  return <div className="port-tutorial-layer" data-tutorial-step={key} data-tutorial-phase={step?.phase ?? "complete"}>
    <svg className="port-tutorial-spotlights" aria-hidden="true" viewBox={`0 0 ${size.width} ${size.height}`}>
      <defs><mask id={maskId}><rect width={size.width} height={size.height} fill="white"/>{rects.map(r => <rect key={r.key} x={r.x - 5} y={r.y - 5} width={r.width + 10} height={r.height + 10} rx="10" fill="black"/>)}</mask></defs>
      <rect width={size.width} height={size.height} fill="#092d42" opacity=".18" mask={`url(#${maskId})`}/>
      {rects.map((r, i) => <g key={r.key} className="port-tutorial-glow" data-highlight-target={r.key}><rect x={r.x - 4} y={r.y - 4} width={r.width + 8} height={r.height + 8} rx="9" fill="none" stroke={i === 0 ? "#f5b741" : "#36c9b0"} strokeWidth="3"/><circle cx={r.x + 4} cy={r.y + 4} r="9" fill={i === 0 ? "#f5b741" : "#36c9b0"}/></g>)}
      {!touchInput && !interacting && start && end && step?.gesture === "drag" && <path data-drag-trace={destination?.key.startsWith("scene:")?"stage":"panel"} d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} stroke="#f5b741" strokeWidth="3" strokeDasharray="7 6" fill="none"/>}
      {!touchInput && ghost && !interacting && step?.phase!=="running" && start && end && <g key={`${key}-${replay}-${start.x}-${start.y}-${end.x}-${end.y}`} className="port-tutorial-ghost" transform={`translate(${start.x} ${start.y})`}>
        {!reduced && <animateTransform attributeName="transform" type="translate" values={`${start.x} ${start.y};${start.x} ${start.y};${end.x} ${end.y};${end.x} ${end.y}`} keyTimes="0;.2;.78;1" dur={step?.gesture==="drag"?"4s":"2.8s"} repeatCount={step?.gesture==="drag"?"indefinite":"1"} fill="freeze"/>}
        <circle r="20" fill="#f8bd4c44" stroke="#f8bd4c" strokeWidth="2">{!reduced && <animate attributeName="r" values="10;23;10" dur=".9s" repeatCount="3"/>}</circle>
        {step?.gesture==="drag" ? <g data-gesture-hand="left-button"><path d="M0 16 V-12 Q0 -20 7 -20 Q14 -20 14 -12 V5 Q19 -1 25 5 Q31 0 37 7 Q45 5 46 14 V30 Q44 48 27 49 H16 Q8 47 2 37 L-11 20 Q-16 11 -8 9 Q-3 9 0 16Z" fill="#fff9ec" stroke="#153f52" strokeWidth="2.4"/><g transform="translate(46 -35)"><rect width="30" height="42" rx="13" fill="white" stroke="#153f52"/><path d="M15 1 Q1 1 1 20 H15Z" fill="#f5b741">{!reduced&&<animate attributeName="opacity" values=".35;1;1;.35" keyTimes="0;.15;.8;1" dur="4s" repeatCount="indefinite"/>}</path><path d="M15 1 V20 H29" fill="none" stroke="#153f52"/></g><text x="4" y="70" fontSize="13" fill="#153f52" stroke="white" strokeWidth="3" paintOrder="stroke">按住左键 · 拖动 · 松开</text></g> : <path d="M 0 0 L 0 28 L 7 21 L 13 34 L 19 31 L 13 18 L 24 18 Z" fill="white" stroke="#153f52" strokeWidth="2"/>}
        {step?.gesture === "context" && <g transform="translate(25 -24)"><rect width="28" height="38" rx="12" fill="white" stroke="#153f52"/><path d="M14 1 Q27 1 27 18 H14Z" fill="#f5b741"/><path d="M14 1 V18 H1" fill="none" stroke="#153f52"/></g>}
      </g>}
    </svg>
    <section ref={card} className="port-tutorial-coach" aria-label="操作教学引导" style={{ left: Math.max(12, position.x), top: position.y, width: w }}>
      <div className="port-tutorial-coach-head"><span><Hand size={16}/>操作教学 · 独立现场</span><button onClick={() => setCompact(!compact)} aria-expanded={!compact}>{compact ? "展开提示" : "收起提示"}</button><button aria-label="退出操作教学" onClick={onExit}><X size={16}/></button></div>
      <div className="port-tutorial-meter"><span style={{ width: `${tutorial.completed / tutorial.total * 100}%` }}/></div>
      <div role="status" aria-live="polite"><small>{step ? `${tutorial.completed + 1} / ${tutorial.total} · ${gestures[step.gesture]}` : `${tutorial.total} / ${tutorial.total} · 已完成`}</small><h2>{step?.title ?? "本段操作教学完成"}</h2></div>
      {step ? <>{!compact && <><p>{step.repeated && !expanded && step.phase === "action" ? "同类操作：按高亮完成本批安排。需要帮助可展开详细提示。" : touchInput && step.gesture === "drag" ? "在高亮操作区确认船舶或货批，再点选下方的目标位置。系统会检查条件并反馈结果。" : touchInput && step.gesture === "context" ? "点选高亮的操作按钮，打开对象的业务工作台。" : step.instruction}</p>{(!step.repeated || expanded) && <p className="port-tutorial-why">{step.why}</p>}{step.repeated && <button onClick={() => setExpanded(!expanded)}>{expanded ? "收起详细提示" : "展开详细提示"}</button>}</>}
        {feedback && <p className="port-tutorial-result" role="status">{feedback}</p>}
        <div className="port-tutorial-coach-actions"><button onClick={reveal}><MousePointer2 size={14}/>再演示一次</button>{step.sceneGesture&&<button onClick={reveal}>定位指引</button>}{status === "paused" && <button data-tutorial-target="clock:resume" className={step.phase === "waiting" ? "primary" : undefined} onClick={()=>{setGhost(false);onContinue();}}>继续运行</button>}{step.phase === "blocked" && <button onClick={onResources}>调整资源</button>}{!rects.length && <button onClick={reveal}>展开并定位操作</button>}</div>
      </> : <><p>你已亲自完成本段操作并查看实际结果。现在可以返回原练习，独立完成任务。</p><button className="primary" onClick={onExit}><Check size={16}/>返回自主练习</button></>}
      <div className="port-tutorial-coach-footer"><button onClick={onRestart}><RotateCcw size={13}/>重新学习本段</button><button onClick={onExit}>退出教学，返回练习</button></div>
    </section>
  </div>;
}
