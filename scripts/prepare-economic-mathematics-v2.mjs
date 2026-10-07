import {build} from "esbuild";
import {writeFile,mkdir,readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
const root=new URL("../",import.meta.url);
const bundle=await build({entryPoints:[new URL("packages/course-content/src/economic-mathematics/index.ts",root).pathname.replace(/^\/([A-Za-z]:)/,"$1")],bundle:true,platform:"node",format:"esm",write:false});
const course=await import("data:text/javascript;base64,"+Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const {ECONOMIC_MATHEMATICS_LESSONS:lessons,ECONOMIC_MATHEMATICS_SLIDES:slides,ECONOMIC_MATHEMATICS_LESSON_DEFINITIONS:definitions}=course;
const manifest={deckId:course.ECONOMIC_MATHEMATICS_DECK_ID,versionId:course.ECONOMIC_MATHEMATICS_VERSION_ID,canvas:[1600,1000],hours:64,slideTotal:slides.length,lessons,constructivistPages:slides.filter(s=>s.style==="constructivist").length,pages:slides.map(s=>({index:s.index,slideKey:s.slideKey,lesson:s.lesson,localIndex:s.localIndex,title:s.title,layout:s.layout,style:s.style,image:s.image,steps:s.steps?.length??0,revealTitles:(s.steps??[]).map(step=>step.title),interactionId:s.interactionId}))};
await mkdir(new URL("docs/course/",root),{recursive:true});
await writeFile(new URL("docs/course/economic-mathematics-deck-v2.json",root),JSON.stringify(manifest,null,2)+"\n");
const scripts=["# 经济数学V2教学脚本\n\n商科本科一年级；32讲、64学时；每讲90分钟。以下页面内容逐页编写，公式和答案以源码为准。备课PDF公开全部累计步骤；课堂默认从第0步开始。\n"];
for(const l of definitions){
 scripts.push("## 第"+l.number+"讲 "+l.title+"\n\n核心问题："+l.coreQuestion+"\n\n先修："+l.prerequisites.join("、")+"\n\n学习目标：\n"+l.outcomes.map(x=>"- "+x).join("\n")+"\n\n90分钟路线：\n"+l.route.map(x=>"- "+x.minutes+"分钟："+x.activity).join("\n"));
 for(const [i,s] of l.slides.entries())scripts.push("\n### "+(i+1)+". "+s.title+"\n\n"+[s.lead,...s.body??[],s.formula?"$$"+s.formula+"$$":null,s.prompt,s.table?JSON.stringify(s.table):null,...(s.steps??[]).map((r,j)=>(j+1)+". "+r.title+(r.text?"："+r.text:"")+(r.formula?"\n\n$$"+r.formula+"$$":"")),"备课提示："+s.teachingCue].filter(Boolean).join("\n\n"));
}
await writeFile(new URL("docs/course/economic-mathematics-scripts-v2.md",root),scripts.join("\n\n")+"\n");
const assets=JSON.parse(await readFile(new URL("docs/course/economic-mathematics-assets-v2.json",root),"utf8"));
for(const a of assets.assets){const bytes=await readFile(new URL("apps/teacher-web/public/course-assets/economic-mathematics/v2/"+a.file,root));a.sha256=createHash("sha256").update(bytes).digest("hex");a.bytes=bytes.length;a.publicLabel=a.role==="scene"?"教学情境":"概念模型";}
await writeFile(new URL("docs/course/economic-mathematics-assets-v2.json",root),JSON.stringify(assets,null,2)+"\n");
console.log(JSON.stringify({pages:slides.length,lessons:lessons.length,images:assets.assets.length,constructivistPages:manifest.constructivistPages}));
