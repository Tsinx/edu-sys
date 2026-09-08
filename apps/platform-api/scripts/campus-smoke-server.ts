// Isolated local browser acceptance server; never loads the workspace .env.
import { mkdtemp,mkdir,writeFile } from "node:fs/promises";
import { resolve,join } from "node:path";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { buildApp } from "../src/app.js";
import { CampusIdentityProvider } from "../src/campus/accounts.js";
const root=resolve(process.env.EDU_REPO_ROOT ?? "../..");
const directory=await mkdtemp(join(tmpdir(),"edu-campus-browser-"));
const identity=new CampusIdentityProvider(join(directory,"accounts.sqlite"));
const password=randomBytes(18).toString("hex");
await identity.createAccount("teacher-qa","部署验收教师","teacher",password);
await identity.createAccount("student-qa","部署验收学生","student",password);
const app=await buildApp({dataFile:join(directory,"state.json"),campusMode:true,secureIdentityCookie:false,identityProvider:identity,
  staticRoot:resolve(root,"apps/teacher-web/dist"),assistantProvider:{name:"qa-no-network",async *streamJson(){yield JSON.stringify({schema:"edu.classroom.assistant.response",version:"1.0",dialogue:"这是本地验收回复。",actions:[]});}},
  studySpeechProvider:{name:"qa-text-only",asrConfigured:false,ttsConfigured:false,async transcribe(){throw new Error("QA has no cloud speech");},async *synthesize(){throw new Error("QA has no cloud speech");}}
});
const address=await app.listen({host:"127.0.0.1",port:0});
const login=await app.inject({method:"POST",url:"/api/identity/login",payload:{username:"teacher-qa",password}});
const cookie=String(login.headers["set-cookie"]).split(";")[0]!;
const classrooms:Record<string,string>={};
for(const course of ["course-port-management-intro","course-economic-mathematics"]) {
  const live=await app.inject({method:"POST",url:`/api/courses/${course}/class-sessions`,headers:{cookie}});
  if(live.statusCode!==201)throw new Error(live.body);classrooms[course]=live.json().id;
}
await mkdir(join(root,".runtime"),{recursive:true});
await writeFile(join(root,".runtime/campus-browser-info.json"),JSON.stringify({address,password,classrooms,directory}));
console.log(JSON.stringify({address,credentialsFile:".runtime/campus-browser-info.json",cloudCalls:false}));
for(const signal of ["SIGINT","SIGTERM"] as const)process.once(signal,()=>void app.close().then(()=>process.exit(0)));
