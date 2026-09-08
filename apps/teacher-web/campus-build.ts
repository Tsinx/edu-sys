import { createHash } from "node:crypto";
import { readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import ts from "typescript-api";
import type { Plugin } from "vite";

const privateFields=new Set(["teachingCue","assistantCue","storyBeat","voyageStage","openQuestion"]);
export function stripAuthoringMetadata(source:string,filename:string) {
  const ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const result=ts.transform(ast,[context=>root=>{
    const visit:ts.Visitor=node=>{
      if(ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name)||ts.isStringLiteral(node.name)) && privateFields.has(node.name.text)) {
        return ts.factory.updatePropertyAssignment(node,node.name,ts.factory.createStringLiteral(""));
      }
      return ts.visitEachChild(node,visit,context);
    };
    return ts.visitNode(root,visit) as ts.SourceFile;
  }]);
  const code=ts.createPrinter({removeComments:true}).printFile(result.transformed[0]!);result.dispose();return code;
}
async function filesUnder(root:string):Promise<string[]> {
  const result:string[]=[];
  for(const item of await readdir(root,{withFileTypes:true})) {
    const path=resolve(root,item.name);
    if(item.isDirectory())result.push(...await filesUnder(path));else if(item.isFile())result.push(path);
  }
  return result;
}
export function campusBuild(releaseId:string):Plugin {
  let outDir="";let projectRoot="";
  return {
    name:"edu-campus-public-content",enforce:"pre",apply:"build",
    configResolved(config){outDir=resolve(config.root,config.build.outDir);projectRoot=config.root;},
    transform(code,id){
      if(id.replaceAll("\\","/").includes("/packages/course-content/src/") && /\.ts$/.test(id))return {code:stripAuthoringMetadata(code,id),map:null};
    },
    async closeBundle(){
      // Only built runtime files and vetted media are publishable. Production
      // previews, source scripts and author notes stay outside the web root.
      for(const path of await filesUnder(outDir)) {
        const name=relative(outDir,path).replaceAll("\\","/");
        if(name.startsWith("avatar/handdrawn/") || /\.(md|mjs|map|ts|py|ps1)$/i.test(name))await unlink(path);
      }
      const entries=[];
      for(const path of await filesUnder(outDir)) {
        const name=relative(outDir,path).replaceAll("\\","/");
        if(["service-worker.js","offline-manifest.json"].includes(name))continue;
        const bytes=(await stat(path)).size;
        const sha256=createHash("sha256").update(await readFile(path)).digest("hex");
        const shell=/\.(js|css|woff2?|ttf)$/.test(name) || ["index.html","student.html","app.webmanifest","icon.svg"].includes(name);
        const group=shell?"shell":name.startsWith("avatar/lanzhou/")?"avatar":name.startsWith("course-assets/economic-mathematics/")?"economic":"port";
        entries.push({url:`/${name}`,bytes,sha256,group});
      }
      await writeFile(resolve(outDir,"offline-manifest.json"),JSON.stringify({version:1,releaseId,groups:[{id:"shell",label:"基础程序"},{id:"port",label:"港口管理课程与仿真"},{id:"economic",label:"经济数学课程"},{id:"avatar",label:"数字人动作素材"}],files:entries}));
      const sw=await readFile(resolve(projectRoot,"src/campus/service-worker.js"),"utf8");
      await writeFile(resolve(outDir,"service-worker.js"),sw.replaceAll("__EDU_RELEASE_ID__",releaseId));
    }
  };
}
