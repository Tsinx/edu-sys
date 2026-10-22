# 统计分析方法 · 原生课件

课程内部标识 `statistical-analysis`。32课时、16讲，面向学过基础统计但尚不能独立实证分析的商科研究生。第1—13讲分别48、52、48、50、52、48、52、48、52、48、48、48、48页，共642页，各90分钟；第14—16讲保留正式标题与“待建设”，没有空白播放入口。

第12讲[双重差分与事件研究](http://127.0.0.1:5181/statistical-analysis-preview.html?page=547)与第13讲[工具变量与两阶段最小二乘](http://127.0.0.1:5181/statistical-analysis-preview.html?page=595)各48页，使用同一份真实INPRES/1995 SUPAS处理版，按项目连续跟做。每讲55分钟讲述、25分钟个人Python/vibe coding、10分钟观察判断；课前另做环境准备。[教学设计](lecture-twelve-thirteen-design.md)、[来源与方法](sources-policy.json)、[实际验收](acceptance-policy.md)。

两份[第12讲完整稿](lecture-12-script.md)、[第13讲完整稿](lecture-13-script.md)与教师备课区同源；96页逐页承接、指图顺序与转场完整。课堂“更多工具 → 项目材料”按钮可下载两个Notebook、数据字典、依赖与AI核查提示；[学生项目说明](../../../apps/teacher-web/public/course-assets/statistical-analysis/project-12-13/README.md)。原始数据按固定hash课前下载，本地缓存后可离线运行，不把微数据夹入再分发ZIP。当前四格入门规格保留不精确DID与弱IV结果，不冒称原论文全部复制；年龄队列剖面与日历事件研究明确区分。

第10讲[因果推断与匹配、加权](http://127.0.0.1:5178/statistical-analysis-preview.html?page=451)48页，第11讲[面板与固定效应](http://127.0.0.1:5178/statistical-analysis-preview.html?page=499)48页。两讲使用统一门店培训教学模拟，逐字稿与课件同步设计：[第10讲完整稿](lecture-10-script.md)、[第11讲完整稿](lecture-11-script.md)。正文分别14183与14294汉字，每讲70分钟讲述、20分钟观察/个人判断预算；教师课堂备课区可逐页查看。详见[设计与计算口径](lecture-ten-eleven-design.md)、[来源](sources-causal.json)及[实际验收](acceptance-causal.md)。没有增加语音播放，时间预算不代表完成真人试讲。

第8讲[探索性因子分析](http://127.0.0.1:5173/statistical-analysis-preview.html?page=351)48页，第9讲[验证性因子分析与结构方程模型入门](http://127.0.0.1:5173/statistical-analysis-preview.html?page=399)52页。[教学设计](lecture-eight-nine-design.md)说明前置知识、逐步证据与应用练习，[来源记录](sources-factors.json)列明官方文档与研究依据，[验收记录](acceptance-factors.md)保存实际测试与PDF核查结果。新增4张配图由内置ImageGen生成，原始文件路径、完整提示、尺寸与校验值保存在[配图记录](image-generation-factors.json)。

第8讲延续原六题：从题意、分布和相关进入共同因子、提取、留数、旋转、载荷、共同度及题项修订。221份完整记录来自第6讲原240份模拟，T3反向，采用多分相关、MINRES和oblimin。置换平行分析199次保留各题分布、重新估计多分相关，以SMC替换对角的约化特征值和95%参考比较，按首维起连续比较。

第9讲另用400份独立五级模拟，先规定六题两因素CFA，再解读阈值、WLSMV、定标、识别、参数、隐含相关、局部残差和整体拟合。例中CFI约0.976而RMSEA约0.087，精确拟合被拒绝，相关残差仍有失配，多个修订方向需核查；不宣称模型完整通过。SEM段明确新增S1—S3满意度题，用同一定标计算路径乘积与delta区间，反向递归模型展示协方差等价。所有数值是教学模拟，不是实际调查或已验证工具。

两讲都保留成熟工具的采用、适配和不宜套用情形，说明内容依据、版本、许可与目标人群证据。均包含独立判断/后页反馈，所有页面有教师讲解、停顿问题与当前页助手约束。

数值复现需要R及`psych`、`GPArotation`、`lavaan`、`jsonlite`：在仓库根运行`Rscript scripts/build-statistical-analysis-factors.R`。可额外提供本地R库路径作为第一个参数。脚本单线程，记录实际版本、随机种子、221份原行与400份新行，并输出原始CSV、结果JSON及会话记录。正常页面播放仅使用预计算结果。

## 打开与授课

本机平台运行时，打开 [课程工作区](http://127.0.0.1:5173/courses/statistical-analysis)，在讲次目录中选择第1—13讲。教师可使用上一页、下一页、讲内页码与讲次选择器；学生从该课堂的加入链接同步观看。刷新保留进度。已结束的课堂不能继续控制。

[独立课件预览](http://127.0.0.1:5173/statistical-analysis-preview.html?page=1) 用于备课；`page` 是1—642的全局页码；各讲从1、49、101、149、199、251、299、351、399、451、499、547、595开始。该预览不发布课堂状态。每张投影为1600×1000，在窄屏按比例缩放。方向键与页面按钮可翻页。

LBL由教师讲解、翻页和揭示证据；个人思考只作短暂停顿。教师备注在课堂侧的折叠区域，与学生画布分离。每页提供讲解重点、停顿位置和证据口径；五层助手提示保持当前课程、讲次与页面范围。

## 课件源文件

| 内容 | 项目路径 |
|---|---|
| 16讲目录、546页文案与备注 | `packages/course-content/src/statistical-analysis/index.ts` |
| 可复现原始数据和预计算结果 | `packages/course-content/src/statistical-analysis/data.json` |
| 546页逐页原生构图 | `apps/teacher-web/src/features/statistical-analysis/StatisticalAnalysisSlideStage.tsx` |
| 原生SVG图形与公式渲染 | 同目录 `charts.tsx`，及Stage中的KaTeX |
| 摄影、蒙版、色彩、字体与画布 | 同目录 `statistical-analysis.css` |
| 课程注册 | `packages/course-content/src/deck-registry.ts` |
| 72张正式配图与本地字体 | `apps/teacher-web/public/course-assets/statistical-analysis/` |
| 逐页设计和教师讲解说明 | [page-design-and-notes.md](page-design-and-notes.md)、[JSON](page-design-and-notes.json) |
| 配图生成提示与使用清单 | [image-prompts.json](image-prompts.json)、[asset-manifest.json](asset-manifest.json) |
| 实测记录 | [前两讲验收](acceptance.md)、[第3—5讲验收](acceptance-regression.md) |

课程封面和正文使用深墨蓝、暖纸白、琥珀和蓝绿。会员保持琥珀，非会员保持蓝绿；散点图同时用圆点与三角区分类别。图像承担情境，数据、坐标、中文和公式均由原生元素绘制。每一页的设计意图在逐页文档中登记。

前两讲的24张正式素材每讲12张，均由ImageGen生成。7张支持真实alpha透明背景的主体及其他摄影素材通过CSS裁切、渐变蒙版、局部透明度、斜边窗口与投影阴影合成。最终文件保留原始PNG字节，`asset-manifest.json`登记源路径、最终提示、像素尺寸、alpha范围与SHA-256；3次替换前的素材存于`image-iterations/`。原始生成清单和替换理由分别在`generated-assets.jsonl`与`asset-revisions.jsonl`。

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

浏览器验收使用Playwright，可通过`PLAYWRIGHT_MODULE`指定模块路径、`CHROME_PATH`指定浏览器。`STATS_QA_ORIGIN`指定静态预览地址；第8—9讲课堂验收用`STATS_FACTOR_QA_ORIGIN`指定一个启用开发测试身份、提供当前前端资源的隔离API。课堂脚本创建并结束专用测试课堂，不对生产课堂运行写入验收。

```powershell
pnpm --filter @edu/teacher-web exec vite --host 127.0.0.1 --port 5178
$env:STATS_QA_ORIGIN='http://127.0.0.1:5178'
node scripts/statistical-analysis-browser-audit.mjs
$env:STATS_FACTOR_QA_ORIGIN='http://127.0.0.1:4318'
node scripts/statistical-analysis-factors-runtime-audit.mjs
```

当前全页截图与浏览器报告存于`output/statistical-analysis-factors-qa/`，旧验收保留在`output/statistical-analysis-qa/`，均不纳入Git。交付目录内的验收记录与报告摘要用于后续审阅。已有数据文件迁移只在缺少该课程时补入，保留现有课程和课堂进度。

## 第3—5讲新增材料

参见[数据与复现说明](data/README.md)、[新增配图提示](image-prompts-regression.json)、[生成与校验清单](image-generation-regression.json)。36张新图使用内置ImageGen生成，原始PNG保存在课程assets目录。新内容在`regression-lessons.ts`中逐页编写，`RegressionPages.tsx`渲染原生表、SVG和KaTeX。新增44组计算图形、25张证据表，按教学问题逐页展开。

原有480行与前100页的稳定键保持不变。第1讲24页修正标准差标签重叠；第2讲43页明确为独立区间示意。教师备注和助手边界只进入相应教师/助手上下文，不进入学生画布DOM。

## 第6—7讲新增材料

第6讲48页，以一次购买贯穿调查对象、抽样、实施方式、变量测量、成熟量表选择、完整问卷、预测试与逐步计分，再进入信度和效度；第7讲52页，从九点几何到UCI六指标的预处理、方向、得分、重构损失与方法边界。各90分钟，教师控制证据揭示，延续原生表、SVG、KaTeX与深墨蓝/纸白/琥珀/蓝绿。第6讲逐页时长按理解、演算和个人练习分配，复杂计算与应用保留更长停顿。

- [第6讲预览](http://127.0.0.1:5173/statistical-analysis-preview.html?page=251) / [第7讲预览](http://127.0.0.1:5173/statistical-analysis-preview.html?page=299)
- 新源文件：`measurement-lessons.ts`、`measurement-visuals.ts`、`measurement-data.json`；新渲染：`MeasurementPages.tsx`、`measurement-pages.css`、`measurement-survey.css`。
- [第6讲教学设计修订](lecture-six-teaching-revision.md)、[数据与计算口径](data/measurement-README.md)、[来源](sources-measurement.json)、[8张配图清单](image-generation-measurement.json)、[初版第6—7讲验收](acceptance-measurement.md)、[本次第6讲修订验收](acceptance-lecture-six-revision.md)。
- 复算：`python -X utf8 scripts/build-statistical-analysis-measurement.py`；先保留仓库内UCI原ZIP，离线复算无需再次下载。修改文案后重建字体并导出逐页备注。

新增内容未改写前250页或旧数据。自编问卷240份、九点几何、UCI 440条记录彼此独立；不把模拟说成已开展的预测试或量表验证。

第6讲17—22页专门区分成熟量表的采用、适配与不适用情形：匹配构念、对象、语言、用途且使用条件适合时，优先评估已有工具；事实用记录，未知内容先探索；翻译、删改和跨群使用不能自动继承原证据。原作者UWES手册提供具体工具规格，本课不复制原题、不为未指定译本背书。“同一个均分，两种体验”移到36页，位于题项、反向与领域计分之后。
