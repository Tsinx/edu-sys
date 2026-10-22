# INPRES真实数据项目｜统计分析方法第12—13讲

目标：用同一份真实资料完成一个可复算的小项目，而不是追出显著正系数。

第12讲：四格DID、出生队列暴露剖面、诊断与报告。
第13讲：共同工资样本、候选工具、第一阶段与简约式、2SLS、弱工具与AR置信集合。

每讲48页、90分钟；6个个人跟做点。没有AI也能完整运行。代码在自己的Python环境里执行，教学网页不启动模型服务。

## 课前准备（建议提前15—25分钟）

课堂从“更多工具 → 项目材料”（独立预览可直接点击项目材料）下载并解压完整`project-12-13.zip`，进入`inpres-project`目录。保留其中的辅助脚本与Notebook，不只下载一个ipynb。

推荐使用Python 3.13（本次完整验证版本）。Windows PowerShell：

```powershell
python -m venv .venv
# 不修改全局PowerShell执行策略；直接调用环境中的Python也可以。
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe prepare_data.py
.\.venv\Scripts\python.exe -m jupyterlab
```

macOS / Linux：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python prepare_data.py
.venv/bin/python -m jupyterlab
```

在JupyterLab里选本环境的Python内核，先运行`01_did.ipynb`。第二讲用`02_iv.ipynb`。
若内核不一致，重选`.venv`对应内核；不要在Notebook里反复全局安装包。

第一次准备从固定公开Git版本下载约15 MB的Stata处理文件，SHA-256通过后缓存到`data/inpresdata.dta`。先准备、后上课，可以离线跟做；校验失败立即停止，不自动换源或覆盖。项目包保留来源与下载程序，不夹带未明确授权再分发的原始微数据。

`requirements.txt`引用`requirements-verified.txt`，锁定本次实际验证的直接依赖版本。先核对Python 3.13与内核；其他Python版本未完成本项目验证。

## 课堂节奏与产物

| 检查点 | 课件本讲页 | 你应保存什么 |
|---|---:|---|
| P1 载入与审核 | 12讲第7页 | `results/audit.json` |
| P2 四格表 | 12讲第14页 | `results/did_cells.csv` |
| P3 手算与回归 | 12讲第22页 | `results/did_results.json` |
| P4 队列图 | 12讲第29页 | `results/cohort_profile.png`及图注 |
| P5 设计核查 | 12讲第36页 | `results/design_check.md` |
| P6 初稿 | 12讲第43页 | `results/memo_did.md` |
| P7 共同工资样本 | 13讲第6页 | `results/sample_iv.csv`（摘要） |
| P8 工具条件 | 13讲第14页 | `results/iv_assumptions.md` |
| P9 两条方程 | 13讲第22页 | `results/stages.json` |
| P10 2SLS | 13讲第29页 | `results/iv_results.json` |
| P11 弱工具 | 13讲第36页 | `results/ar_confidence.json`与解释 |
| P12 合稿 | 13讲第43页 | `results/memo.md` |

Notebook提供完整可运行代码；文字备忘录由你自己写，不自动生成一份看似完成的个人答案。`memo-template.md`给出问题结构，`vibe-coding-prompts.md`帮助核查。

## 结果核对

先对人数、对象、权重与控制，再对系数；不要以“必须显著”为断言。

- 原文件152990行，有效教育/出生/权重152989行。
- 教育主样本78470；工资共同样本31061；出生地区290。
- 四格加权教育DID约0.036414年，地区聚类95%区间约[−0.196843, 0.269672]。
- 工资共同样本：第一阶段约0.114777；简约式约0.015629；2SLS约0.136173。
- 第一阶段聚类t²约0.554670；本简化规格工具很弱，AR 95%集合为全体实数。

完整预期值在`reference-results.json`。这是本次明示教学规格的结果，不是Duflo论文全部结果的复制。权重是调查观测权重，地区CR1聚类未重建完整复杂抽样设计。第一阶段弱、排除限制与工资选择风险应分别说明。

## 小幅改动与vibe coding

可以改变图形颜色、标签或显示精度，核对手算与回归；如果改变样本、权重、年龄窗口或模型，先写理由，另存版本，不覆盖主结果。
请AI解释一段报错时，提供错误单元、代码、列名与实际错误文本；不要上传不必要的个人资料，也不要要求它编造输出。
若AI建议复制行做面板、补0工资、把年龄当政策后期数或自动搜显著规格，请回到原字典与本课比较设计核查。

## 从命令行重跑全部数值

```bash
python inpres_project.py
```

该命令按顺序运行固定模型，写`results/reference-results.json`；不修改原始数据，不上传文件，不启动后台服务。
数值库默认单线程，不进行并行bootstrap、自动模型搜索或大网格扫描。整个项目是有限规模的本地分析。

## 常见问题

- 找不到`inpres_project`：先解压完整包，Notebook与脚本应在同一目录；核对内核工作目录。
- 数据下载失败：课前重试固定URL；若校验不同，保留错误并核查来源，不绕过断言。
- 输出与参考不同：先重启内核，从第一格运行；比n、权重与列定义，再比系数。浮点末位允许1e−8级核对容差。
- 区间跨0、AR无界：是本数据与规格的真实结果，不需要“修复”为显著。
- 当前资料是1995年截面，队列图不是个人面板或日历事件研究；没有逐期政策前后结果就不拟合对应动态模型。

来源与变量见`DATA.md`。课堂时间是备课预算，不代表已完成真人试讲。
