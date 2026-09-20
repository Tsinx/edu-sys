import {buildApp} from '../apps/platform-api/src/app.js';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=fileURLToPath(new URL('../output/port-lesson-six-qa/runtime',import.meta.url));await mkdir(dir,{recursive:true});
const app=await buildApp({dataFile:resolve(dir,'state.json'),portSimulationDatabaseFile:resolve(dir,'simulation.sqlite'),portSimulationTickMs:0,allowDevelopmentIdentity:true,allowLegacyDevelopmentIdentity:true,studentAiEnabled:false});
await app.listen({host:'127.0.0.1',port:4316});console.log('Lesson 6 isolated QA API: 4316');
