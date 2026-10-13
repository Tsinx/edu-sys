import {buildApp} from '../apps/platform-api/src/app.js';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('../output/port-performance-safety-qa/runtime/',import.meta.url));await mkdir(dir,{recursive:true});
const app=await buildApp({dataFile:dir+'state.json',portSimulationDatabaseFile:dir+'simulation.sqlite',portSimulationTickMs:0,allowDevelopmentIdentity:true,allowLegacyDevelopmentIdentity:true,studentAiEnabled:false});
await app.listen({host:'127.0.0.1',port:4321});console.log('Lecture 11-12 isolated QA API: 4321');
