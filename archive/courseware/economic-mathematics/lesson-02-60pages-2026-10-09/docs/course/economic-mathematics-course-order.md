# 经济数学课程顺序与版本

第1讲为课程引入，40页、45分钟。第2讲为60页、两个45分钟课时，五次独立练习共20分钟；前30页第一课时，后30页第二课时。第3-32讲编号与内容保留。当前入口共422页、32讲。

大纲64学时：第1讲1学时、第2讲2学时、后续60学时，已分配63学时；剩余1学时待课程层面安排。

当前版本 `release-economic-mathematics-lesson02-flow-2026-10-09`，Deck `deck-economic-mathematics-2026-lesson02-flow`。第二讲页面键 `em-l02-refined-flow-p001` 至 `p060`。注册、课堂页数、范围与导出读取课程清单。

原26页合并版保存在 `archive/courseware/economic-mathematics/lesson-02-26pages-2026-10-09/`。原50页精修版连同源文件、图形代码、封面、讲稿和三个PDF保存在 `archive/courseware/economic-mathematics/lesson-02-50pages-2026-10-09/`，附SHA-256清单与恢复说明。

V1、348页V2、388页重排版和412页精修版的课堂分别保留原版本、原页码与实验状态。历史页数按版本识别，显示已归档提示，禁止自动映射到新页码。独立讲解页使用新的浏览器缓存命名空间，不复用50页版的位置。

第二讲入口 `/economic-narration.html?lesson=2&page=1`。每页数字人讲解只使用已公开段落；教师可控制逐步公开、练习计时与实验变量。打印课件与正式显示共享React、KaTeX和原生模型；实验打印页给出已核验的项目比较表。

运行 `pnpm --filter @edu/teacher-web exec tsx scripts/export-economic-refined.tsx` 更新打印页面、逐页讲稿、练习单及源文件指纹，再按CSS尺寸打印PDF。逐页脚本、设计、衔接说明和验收记录位于同目录的lesson-02文档；最终PDF位于项目的 `output/pdf/`。
