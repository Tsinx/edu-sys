import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPortCourse, applyPortCourseCommand, nextPortCourseStep, serializePortCourse, portCourseView, makePortSubmission, verifyPortSubmission } from '../packages/port-simulation-core/src/index.js';
const output = fileURLToPath(new URL('../output/port-submission-score-20260922/', import.meta.url));
await mkdir(output, { recursive: true });
const run = createPortCourse('arrival', undefined, 'battle');
applyPortCourseCommand(run, { kind: 'start' });
assert.equal(applyPortCourseCommand(run, { kind: 'depart', callId: 'S01' }).deduction, 5);
while (!run.complete) { const step = nextPortCourseStep(run); assert.ok(step); applyPortCourseCommand(run, step.command); }
const raw = serializePortCourse(run), pkg = await makePortSubmission(raw, run.simulation), verified = await verifyPortSubmission(pkg);
assert.equal(verified.result.score, 95);
assert.equal(portCourseView(run).lesson.score.total, 95);
await writeFile(output + 'arrival-95.json', raw);
await writeFile(output + 'arrival-95-submission.json', JSON.stringify(pkg));
await writeFile(output + 'arrival-95-verified.json', JSON.stringify(verified, null, 2));
console.log(JSON.stringify({ score: verified.result.score, courseScore: verified.result.courseScore, hash: verified.result.stateHash }));
