# 《管理学》第 5—8 讲验证报告

验收日期：2026-09-15。课件版本 `management-principles-2026-v2`；最终校内资源包 `campus-20260915130552670`。本报告对应第二期完整课件，第一期证据保留在原目录。

## 交付数量与基线

| 项目 | 第一期 | 本期新增 | 前八讲合计 |
|---|---:|---:|---:|
| 原 PPTX | 5 | 4 | 9 |
| 原页 | 299 | 218 | 517 |
| 网页页面 | 367 | 296 | 663 |
| Imagegen 图片 | 110 | 80 | 190 |
| 教师控制演示 | 8 | 8 | 16 |

[基线审计](../../output/management-principles/qa-phase2/baseline-audit.json)通过：前四讲全部 367 页公开内容、标识与顺序不变，110 张原有生成图片的原件和网页版本校验一致，12 个第一期基线文件保持原值。517 个原页均有对应，拆页连续、网页编号连续且标识唯一。第二期源文件校验值见[实施说明](IMPLEMENTATION-PHASE2.md)。

## 内容与视觉

全部 218 张原稿经 PowerPoint 实际渲染并逐页审阅；原稿文字、表格、图片、备注及动画关系保留在来源索引。新增页使用逐页编写的正文，第八讲封面前点评和第 7—11 页图像信息已核对。所有修订具有来源与期间，例题复算见[独立计算记录](../../output/management-principles/qa-phase2/calculation-audit.json)。

全部 80 张新增 Imagegen 图片已逐张检查原件及采用版本，保存独立提示词、SHA-256 和页面关系。完整 296 页分别在桌面与 390px 宽度完成真实浏览和截图，共 592 张；以 74 张桌面／窄屏成对联系表逐页审阅，未见裁切、重叠、比例失真、缺图或教师备注泄露。紧凑缩略图遮挡页眉的问题已修复，受影响页面在最终截图中复核通过。共享旧页样式未改动，新增结构渲染与修复限定第 5—8 讲。

前八讲同时执行教师端、学生端、1600px 与 390px 宽度的全页浏览，共 **663×2×2＝2652 次画布检查**，全部通过。窄屏保持 1600×1000 逻辑画布等比缩放；并非改写为竖屏长文布局。

- [逐页视觉记录](visual-review-phase2.json)：218 个原页、296 个新网页、592 张截图和联系表的校验值。
- [全八讲真实课堂浏览](../../output/management-principles/qa-phase2/runtime/audit.json)：2652 次检查，错误列表为空。
- [新四讲预览检查](../../output/management-principles/qa-phase2/preview-final.log)：592 次通过。
- [全课私有对照](../../output/management-principles/review-phase2/index.html)：517 行，1180 张原稿／网页图片路径全部存在；[对照页面检查](../../output/management-principles/qa-phase2/review-test.log)包含 20 个桌面与窄屏代表项。

## 课堂、演示与助教

[课堂功能检查](../../output/management-principles/qa-phase2/runtime/audit.json)通过课程进入、独立学生加入、只读权限、翻页、第四至第五讲边界、跨讲跳转、第四讲双文件定位和新增来源定位。全部 16 处演示在两个浏览器间推进、参数变更和重置同步；刷新及离开后返回页面保留已揭示状态。

[演示状态审计](../../output/management-principles/qa-phase2/demos/audit.json)覆盖全部已注册演示的步骤、选项和数值范围，桌面与窄屏共 **238 项通过**。管理幅度演示验证 64 名基层人员、幅度 2—8 的向上取整结果，原稿 4096 人模型另行复算。教师可直接翻页，未添加投票、分组或提交门槛。

学生访问教师来源接口返回 403，学生快照与 DOM 不包含原备注、制作记录和私有上下文。663 个页面的助手上下文各自独立；课程、讲次、页面与可见步骤正确，未混入港口或数学内容。

第 5—8 讲各执行一次真实云端助教服务请求，**4 次均成功**。分别覆盖 PDCA、管理幅度、候选人证据和上汽双龙演示的未揭示状态；实际请求文本及回答均未包含被隐藏的后续答案，服务没有擅自推进页面。[请求与回答证据](../../output/management-principles/qa-phase2/live-assistant/audit.json)保留各讲 SSE、可见提示文本及 SHA-256。刷新恢复检查在真实课堂回归中完成；四次云端请求为本次服务可用性和上下文隔离证据，不代表未来所有模型回答的质量保证。

