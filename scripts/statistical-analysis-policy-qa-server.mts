import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {buildApp} from '../apps/platform-api/src/app.js';
const root=resolve(import.meta.dirname,'..');
const port=Number(process.env.STATS_POLICY_QA_PORT||4320);
const app=await buildApp({dataFile:resolve(root,`.runtime/statistical-policy-qa-${randomUUID()}/state.json`),logger:false,
 allowDevelopmentIdentity:true,allowLegacyDevelopmentIdentity:true,secureIdentityCookie:false,portSimulationTickMs:0,
 staticRoot:resolve(root,process.env.STATS_POLICY_WEB_ROOT||'apps/teacher-web/dist'),publicOrigin:`http://127.0.0.1:${port}`});
await app.listen({port,host:'127.0.0.1'});
console.log(`STATISTICAL_POLICY_QA_READY http://127.0.0.1:${port}`);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>void app.close().then(()=>process.exit(0)));
