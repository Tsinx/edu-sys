# 第11、12讲课件与专用课堂实验

2026-10-14更新。当前课程版本`release-port-management-documentary-v19`。每讲32页、90分钟，第16页后课间，33—63分钟为30分钟个人电脑实操。第11讲14页、第12讲15页使用场景配图，两讲开场均已重剪为独立3分钟实拍纪实片，封面与PDF同步更新。

| 讲次 | 课件 | 专用实验 |
|---|---|---|
| 11 绩效诊断与运营改善 | `/port-expansion-preview.html?lesson=11` | `/port-class-lab.html?lesson=11` |
| 12 风险屏障与中断恢复 | `/port-expansion-preview.html?lesson=12` | `/port-class-lab.html?lesson=12` |

本机入口为`http://127.0.0.1:5173`。两讲独立保存进度。原48小时综合实训保留，并增加专用入口；讲次页数、课程资源、助手上下文、教师讲稿和版本已同步。

## 内容与实验

第11讲以MPA新加坡2024年材料提出竞争解释，加入六个时间事件、CPPI 2026方法、样本结构反转、未完成样本偏差、库存流量关系和经营评审。开场8分钟分为3分钟短片与5分钟问题/资料核查，不增加总课时。新版《等待，发生在哪里》使用9个许可实拍来源、26段画面剪辑，13段重新撰写的中文旁白，包含素材原声、原创配乐、字幕与片头片尾。用作业动作追踪接续，官方档案标题节选9秒；保留观察与停顿。普通港口实拍不是新加坡事件现场，MPA明确当时锚地并未拥挤。其余AI场景配图继续标明，定量标注保持可编辑。

新版入口：`/course-assets/port-management/l11-media/documentary-v2/index.html`；同目录`opening.mp4`可下载（180秒、1920×1200、30fps、H.264/AAC）。原`l11-media/index.html`自动进入新版，`legacy-index.html`保留旧版对照。第一页面向课堂播放，统一工具栏提供播放/暂停及影片控制；教师端输出声音，跟随投影端静音。播放器含章节、逐字稿、逐项素材来源、许可与剪辑时间表。

实验预置双船300箱，第120分钟前的入港、系泊与普通业务已完成；保存基准后，从相同检查点建立最多三份岗位试验，统一第360分钟观察。交付、未完、在制、期限与成本由实际运行产生。

任务书：诊断5分钟、基准5分钟、试验12分钟、评审8分钟。使用连续流箱当量，不具备逐箱最终周转时间，不能据此编造逐箱P90或CPPI分数。

第12讲读取天津港事故调查中的许可、库存、人员与监管接口证据，以及名古屋NUTS中断材料，加入蝴蝶结、屏障性能、共同原因、业务影响、RTO和RPO。独立实验从第90分钟接口不可信开始；选择隔离范围，核验重复和过期票据，使用有限备用，进行技术恢复、对账、实际试运行与恢复审查。

第12讲新版《放行之前》用11个许可实拍来源、25段剪辑与13段新旁白，把生命安全、依法履责、诚实记录和协同处置落实到专业判断。事故段使用官方调查报告标题节选16秒，仓储人物与历史案件无关，无合成采访。一般实拍与天津、名古屋历史材料明确区分。0—3分钟看短片、3—8分钟写判断并核查材料，保留原有实操时段。独立播放器：`/course-assets/port-management/l12-media/documentary-v2/index.html`，可下载MP4、字幕和剪辑时间表；原入口转入新版并保留旧版对照。封面改为许可实拍帧，其余AI示意配图继续保留原标签。教师稿含“价值目标—任务—学习证据”对应表。

任务书：界定事件5分钟、维持业务8分钟、验证恢复10分钟、复盘7分钟。备用单道22箱当量/时、总额度24，另计两名复核人员费用；技术恢复需60人分钟；对账与实际3箱试运行后才可恢复。第240分钟评价经营影响。初始可恢复点落后15分钟，超过10分钟目标；这表示初始记录暴露，不冒充最终永久丢失量。技术完成、服务恢复与积压消化分别记录。

两套实验复用现有`terminal-lab`连续流内核，新增版本化检查点与信息恢复条件。参数、票据和处置路径为课程设定，不重演天津或名古屋现场。

## 保存与复盘

进度与草稿自动保存在本机。JSON包含可重放指令、分析与拒绝反馈，CSV提供指标。载入JSON前自动下载当前工作备份，再重放本讲指令计算状态；未知版本、跨讲记录和不可读笔记不会覆盖原记录。实验完整性检查不等于教师分析评价，也不上传学校平台。

## 配套材料

- [第11讲逐页教师讲稿](./port-management-lesson-eleven-teacher.md)、[第12讲逐页教师讲稿](./port-management-lesson-twelve-teacher.md)。
- [来源台账](./port-management-lessons-eleven-twelve-sources.md)与[参考分析、量规](./port-class-lab-teacher-reference.md)。
- 可编辑正文为`packages/course-content/src/port-lesson-eleven.ts`与`port-lesson-twelve.ts`；固定1600×1000画布，解析由教师揭示。
- 第11讲PDF：`/handouts/port-documentary-v19-l11/port-management-lesson-11-v19-documentary.pdf`；第12讲PDF：`/handouts/port-documentary-v19-l12/port-management-lesson-12-v19-documentary.pdf`。各32页，含文字、矢量图、字体和逐页书签。v16—v18文件保留为交付档案。
- [两讲纪实版短片验收](./port-management-documentary-v2-qa.md)。
- [第11讲v17插图与旧片验收档案](./port-management-lesson-eleven-media-qa.md)。
- [第12讲v18插图、思政与旧片验收档案](./port-management-lesson-twelve-media-qa.md)。
- [验收记录](./port-management-learning-lab-qa.md)。

原方案为前期档案，实施范围以本文为准。整门549页的旧导出流程遇到资源限制；本次按讲次隔离、8页分批，只发布验证通过的两讲新版PDF，不宣称全课程PDF重建完成。浏览器检查不替代真实整班90分钟试讲。

## 逐箱设施版 v20（当前课堂入口）

- 统一入口 `/port-classroom.html`，当前本机服务为 http://127.0.0.1:5174/port-classroom.html 。
- 两讲专用实验使用2.0逐箱模型；综合使用3.2。现有纪实开场片与配图保留，课件参考数据和时间轴同步新模型。
- 当前PDF为 `/handouts/port-facilities-v20-l11/port-management-lesson-11-v20-facilities.pdf` 与 `/handouts/port-facilities-v20-l12/port-management-lesson-12-v20-facilities.pdf`，每讲32页。v19作为历史交付保留。
- 设施规则、兼容范围、功能修复和验收见 `docs/design/port-facility-repair-v20.md`；参考数值见 `port-class-lab-teacher-reference.md`。
