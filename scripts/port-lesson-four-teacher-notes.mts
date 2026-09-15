// Export the individually authored source notes; no generated teaching prose.
import {writeFile} from 'node:fs/promises';
import {PORT_LESSON_FOUR_SLIDES as pages,PORT_LESSON_FOUR_TIMING as timing,PORT_LESSON_FOUR_LABS as labs} from '../packages/course-content/src/port-lesson-four.js';
const chunks=[`# 第4讲：码头怎样把一艘船“做完”？

44页 · 90分钟 · 教师演示 + 学生个人实机25分钟。课件版本 release-port-management-authored-v10，课程内全局第154—197页；前153页保留。

## 使用

在教学系统选择港口课程第4讲；独立授课台为 /port-lesson-four-preview.html。教师讲稿在授课台右侧，提示词可在课堂“提示词设置”中按 agent／course／lesson／page／tools 五层修改。

第10、19、30、35页点击细线引导的现场入口，跳转到完整实验系统 /simulations 并定位对应分段。入口只加载暂停现场；教师使用实验系统原有的播放、暂停、下一步演示和操作面板。点击实验页“返回课件”回到来源页并恢复动画进度；再次进入恢复保存现场，明确点击“重播本段”才重置。跨页面后可按需要重新进入全屏。数字人与提示词编辑保留在课堂页面。

在课堂页面也可明确说“进入入港演示”“进入装卸演示”“进入堆场演示”“进入离港演示”。点击和助手动作通过同一服务端入口校验后跳转；实验页用“返回课件”按钮返回。四段各有独立预置起点和记录，演示不会发布学生任务；学生继续使用现有实机模块。

## 课堂节奏

| 时间（分钟） | 页码 | 内容 | 用时 |
|---|---|---|---|`];
let elapsed=0;
for(const t of timing){chunks.push(`| ${elapsed}—${elapsed+t.minutes} | ${t.slideStart-153}—${t.slideEnd-153} | ${t.label}：${t.purpose} | ${t.minutes} |`);elapsed+=t.minutes;}
chunks.push(`
演示、观察、切换与讨论已经包含在对应时段内。学生实机A/B/C分别在第11/20/31页，7/10/8分钟。设备选型、布局优化和综合挑战留待后续讲次。

## 四段演示的观察与复核

| 演示 | 入口／任务／复核页 | 关键停点 | 复核依据 |
|---|---|---|---|`);
for(const l of labs)chunks.push(`| ${l.name} | ${l.demoPage} / ${l.taskPage??'—'} / ${l.reviewPage} | ${l.stop} | ${l.acceptance} |`);
chunks.push(`
### 事实与回答边界

- S01是本课程单船教学情境；116箱进口与78箱出口为实体箱计数，不能直接写成TEU。
- 第21页116／78／88是默认装卸演示的冻结快照。实时解释使用当前运行的分段、时点、目标、箱量和状态记录；不能沿用旧运行结果。
- 第11、20、31页先给核验方向；第41页三个判断在第42页解析前保留独立思考，不把教师答案注入助手。
- 16个动画页：3、4、7、8、9、12、14、16、17、18、22、24、27、29、34、43。首次展示1秒后播放一轮，教师可随时暂停、重播、拖动进度；动画不自动翻页。空格播放／暂停，R重播，F全景，句点下一幕。
- 另开同步投影接收课件页面和动画进度。演示实验时请投影完整实验系统窗口。教师讲稿和助手约束保留在教师侧。
- 生成图片仅提供现场感，带“教学情境 · AI生成示意”标识。流程、状态和数量由代码绘制，真实业务以模型运行记录为准。

## 44页逐页讲稿与助手约束
`);
for(const p of pages)chunks.push(`### ${String(p.localPage).padStart(2,'0')} · ${p.title.replaceAll('\n','')}

稳定标识：${p.slideKey}。段落：${p.section}。${p.animationSeconds?'动画16秒，播放一轮。':''}${p.answerHidden?'本页答案暂不揭示。':''}

**投屏正文**

${p.lead}

${p.points.map(t=>'- '+t).join('\n')}${p.prompt?'\n\n提问：'+p.prompt:''}

**教师讲解建议**

${p.teachingCue}

**本页助手提示**

${p.assistantCue}
`);
await writeFile(new URL('../docs/course/port-management-lesson-four-teacher.md',import.meta.url),chunks.join('\n'),'utf8');
console.log(JSON.stringify({pages:pages.length,minutes:elapsed,notes:pages.map(p=>({page:p.localPage,characters:p.teachingCue.length,short:['task','demo'].includes(p.visual)})),images:[...new Set(pages.map(p=>p.image))]},null,2));
