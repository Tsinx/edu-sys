import assert from "node:assert/strict";
import { mkdir,readFile,writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const root=process.cwd();
const {chromium}=await import(process.env.EDU_PLAYWRIGHT_PATH?pathToFileURL(process.env.EDU_PLAYWRIGHT_PATH).href:"playwright");
const fixture=JSON.parse(await readFile(resolve(root,".runtime/campus-browser-info.json"),"utf8"));
const output=resolve(root,"output/campus-deployment-review");await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.EDU_BROWSER_PATH?{executablePath:process.env.EDU_BROWSER_PATH}:{channel:"msedge"})});
const errors=[];const report={pages:[],offline:false,checkpoint:false,conflictRecovery:false,cloudCalls:[],errors};
function observe(page){page.on("pageerror",error=>errors.push(error.message));page.on("request",request=>{const url=new URL(request.url());if(["http:","https:"].includes(url.protocol)&&url.origin!==fixture.address)report.cloudCalls.push(request.url());});}
async function login(page,role){await page.goto(fixture.address);await page.getByLabel("账号",{exact:true}).fill(`${role}-qa`);await page.getByLabel("密码",{exact:true}).fill(fixture.password);await page.getByRole("button",{name:"登录",exact:true}).click();await page.getByRole("button",{name:/离线与同步/}).waitFor();}
async function inspect(page,label){const result=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,broken:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).map(image=>image.getAttribute("src")),leaks:document.querySelectorAll("[data-teaching-cue],[data-assistant-cue],[data-story-beat],[data-voyage-stage],[data-open-question]").length}));assert.ok(result.scrollWidth<=result.width+1,`${label} horizontal overflow: ${JSON.stringify(result)}`);assert.equal(result.broken.length,0,`${label}: broken images`);assert.equal(result.leaks,0);report.pages.push({label,...result});}
try{
  const student=await browser.newContext({viewport:{width:1440,height:1000}});const page=await student.newPage();observe(page);
  await login(page,"student");await inspect(page,"student-home-desktop");await page.screenshot({path:resolve(output,"student-home.png")});
  await page.goto(`${fixture.address}/simulations`);await page.getByRole("button",{name:/^(开始|继续)$/}).waitFor();
  await page.getByRole("button",{name:/离线与同步/}).click();
  await page.getByText("基础程序",{exact:true}).waitFor({timeout:90000});
  const article=page.locator(".campus-offline-panel article").filter({has:page.getByText("港口管理课程与仿真",{exact:true})});
  await article.getByRole("button",{name:"下载并校验"}).click();await article.getByText(/已校验，可离线使用/).waitFor({timeout:180000});
  await page.getByRole("button",{name:/离线与同步/}).click();
  await page.getByRole("button",{name:/^(开始|继续)$/}).click();await page.waitForTimeout(2200);await page.getByRole("button",{name:"暂停",exact:true}).click();
  await page.waitForTimeout(500);
  await page.getByRole("button",{name:/离线与同步/}).click();
  const receipt=page.waitForResponse(response=>response.url().endsWith("/api/edge/records")&&response.request().method()==="POST"&&response.status()===200,{timeout:20000});
  await page.getByRole("button",{name:"立即同步存档"}).click();await receipt;await page.getByText("服务器已接收存档",{exact:true}).waitFor({timeout:20000});
  const backups=await student.request.get(`${fixture.address}/api/edge/records`);const records=(await backups.json()).records;assert.ok(records.some(record=>record.key.endsWith(":run")));report.checkpoint=true;
  await page.getByRole("button",{name:/离线与同步/}).click();
  await inspect(page,"simulation-desktop");await page.screenshot({path:resolve(output,"simulation-desktop.png")});
  await student.setOffline(true);await page.reload();await page.getByRole("button",{name:"继续",exact:true}).waitFor({timeout:30000});
  await page.getByRole("button",{name:"继续",exact:true}).click();await page.waitForTimeout(1500);await page.getByRole("button",{name:"暂停",exact:true}).click();
  report.offline=true;await inspect(page,"simulation-offline");
  await page.setViewportSize({width:390,height:844});await inspect(page,"simulation-narrow");await page.screenshot({path:resolve(output,"simulation-narrow.png")});
  await student.setOffline(false);await page.getByRole("button",{name:/离线与同步/}).click();await page.getByRole("button",{name:"立即同步存档"}).click();await page.getByText("服务器已接收存档",{exact:true}).waitFor({timeout:20000});
  const currentCloud=await (await student.request.get(`${fixture.address}/api/edge/records`)).json();
  const branch=currentCloud.records.find(record=>record.key.endsWith(":run"));const remoteValue={...JSON.parse(branch.value),selectedRole:"berth_operations"};
  const changed=await student.request.post(`${fixture.address}/api/edge/records`,{data:{requestId:crypto.randomUUID(),deviceId:crypto.randomUUID(),key:branch.key,expectedRevision:branch.revision,releaseId:"qa-other-device",value:JSON.stringify(remoteValue)}});assert.equal(changed.status(),200);
  await page.getByRole("button",{name:/离线与同步/}).click();await page.getByRole("button",{name:"继续",exact:true}).click();await page.waitForTimeout(1500);await page.getByRole("button",{name:"暂停",exact:true}).click();await page.waitForTimeout(600);
  await page.getByRole("button",{name:/离线与同步/}).click();await page.getByRole("button",{name:"立即同步存档"}).click();await page.getByText("存在存档分叉",{exact:true}).waitFor();
  await page.getByRole("button",{name:"读取服务器存档",exact:true}).click();await Promise.all([page.waitForEvent("load"),page.getByRole("button",{name:"备份本机后采用服务器版本",exact:true}).click()]);await page.getByRole("button",{name:"继续",exact:true}).waitFor();
  const restored=await page.evaluate(key=>new Promise((resolve,reject)=>{const open=indexedDB.open("edu-campus-v1");open.onsuccess=()=>{const request=open.result.transaction("records").objectStore("records").getAll();request.onsuccess=()=>resolve(JSON.parse(request.result.find(item=>item.key===key).value).selectedRole);request.onerror=()=>reject(request.error);};}),branch.key);assert.equal(restored,"berth_operations");report.conflictRecovery=true;
  await page.goto(`${fixture.address}/join/${fixture.classrooms["course-port-management-intro"]}`);await page.locator(".slide-logical-canvas").waitFor();await inspect(page,"student-slide-narrow");await page.screenshot({path:resolve(output,"student-slide-narrow.png")});
  const teacher=await browser.newContext({viewport:{width:1600,height:1100}});const teacherPage=await teacher.newPage();observe(teacherPage);await login(teacherPage,"teacher");
  await teacherPage.goto(`${fixture.address}/classroom/${fixture.classrooms["course-port-management-intro"]}`);await teacherPage.locator(".slide-logical-canvas").waitFor();
  await teacherPage.getByText("数字人在本机播放 · AI 由校园服务器代理",{exact:true}).waitFor();await inspect(teacherPage,"teacher-classroom");await teacherPage.screenshot({path:resolve(output,"teacher-classroom.png")});
  assert.deepEqual(errors,[]);assert.deepEqual(report.cloudCalls,[]);
  await writeFile(resolve(output,"browser.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){await writeFile(resolve(output,"browser-failure.json"),JSON.stringify({...report,failure:String(error)},null,2));throw error;}
finally{await browser.close();}
