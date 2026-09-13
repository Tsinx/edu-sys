import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LegacyTerminalStudio as TerminalStudio } from "../src/features/port-simulation/TerminalStudio.js";
import { TerminalTrainingReview } from "../src/features/port-simulation/TerminalTrainingPanel.js";
import { applyTrainingCommand, createTerminalTraining, serializeTraining, trainingStorageKey, createTerminalState, serializeTerminal } from "@edu/port-simulation-core";

test("teacher-locked battle overrides the last standalone preference and publishes the fixed rules", () => {
  const storage = { getItem: (key: string) => key.includes(":selection:") ? "practice" : null, setItem() {} };
  const markup = renderToStaticMarkup(createElement(TerminalStudio, {
    storage, storageScope: "actor:course", initialTrainingMode: "battle", trainingModeLocked: true
  }));
  assert.match(markup, /实战场 · 正常流程实训/);
  assert.match(markup, /aria-label="选择训练场" disabled=""/);
  assert.match(markup, /aria-label="仿真速度" disabled=""/);
  assert.match(markup, /教师已锁定/);
  assert.match(markup, /没有超时扣分/);
});
test("opening a stored active battle produces an interrupted review with its penalty evidence", () => {
  let battle = applyTrainingCommand(createTerminalTraining("battle"), { kind: "start" });
  battle = applyTrainingCommand(battle, { kind: "order", order: { kind: "harbor", vessel: 0, action: "secure" } });
  const key = trainingStorageKey("actor:course", "regular", "battle");
  const storage = { getItem: (k: string) => k === key ? serializeTraining(battle) : k.includes(":selection:") ? "battle" : null, setItem() {} };
  const markup = renderToStaticMarkup(createElement(TerminalStudio, { storage, storageScope: "actor:course" }));
  assert.match(markup, /实战场 · 已中断/);
  assert.match(markup, /moor-before-arrival/);
  assert.match(markup, /扣分 5/);
  assert.doesNotMatch(markup, /实战运行中/);
});
test("the local review shows original observations and rejected orders, while legacy is explicitly ungraded", () => {
  let session = applyTrainingCommand(createTerminalTraining(), { kind: "start" });
  session = applyTrainingCommand(session, { kind: "order", order: { kind: "operate", target: "crane-a", running: true } });
  const props = { session, archives: [], onOpenArchive() {}, onRestart() {} };
  const markup = renderToStaticMarkup(createElement(TerminalTrainingReview, props));
  assert.match(markup, /处置前的原始状态与规则依据/);
  assert.match(markup, /crane-before-mooring/);
  assert.match(markup, /不扣分/);
  assert.match(markup, /未完成节点不计分/);
  const legacy = renderToStaticMarkup(createElement(TerminalTrainingReview, { ...props, session: null }));
  assert.match(legacy, /未补算新流程成绩/);
});
test("a first upgrade opens the normal practice preset and keeps old local records accessible in history", () => {
  const raw = serializeTerminal(createTerminalState());
  const storage = { getItem: (k: string) => k === "edu-terminal-lab:v2:upgrade:regular" ? raw : null, setItem() {} };
  const markup = renderToStaticMarkup(createElement(TerminalStudio, { storage, storageScope: "upgrade" }));
  assert.match(markup, /练习场 · 正常流程实训/);
  assert.match(markup, /本机历史场次（1 次）/);
  assert.match(markup, /场次 1 · 旧版/);
  assert.equal(storage.getItem("edu-terminal-lab:v2:upgrade:regular"), raw);
});
