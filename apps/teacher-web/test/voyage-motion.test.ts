import assert from "node:assert/strict";
import test from "node:test";
import { PiecewiseGeodesicCurve } from "../src/features/globe/InteractiveEarthGlobe.js";
import { sampleVoyageFrame, voyageProgress } from "../src/features/globe/voyage-motion.js";
import data from "../src/features/globe/data/opening-trade-route.json";

const curve = new PiecewiseGeodesicCurve(data.route.points.map(([longitude, latitude]) => ({ longitude, latitude })), 1.032);
const motion = { routeId: data.route.id, durationMs: 40_000, elapsedMs: 0, startedAt: 1000 };

test("voyage moves continuously along the rendered route despite uneven waypoint density", () => {
  let previous = sampleVoyageFrame(curve, motion, 1000);
  let movingFrames = 0;
  for (let ms = 1016; ms <= 41_000; ms += 16) {
    const frame = sampleVoyageFrame(curve, motion, ms);
    assert.ok(frame.progress >= previous.progress);
    assert.ok(frame.position.distanceTo(previous.position) < 0.01, `jump at ${ms}`);
    assert.ok(frame.position.distanceTo(curve.getPointAt(frame.progress)) < 1e-12);
    assert.ok(Math.abs(frame.forward.length() - 1) < 1e-10);
    assert.ok(Math.abs(frame.forward.dot(frame.position)) < 1e-10);
    if (frame.progress > 0 && frame.progress < 1) {
      assert.ok(frame.position.distanceTo(previous.position) > 0, `stalled frame at ${ms}`);
      movingFrames++;
    }
    previous = frame;
  }
  assert.ok(movingFrames > 2200);
});

test("pause, resume and reconnect preserve distance and do not loop after arrival", () => {
  const paused = { ...motion, elapsedMs: 16_000, startedAt: null };
  assert.equal(voyageProgress(paused, 17_000), voyageProgress(motion, 17_000));
  assert.equal(voyageProgress(paused, 97_000), voyageProgress(paused, 17_000));
  const resumed = { ...paused, startedAt: 97_000 };
  assert.equal(voyageProgress(resumed, 97_000), voyageProgress(paused, 17_000));
  assert.equal(voyageProgress(resumed, 98_000), voyageProgress(motion, 18_000));
  assert.equal(voyageProgress(motion, 99_000), 1);
  assert.ok(sampleVoyageFrame(curve, motion, 99_000).position.distanceTo(curve.getPointAt(1)) < 1e-12);
});

test("distance sampling handles long legs, duplicate waypoints and the date line", () => {
  const path = new PiecewiseGeodesicCurve([
    { latitude: 0, longitude: 170 }, { latitude: 0, longitude: 171 },
    { latitude: 0, longitude: 171 }, { latitude: 0, longitude: -170 }
  ], 1.032);
  const halfway = sampleVoyageFrame(path, motion, 21_000);
  assert.ok(Math.abs(Math.abs(halfway.coordinate.longitude) - 180) < 1e-9);
  assert.ok(Math.abs(halfway.coordinate.latitude) < 1e-9);
  const stationary = new PiecewiseGeodesicCurve([{ latitude: 90, longitude: 0 }, { latitude: 90, longitude: 0 }], 1.032);
  assert.ok(sampleVoyageFrame(stationary, motion, 99_000).forward.toArray().every(Number.isFinite));
});
