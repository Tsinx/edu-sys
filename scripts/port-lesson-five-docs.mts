import { writeFile } from 'node:fs/promises';
import { PORT_LESSON_FIVE_SLIDES as pages, PORT_LESSON_FIVE_TIMING as timing, PORT_LESSON_FIVE_EVIDENCE as evidence, capacityTime } from '../packages/course-content/src/port-lesson-five.js';
const root=new URL('../docs/course/',import.meta.url);
const head=['# 第5讲：岸桥更多，船为什么未必更快？','', '48页 · 90分钟 · 教师演示＋个人C实验。全局第198—245页。课件版本：release-port-management-capacity-v11。','', '## 使用','', '正式课堂选择第5讲；独立授课台为 `/port-lesson-five-preview.html`。第19/22页打开A/B演示，第34页打开个人C。实验入口只加载现场，明确点击推进才开始计算。返回课件保留页码和动画；重置先归档。个人记录保存在本机，导出后按教师指定渠道提交。','', '教师可另开同步投影。场景动画首次进入1秒后播放一轮，可暂停、重播、分幕、拖动；不自动翻页。第6/28页演算停在首步，由教师点击播放或下一幕展开。第45页解析由教师手动揭示，第46页为公开解析。','', '软件故障时使用A/C记录分析，记录完成方式，不将参考记录视为个人运行。','', '## 90分钟安排','', '| 时间 | 页码 | 段落 |','|---|---|---|'];
let elapsed=0;for(const t of timing){head.push(`| ${elapsed}—${elapsed+t.minutes}分钟 | ${t.slideStart-197}—${t.slideEnd-197} | ${t.label} |`);elapsed+=t.minutes;}
head.push('','## 48页逐页教师稿','');
for(const p of pages)head.push(`### ${p.localPage} · ${p.title.replaceAll('\n','')}`, '', `稳定标识：${p.slideKey}。${p.animationSeconds?'动画16秒，可分幕观察。':''}${p.answerHidden?'本页为独立判断，答案未揭示。':''}`, '', '**投屏正文**','',p.lead??'','',...p.points.map(s=>'- '+s),'','**教师讲授与操作**','',p.teachingCue,'','**助手边界**','',p.assistantCue,...(p.reveal?['','**教师手动揭示内容**','',p.reveal]:[]),'');
await writeFile(new URL('port-management-lesson-five-teacher.md',root),head.join('\n'));
const rows=Object.entries(evidence).map(([id,v])=>`| ${id} | ${v.configuration.cranes} | ${v.configuration.drivers} | ${v.elapsed} | ${capacityTime(v.elapsed!)} |`);
await writeFile(new URL('port-management-lesson-five-experiment.md',root),`# 第5讲实验与证据说明

## 已复现的计算

运行版本 port-capacity/1.0；底层引擎 port-operations/3.1；种子20260932。通过原引擎命令准备S01：已靠妥、四货批回执均有效；I1/Y1、I2/Y2、E1/Y3、E2/Y4。准备阶段资源暂不启用，相对计时起点为绝对仿真9209秒。起点无在途作业、无异常箱，未删事件或绕过核查。

已有岸桥4台、牵引车12辆、场桥4台、闸口2个。岸桥操作员4，场桥岗位4，闸口岗位2，维修岗位1。只改变分配给S01的岸桥数或运输岗位；不是采购设备。

| 方案 | S01岸桥 | 运输岗位 | 精确耗时（秒） | 时:分:秒 |
|---|---:|---:|---:|---|
${rows.join('\n')}

以上来自正式复现脚本，已逐组按导出命令重放核对，不是手填课件结果。完整验收状态与运行证据见 [验收报告](port-management-lesson-five-qa.md)。核心、浏览器与课堂联动分别核验。

## 1、2、4小时快照

| 方案 | 开工后（小时） | 已卸进口 | 已装出口 | 岸侧 | 待运输 | 进口提离 |
|---|---:|---:|---:|---:|---:|---:|
${Object.entries(evidence).flatMap(([id,v])=>v.samples.filter(s=>[3600,7200,14400].includes(s.elapsed)).map(s=>`| ${id} | ${s.elapsed/3600} | ${s.unloaded} | ${s.loaded} | ${s.quay} | ${s.waitingTransport} | ${s.delivered} |`)).join('\n')}

以上计数单位均为实体箱。

## 指标与边界

主指标为最后一箱进口卸船或出口装船的真实事件时间减开工时刻；任务共116箱进口、78箱出口，均为实体箱。精确终点不做30秒向上取整。按30秒及终点采样，课件曲线取300秒采样与终点；观察点1/2/4小时保留。

岸侧箱数按位置字段统计；待运输箱数剔除已分配运输任务的箱子。进口卸船、出口装船、进口提离分别计数。资源显示实际执行任务数和可用数；没有充分证据的等待原因标为待核查。

单一固定模型的结果不能外推为真实码头长期平均效应。增加岸桥可能改变双向共享任务节奏；单靠总时间差不能认定唯一机制。概念模型60/40/50和六车排队使用独立教学参数，不能混同为S01实测结果。

## 操作与个人记录

教师演示A/B，学生先填写假设及反证，再执行C。D/E用于解释边际改善。每次从同一冻结起点重建。推进计算在Worker内进行；允许运行到观察点或完成，记录使用仿真时间。

记录按身份、课堂/作用域、用途、方案隔离。刷新按命令重放；重置先归档原记录。导出包括版本、方案、命令、假设、反证、解释和完成方式。导入校验作用域并重放，不接受文件声称的完成标志。查看教师演示不会标记学生完成。

个人结果完成后才开放结果解释。计算失败可切换“记录分析”，使用已验证A/C，并显式保存该完成方式；不算个人实机完成。不自动上传或计分。

## 复现命令

在 packages/port-simulation-core 执行：\
\`pnpm exec tsx ../../scripts/port-lesson-five-evidence.mts\`

生成的课件数据位于 packages/course-content/src/port-lesson-five-evidence.ts，A—E命令包及源码、命令SHA-256清单位于 output/port-lesson-five-evidence。更改模型后须重跑、核对并更新文档，不能静默沿用旧结果。
`);
console.log(`Updated ${pages.length} page notes; ${elapsed} minutes.`);
