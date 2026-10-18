# 第8—9讲的教学模拟与计算

以下三种资料分开使用：第6讲原240份自编六题回答，第8讲从中保留的221份六题完整记录，第9讲另生成的400份C编号五级回答。后者不是原样本的切分，不是实际追访，也不证明工具在真实人群中有效。

`scripts/build-statistical-analysis-factors.R`是完整复现入口。需要R和`psych`、`GPArotation`、`lavaan`、`jsonlite`。在仓库根运行：

```powershell
Rscript scripts/build-statistical-analysis-factors.R
# 如果依赖在单独的本地库：
Rscript scripts/build-statistical-analysis-factors.R path/to/R-library
```

实际会话版本见[factor-session-info.txt](factor-session-info.txt)。运行时单线程，原始六题JSON只读。运行顺序固定，不根据拟合优劣筛选随机种子。

## EFA

保留S编号和T3反向后的原始完整答案。Pearson矩阵用于直接观察、经典KMO/MSA及Bartlett近似演示，后者的正态连续假设与五级题有距离，不把其p值当有序测量模型的正式验证。

实际提取输入为多分相关矩阵。`psych::polychoric`指定`correct=0, global=TRUE, smooth=FALSE`；检查正定后用MINRES提取1、2、3因素，2因素使用oblimin。另保存未旋转与varimax解。展示方向按R1—R3主要联系的因素排在第一位，并统一符号，重构关系保持不变。

共同度使用`diag(ΛΦΛ′)`，结构矩阵为`ΛΦ`，残差RMS仅汇总15个非对角题项对。六题三因素协方差自由度为0，低残差不能当成第三因素获得支持。

置换式共同因子平行分析固定种子20261016，199次逐列独立置换保留各题边际分布，每次重估多分相关。用`1−1/diag(R⁻¹)`替换相关矩阵对角，再计算约化特征值，报告相应次序的95%置换分位。从第一维开始连续比较，到首次未超过参考时停止，不挑选后部负特征值中的偶然交叉。完整矩阵的碎石图单独保存，不能与此约化矩阵口径混同。

## 独立CFA资料

固定另一随机流20261017生成400份，无缺失。六道R/T题保持原文字与锚点；原始T3反向，CSV保存原答案，分析矩阵保存统一方向后的答案。所有回答为1—5整数。

生成模型的R/T相关为0.42；新增满意度S依线性关系`S=0.25R+0.48T+ζ`生成，残差方差按总体S方差为1设置。九题的主要生成载荷和四个阈值保存在结果JSON。T2还含0.14的R交叉项，以提供局部失配案例。课堂诊断只依据观测残差与MI讨论候选解释，不用这些已知生成设置冒充从资料中识别出来的唯一机制。

六题CFA预先规定两相关因素，交叉载荷和题项残差协方差为0；用`ordered=keys, estimator='WLSMV', std.lv=TRUE`估计。六题共24阈值，31自由参数，df=8。报告校正χ²、scaled CFI/TLI、scaled RMSEA及90%区间，以及SRMR，区分不同输出列。

当前结果有局部失配，不能宣布所有零约束成立。T1/R3和T2/R2有较大的残差；释放R对T2的载荷、或T1/T3的残差相关，其MI相同。没有根据MI自动改模。AVE与单位权重ω来自当前模型的标准化潜在响应参数，不是原始整数总分的无条件信度。

## 九题SEM演示

S1—S3是新加入的满意度自编题。测量模型与结构模型同时估计`T~aR; S~bT+cR`，三个因素均以首题载荷1定标。报告同一定标的非标准化路径、`ab`与`c+ab`，并保留a/b/c的参数协方差，供独立复算delta区间。

没有进行bootstrap。方向反转模型`R~T; S~R+T`也实际拟合；两种完整递归关系可表达相同潜变量协方差。两者相同拟合不提供方向识别；横截面关系与显著乘积不能取代时间顺序、混杂条件或干预设计。

六题CFA中的测量失配与新增S题的证据不足，仍限制九题SEM的实质解释。本段用于看懂模型计算、报告与边界，不作为正式机制研究结果。

原始资料见[factor-confirmation.csv](factor-confirmation.csv)，全部矩阵、参数、区间和置换试验见`packages/course-content/src/statistical-analysis/factor-data.json`。独立数值与上下文检查在`apps/platform-api/test/statistical-analysis-factors.test.ts`。
