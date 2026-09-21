import {buildApp} from '../apps/platform-api/src/app.js';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const dir=resolve('output/port-expansion-qa/runtime');await mkdir(dir,{recursive:true});
const app=await buildApp({dataFile:resolve(dir,'state.json'),portSimulationDatabaseFile:resolve(dir,'simulation.sqlite'),portSimulationTickMs:0,allowDevelopmentIdentity:true,allowLegacyDevelopmentIdentity:true,studentAiEnabled:false});
await app.listen({host:'127.0.0.1',port:4318});console.log('Lesson 7-8 isolated QA API: 4318');
