import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const stem='packages/course-content/src/management-principles';
const pages=read(`${stem}/pages.json`),lessons=read(`${stem}/lessons.json`),images=read('docs/management/image-manifest.json'),updates=read('docs/management/updates.json');
const sourceCounts={0:55,1:56,2:67,3:65,4:111,5:60,6:64,7:55,8:39,9:133,10:222,11:54,12:45,13:71,14:52,15:33,16:63};
const primaryCounts={0:55,9:60,10:90};
const modules=lessons.map(l=>{const pp=pages.filter(p=>p.lessonNumber===l.number);return {...l,sourcePages:sourceCounts[l.number],primaryPages:primaryCounts[l.number]??sourceCounts[l.number],generatedImages:new Set(pp.flatMap(p=>p.image?.src.match(/mg-\d+\.webp$/)?[p.image.src]:[])).size,demos:pp.filter(p=>p.demo).map(p=>({type:p.demo,slideKey:p.slideKey,index:p.index})),pages:pp.map(p=>({slideKey:p.slideKey,index:p.index,localIndex:p.localIndex,title:p.title}))};});
const index={title:'管理学',attribution:'管理学课程组 · 韦笑',version:'management-principles-2026-v3',verifiedDate:'2026-09-20',lectureCount:16,introductionCount:1,sourcePages:updates.length,webPages:pages.length,imageCount:images.length,demoCount:modules.reduce((s,l)=>s+l.demos.length,0),courseCode:null,totalHours:null,modules};
fs.writeFileSync('docs/management/course-index.json',JSON.stringify(index,null,2)+'\n');
const old='docs/management/README.md';if(!fs.existsSync('docs/management/README-PHASE2.md'))fs.copyFileSync(old,'docs/management/README-PHASE2.md');
const table=modules.map(l=>`| ${l.number===0?'绪论':`第${l.number}讲：${l.title}`} | ${l.sourcePages}${l.sourcePages!==l.primaryPages?`（主${l.primaryPages}＋补${l.sourcePages-l.primaryPages}）`:''} | ${l.slideTotal} | ${l.slideStart}—${l.slideEnd} | ${l.generatedImages} |`).join('\n');
fs.writeFileSync(old,`# 《管理学》完整课程交付索引

已完成**绪论＋第1—16讲**：1245个原页归档、1477个网页页面、410张Imagegen图片、34处教师控制演示。本期新增814页、220张图和18处演示。署名：管理学课程组 · 韦笑。核验日期：2026-09-20。

打开[本机管理学课程](http://127.0.0.1:5173/courses/management-principles)，选择模块开始授课。教师可按原文件和原页码定位、推进或重置演示；学生同步只读。正式课程代码及总学时继续显示待完善。

## 全课目录

| 模块 | 归档原页 | 网页页数 | 历史存储索引 | Imagegen图片 |
|---|---:|---:|---|---:|
${table}
| 合计 | **1245** | **1477** | 身份保持连续 | **410** |

播放顺序是绪论→第一讲→…→第十六讲。绪论追加存储在末尾，以保留前八讲页面身份；历史存储索引不是目录顺序。第9、10讲归档数包含补充版本，重复共用页不重复制造教学页面。绪论2页旧行政安排省略，仍保留私有记录。[完整机器可读目录](course-index.json)包含每页标题和稳定标识。

## 教师审阅与制作材料

- [完整原页与版本对照](../../output/management-principles/review-phase3/index.html)：1245个原页，可展开原表述、新表述、修改理由和来源；仅供教师审阅。
- [全课更新记录](updates.json)、[第三期更新记录](updates-phase3.json)、[第三期处理状态](source-dispositions-phase3.json)、[多版本去重核对](duplicate-review-phase3.json)。
- [全课原页映射](source-map.json)、[原稿逐页审阅](source-review-phase3.json)、[第三期来源目录](sources-phase3.mjs)、[复算与口径记录](CALCULATIONS-PHASE3.md)。
- [新增220张图片及提示词](image-manifest-phase3.json)、[单张制作记录](images-phase3/)、[生成原件](../../output/management-principles/images-phase3/originals/)、[全课410张图片索引](image-manifest.json)。
- [验证报告](VERIFICATION-PHASE3.md)、[逐页截图审阅与校验值](visual-review-phase3.json)、[制作记录](IMPLEMENTATION-PHASE3.md)。

## 工作区与运行包

| 内容 | 位置 |
|---|---|
| 本期12份原稿、解析、媒体、渲染 | [source-phase3](../../output/management-principles/source-phase3/) |
| 逐页可编辑正文 | [authored](authored/) |
| 课程目录、公开页面、导航和演示 | [课程模块](../../packages/course-content/src/management-principles/) |
| 本期截图、日志及真实服务结果 | [qa-phase3](../../output/management-principles/qa-phase3/) |
| 完整校内资源包 | [campus-management-20260920-delivery](../../output/campus-management-20260920-delivery/) |

最终包版本为 campus-20260919182941886，已通过生产依赖安装、独立启动、923项资源校验和从第二期缓存升级。管理学公开资源组为423文件（410生成图＋13资料图），90,259,450字节。私有原稿、来源详情、完整提示词与验收数据留在工作区，不随公开静态资源发布。启动说明见包内[DEPLOYMENT.md](../../output/campus-management-20260920-delivery/DEPLOYMENT.md)，本机日常启动使用[课堂启动脚本](../../scripts/start-classroom.ps1)。本次未外部部署。

## 前两期存档

第一期[验证报告](VERIFICATION.md)、[原页对照](../../output/management-principles/review/index.html)和[资源包](../../output/management-campus-20260914-final/)保留。第二期[交付索引](README-PHASE2.md)、[验证报告](VERIFICATION-PHASE2.md)、[原页对照](../../output/management-principles/review-phase2/index.html)和[资源包](../../output/campus-management-phase2-20260915-delivery-final/)保留。[第三期基线审计](../../output/management-principles/qa-phase3/baseline-audit.json)确认前八讲663页及190张原有图片保持一致。
`);
console.log({modules:modules.length,pages:pages.length,images:images.length});
