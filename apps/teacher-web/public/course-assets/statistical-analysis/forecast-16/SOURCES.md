# 数据与方法出处

- Fanaee-T, H. (2013). Bike Sharing. UCI Machine Learning Repository. DOI: [10.24432/C5W894](https://doi.org/10.24432/C5W894)。[数据页面](https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset)；[官方ZIP](https://archive.ics.uci.edu/static/public/275/bike+sharing+dataset.zip)。访问2026-11-04。
- 作者原始Readme.txt：Capital Bikeshare 2011—2012日/小时汇总，holiday来自DCHR；字段定义原文保留在包内。
- DCHR, *Schedules, Holidays (2012/2013)*，[原始日历PDF](https://dchr.dc.gov/sites/default/files/dc/sites/dchr/publication/attachments/DCHR_edpm_12_261_schedules_holidays_2012_2013.pdf)。核对11月22日感恩节及11月12日纪念日安排。课堂节假日编码沿用原数据。
- Hyndman & Athanasopoulos, *Forecasting: Principles and Practice*, 3rd ed.：第5章[Forecasting toolbox](https://otexts.com/fpp3/toolbox.html)，简单基准、MAE/RMSE与5.10滚动起点评价；第7章[Time series regression models](https://otexts.com/fpp3/regression.html)，7.4指示变量与日历；第9章[ARIMA models](https://otexts.com/fpp3/arima.html)，9.3自回归模型。

本项目使用numpy最小二乘求解：日历模型688×20，AR(1)687×2，日历加lag1/lag7模型681×22。所有参数只取相应起点以前训练行；验证按MAE选择；测试规格固定后滚动更新输入。演示H切换时保持起点和已估系数一致，ARX后续差由递归继续传播。
