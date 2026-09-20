# 第3—5讲：数据、模型与复现

三讲分别48、50、52页，每讲90分钟。原有`data.json`的480条顾客数据保持字节不变，新结果存入`regression-data.json`。页面图表直接读取计算结果，不手工绘制统计结论。数据哈希、模型指标和分段记录见[provenance-regression.json](provenance-regression.json)。

## 复现

在仓库根目录创建独立Python环境，安装本目录的精确依赖版本，然后运行：

```bash
uv venv .runtime/statistics-build
uv pip install --python .runtime/statistics-build/bin/python -r docs/course/statistical-analysis/data/requirements.txt
.runtime/statistics-build/bin/python scripts/build-statistical-analysis-regression.py
.runtime/statistics-build/bin/python scripts/build-statistical-analysis-fonts.py
pnpm --filter @edu/platform-api exec tsx ../../scripts/export-statistical-analysis-notes.mts
pnpm test
pnpm build
git diff --check
```

不需要重新运行前两讲数据生成器。脚本完全离线读取已归档UCI压缩包。数值的最后若干位可能受底层BLAS影响；记录中保留完整精度，课件按教学需要舍入。

## 第3讲：同一个零售样本

结果变量为顾客月消费（元/人/月）；解释变量为会员、甲城指示、收入（千元）、年龄。依次拟合四个含截距OLS模型，M1会员系数为150元，M2加入城市后为−50元。M3/M4不强制收入或年龄“显著”。常规OLS标准误与t区间用于介绍，依赖相应误差模型，后续诊断并未被假定已经通过。

收入单变量模型展示残差、平方损失、逐点条件均值置信区间与个体预测区间。预测区间还要求相应正态、同方差误差条件；它不是已经验证有效的业务预测工具。

固定种子3901随机划分360行训练、120行留出，比较训练均值基准与预定模型。原始`visits`由消费额生成，因此含该变量的模型仅作为泄漏反例。此处同分布随机留出不能代替真正的跨期预测验证。

## 第4讲：独立机制模拟

固定种子20260920。主要诊断样本180行，x等距覆盖[0,10]：

- 线性：y=4+2x+N(0,2²)。
- 弯曲：在同一线性信号及误差上增加0.65(x−5)²；直线与二次项拟合比较使用同一批数据。
- 异方差：y=4+2x+u，u的SD为0.5+0.7x。HC3保持OLS系数，只改变协方差估计。
- 对数：ln(y)=1+0.2x+N(0,0.23²)。图上的指数还原线为条件中位数的拟合，不冒充条件均值。
- 序列：误差按uₜ=0.8uₜ₋₁+εₜ生成，首值0；用于展示依赖，而非独立样本推断。
- 个案：基础50点分别加入普通x异常y、高x近趋势点、高x偏离点；保留三套51点数据，删除对照仅为敏感性演示。
- 共线性：z=x+小噪声，分别展示变量散点、VIF与完整系数区间。

模拟原值与全部模型系数随JSON保存。Q–Q参考线采用残差均值和样本SD；不是正式正态性证明。诊断阈值不作自动删点规则。

## 第5讲：调节效应与二元选择

独立240点调节模拟：x∈[1,9]、z∈[1,5]，y=20+2x+3(z−3)+1.7x(z−3)+N(0,5²)。z以预定中点3中心化，**不是样本均值中心化**。简单斜率与逐点t区间使用完整参数协方差；中心化前后预测相同。并排平行线图明确是机制示意，非同一数据拟合。

Logistic、Probit、优势、OR和边际效应部分为公式计算示意。未伪造真实Logit系数的显著性或AME结果。真实案例使用固定正则化Logit作预测评价，区分预测任务与参数推断。

## UCI真实数据与许可

来源：[UCI Bank Marketing](https://archive.ics.uci.edu/dataset/222/bank+marketing)，Moro, S., Rita, P., & Cortez, P. (2014)，[DOI 10.24432/C5K306](https://doi.org/10.24432/C5K306)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。本目录归档官方原始压缩包；下载地址为`https://archive.ics.uci.edu/static/public/222/bank%2Bmarketing.zip`。数据经本课训练、预测、聚合，派生结果不是UCI提供的模型结论。

本课只使用嵌套压缩包中的`bank-additional-full.csv`，41,188行、20个输入；不能混同旧版45,211行。原始变量说明保存在[bank-additional-names.txt](bank-additional-names.txt)。官方说明该文件按2008年5月至2010年11月的日期排序，但记录中没有完整日期、稳定客户ID。因此按原行序切分，并不能保证跨段客户独立。

预测任务：在本次电话开始前估计认购概率。使用9项保守特征：age、previous、job、marital、education、default、housing、loan、poutcome。排除duration以及本次联系过程/日程信息；也不使用宏观指标，目的是形成简单且可审阅的教学基准，非复现原论文最佳模型。unknown保留为类别；pdays=999为“此前未联系”，不当作实际天数（本模型直接不纳入pdays）。12条完全相同行因缺少客户ID而保留，不擅自认定为重复导入。

前28,831行训练，中6,178行验证，后6,179行测试。标准化和独热编码只在训练集拟合。LogisticRegression使用L2正则化、C=1、lbfgs，未用测试集调参。阈值在0.01至0.99网格上最小化验证集FP+FN，并列取最高值；这是预定的等错分成本教学规则。模型与阈值冻结后计算测试指标。

训练/验证/测试认购比例约为5.57%/4.49%/38.45%，存在明显时间构成变化。本次选中阈值0.99，测试集全预测未认购：TN=3803、FP=0、FN=2376、TP=0。召回率0；精确率**无定义**。准确率0.615与全负基准相同。ROC AUC约0.628、Average precision约0.529、Brier约0.314。AP不是梯形PR面积。校准图采用8个等频分箱，分箱比例存在抽样不确定性。ROC与PR显示抽稀坐标，指标以全部预测计算。

[bank-evaluation.csv](bank-evaluation.csv)保留验证/测试原始行号、真实标签和冻结预测概率，可独立复算阈值、混淆矩阵和概率误差。失败表现是课堂证据：不重新选取测试区间或利用测试集校准来美化成绩。后续应用需新的时间外验证和客户层面检查。

方法参考：[NIST模型验证](https://www.itl.nist.gov/div898/handbook/pmd/section4/pmd44.htm)、[statsmodels OLS](https://www.statsmodels.org/stable/generated/statsmodels.regression.linear_model.OLS.html)、[scikit-learn average precision](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.average_precision_score.html)。
