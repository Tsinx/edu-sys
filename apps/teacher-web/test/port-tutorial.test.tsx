import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortTutorialOffer } from "../src/features/port-simulation/PortTutorialOverlay.js";
import { tutorialElement } from "../src/features/port-simulation/port-tutorial-targets.js";

test("a teacher-selected unit offers only its own independent tutorial and an explicit skip", () => {
  let changed = 0;
  const html = renderToStaticMarkup(createElement(PortTutorialOffer, { unit: "cargo", onStart: () => { changed++; }, onSkip: () => { changed++; } }));
  assert.match(html, /是否先学习本段操作/);
  assert.match(html, /开始操作教学/);
  assert.match(html, /跳过，直接练习/);
  assert.match(html, /独立现场/);
  assert.doesNotMatch(html, /port-tutorial-catalog|不再提示|自动完成/);
  assert.equal(changed, 0);
});
test("comprehensive teaching offers five short tutorials without changing the selected exercise", () => {
  const html = renderToStaticMarkup(createElement(PortTutorialOffer, { onStart: () => {}, onSkip: () => {} }));
  for (const name of ["船舶入港", "装卸与运输", "堆场与交付", "设备与规划", "离港与复核"]) assert.match(html, new RegExp(name));
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /48 小时/);
});
test("coach targets prefer the visible adjacent transfer rack and ignore hidden controls", () => {
  const fake = (visible: boolean, rack: boolean) => ({ dataset: { tutorialTarget: "yard-target:Y1" }, getClientRects: () => visible ? [{}] : [], closest: () => rack ? {} : null });
  const hidden = fake(false, true), scene = fake(true, false), rack = fake(true, true);
  const root = { querySelectorAll: () => [hidden, scene, rack] } as unknown as HTMLElement;
  assert.equal(tutorialElement(root, "yard-target:Y1"), rack);
  assert.equal(tutorialElement(root, "missing"), undefined);
});
