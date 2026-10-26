import { parentPort, workerData } from 'node:worker_threads';
import { verifyEnterprisePackage } from '@edu/port-simulation-core';
try { parentPort?.postMessage({ ok: true, value: verifyEnterprisePackage(workerData) }); }
catch (error) { parentPort?.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) }); }
