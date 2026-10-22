# 经济数学课程顺序与版本

2026-10-20：保持32讲、64学时框架；第1讲为45分钟序章，第2—10讲各两个45分钟。第1讲压缩后仍有1学时待课程层面统一安排，本轮不额外增加课时。

当前课件863页。第1—10讲页数分别为40、59、85、60、66、64、64、64、64、64；第11—32讲保留原内容，不用规划中的新标题冒充已重写的页面。第八至十讲每讲主线60页、课后拓展4页；第1课时1—30页，第2课时31—60页，拓展61—64不计入90分钟。

当前版本`release-economic-mathematics-differentiation-2026-10-20`，Deck为`deck-economic-mathematics-2026-differentiation`。注册、课堂导航、页码和导出从清单读取。独立入口为`/economic-narration.html?lesson=8&page=1`，第9、10讲相应修改lesson。第八至十讲有独立页面键与进度命名空间；数字人只朗读已公开段落。

前一版`release-economic-mathematics-continuity-derivative-2026-10-17`共701页，第八至十讲各10页。内容和接入快照在`archive/courseware/economic-mathematics/lessons-08-10-before-differentiation-2026-10-20/`，附SHA-256和恢复说明。历史课堂使用自己的页数清单，保留原版本、页码与实验状态，显示归档，禁止自动映射。V1、348页V2和历次精修归档继续保留。

第10—13讲顺序：高阶导数与微分→中值定理→洛必达→泰勒与极限综合。第10讲已经制作，第11—13讲尚待逐页重写；凹凸、拐点应用仍留到第14讲。规划见`economic-mathematics-lessons-10-13-plan.md`。

运行`pnpm --filter @edu/teacher-web exec tsx scripts/prepare-economic-differentiation.tsx`更新第八至十讲的逐页讲稿、完整答案打印页、个人练习单、学习通题源、课程清单和源文件指纹。课堂与打印共用React、KaTeX和显式模型图形。
