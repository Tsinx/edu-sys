import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { PortLblPage } from "../../../../../packages/course-content/src/port-lbl";

export const LblPlayback = createContext({ progress: 1, playing: false, reducedMotion: false });
export const useLblPlayback = () => useContext(LblPlayback);
export const clamp = (v: number) => Math.min(1, Math.max(0, v));
export const ease = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };
export const phase = (p: number, start: number, end: number) => ease((p - start) / (end - start));
export const asset = (name: string) => `/course-assets/port-management/lbl/${name}.png`;

export function Paper({ page, children, tone = "ink", className = "", source = "教学示意 · 概念模型" }: {
  page: PortLblPage; children: ReactNode; tone?: "ink" | "paper" | "steel"; className?: string; source?: string;
}) {
  return <article className={`lbl-slide lbl-slide--${tone} ${className}`} aria-label={page.title}>
    {children}
    <footer className="lbl-folio"><span>{source}</span><span>港口管理概论 <b>{page.lesson === 2 ? "Ⅱ" : "Ⅲ"}</b> <i>{String(page.localPage).padStart(2,"0")}</i><em>/ {page.lesson === 2 ? 52 : 54}</em></span></footer>
  </article>;
}

export function T({ children, x, y, w, size = 32, weight = 400, color, className = "", style }: {
  children: ReactNode; x: number; y: number; w?: number; size?: number; weight?: number; color?: string; className?: string; style?: CSSProperties;
}) { return <div className={`lbl-type ${className}`} style={{ left:x, top:y, width:w, fontSize:size, fontWeight:weight, color, ...style }}>{children}</div>; }

export function H({ children, x=88, y=94, w=1300, size=64, color, style }: {
  children: ReactNode; x?: number; y?: number; w?: number; size?: number; color?: string; style?: CSSProperties;
}) { return <h2 className="lbl-title" style={{left:x,top:y,width:w,fontSize:size,color,...style}}>{children}</h2>; }

export function Photo({ name, alt, x=0, y=0, w=1600, h=1000, style, className="" }: {
  name: string; alt: string; x?: number; y?: number; w?: number; h?: number; style?: CSSProperties; className?: string;
}) { return <img className={`lbl-photo ${className}`} src={asset(name)} alt={alt} draggable={false} style={{left:x,top:y,width:w,height:h,...style}} />; }

export function Shade({ style, className="" }: {style?: CSSProperties;className?:string}) {
  return <div aria-hidden="true" className={`lbl-shade ${className}`} style={style}/>;
}

export function Rule({x,y,w=100,h=1,color="currentColor",style}:{x:number;y:number;w?:number;h?:number;color?:string;style?:CSSProperties}) {
  return <div className="lbl-rule" aria-hidden="true" style={{left:x,top:y,width:w,height:h,background:color,...style}}/>;
}

export function Reveal({at=0.1,until=1,children,style,className=""}:{at?:number;until?:number;children:ReactNode;style?:CSSProperties;className?:string}) {
  const {progress,reducedMotion}=useLblPlayback();
  const alpha=reducedMotion ? 1 : phase(progress,at,Math.min(at+.1,1))*(until<1?1-phase(progress,until,Math.min(until+.06,1)):1);
  return <div className={`lbl-reveal ${className}`} style={{opacity:alpha,...style}} aria-hidden={alpha<.01}>{children}</div>;
}

export function Box({x,y,w=330,rotate=0,opacity=1,style,label="教学箱 C-01"}:{x:number;y:number;w?:number;rotate?:number;opacity?:number;style?:CSSProperties;label?:string}) {
  return <img className="lbl-box" src={asset("container-cutout")} alt={label} draggable={false} style={{left:x,top:y,width:w,transform:`rotate(${rotate}deg)`,opacity,...style}}/>;
}

export function Diagram({children,label,style}:{children:ReactNode;label:string;style?:CSSProperties}) {
  return <svg className="lbl-diagram" viewBox="0 0 1600 1000" fill="none" role="img" aria-label={label} style={style}>{children}</svg>;
}

export function RouteStroke({d,at=0,end=.85,color="#55c9de",width=4,dash}:{d:string;at?:number;end?:number;color?:string;width?:number;dash?:string}) {
  const {progress}=useLblPlayback();
  return <path d={d} fill="none" stroke={color} strokeWidth={width} pathLength={1} strokeDasharray={dash ?? 1} strokeDashoffset={dash?0:1-phase(progress,at,end)} strokeLinecap="round"/>;
}

export function Keyline({x,y,label,body,w=380}:{x:number;y:number;label:string;body:string;w?:number}) {
  return <><Rule x={x} y={y} w={w} color="var(--lbl-rule)"/><T x={x} y={y+22} w={w} size={28} weight={600}>{label}</T><T x={x} y={y+72} w={w} size={25} className="lbl-muted">{body}</T></>;
}
