import { parentPort, workerData } from "node:worker_threads";
import { verifyPortExperimentSubmission } from "@edu/port-simulation-core";
try { parentPort!.postMessage({ ok: true, value: await verifyPortExperimentSubmission(workerData) }); }
catch (error) { parentPort!.postMessage({ ok: false, error: (error as Error).message }); }
