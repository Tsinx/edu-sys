import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../apps/platform-api/src/app.js';
import { CampusIdentityProvider } from '../apps/platform-api/src/campus/accounts.js';

process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve('output/port-enterprise-integration');await mkdir(output,{recursive:true});
const require=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js');
const {chromium}=require('playwright');
const mainBrowser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
const mainPage=await mainBrowser.newPage({viewport:{width:1500,height:1050}}),errors:string[]=[];
mainPage.on('pageerror',(error:Error)=>errors.push(error.message));
try{
 await mainPage.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const course=mainPage.locator('.workspace-card').filter({has:mainPage.getByRole('heading',{name:'港口管理概论',exact:true})});
 await course.getByRole('link',{name:'长期独立经营 →',exact:true}).waitFor({timeout:60000});
 const identity=await (await mainPage.request.get('http://127.0.0.1:5173/api/identity/session')).json();assert.equal(identity.actor.actorId,'teacher-li-xingzhi');
 await course.getByRole('link',{name:'长期独立经营 →',exact:true}).click();
 await mainPage.locator('.enterprise-app[data-enterprise-schema="port-enterprise/1.0"]').waitFor({timeout:60000});
 await mainPage.getByRole('navigation',{name:'经营工作台'}).getByRole('button',{name:'任务与提交',exact:true}).click();
 await mainPage.getByRole('form',{name:'公布新的独立经营任务'}).waitFor();
 await mainPage.goto('http://127.0.0.1:5173/courses/course-port-management-intro?tab=enterprise',{waitUntil:'domcontentloaded'});
 await mainPage.locator('[data-enterprise-portal="course"]').getByRole('link',{name:'发布长期经营任务与查看个人结果'}).waitFor();
 await mainPage.screenshot({path:join(output,'local-course-enterprise.png'),fullPage:true});
 const overview=await mainPage.request.get('http://127.0.0.1:5173/api/port-enterprise/overview');assert.equal(overview.ok(),true);
 assert.deepEqual(errors,[]);
 await writeFile(join(output,'local-browser.json'),JSON.stringify({origin:'http://127.0.0.1:5173',actor:'teacher-li-xingzhi',checks:['existing-local-login','course-home-entry','local-worker-start','teacher-task-publication-controls','course-workspace-tab','same-origin-enterprise-api'],noOfficialTaskPublished:true,errors},null,2));
 console.log('Existing local teaching platform verified without publishing a real task.');
}finally{await mainBrowser.close();}

const fixture=join(output,'isolated-campus-'+Date.now());await mkdir(fixture);
const dataFile=join(fixture,'state.json'),identity=new CampusIdentityProvider(dataFile+'.accounts.sqlite'),password=randomUUID();
for(const [name,display,role] of [['enterprise-teacher','经营验收教师','teacher'],['enterprise-student','经营验收学生','student'],['enterprise-other','其他验收学生','student']] as const)await identity.createAccount(name,display,role,password);
const app=await buildApp({dataFile,identityProvider:identity,campusMode:true,secureIdentityCookie:false});
const teacherRequire=createRequire(resolve('apps/teacher-web/package.json'));
const {createServer}=await import(pathToFileURL(teacherRequire.resolve('vite')).href);
process.env.EDU_API_PROXY_URL='http://127.0.0.1:4321';process.env.EDU_WEB_PORT='5191';
let vite:Awaited<ReturnType<typeof createServer>>|undefined;
try{
 await app.listen({host:'127.0.0.1',port:4321});
 vite=await createServer({root:resolve('apps/teacher-web'),configFile:resolve('apps/teacher-web/vite.config.ts'),server:{host:'127.0.0.1',port:5191,strictPort:true},logLevel:'warn'});await vite.listen();
 const connection=resolve('apps/platform-api/output/port-enterprise-qa/test-connection.json');
 await mkdir(resolve('apps/platform-api/output/port-enterprise-qa'),{recursive:true});
 await writeFile(connection,JSON.stringify({password,root:fixture,api:'http://127.0.0.1:4321',web:'http://127.0.0.1:5191'}));
 console.log('Testing teacher/student portal, submission and classroom tools against isolated data.');
 await import('./port-enterprise-task-browser-audit.mts');
 await copyFile(resolve('output/port-enterprise-qa/task-browser-report.json'),join(output,'portal-flow.json'));
}finally{await vite?.close();await app.close();}
