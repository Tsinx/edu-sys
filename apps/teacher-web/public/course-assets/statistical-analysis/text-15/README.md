# 第15讲：从数清一个词，到服务分析

54页课件与本Notebook采用相同顺序。建议Python 3.13，在本目录执行 `python -m pip install -r requirements.txt`，随后打开classroom.ipynb，从上到下运行。也可以先阅读已保存的运行结果。

## 课堂顺序

1. 打开原始评论，阅读A、B、C三段真实摘句。
2. 分词，用Counter数次数，形成第一张词频表。
3. 应用停用词和领域词表，比较全部评论整理前后的词频图。
4. 区分词频与文档频数df，先完成原始计数矩阵，再手算TF×IDF。
5. 用同一中文词表示训练二元Logit，判断是否标为上菜速度负向。
6. 先数四格人数，再计算精确率与召回率。
7. 使用作者人工标签统计六项体验，结合原话完成服务简报。

词频指词出现的次数，相对词频以全部保留词的出现总次数为分母。df指有几条评论出现这个词，同一评论最多贡献1。三段手算只统计味道、牛角包、上菜速度三个指定词，合计7次，次数为4、2、1；df为3、1、1。TF-IDF使用原始次数乘平滑IDF，norm=None，无次线性变换。课堂手算和实际模型采用同一种表示。

原始方面标签为1正向、0中性、−1负向、−2未提及。模型任务为是否标为速度负向，原速度标签−1对应y=1，其余三类对应y=0。随后六方面统计重新使用四类原标签。两部分任务各自说明，不把预测结果写成人工标签。

## 文件

- data/raw/train.csv、dev.csv、test.csv：完整原始数据，36,850 / 4,940 / 4,940条，保留原始字节。
- classroom.ipynb：逐步跟做与已经运行的表图，没有run()一键代替课堂步骤。
- analysis.py：同一计算的完整单线程脚本。
- outputs/word-counts-raw.csv、word-counts.csv：完整词频、出现评论数与相对频率。
- outputs/toy-counts.csv、toy-weights.csv：同一三段摘句的计数与权重。
- outputs/validation-predictions.csv、test-predictions.csv：验证与测试评论id、人工结果、概率及分类结果。
- outputs/aspect-summary.csv：六项体验计数与比例。
- service-brief-template.md：简报模板。
- extensions/method-card.md：完整固定参数、补充指标与阅读。
- source-manifest.json、LICENSE-ASAP：来源版本、文件哈希与原许可。

执行 `python analysis.py` 可重算全部产物，`python verify.py` 可独立核对主要计数和分类评价。安装依赖后不需要联网、GPU或API密钥。全量分词可能需要数分钟，课堂可以先处理三段摘句，再处理全部资料；各步结果也已随包保存。代码单线程运行，网页只提供下载，不自动启动计算。

## 原始来源

Bu等（2021）. ASAP: A Chinese Review Dataset Towards Aspect Category Sentiment Analysis and Rating Prediction. NAACL, 2069–2079. https://aclanthology.org/2021.naacl-main.167/

数据发布：https://github.com/Meituan-Dianping/asap ，固定提交975122a60065240124df62cb4d5dbfd19ed9ef2c。本教学项目新增中文字典、逐步Python、Notebook和派生结果，原始文件及标签未改写。许可原文见LICENSE-ASAP。