## 工程检查

| 检查 | 结果 | 证据 |
|---|---|---|
| 学生文案、课程上下文、覆盖、演示和迁移专项 | 14 项通过 | [context-tests.log](../../output/management-principles/qa-phase2/context-tests.log) |
| 平台 API 回归 | 83 项通过 | [api-regression.log](../../output/management-principles/qa-phase2/api-regression.log) |
| 网页回归 | 104 项通过 | [web-tests.log](../../output/management-principles/qa-phase2/web-tests.log) |
| 港口模拟核心回归 | 68 项通过 | [core-regression.log](../../output/management-principles/qa-phase2/core-regression.log) |
| `pnpm typecheck`、生产构建 | 通过；`pnpm build` 先执行全工作区 typecheck | [delivery-build.log](../../output/management-principles/qa-phase2/delivery-build.log) |
| `git diff --check` | 通过 | [diff-check.log](../../output/management-principles/qa-phase2/diff-check.log) |

上表是各次执行的通过数，专项与完整 API 回归存在重叠，不相加宣称独立测试数量。构建仍提示既有大块资源及港口组件静态／动态重复引用，构建成功，未将这些提示计为失败。

## 发布资源、缓存与独立启动

最终包位于 [campus-management-phase2-20260915-delivery-final](../../output/campus-management-phase2-20260915-delivery-final/)。[资源校验](../../output/management-principles/qa-phase2/asset-integrity.json)通过：管理学资源 199 个文件，190 张生成图片、9 张原始资料图片，共 36,941,426 字节；所有 SHA-256 一致，公开资源中无私有来源文件或原备注。

[独立服务验收](../../output/management-principles/qa-phase2/campus-release-delivery.json)通过生产依赖安装、独立启动、账号建立、安全 Cookie、缺失配置拒绝运行、静态根隔离、管理学八讲目录与末页、教师来源接口、633 项发布资源和 5 个数据库备份完整性。独立运行不依赖源仓库或 GPU 子模块。

[缓存版本验收](../../output/management-principles/qa-phase2/cache/audit.json)在真实持久化浏览器中从第一期资源包切换到第二期：旧标签继续使用旧版本，关闭浏览器后重新打开激活新版本，页面显示八讲；新资源组下载后断网读取全部 199 个文件并逐个核对字节数与 SHA-256。Service Worker 的 CacheStorage 中未缓存 `/api/` 请求。最后一页刷新恢复后，“下一页”不可用。

缓存测试使用本地 HTTP 版本切换服务，并以现有课堂 API 为上游。早期测试服务将无扩展名的 `LICENSE` 错误回退为 HTML、随后末页断言遗漏拆页，均已修正测试夹具并重新执行；HTTP 夹具不转发课堂 WebSocket，末页采用刷新后校验。实际教师—学生 WebSocket 同步另由课堂回归验证。

最终本机入口另经[课程首页检查](../../output/management-principles/qa-phase2/local-course-final.json)：八个讲次按钮、517 原页、663 网页和 16 处演示显示正确，新增图片请求成功，页面运行错误为空。收尾时修正首页遗留演示计数并重载本机接口，使系统课程简介完成幂等更新；随后重新构建并验证上述最终资源包。此项只调整课程首页计数，课件画布内容与已审阅截图对应的页面校验值未变。

## 明确边界

- 正式课程代码、总学时尚无来源，界面显示“待完善”，未从课件数量推算。
- 微软旧推荐比例、奖励等仍缺可靠证据，已在课件中标注历史／未核实边界；没有补造数据。
- 本次在本机验证资源包与 HTTPS 代理上游配置，未执行实际校园 TLS、校内路由或外部部署。云端助教由另行执行的四次真实请求验证。
- 第二期课件、图片、逐页对照、更新记录、截图和验证证据均已落入工作区。第一期交付证据保留，未生成新版 PPTX 或通用课件编辑器。
