import { portActiveResources, portBatchSummary, portHandoverItems, portWaitReason, portYardUsage, visiblePortCalls } from "./port-operations-engine.js";
import { portDeadline, portScore } from "./port-operations-review.js";
import type { PortSession } from "./port-operations-model.js";
/** Only this projection is sent to the student render thread. Future actual arrivals,
 * undisclosed calls and latent anomalies remain inside the simulation worker. */
export function portStudentView(s: PortSession, reference?: {
    unitCost: number;
}) {
    const vessels = visiblePortCalls(s).map(v => ({ ...v, waitReason: portWaitReason(s, v.call), deadline: portDeadline(s, v.id, "ship") }));
    const ids = new Set(vessels.map(v => v.id));
    const batches = Object.values(s.batches).filter(b => ids.has(b.callId)).map(b => ({ ...b, summary: portBatchSummary(s, b), deadline: portDeadline(s, b.callId, b.flow) }));
    const batchIds = new Set(batches.map(b => b.id));
    const boxes = Object.values(s.boxes).filter(b => batchIds.has(b.batchId)).map(({ issueExpected: _, history, ...b }) => ({ ...b, recordCount: history.length }));
    const sample = s.schedules.filter(v => v.eta <= 48 * 3600);
    return { schema: s.schema, status: s.status, mode: s.mode, second: s.second, config: s.config, plan: s.plan, vessels, batches, boxes, jobs: s.jobs,
        berths: s.berths, anchors: s.anchors, channel: s.channel, pauseReason: s.pauseReason, cost: s.cost, energy: s.energy, distance: s.distance, rehandles: s.rehandles,
        failedCrane: s.failedCrane, repairPending: s.repairPending, wind: s.wind, resources: portActiveResources(s),
        yards: s.plan.yards.map(y => ({ ...y, ...portYardUsage(s, y.id) })), notices: s.notices.slice(-80), attempts: s.attempts.slice(-40), score: portScore(s, reference),
        statistics: s.status === "completed" ? { configuredMeanGap: s.config.meanGapMinutes, referenceMeanService: 240, sampleMeanGap: sample.length > 1 ? (sample.at(-1)!.eta - sample[0]!.eta) / (sample.length - 1) / 60 : 0, sampleMeanService: sample.reduce((n, v) => n + v.referenceService, 0) / sample.length / 60 } : null,
        handover: ["completed", "interrupted"].includes(s.status) ? portHandoverItems(s).map(({ fingerprint: _, ...h }) => ({ ...h, verified: s.handover.some(e => e.object === h.object) })) : [] };
}
export type PortView = ReturnType<typeof portStudentView>;
