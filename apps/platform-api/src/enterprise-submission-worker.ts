import { parentPort, workerData } from 'node:worker_threads';
import { verifyEnterprisePackage } from '@edu/port-simulation-core';
try {
  let week=-1;
  const value=verifyEnterprisePackage(workerData,hour=>{const next=Math.floor(hour/168);if(next>week){week=next;parentPort?.postMessage({type:'progress',hour});}});
  parentPort?.postMessage({ ok: true, value });
}
catch (error) { parentPort?.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) }); }
