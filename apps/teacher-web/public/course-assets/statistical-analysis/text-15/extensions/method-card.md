# 课后方法卡

课堂主线已经依次解释词频、df、IDF、TF-IDF、二元Logit、混淆矩阵、精确率与召回率。以下设置供复核和课后试改。

## 固定表示与模型

领域词：牛角包、上菜速度、服务态度、性价比。停用词表定义在analysis.py，保留不、没、没有等否定。只保留中文词，原文另存不改。

TfidfVectorizer采用中文分词后的词列表，norm=None，sublinear_tf默认False，smooth_idf默认True。min_df=5表示训练中至少5份文档出现的词才进入候选；max_features=12000表示词表最多12,000项。实际词表只从训练集学习。这些设置缩小计算规模，不改变TF×平滑IDF的计算形式。

二元Logit采用C=1，L2正则，lbfgs求解，最大迭代500，随机种子15。正则化对系数幅度施加约束，C为其强度的倒数。本次固定配置，不在测试集选择设置。验证集用于查看方案，测试集最后评价。阈值固定0.5；课后可在验证集比较阈值与精确率/召回率的变化，再对冻结方案评价。

精确率P=TP/(TP+FP)，召回率R=TP/(TP+FN)。在读懂两个分母后，可继续计算F1=2PR/(P+R)。课堂主任务只要求先算清P与R。

## 进一步阅读

Chen, L. & Mankad, S. (2025). A Structural Topic and Sentiment-Discourse Model for Text Analysis. Management Science,71(7),5767–5787. https://doi.org/10.1287/mnsc.2022.00261 。文章同时研究谈论内容、情感表达和文档特征；本课独立实现预设方面的小项目。

Carlson, N. A. & Burbano, V. (2026). The use of LLMs to annotate data in management research: Foundational guidelines and warnings. Strategic Management Journal,47(3),699–725. https://doi.org/10.1002/smj.70023 。大模型标注可以作为课后扩展，使用同一方面定义与人工标签逐条比较；没有提供未实际运行的大模型输出。
