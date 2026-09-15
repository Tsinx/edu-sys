import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPortCourse, applyPortCourseCommand, nextPortCourseStep, portCourseGoals, portCourseView, serializePortCourse, restorePortCourse, type PortCourseUnit } from '../packages/port-simulation-core/src/index.js';

const output = fileURLToPath(new URL('../output/port-lesson-four-qa',import.meta.url));
await mkdir(output, { recursive: true });
const summaries = [];
for (const unit of ['arrival', 'cargo', 'yard', 'departure'] as PortCourseUnit[]) {
  const run = createPortCourse(unit);
  for (let i = 0; i < 300 && !run.complete; i++) {
    const step = nextPortCourseStep(run);
    assert.ok(step);
    const result = applyPortCourseCommand(run, step.command, true);
    assert.notEqual(result.outcome, 'incorrect', result.message);
  }
  assert.ok(run.complete, unit);
  assert.deepEqual(portCourseView(restorePortCourse(serializePortCourse(run, true))), portCourseView(run));
  const boxes = Object.values(run.simulation.boxes);
  summaries.push({ unit, schema: run.schema, simulationSeconds: run.simulation.second - run.startSecond, commands: run.commands.length, goals: portCourseGoals(run), unloaded: boxes.filter(b => b.unloadedAt !== null).length, loaded: boxes.filter(b => b.loadedAt !== null).length, delivered: boxes.filter(b => b.deliveredAt !== null).length, stage: run.simulation.calls.S01!.stage });
  await writeFile(`${output}/${unit}-demonstration.json`, serializePortCourse(run, true));
}
const cargo=summaries.find(s=>s.unit==='cargo')!;
assert.equal(cargo.unloaded,116);assert.equal(cargo.loaded,78);assert.equal(cargo.delivered,88);
const boundary={label:'默认装卸标准演示完成时的冻结快照',shipCargoDone:true,unloaded:cargo.unloaded,loaded:cargo.loaded,delivered:cargo.delivered,remainingImports:116-cargo.delivered};
await writeFile(`${output}/evidence.json`,JSON.stringify({checkedAt:new Date().toISOString(),boundary,summaries},null,2));
console.log(JSON.stringify({boundary,summaries},null,2));
