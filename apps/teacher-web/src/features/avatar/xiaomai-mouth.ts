import type { SpeechVisemeCue } from "@edu/contracts";
import { xiaomaiLocalMatrix, type XiaomaiPose } from "./xiaomai-motion";

type Viseme = SpeechVisemeCue["value"];
let mouthInstance = 0;
// Width, aperture, upper teeth, raised tongue. Native model coordinates.
export const mouthPoses: Record<Viseme, readonly [number, number, number, number]> = {
  X: [35.5, 0, 0, 0], A: [33, 0, 0, 0], B: [34, 3, 0.8, 0],
  C: [31, 10, 0.5, 0], D: [30, 17, 0.45, 0], E: [23, 11, 0.2, 0],
  F: [15, 8, 0, 0], G: [29, 2.5, 1, 0], H: [29, 10, 0.55, 1]
};

/** A handful of vector paths; only geometry changes, never open/closed image opacity. */
export class XiaomaiMouth {
  readonly element: SVGSVGElement;
  private paths: SVGPathElement[] = [];
  private values = [...mouthPoses.X];
  private warp: SVGGElement;
  constructor(host: HTMLElement) {
    const ns = "http://www.w3.org/2000/svg";
    this.element = document.createElementNS(ns, "svg");
    this.element.setAttribute("viewBox", "0 0 1024 760");
    this.element.setAttribute("aria-hidden", "true");
    this.element.setAttribute("data-xiaomai-mouth", "");
    this.element.style.cssText = "position:absolute;left:0;top:0;width:1024px;height:760px;max-width:none;pointer-events:none;transform-origin:0 0;overflow:visible;display:none";
    // Feather the first rig's polygonal underpainting seam exposed when its lip sprites are hidden.
    const gradientId = `xiaomai-skin-${++mouthInstance}`;
    const defs = document.createElementNS(ns, "defs");
    const gradient = document.createElementNS(ns, "radialGradient");
    gradient.id = gradientId;
    for (const [offset, opacity] of [[0, 1], [0.68, 1], [0.9, 0.5], [1, 0]]) {
      const stop = document.createElementNS(ns, "stop");
      stop.setAttribute("offset", String(offset)); stop.setAttribute("stop-color", "#fedec5"); stop.setAttribute("stop-opacity", String(opacity)); gradient.append(stop);
    }
    defs.append(gradient); this.element.append(defs);
    this.warp = document.createElementNS(ns, "g"); this.element.append(this.warp);
    const skin = document.createElementNS(ns, "ellipse");
    skin.setAttribute("cx", "513"); skin.setAttribute("cy", "383"); skin.setAttribute("rx", "58"); skin.setAttribute("ry", "34"); skin.setAttribute("fill", `url(#${gradientId})`);
    this.warp.append(skin);
    const group = document.createElementNS(ns, "g");
    group.setAttribute("transform", "translate(513 373) rotate(-5)");
    this.warp.append(group);
    for (const fill of ["#dc9980", "#f0b092", "#784639", "#fff8e7", "#d58778", "none", "none"]) {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("fill", fill);
      group.append(path); this.paths.push(path);
    }
    this.paths[5]!.setAttribute("stroke", "#8b5340"); this.paths[5]!.setAttribute("stroke-width", "1.4");
    this.paths[6]!.setAttribute("stroke", "#ffe0c1"); this.paths[6]!.setAttribute("stroke-width", "1.5");
    for (const path of this.paths) path.setAttribute("stroke-linecap", "round");
    host.append(this.element);
  }
  fit(x: number, y: number, scale: number) { this.element.style.transform = `translate(${x}px,${y}px) scale(${scale})`; }
  setPose(pose: XiaomaiPose) { this.warp.setAttribute("transform", xiaomaiLocalMatrix(513,373,pose)); }
  update(value: Viseme | undefined, level: number, delta: number, speaking: boolean, smile = 0) {
    this.element.style.display = speaking ? "block" : "none";
    if (!speaking) { this.values = [...mouthPoses.X]; return; }
    const pose = mouthPoses[level < 0.025 ? "X" : value ?? (level > 0.5 ? "D" : "C")];
    const amount = 1 - Math.exp(-Math.max(0.001, delta) / (pose[1] === 0 ? 0.018 : 0.035));
    const target = [...pose];
    // Acoustic energy adds modest articulation; closed consonants remain fully closed.
    target[1] = pose[1] * (0.72 + Math.min(1, level * 2) * 0.28);
    this.values = this.values.map((v, index) => v + (target[index]! - v) * amount);
    const [w, h, teeth, tongue] = this.values as [number, number, number, number];
    const top = -h * 0.22 + smile * 2, bottom = 4 + h + smile * 2;
    this.paths[0]!.setAttribute("d", `M${-w} 0 C${-w*.62} 0 -14 ${top-7} -4 ${top-4} C2 ${top-1} 7 ${top-5} 14 ${top-3} L${w} -1 Q10 ${top+5} ${-w} 0Z`);
    // Share the cavity's lower contour, then expand outwards: the dark opening must not cover the lower lip.
    this.paths[1]!.setAttribute("d", `M${-w} 0 Q${-w*.82} ${bottom*.6} ${-w*.28} ${bottom} Q${w*.4} ${bottom+9} ${w} -1 Q${w*.4} ${bottom+19} ${-w*.28} ${bottom+6} Q${-w*.82} ${bottom*.6+4} ${-w} 0Z`);
    this.paths[2]!.setAttribute("d", `M${-w} 0 Q-4 ${top+5} ${w} -1 Q${w*.4} ${bottom+9} ${-w*.28} ${bottom} Q${-w*.82} ${bottom*.6} ${-w} 0Z`);
    this.paths[2]!.style.display = h > 0.55 ? "" : "none";
    const toothDepth = Math.min(h * 0.65, 3.5) * teeth;
    this.paths[3]!.setAttribute("d", `M${-w*.88} 1 Q0 ${top+5} ${w*.86} 0 L${w*.75} ${toothDepth+1} Q-2 ${top+6+toothDepth} ${-w*.72} ${toothDepth+2}Z`);
    this.paths[3]!.style.display = h > 1.1 && teeth > 0.12 ? "" : "none";
    const tongueY = bottom - 1 - tongue * h * 0.45;
    this.paths[4]!.setAttribute("d", `M${-w*.40} ${bottom-1} Q0 ${tongueY-3} ${w*.42} ${bottom-2} Q0 ${bottom+4} ${-w*.40} ${bottom-1}Z`);
    this.paths[4]!.style.display = h > 6 ? "" : "none";
    this.paths[5]!.setAttribute("d", `M${-w} 0 Q-4 ${top+5} ${w} -1`);
    this.paths[6]!.setAttribute("d", `M${-w*.24} ${bottom+5} Q1 ${bottom+7} ${w*.32} ${bottom+4}`);
  }
  destroy() { this.element.remove(); }
}
