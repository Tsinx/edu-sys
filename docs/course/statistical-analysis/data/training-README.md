# 门店培训教学数据

`training-stores.csv`为120家门店的摘要，`training-panel.csv`为2880条门店—月份记录，两表门店编号完全一致。seed 20261017，参加店59、未参加店61，第13月启动。各数值以完整精度存储，课件只在显示时四舍五入。

门店摘要：id、treated（参加组别）、area（m²）、urban（中心区0/1）、before（前12月销售平均）、after（后12月销售平均）、propensity（估计参加概率）、logit、weight（ATT权重）。面板：id、month、treated、training（生效状态）、sales（万元/店/月）。

生成程序为根目录`scripts/build-statistical-analysis-causal.py`，预计算结果在`causal-data.json`，正常播放不执行拟合。固定Python/NumPy/SciPy版本见JSON的versions。bootstrap使用独立seed 20261018，499次，每次重新估计参加模型；没有因结果不理想而筛选种子或主分析。

`training-generator-audit.json`包含潜在稳定能力、分配概率和加性作用参数，仅供教师审计，不得当成观测发现、给助手补答案或投影。分配机制关联前期销售扰动，故不能宣称主数据已经满足条件可交换性或FE严格外生性。模拟已知参数与观察资料可识别效应必须分开。

原顾客、问卷、采购、因子数据不合并、不追加模拟“追访”。两店三期、缺失键、培训反馈和同期促销均为另设概念/风险示意，不是修改主面板记录。
