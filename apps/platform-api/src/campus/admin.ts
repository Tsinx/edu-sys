import { loadEnvFile } from "node:process";
import { resolve, join } from "node:path";
import { mkdir, readdir, readFile, copyFile } from "node:fs/promises";
import { backup, DatabaseSync } from "node:sqlite";
import { CampusIdentityProvider } from "./accounts.js";

try {loadEnvFile(process.env.EDU_ENV_FILE ?? resolve(".env"));} catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
const dataFile=resolve(process.env.EDU_DATA_FILE ?? "data/state.json");
const action=process.argv[2] ?? "help";
if(action==="backup") {
  const target=process.argv[3];if(!target)throw new Error("请指定一个新的备份目录。");
  const directory=resolve(dataFile,"..");
  try {
    const pid=Number(await readFile(join(directory,"server.pid"),"utf8"));
    if(pid>0){let running=false;try{process.kill(pid,0);running=true;}catch{}if(running)throw new Error("请先停止教学服务，再执行跨数据库一致性备份。");}
  } catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
  await mkdir(resolve(target),{recursive:false});
  for(const item of await readdir(directory)) {
    const source=join(directory,item);const destination=join(resolve(target),item);
    if(item.endsWith(".sqlite")) {
      const db=new DatabaseSync(source,{readOnly:true});try{await backup(db,destination);}finally{db.close();}
      const check=new DatabaseSync(destination,{readOnly:true});try{const result=check.prepare("PRAGMA integrity_check").get();if(result?.integrity_check!=="ok")throw new Error(`备份校验失败：${item}`);}finally{check.close();}
    } else if(item.endsWith(".json"))await copyFile(source,destination);
  }
  console.log("备份完成，SQLite 完整性检查通过。");
} else if(["create","reset-password","list"].includes(action)) {
  const identity=new CampusIdentityProvider(`${dataFile}.accounts.sqlite`);
  try {
    if(action==="list")console.log(JSON.stringify(identity.listAccounts(),null,2));
    else {
      let input="";for await(const chunk of process.stdin){input+=chunk;if(input.length>4000)throw new Error("账号输入过长。");}
      const data=JSON.parse(input) as {username:string;displayName:string;role:"teacher"|"student";password:string};
      if(typeof data.username!=="string" || typeof data.password!=="string")throw new Error("账号参数格式不正确。");
      if(action==="create") {
        if(!["teacher","student"].includes(data.role)||typeof data.displayName!=="string")throw new Error("账号角色或姓名不正确。");
        console.log(JSON.stringify(await identity.createAccount(data.username,data.displayName,data.role,data.password)));
      } else {await identity.resetPassword(data.username,data.password);console.log("密码已重置，该账号的旧会话已失效。");}
    }
  } finally {identity.close();}
} else console.log("用法：node admin.mjs create | reset-password | list | backup <新目录>。create/reset-password 从标准输入读取 JSON，密码不会写入命令参数。");
