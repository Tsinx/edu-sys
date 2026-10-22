# 来源、字典与处理规则

研究：Esther Duflo (2001), “Schooling and Labor Market Consequences of School Construction in Indonesia: Evidence from an Unusual Policy Experiment,” *American Economic Review* 91(4):795–813，DOI [10.1257/aer.91.4.795](https://www.aeaweb.org/articles?id=10.1257/aer.91.4.795)。

本项目使用1995 SUPAS的**公开处理版**，并非BPS原始问卷数据库，也不是原论文的完整复制包。复核者David Roodman的[资料说明](https://github.com/droodman/Duflo-2001)链接到该文件。

- 下载仓库：`droodman/Duflo2001`。
- 固定commit：`c3b4868a66ab908f8fd09354e0439fed4cb92085`。
- 文件：[inpresdata.dta固定版本](https://raw.githubusercontent.com/droodman/Duflo2001/c3b4868a66ab908f8fd09354e0439fed4cb92085/inpresdata.dta)。
- SHA-256：`1a0be1709ef2ed7e182b02b13da9791f4300a94818b4f13efea3e6868a984e5a`。
- 访问核查：2026-10-21。

处理版可以公开读取；这里不将其他仓库的MIT代码许可扩大解释为该微数据的再分发许可。项目ZIP提供固定下载程序，原始文件在使用者本地缓存，未夹带再分发。原始字节校验后只读，不覆盖。

## 一行与时间

一行是一名受访者在1995年的记录；来源覆盖男性出生队列。不是个人追踪面板。1973—1978年政策建设与1995年结果之间，用1974年年龄刻画潜在暴露。1974只是队列年龄基准，不是把政策启动年改成1974。

| 列 | 变量标签/派生 | 口径与处理 |
|---|---|---|
| yeduc | years of education | 受教育年限，单位年 |
| lhwage | log(hourly wage) | 已取自然对数；不再次取对数；缺失不填0 |
| wage / lwage | 月工资 / log月工资 | 保留在原文件，本项目不冒充小时工资使用 |
| p504thn | year of birth | 年份后两位；birth_year=1900+p504thn |
| age74 | 1974−birth_year | 是1974年年龄，不是1995年龄 |
| recp / high | 1 if high program region | 沿用来源中的二元高强度定义；不按教育、工资或本样本中位数重分组 |
| nin | number of inpres school per children | 连续建校强度；本入门主规格未使用，不把二元结果说成“每千儿童多一校”的剂量效应 |
| birthpl / district | province and kabupaten of birth | 来源出生地区编码；不重新映射边界，按该列聚类 |
| weight | observation weight | 调查观测权重；不是ATT/IPW权重；不以权重和当样本量 |
| young | age74在[2,6] | 1为年轻队列；主比较年长队列[12,17] |
| z | high×young | 四格交互项；第13讲作候选排除工具 |
| source_row | 原文件行序号 | 新增核查用行号，不是跨期个人ID |

## 样本与模型

1. 固定文件152990行；一行缺关键教育/出生资料，明确排除后152989行。不对整个表无差别dropna。
2. 教育主样本：1974年2—6岁或12—17岁，共78470行、290个出生地区。WLS：`yeduc ~ high + young + z`。
3. 工资共同样本：上述样本中lhwage非缺失，共31061行、290地区。工资缺失47409行，不当成零或随机缺失。
4. 第一阶段：`yeduc ~ high + young + z`；简约式：`lhwage ~ high + young + z`；均在工资共同样本运行。
5. 2SLS：`lhwage ~ 1 + high + young + [yeduc ~ z]`。所有阶段使用同一调查权重与外部控制。
6. 常规区间：出生地区CR1聚类方差，显示t(289)的95%区间。未重建完整复杂抽样设计。
7. 第一阶段稳健诊断：一个排除工具的聚类t²；linearmodels对应诊断标签为χ²(1)，不冒称普适KP/SW弱工具临界值检验。
8. AR：联合聚类sandwich求解单工具线性模型的检验反演集合，t(289)临界值；保留无限端。稳健于弱相关，不稳健于工具无效。另以多个候选β的直接回归核查。
9. 队列剖面：`yeduc ~ high * C(age74, Treatment(reference=12))`，教育有效样本全体、调查权重、出生地区聚类。年龄2—24岁，12岁规范化基期，逐点95%区间；不冒充联合带或日历事件研究。
10. 安慰剂：12—17岁对18—24岁，保持high定义与权重；只用于诊断，不直接作偏差扣除。敏感性保留同一模型不加权版，不按p值挑选。

## 方法与争议

课堂规格用于透明理解四格DID到单工具IV的联系，不复制Duflo全部连续强度、固定效应、基线控制与其他模型。不能把这里的0.036年说成原论文的每千儿童新增一所学校效应。

后续复核：[Roodman, *Comment*](https://arxiv.org/abs/2207.09036)及[2026年发表记录](https://jcr-econ.org/schooling-and-labor-market-consequences-of-school-construction-in-indonesia-comment/)，提醒权重、资料重建、年龄工资结构与弱识别等问题。本课堂没有宣称复制该复核的全部修正规格。

跨队列平行变化、直接政策工资通路、学校质量与教育年限的区别、人口迁移及工资样本选择，均为保留风险。计算一致性断言不能证明这些识别条件。

其他方法文档：[linearmodels IV](https://bashtage.github.io/linearmodels/iv/examples/basic-examples.html)；[Callaway与Sant’Anna多期DID](https://bcallaway11.github.io/did/articles/multi-period-did.html)。
