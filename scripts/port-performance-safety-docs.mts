import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PORT_EXPANSION_SLIDES, PORT_EXPANSION_SOURCES, EXPANSION_TITLES, expansionStart, expansionTiming } from '../packages/course-content/src/port-expansion.js';
import { PORT_ADVANCED_ILLUSTRATIONS, portOpeningFilm } from '../packages/course-content/src/port-advanced-media.js';
const folder=fileURLToPath(new URL('../docs/course/',import.meta.url));await mkdir(folder,{recursive:true});
for(const lesson of [11,12] as const){
  let minute=0;const pages=PORT_EXPANSION_SLIDES.filter(p=>p.lesson===lesson);
  const lines=[
    '# 港口管理概论 · 第'+lesson+'讲教师讲稿','',
    '主题：'+EXPANSION_TITLES[lesson]+'。32页，90分钟，两段各45分钟，第16页后课间。','',
    '第33—63分钟为个人电脑实操，共30分钟。实验入口：/port-class-lab.html?lesson='+lesson+'。任务、草稿、运行与导出都在该独立页面；本机保存不等于学校平台提交。','',
    '| 时间 | 页码 | 内容 |','|---|---|---|',
    ...expansionTiming(lesson).map(t=>{const from=minute;minute+=t.minutes;return '| '+from+'—'+minute+'分钟 | '+(t.slideStart-expansionStart(lesson)+1)+'—'+(t.slideEnd-expansionStart(lesson)+1)+' | '+t.label+' |';}),'',
    '所有参考数据均为冻结模拟运行，学生实际结果应从自己的JSON重放。真实案例材料与教学情境分别注明；课堂任务不构成现场作业程序或授权。',''
  ];
  const film=portOpeningFilm(pages[0]!.slideKey)!;
  lines.splice(4,0,'开场：0—3分钟播放《'+film.title+'》，3—8分钟写判断并核查案例。短片入口：'+film.player+'；MP4：'+film.src+'。已含中文旁白、字幕和原创音乐；投影端默认静音，教师端输出声音。','');
  if(lesson===12)lines.push('## 课程思政目标与可观察学习证据','','| 价值目标 | 学习任务 | 可观察证据 | 对应页 |','|---|---|---|---|','| 人民至上、生命至上 | 在进度与核验冲突时写出决定及必要条件 | 没有把产量收益作为缺失屏障的补偿 | 1、28、32 |','| 依法履责 | 明确提供、复核与交接的责任接口 | 指明对象、状态、接收方及现实授权边界 | 2—4、6、25 |','| 数据诚信 | 保留重复、旧版、差异与失败记录 | 原始告警未删除，差异及处置可追踪 | 7、15、27、31 |','| 专业精神与协同 | 核对技术、数据与业务证据后交接 | 受控试运、恢复时点及下一班任务有记录 | 12、19—20、25—27 |','','按证据、推理和责任完整性评价，不以复述口号、表态或复制参考操作作为学习成绩。软件指标不测定真实人身风险，课堂恢复不产生现实授权。','');
  for(const p of pages){const source=PORT_EXPANSION_SOURCES[p.source],art=PORT_ADVANCED_ILLUSTRATIONS[p.slideKey];lines.push('## '+String(p.localPage).padStart(2,'0')+'　'+p.title,'',p.lead,'','**讲授与操作**','',p.teachingCue,'',...(art?['**配图观察**','',art.alt+'。'+art.caption+'。标注由代码绘制，可按本页进度展开。','']:[]),'**投影要点**','',...p.points.map(t=>'- '+t),'',...(p.rows?['**图表材料**','',...p.rows.map(r=>r.join(' / ')),'']:[]),...(p.reveal?['**教师参考解析，受控揭示**','',p.reveal,'']:[]),'来源：['+source.label+']('+source.url+')；'+source.date,'');}
  await writeFile(folder+'port-management-lesson-'+(lesson===11?'eleven':'twelve')+'-teacher.md',lines.join('\n'));
}
const pages=PORT_EXPANSION_SLIDES.filter(p=>p.lesson>=11);
const ledger=['# 第11—12讲来源与参考运行台账','','核验日期：2026-10-14。真实事件、通用工具、独立教学样本与冻结参考运行分别标注。','','| 来源 | 日期或版本 | 对应页面 | 使用边界 |','|---|---|---|---|',...Object.entries(PORT_EXPANSION_SOURCES).filter(([id])=>pages.some(p=>p.source===id)).map(([id,s])=>'| ['+s.label+']('+s.url+') | '+s.date+' | '+pages.filter(p=>p.source===id).map(p=>p.lesson+'-'+p.localPage).join('、')+' | '+s.boundary+' |'),'','参考运行由 scripts/port-class-lab-evidence.mts 生成，源文件为 packages/course-content/src/port-class-lab-evidence.json。每份均含完整版本化指令，可用 restorePortClassLab 重放；教师参考不是学生操作。','','CPPI采用2025版入口及2026-06-10方法说明，时间口径排除离泊后至驶出口岸区段。本课程挂靠时间轴、分层反转数据与未完成样本为独立教学设定，未复制或编造官方榜单。','','天津材料来自应急管理部保存的事故调查报告；名古屋材料来自日本国土交通省委员会资料。报告事实、课程机制映射和软件场景不得混为一类。软件不重演危险化学过程，不模拟网络攻击实施。','','两讲与综合模拟共用 port-operations/3.2 逐箱设施内核；库存、车辆与任务共用状态，数值为整数箱。第11讲指标是固定窗口交付、在制和成本，没有逐箱周转分位数；第12讲新增有限备用、独立记录、技术工作、对账和受控试运行约束。',''];
ledger.push('第11讲14页配图：开场封面为Toàn BDS的Pexels许可实拍帧，其余沿用标有AI教学示意的场景。概念标注、图表和数值继续由代码绘制，保留教师揭示。','','纪实开场片《等待，发生在哪里》采用9个许可实拍来源，剪辑为26段画面；官方档案标题节选9秒。180秒、1920×1200、30fps、H.264/AAC，13段新写中文旁白、分句字幕、素材原声与原创配乐。MPA明确当时锚地并未拥挤；普通港口实拍不作为新加坡事件现场。原动态PPT版保留在上级目录，legacy-index.html可对照。','');
ledger.push('第12讲15页配图：封面改为cottonbro studio的Pexels许可实拍帧，其余AI通用场景继续标明，不作为历史布局或距离测量。纪实片《放行之前》采用11个许可实拍来源，25段画面、13段新旁白；事故段使用官方报告标题节选，人物与历史案件无关，无合成采访。','','两片素材作者、原发布页、许可链接、片中使用时间与原文件SHA256均在各自 documentary-v2/storyboard.json 及播放器中逐项列出；原素材仅存放于ignored工作目录，不另行发布素材集。依据Pexels License剪辑，不以教学用途推断自动免责。片段原声不作为历史案件同期声。','','思政价值依据引用应急管理部存档的安全生产法第三条（2021年修正文本），具体落实为生命安全、依法履责、诚实记录与协同处置；与天津历史事实、名古屋信息依赖案例以及教学实验保持边界。量规评价证据和责任完整性，不凭政治表态代替专业分析。','');
await writeFile(folder+'port-management-lessons-eleven-twelve-sources.md',ledger.join('\n'));
console.log('Wrote updated lecture 11/12 teacher scripts and source ledger.');
