# 第11、12讲专用实验与课件验收

日期：2026-10-14。实施范围见[交付说明](./port-management-lessons-eleven-twelve-delivery.md)。

## 实际交付

两讲正文已从各48页重写为各32页，90分钟与30分钟实操同步编排。独立入口为 /port-class-lab.html?lesson=11 和 ?lesson=12；授课台为 /port-expansion-preview.html?lesson=11 和 ?lesson=12。预置现场、任务书、真实箱流反馈、对照或恢复复盘、持久化、导出与JSON重放均已实现。

第11讲基准和试验复用同一120分钟检查点、固定300箱队列与360分钟观察终点。第12讲信息故障实际限制闸口交付；独立清单、限额备用、技术工作、对账和真实3箱试运行构成恢复条件。没有将旧岸桥故障或已有48小时综合挑战冒充新实验。

数值为连续流箱当量，不等同于逐箱台账；本实验不输出逐箱周转分位数或CPPI。原48小时场次、分段教学与成绩规则保留，相关核心回归通过。

## 检查结果

| 检查 | 结果 |
|---|---|
| 核心包完整测试 | 110项通过，含6项新增短实验不变量 |
| 教师前端完整测试 | 206项通过 |
| 平台API完整测试 | 145项通过 |
| 最新正文文案与课堂上下文复核 | 10项通过，覆盖全部扩展页与受控揭示 |
| 全工作区类型检查 | 通过 |
| 最终网页生产构建 | vite build通过；保留原有大于500KB的分块提示 |
| 真实浏览器流程 | 9项通过，异常、控制台错误和溢出均为空 |
| 两讲PDF | 各32页；字体嵌入、文字、逐页书签、尺寸和边界检查通过 |
| 学生内容边界 | 未显示教师讲稿、助手约束或未揭示解析；固定1600×1000 |

浏览器使用正在运行的5173服务，完成以下实际操作：

1. 第11讲运行基准、保存、从同一起点改变岗位、运行试验、保存分析并下载。
2. 刷新后重放原场次、基准、草稿与完成标记。
3. 载入JSON前备份当前工作；篡改汇总数字后仍按真实指令重算。
4. 第12讲拒绝缺失恢复证据和错误清单，正确核验后实际启用备用、维修、对账、试运和恢复。
5. 保留初始RPO暴露、未交付和被拒绝的尝试，不将技术完成自动当服务恢复。
6. 两套实验390px检查，可输入且没有文档横向溢出。
7. 损坏原笔记保留，可继续实验并下载新结果。
8. 全部64页在1600与390px分别打开；无坏图、文字越界或教师元数据。
9. 使用公共工具栏切换网页全屏，讲次与页码保留，未新增第二条课件工具栏。

检查文件位于 output/port-class-lab-qa：browser.json、pdf-checks.json、完整测试及构建日志、两讲运行JSON、CSV、三维现场截图、64页网页截图和PDF渲染拼图。早期调试失败与全课程导出尝试另有记录，当前结果以 browser.json 和 pdf-checks.json 为准。

## PDF范围与资源边界

两讲最终文件为 output/pdf/port-class-labs-v16/port-management-lesson-11-v16-final.pdf 与 lesson-12同名模式；页面提供静态下载。每份32页、32个书签，文字可提取，中文字体已嵌入，图解与数量保留矢量/文字。manifest.json记录SHA256。

原整门549页导出在131页附近出现printToPDF超时，资源报告峰值1653.7 MiB；未发布失败的全课程包。之后使用按讲次隔离浏览器、8页分批的专用导出，保持10% CPU与1536 MiB上限，峰值约519 MiB并成功结束。其他讲次PDF未在本轮重新验收。

## 复查

- pnpm --filter @edu/port-simulation-core test
- pnpm --filter @edu/teacher-web test
- pnpm --filter @edu/platform-api test
- pnpm typecheck
- pnpm --filter @edu/teacher-web exec vite build
- pnpm --filter @edu/port-simulation-core exec tsx ../../scripts/port-class-lab-browser-audit.mts
- python scripts/course-pdf/run_limited.py node --max-old-space-size=256 scripts/export-port-class-labs.mjs
- python scripts/verify-port-class-lab-pdfs.py

实验无需登录，记录本地保存，不自动提交学校平台。源资料为历史事实与方法，软件不提供生产授权。这里验证的是本机真实浏览器、代码和导出；尚未进行整班90分钟试讲、校园网多机或实际投影验收。未部署生产环境，未提交或推送Git。

空白检查：本次港口范围的差异检查及新增文本检查通过。全工作区 git diff --check 仍报告原有并行文件 docs/course/economic-mathematics-limits-exercises.md:953 的末尾空行，本轮未修改该文件。
