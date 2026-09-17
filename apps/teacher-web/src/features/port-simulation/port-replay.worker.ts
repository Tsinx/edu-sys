import { PortSubmissionReplay, type PortSubmissionPackage } from "@edu/port-simulation-core";
let replay: PortSubmissionReplay | undefined;
let expected: PortSubmissionPackage["expected"];
let reference: { unitCost: number } | undefined;
self.onmessage = async (event: MessageEvent<{ id: number; type: "load" | "seek"; package?: PortSubmissionPackage; position?: number; nodeIndex?: number; trialIndex?: number; referenceUnitCost?: number | null }>) => {
  const m = event.data;
  try {
    if (m.type === "load") {
      expected = m.package!.expected;
      reference = typeof m.referenceUnitCost === "number" && Number.isFinite(m.referenceUnitCost) ? { unitCost: m.referenceUnitCost } : undefined;
      replay = new PortSubmissionReplay(m.package!.record);
    }
    if (!replay) throw new Error("请先载入复现记录。");
    const view = m.trialIndex === undefined ? replay.seek(m.position ?? 0) : replay.trialView(m.position!, m.trialIndex);
    let verified: boolean | undefined;
    if (m.trialIndex === undefined && replay.position === replay.inputs.length) {
      const result = await replay.result(true, reference);
      verified = result.stateHash === expected.stateHash && result.score === expected.score;
      if (!verified) throw new Error("当前回放版本与提交结果不一致，请下载原始记录核查。");
    }
    postMessage({ id: m.id, view, position: m.nodeIndex ?? 0, verified });
  } catch (error) { postMessage({ id: m.id, error: (error as Error).message }); }
};
