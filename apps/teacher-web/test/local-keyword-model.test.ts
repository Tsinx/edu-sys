import assert from "node:assert/strict";
import test from "node:test";
import { availableKeywordModels, readKeywordModel } from "../src/features/classroom/local-keyword-model";

test("a server without private models offers the general model and migrates saved selections", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => "xiaomai-20260909-epoch10" } });
    const installed = availableKeywordModels(["original"]);
    assert.deepEqual(Object.keys(installed), ["original"]);
    assert.equal(readKeywordModel(installed), "original");
    const restored = availableKeywordModels(["original", "xiaomai-20260909-epoch10"]);
    assert.equal(readKeywordModel(restored), "xiaomai-20260909-epoch10");
    assert.equal(Object.hasOwn(availableKeywordModels(["original", "unknown"]), "unknown"), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
