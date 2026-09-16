import assert from "node:assert/strict";
import test from "node:test";
import { createSceneGesture } from "../src/features/port-simulation/scene-gesture";

const point = (pointerId = 1, clientX = 10, button = 0) => ({ pointerId, clientX, clientY: 20, button });
test("scene taps distinguish rotation, pinch, cancellation and mouse buttons", () => {
  const gesture = createSceneGesture();
  gesture.down(point()); assert.equal(gesture.up(point(1, 12)), true);
  gesture.down(point()); gesture.move(point(1, 50)); assert.equal(gesture.up(point()), false);
  gesture.down(point()); gesture.down(point(2));
  assert.equal(gesture.up(point(2)), false); assert.equal(gesture.up(point()), false);
  gesture.down(point()); gesture.cancel(point()); assert.equal(gesture.up(point()), false);
  gesture.down(point(1, 10, 2)); assert.equal(gesture.up(point(1, 10, 2)), false);
  assert.equal(gesture.up(point(7)), false);
  gesture.down(point()); assert.equal(gesture.up(point()), true);
});
