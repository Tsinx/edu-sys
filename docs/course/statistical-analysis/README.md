# 统计分析方法 · 原生课件

课程内部标识 `statistical-analysis`。32课时、16讲，面向学过基础统计但尚不能独立实证分析的商科研究生。第1讲48页、第2讲52页，各90分钟；第3—16讲保留正式标题与“待建设”，没有空白播放入口。

## 打开与授课

本机平台运行时，打开 [课程工作区](http://127.0.0.1:5173/courses/statistical-analysis)，在讲次目录中选择第1讲或第2讲。教师可使用上一页、下一页、讲内页码与讲次选择器；学生从该课堂的加入链接同步观看。刷新保留进度。已结束的课堂不能继续控制。

[独立课件预览](http://127.0.0.1:5173/statistical-analysis-preview.html?page=1) 用于备课；`page` 是1—100的全局页码，第2讲从49开始。该预览不发布课堂状态。每张投影为1600×1000，在窄屏按比例缩放。方向键与页面按钮可翻页。

LBL由教师讲解、翻页和揭示证据；个人思考只作短暂停顿。教师备注在课堂侧的折叠区域，与学生画布分离。每页提供讲解重点、停顿位置、前后衔接和证据口径；五层助手提示保持当前课程、讲次与页面范围。

## 课件源文件

| 内容 | 项目路径 |
|---|---|
| 16讲目录、100页文案与备注 | `packages/course-content/src/statistical-analysis/index.ts` |
| 可复现原始数据和预计算结果 | `packages/course-content/src/statistical-analysis/data.json` |
| 100页逐页原生构图 | `apps/teacher-web/src/features/statistical-analysis/StatisticalAnalysisSlideStage.tsx` |
| 原生SVG图形与公式渲染 | 同目录 `charts.tsx`，及Stage中的KaTeX |
| 摄影、蒙版、色彩、字体与画布 | 同目录 `statistical-analysis.css` |
| 课程注册 | `packages/course-content/src/deck-registry.ts` |
| 24张正式配图与本地字体 | `apps/teacher-web/public/course-assets/statistical-analysis/` |
| 逐页设计和教师讲解说明 | [page-design-and-notes.md](page-design-and-notes.md)、[JSON](page-design-and-notes.json) |
| 配图生成提示与使用清单 | [image-prompts.json](image-prompts.json)、[asset-manifest.json](asset-manifest.json) |
| 实测记录 | [acceptance.md](acceptance.md) |

课程封面和正文使用深墨蓝、暖纸白、琥珀和蓝绿。会员保持琥珀，非会员保持蓝绿；散点图同时用圆点与三角区分类别。图像承担情境，数据、坐标、中文和公式均由原生元素绘制。每一页的设计意图在逐页文档中登记。

24张正式素材每讲12张，均由ImageGen生成。7张支持真实alpha透明背景的主体及其他摄影素材通过CSS裁切、渐变蒙版、局部透明度、斜边窗口与投影阴影合成。最终文件保留原始PNG字节，`asset-manifest.json`登记源路径、最终提示、像素尺寸、alpha范围与SHA-256；3次替换前的素材存于`image-iterations/`。原始生成清单和替换理由分别在`generated-assets.jsonl`与`asset-revisions.jsonl`。

字体采用Noto Sans CJK SC与Noto Serif CJK SC，源OTF与OFL许可保存在`font-originals/`，播放使用本地WOFF子集。修改中文后须重建字体子集。

## 数据与解释边界

主数据为**刻意构造的教学模拟**，不代表实际企业数据。先在四个“城市×会员”单元生成右偏消费，再按单元重标定，使案例的均值关系严格成立。区间与检验演示以独立抽样、适当均值模型为条件；这些条件是课堂推断假设，不能把合成流程当成已经实现的真实随机抽样或会员随机实验。

`customers.csv`与`data.json.people`逐行对应480位顾客。字段为：`id`（合成编号）、`member`（会员身份）、`city`（甲/乙）、`spend`（观察月净消费，元）、`income`（模拟月收入，元）、`age`（模拟年龄）、`visits`（模拟到店次数）。每人一行，两组各240人。正式结论采用“元/人/月”。

| 城市 | 会员人数 | 会员均值 | 非会员人数 | 非会员均值 |
|---|---:|---:|---:|---:|
| 甲 | 180 | 750 | 60 | 800 |
| 乙 | 60 | 350 | 180 | 400 |
| 合计 | 240 | 650 | 240 | 500 |

总体均值差为150元，相对非会员均值为30%。Welch差值SE约32.39085，自由度约465.71031，双侧p约4.72895×10⁻⁶，95% CI为[86.34968, 213.65032]元。两城内部均值差都为−50元，城市构成解释了本例总体与组内比较的方向反转；城市内区间均跨零。总体比较、分层比较均不能识别会员制度的因果作用。

其余数据与主顾客样本分开：

- **示意账本**：C示例01的三笔订单120、180、200元，用于解释观察单位和聚合；不是C001的真实订单。
- **抽样概念模型**：独立正态总体μ=500、σ=180，固定种子，分别100次抽取n=25和n=100。已知σ时均值SE为36与18。100条近似95%区间实际97条覆盖；不把本次97%当成方法的名义覆盖率。
- **三店ANOVA**：独立的三组模拟，各30个值，展示组间/组内变异和总体检验；并非从主样本切出三组。
- **24个月品牌月报**：每月总额=当月顾客数×人均消费，季度总额为三个月总额之和。缺失演示仅隐藏第8、9月，保留源数据；不补零，不默认跨缺口连线。
- **Anscombe四重奏**：4组各11点，使用R datasets记载的原值；摘要近似相同，图形统一坐标。参考线明确为近似`y=3+0.5x`。
- **概念区间/偏差图**：明确标“示意”，不冒充主样本计算结果。

置信区间按重复抽样覆盖率解释；p值以零假设及模型条件为前提。强调效应量、精度、研究设计和完整报告。图形按分布、比较、构成、关系、时间、不确定性六类组织。

来源：[ASA p值声明](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf)、[R Anscombe说明](https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/anscombe.html)、[Wilke图形分类](https://clauswilke.com/dataviz/directory-of-visualizations.html)。精简来源标签显示在对应投影页脚；完整记录在[sources.json](sources.json)。

## 维护与复现

在仓库根目录运行，Python须有NumPy、SciPy、Pillow、fontTools；Node依赖使用仓库pnpm工作区。

```powershell
python -X utf8 scripts/build-statistical-analysis-data.py
python -X utf8 scripts/build-statistical-analysis-fonts.py
python -X utf8 scripts/catalog-statistical-analysis-assets.py
pnpm --filter @edu/platform-api exec tsx ../../scripts/export-statistical-analysis-notes.mts
pnpm test
pnpm build
git diff --check
```

图片来源核对脚本读取本次生成路径；迁移机器时可依据清单SHA-256直接核对仓库内正式PNG。重新生成图片属于创作变更，不要求不同调用得到相同像素。

浏览器验收使用Playwright。脚本当前从本机Codex依赖运行时加载浏览器库，端口5178指向专用Vite验收服务；课堂验收通过其代理连接API4300。

```powershell
pnpm --filter @edu/teacher-web exec vite --host 127.0.0.1 --port 5178
node scripts/statistical-analysis-browser-audit.mjs
node scripts/statistical-analysis-runtime-audit.mjs
```

全页截图、浏览器报告和构建/测试日志存于`output/statistical-analysis-qa/`，该目录按仓库约定不纳入Git。交付目录内的验收记录与报告副本用于后续审阅。已有数据文件迁移只在缺少该课程时补入，保留现有课程和课堂进度。
