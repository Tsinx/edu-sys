import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {buildApp} from '../apps/platform-api/src/app.js';
import {CampusIdentityProvider} from '../apps/platform-api/src/campus/accounts.js';
const root=resolve(import.meta.dirname,'..'),qaRoot=resolve(root,process.env.EDU_RESEARCH_QA_ROOT??'.runtime/statistics-research'),folder=resolve(qaRoot,'qa-'+randomUUID());
await mkdir(folder,{recursive:true});
const identity=new CampusIdentityProvider(resolve(folder,'accounts.sqlite'));
const password=randomBytes(18).toString('base64url');
await identity.createAccount('research-teacher','统计研究应用验收教师','teacher',password);
const student=await identity.createAccount('research-student','统计研究应用验收学生','student',password);
identity.setCourseAccess(student.id,['statistical-analysis']);
await writeFile(resolve(qaRoot,'qa-auth.json'),JSON.stringify({teacher:'research-teacher',student:'research-student',password}));
const app=await buildApp({dataFile:resolve(folder,'state.json'),logger:false,campusMode:true,identityProvider:identity,
 secureIdentityCookie:false,studentAiEnabled:false,portSimulationTickMs:0,
 staticRoot:resolve(qaRoot,'dist')});
const port=Number(process.env.EDU_RESEARCH_QA_PORT??4324);
await app.listen({port,host:'127.0.0.1'});
console.log('RESEARCH_QA_READY http://127.0.0.1:'+port+' (isolated local test accounts)');
for(const s of ['SIGINT','SIGTERM'] as const)process.once(s,()=>void app.close().then(()=>process.exit(0)));
