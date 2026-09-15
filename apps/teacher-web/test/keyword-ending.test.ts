import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const scope = {} as { ClassroomEndingGate: new () => {
  pending: boolean; begin(speaking: boolean): void; reset(): void;
  advance(samples: number, speaking: boolean): "finish" | "resumed" | undefined;
} };
runInNewContext(readFileSync(new URL("../public/audio/classroom-ending.js", import.meta.url), "utf8"), scope);

test("silence alone never submits, and thanks requires a full second of VAD silence", () => {
  const gate = new scope.ClassroomEndingGate();
  assert.equal(gate.advance(160_000, false), undefined);
  gate.begin(false);
  assert.equal(gate.advance(15_999, false), undefined);
  assert.equal(gate.pending, true);
  assert.equal(gate.advance(1, false), "finish");
  assert.equal(gate.advance(160_000, false), undefined);
});

test("resumed speech cancels ending permanently until another thanks", () => {
  const gate = new scope.ClassroomEndingGate();
  gate.begin(false);
  gate.advance(15_000, false);
  assert.equal(gate.advance(512, true), "resumed");
  assert.equal(gate.pending, false);
  assert.equal(gate.advance(160_000, false), undefined);
  gate.begin(false);
  assert.equal(gate.advance(16_000, false), "finish");
});

test("keyword speech tail can settle but continuous speech cancels ending", () => {
  const gate = new scope.ClassroomEndingGate();
  gate.begin(true);
  assert.equal(gate.advance(2048, true), undefined);
  assert.equal(gate.advance(16_000, false), "finish");
  gate.begin(true);
  assert.equal(gate.advance(5120, true), "resumed");
  assert.equal(gate.advance(16_000, false), undefined);
});

test("reset clears pending ending, duplicate keyword hits do not postpone confirmation", () => {
  const gate = new scope.ClassroomEndingGate();
  gate.begin(false); gate.advance(8000, false); gate.begin(false);
  assert.equal(gate.advance(8000, false), "finish");
  gate.begin(false); gate.advance(8000, false); gate.reset();
  assert.equal(gate.advance(16_000, false), undefined);
});
