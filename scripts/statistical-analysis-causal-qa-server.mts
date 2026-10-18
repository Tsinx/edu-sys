import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {buildApp} from '../apps/platform-api/src/app.js';
const root=resolve(import.meta.dirname,'..');
const app=await buildApp({dataFile:resolve(root,`.runtime/statistical-causal-qa-${randomUUID()}/state.json`),logger:false,allowDevelopmentIdentity:true,allowLegacyDevelopmentIdentity:true,secureIdentityCookie:false,portSimulationTickMs:0,staticRoot:resolve(root,process.env.STATS_CAUSAL_WEB_ROOT||'apps/teacher-web/dist'),publicOrigin:'http://127.0.0.1:4318'});
await app.listen({port:4318,host:'127.0.0.1'});
console.log('STATISTICAL_CAUSAL_QA_READY http://127.0.0.1:4318');
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>void app.close().then(()=>process.exit(0)));
