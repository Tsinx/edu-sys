import type {ResearchPage} from './research-lessons.js';
import {TEXT_DATA as D} from './text-analysis-data.js';
const pct=(v:number)=>(v*100).toFixed(1)+'%';
const p=(title:string,lead:string,text:string[],caption:string,question:string,extra:Partial<ResearchPage>={}):ResearchPage=>({title,lead,text,caption,question,note:question,source:'text',...extra});
const table=(headers:string[],rows:string[][])=>({headers,rows});
/** Each page supplies one step that the next page actually uses. */
const originalTextPages:ResearchPage[]=[
 p('文本数据分析：从顾客评论到服务改进','从数清一个词开始',[],
  'ASAP真实餐饮评论 · Python逐步跟做','一大批评论摆在面前，你希望先弄清什么？',{visual:'text-cover'}),
 p('同一顿饭，可能留下不同感受','顾客写了什么，先按原话读一遍',[],
  'ASAP评论43901，原文摘录；总体4星。','这两句分别谈到了哪一种用餐体验？',{visual:'text-review'}),
 p('先做一张词频表，再整理服务问题','今天的三个成果，分别回答一个问题',[],
  '课堂文件按同一顺序组织：文字计数、评论分类、服务简报。','完成第一张词频表以后，你想继续追问哪件事？',{visual:'text-project'}),
 p('跟做一：先把评论打开','原始文件已经在学生包内',[],
  'Notebook第1节；三份CSV共46,730条，新增split列后为22列。','你读入的表有多少行，review列保存了什么？',{code:"from analysis import load_data\nimport pandas as pd\nparts = load_data()\ndf = pd.concat(parts.values(), ignore_index=True)\nprint(df.shape)\ndf[['id', 'review', 'star']].head(3)"}),
 p('三段真实摘句，贯穿后面的手算','A、B、C分别是一份短文档',[],
  '摘自43901、33204、20264；A合并两处原句。手算只统计屏幕摘句。','A、B、C里，哪些词出现了不止一次？',{visual:'text-excerpts'}),
 p('分词：确定我们准备数什么','把连续的中文，切成一个个词',
  ['原句：“牛角包味道很不错。”','分词：“牛角包 / 味道 / 很 / 不错”。','一个词每出现一次，就留下一个计数位置。'],
  '采用课堂领域词表，把“牛角包”保留为一个词。','“牛角包”再次出现时，应该怎样更新它的计数？'),
 p('个人计算：这三个词各出现几次','暂时只看“味道、牛角包、上菜速度”',
  ['按A、B、C分别计数。','同一段里重复出现的词，每次都计入。','没有出现的位置填0，再计算每列合计。'],
  '使用上一页之前的三段摘句；独立完成约1分钟。','三段合起来，“味道”出现几次，“牛角包”出现几次？',{kind:'question',exerciseId:'T15-Q1',visual:'text-count-question'}),
 p('从逐次计数，得到第一张词频表','三个词合计出现7次',[],
  '仅统计三个指定词；这张小表稍后会原样用于TF-IDF。','哪一格记录了“同一段里出现两次”？',{table:table(['摘句','味道','牛角包','上菜速度'],[['A','2','0','0'],['B','1','0','1'],['C','1','2','0'],['合计','4','2','1']]),kind:'feedback',exerciseId:'T15-Q1'}),
 p('词频，先说清次数和分母','出现次数与相对频率，回答不同层次的问题',
  ['词出现的次数：味道4次，牛角包2次，上菜速度1次。','在这三个词的7次出现中，味道占4/7≈57.1%。','扩大词表后，要用扩大后的总词数重新计算比例。'],
  '本页练习词表只有三个词；真实项目统计全部保留词。','如果再加入其他词，“味道”的出现次数和相对频率会怎样变化？'),
 p('跟做二：让Python替我们逐词计数','Counter保存“词”和“出现次数”',[],
  'Notebook第2节；先核对牛角包=2，再处理全部评论。','Counter更新一次以后，哪个词的数值增加了？',{code:"from collections import Counter\nwords = ['牛角包', '味道', '很', '不错', '牛角包']\ncounts = Counter(words)\nprint(counts['牛角包'])  # 2\nprint(counts.most_common(3))"}),
 p('把全部评论数一遍，会看到什么','第一次计数，保留常见虚词',[],
  '46,730条评论，统一分词后按词出现次数汇总；完整表见word-counts-raw.csv。','这些高频词里，哪些最能告诉你顾客谈了什么？',{visual:'text-frequency-raw'}),
 p('停用词：为当前问题暂时略去一些词','保留原文，计数时先略去“的、了、很”等',
  ['停用词表是本次统计采用的排除名单。','“不、没、没有”等否定表达继续保留。','同一份词表用于后续计数和分类，计算过程保持一致。'],
  '完整停用词表随包公开；本次仅对计数和模型输入应用。','略去“的”和略去“不”，会分别改变我们读到的什么信息？',{code:"stopwords = {'的', '了', '很'}\nwords = ['味道', '很', '好', '上菜', '不', '慢']\nkept = [w for w in words if w not in stopwords]\nprint(kept)"}),
 p('领域词表，让一个概念保留在一起','“上菜速度”和“服务态度”按完整词组计数',
  ['先看程序切出了什么，再核对我们希望统计的概念。','本课把牛角包、上菜速度、服务态度、性价比加入词表。'],
  'Notebook第3节；完整函数只统一换行、分词、略去标点与停用词。','新增“上菜速度”以后，词表中会出现怎样的新计数单位？',{code:"import jieba\ntokenizer = jieba.Tokenizer()\ntokenizer.add_word('上菜速度')\nprint(list(tokenizer.cut('上菜速度适中')))"}),
 p('现在，词频图更容易读出用餐内容','每根条形表示一个词出现的总次数',[],
  '46,730条评论；同一词在一条评论中重复出现，会重复计数。','选两个词，分别回到原文看看顾客怎样使用它们？',{visual:'text-frequency'}),
 p('同样出现3次，是不是同样多的顾客在谈','请比较两个情形',
  ['情形一：一条评论里，“上菜速度”写了3次。','情形二：三条评论里，各写了1次“上菜速度”。','分别填写：词出现几次，出现于几条评论。'],
  '个人判断约90秒；下一页对照两种计数。','如果想知道“有多少条评论谈到它”，该数什么？',{kind:'question',exerciseId:'T15-Q2'}),
 p('数出现次数，也可以数出现的评论数','词频相同，涉及的评论数可以不同',[],
  '每条评论在“出现过”这一计数中最多贡献1。','同一个词在一段里重复10次，会贡献多少次出现、多少条评论？',{table:table(['情形','词出现次数','出现的评论数'],[['一条评论重复3次','3','1'],['三条评论各出现1次','3','3']]),kind:'feedback',exerciseId:'T15-Q2'}),
 p('文档频数df：有几份文档出现这个词','本课每段摘句、每条评论，分别是一份文档',[],
  '仍用A、B、C与同一三个词；df按“是否出现”计数。','牛角包在C中出现两次，为什么df仍为1？',{table:table(['词','三段中的总次数','出现的段数df'],[['味道','4','3'],['牛角包','2','1'],['上菜速度','1','1']])}),
 p('把每段的词频，排成同一张矩阵','每行一段文字，每列一个固定的词',[],
  'TF在本课采用段内原始次数；列顺序固定后，各行可以逐格比较。','哪一行最容易与另外两行区分，你看到了哪一列？',{visual:'text-count-matrix'}),
 p('每段都有的词，对区分段落帮助较少','我们希望同时考虑“写了几次”和“多少段都在写”',
  ['“味道”在A、B、C都出现。','“牛角包”集中在C，“上菜速度”集中在B。','可以为普遍出现的词和较有区分度的词设置不同权重。'],
  '这一步从计数提出需要，再引入IDF权重。','如果要分辨B和C，你会优先查看哪两个词？'),
 p('IDF：出现的文档越多，权重越小','在同一批n份文档中，为每个词计算一个权重',
  ['n=3，是A、B、C三段摘句。','味道的df=3，IDF=1.000。','牛角包和上菜速度的df=1，IDF≈1.693。'],
  '本课沿用工具的平滑IDF；加1用于平滑，log为自然对数。','三段中到处都有的“味道”，与只在一段出现的词，谁获得较大权重？',{formula:'\\operatorname{IDF}(w)=\\log\\frac{1+n}{1+\\operatorname{df}(w)}+1'}),
 p('TF-IDF：段内次数，乘上这个词的权重','先计数，再乘权重，两个部分都参与计算',
  ['TF：这个词在当前段里出现的次数。','IDF：依据整批文档计算的词权重。','C中牛角包出现2次：2×1.693≈3.386。'],
  '本课手算与实际模型均采用原始次数×平滑IDF，不额外归一化。','同一个词的IDF固定时，在另一段多出现一次，TF-IDF会怎样变化？',{formula:'\\operatorname{TFIDF}(w,d)=\\operatorname{TF}(w,d)\\times\\operatorname{IDF}(w)'}),
 p('个人计算：完成B这一行','B中，味道1次、牛角包0次、上菜速度1次',
  ['三词的IDF依次为1.000、1.693、1.693。','按“次数×权重”，计算B的三个位置。','说明味道与上菜速度同样出现1次，为什么加权值不同。'],
  '独立计算约90秒；下一页给出完整矩阵。','你得到的B行是什么，三个位置分别代表哪个词？',{kind:'question',exerciseId:'T15-Q3'}),
 p('一行三个数，就是这段文字的一个向量','位置固定，数值对应同一套词表',[],
  '本页保留3位小数；A、B、C始终使用同一三段摘句。','向量[1.000,0,1.693]为什么能够还原成B的三项词信息？',{visual:'text-weight-matrix',kind:'feedback',exerciseId:'T15-Q3'}),
 p('跟做三：让Python重做刚才的手算','检查三个位置，尤其是C中的3.386',[],
  'Notebook第4节；使用同一分词函数、三个指定词，norm=None与手算一致。','程序给出的表，哪些位置可以用刚才的计数独立核对？',{code:"v = TfidfVectorizer(tokenizer=tokenize,\n    token_pattern=None, vocabulary=toy_words, norm=None)\nX = v.fit_transform(excerpts)\npd.DataFrame(X.toarray(), columns=toy_words).round(3)",text:['toy_words依次为味道、牛角包、上菜速度；excerpts为A、B、C摘句。']}),
 p('词向量有了，接下来想整理哪种评论','把“哪些评论在抱怨上菜速度”设为一个分类任务',
  ['“但是做了好久”在谈等待，原句写的是具体感受。','整理速度抱怨时，要把这些表达与相应的人工标签配对。','ASAP已经为各项体验保留作者人工标注，可以用于训练。'],
  'ASAP原始标注覆盖18个方面；下面先解释上菜速度的四种原标签。','要让模型学习“抱怨速度”，我们需要怎样的已标注样例？'),
 p('原始标签，逐项说明顾客怎样评价','同一方面有正向、中性、负向和未提及四种状态',[],
  'ASAP人工标签；摘句分别来自18259、33204、43901、20264。','“上菜速度适中”和“没有谈到速度”，分别属于哪一种状态？',{visual:'text-labels'}),
 p('本次只判断：有没有标为速度负向','把研究任务写成已经学过的0/1结果',[],
  'y=1对应原始Service#Timely=−1；其余三类在本任务中记y=0。','为什么y=0应该读成“未标为速度负向”，而不是统一读成“满意”？',{table:table(['原始速度标签','本次y','本次任务中的含义'],[['负向 −1','1','标为速度负向'],['正向 1','0','未标为速度负向'],['中性 0','0','未标为速度负向'],['未提及 −2','0','未标为速度负向']])}),
 p('个人判断：先给两个学习样例填写y','先按任务定义整理结果，再交给模型学习',
  ['评论47010：“一般点个菜上个菜要挺久的，催了也不快。”原速度标签为负向。','评论33204：“上菜速度适中。”原速度标签为中性。','分别填写y，并写出y=0这一组还会包含哪些原标签。'],
  '个人判断约90秒；下一页查看标签与输入怎样配对。','这两个样例的y各是多少，模型的输入又是什么？',{kind:'question',exerciseId:'T15-Q4'}),
 p('每个学习样例，配上一行词向量和一个y','模型学习文字特征与结果之间的对应',[],
  '词向量按刚才的TF-IDF方法生成；此处只展示输入与结果的配对方式。','新增一条未标注评论以后，已有词表怎样帮助我们整理它？',{table:table(['学习样例','输入','结果y'],[['47010','它的TF-IDF词向量','1'],['33204','它的TF-IDF词向量','0'],['新评论','按训练词表生成的词向量','等待模型预测']]),kind:'feedback',exerciseId:'T15-Q4'}),
 p('训练、验证、测试，各做一件事','用已有样例学习，再看新样例判断得怎样',[],
  '沿用原始划分：36,850 / 4,940 / 4,940；词表与IDF只在训练集学习。','一条新评论没有参与学习，为什么仍然可以转换成同样长度的向量？',{visual:'text-splits'}),
 p('把词的数值，接回熟悉的Logit','词向量的各列，成为模型中的解释变量',[],
  '实际测试评论的计算拆解；各词贡献为TF-IDF值×模型系数，其余词合并显示。','系数与这个词的TF-IDF值，分别在计算中承担什么作用？',{visual:'text-prediction'}),
 p('跟做四：先学习，再转换验证评论','词表和系数学好以后，沿用它们处理另一批文字',[],
  'Notebook第5节；完整配置放在课后方法卡，课堂直接阅读各步输入与输出。','fit_transform与transform，哪一步会学习词表与IDF？',{code:"X_train = vectorizer.fit_transform(train_texts)\nmodel.fit(X_train, y_train)\nX_dev = vectorizer.transform(dev_texts)\np_dev = model.predict_proba(X_dev)[:, 1]\nprint(X_train.shape, X_dev.shape)"}),
 p('一条评论，怎样得到一次分类结果','先生成抱怨概率，再按0.5阈值转成0或1',[],
  '来自同一次固定模型的测试结果；概率与分类标签分开保留。','真实结果与预测结果分别放在哪一列，哪条需要回看原文？',{visual:'text-prediction-rows'}),
 p('先数清判断结果，再谈成绩','混淆矩阵把4,940次判断放入四格',[],
  '行按真实结果，列按预测结果；抱怨对应y=1，其他对应y=0。','哪一格表示“预测抱怨，但人工标签不是速度负向”？',{visual:'text-confusion'}),
 p('个人计算：两个分母，读出两种表现','同一张四格表，可以回答两个问题',
  ['预测为抱怨的评论中，有多少条判断正确？','真正标为抱怨的评论中，有多少条被模型找到？','分别圈出分子、分母，再计算比例。'],
  '沿用同一实际四格人数；独立计算约90秒。','这两个问题为什么要使用不同的分母？',{kind:'question',exerciseId:'T15-Q5',visual:'text-confusion-question'}),
 p('精确率与召回率，分别读清分母','一项看找出的准不准，一项看真正的找到了多少',[],
  '都来自同一测试集与0.5阈值；读比例时同时保留人数。','如果希望少漏掉一些抱怨，下一轮比较时你会特别关注哪个比例？',{visual:'text-metrics',kind:'feedback',exerciseId:'T15-Q5'}),
 p('判断有误时，回到顾客的原句','把误分记录读清楚，再决定怎样补充样例',[],
  '实际测试集误分；完整文字、人工结果和预测保存在test-predictions.csv及原始CSV。','这段表达中的哪些词或上下文，值得在下一轮整理时特别查看？',{visual:'text-error'}),
 p('一条新评论，可以沿着同一流程整理','每一步都留下可查看的中间结果',[],
  '新评论沿用这条分类流程；接下来用已有人工标签，整理本批评论的六项体验。','分类器整理新增评论，已有标注又怎样帮助我们形成服务简报？',{visual:'text-workflow'}),
 p('回到服务简报，需要同时看几个方面','把六项体验按同一规则整理',[],
  '以下总体统计采用作者人工标签，覆盖全部46,730条评论。','同一条评论谈到多个方面时，应该怎样分别计数？',{table:table(['方面','关注内容','原始字段'],[['口味','味道与口感','Food#Taste'],['上菜速度','点单后的出餐等待','Service#Timely'],['服务态度','回应、礼貌与问题处理','Service#Hospitality'],['性价比','花费与体验是否相称','Price#Cost_effective'],['卫生','干净与整洁','Ambience#Sanitary'],['嘈杂情况','用餐时的声音环境','Ambience#Noise']])}),
 p('跟做五：先数提及，再数其中的负向','把计数与除法直接写出来',[],
  'Notebook第6节；同一段代码再对六项体验循环，输出aspect-summary.csv。','m和neg分别数了什么，两个比例各用谁作分母？',{code:"s = df['Service#Timely']\nm = (s != -2).sum()\nneg = (s == -1).sum()\nmention_rate = m / len(df)\nnegative_share = neg / m\nprint(m, neg, mention_rate, negative_share)"}),
 p('提及多少，与提到后怎样评价，一起看','两幅图使用不同分母，各自回答一个问题',[],
  '左：提及数/46,730；右：负向数/提及数。一条评论可以提及多个方面。','口味与上菜速度，分别呈现怎样的提及规模和评价构成？',{visual:'text-two-aspects'}),
 p('每个点，放在一项具体体验上','横轴看提及规模，纵轴看提及后的负向比例',[],
  '上菜速度提及7,190条，其中负向2,508条；数据均来自原始人工标签。','你想先阅读哪一类负向评论，理由是什么？',{visual:'text-priorities'}),
 p('回看原文，服务问题才变得具体','等待发生在什么时候，回应发生在哪个环节',[],
  '47010、29189原句节选；工作安排为课堂讨论方案。','这两条评论，分别提示我们去查看哪一项现场记录或服务动作？',{visual:'text-service-quotes'}),
 p('个人项目：写一段自己的服务简报','用一个比例、一句原文和一项安排连成一段话',
  ['选择上菜速度或服务态度，写出提及数与负向数。','算清比例，挑一句对应原文。','提出一个具体试行动作，说明接下来记录什么。'],
  '独立完成约3分钟；可以使用刚才输出的表与原文。','读完你的简报，负责人能否知道先查看哪里、准备做什么？',{kind:'question',exerciseId:'T15-Q6'}),
 p('把数字、原话和安排写在同一段里','一份可以继续补充现场资料的简报',[],
  '统计来自完整ASAP资料；安排为课堂示范。保留自己的方案再比较。','你的简报与示范相比，哪一句还可以写得更具体？',{visual:'text-brief',kind:'feedback',exerciseId:'T15-Q6'}),
 p('用vibe coding，也按刚才的步骤提需求','每生成一步代码，都用已经算过的数检查',[],
  'Notebook第7节；先运行计数步骤，再继续TF-IDF与分类。','如果生成代码只输出最终成绩，你会要求补充哪些中间表？',{code:'先读取三份ASAP原始CSV，核对46730行。\n按给定领域词表与停用词表分词。\n用Counter输出词频表，再统计每词出现的评论数。\n用A、B、C摘句核对次数、df和TF-IDF。\n随后拟合二元Logit，输出四格人数与两个比例。\n最后生成六项体验统计表和一段服务简报。'}),
 p('从课堂项目，继续读一篇管理研究','研究者也关心“谈什么”和“对它怎样评价”',
  ['A Structural Topic and Sentiment-Discourse Model for Text Analysis',
   'Chen与Mankad，Management Science，2025。',
   '论文同时研究文字谈论的内容、相应情感表达与文档特征。进一步阅读可从本课已经分开的“方面”和“评价”出发。'],
  '71(7):5767–5787，DOI 10.1287/mnsc.2022.00261；课堂中文提要。','如果再获得消费场景或顾客类型，你会提出哪一个新的比较问题？',{visual:'text-paper'}),
 p('从数清一个词，到完成一份服务分析','把自己算过的每一步保存下来',
  ['词频表：说清词出现了多少次、分母是什么。','TF-IDF与分类：解释文字怎样成为模型输入。','服务简报：把计数、顾客原话与具体安排连起来。'],
  '原始CSV、逐步Notebook、课堂计算表及简报模板均随学生包提供。','请指出自己已经能解释、也能独立修改的一段计算？',{visual:'text-finish'})
];
const additions:Record<string,ResearchPage>={
 aggregate:p('从一条评论，累计到整批评论','每读完一条，就把它的词加入同一本计数账',
  ['update把当前评论的次数加到已有次数上。','循环结束后，most_common按整批评论的总次数排序。'],
  'Notebook第3节；本轮保留常见虚词，下一步再整理停用词。','同一个词在另一条评论里再次出现，计数账会怎样更新？',{
   code:"counts = Counter()\nfor review in df['review']:\n    words = tokenize(review, remove_stopwords=False)\n    counts.update(words)\nprint(counts.most_common(10))"}),
 vocabulary:p('三列扩大到一万多列，位置仍由词表固定','实际项目的每一行，仍然是一条评论的TF-IDF向量',[],
  '本次训练得到12,000个词列；每一列始终对应同一个词。','测试评论里遇到训练词表未收录的词，为什么向量仍有12,000个位置？',{
   table:table(['比较什么','三段摘句练习','实际项目'],[
    ['行','3段摘句','训练36,850条；验证、测试各4,940条'],
    ['列','3个指定词','训练集形成的12,000词词表'],
    ['每格数值','段内次数×三段算出的IDF','评论内次数×训练集算出的IDF'],
    ['处理下一条','仍用原来的3个位置','仍用训练词表；未收录词略过']])}),
 learning:p('模型怎样学出每个词的系数','词向量与人工结果一起进入Logit',
  ['xᵢⱼ是第i条评论中，第j个词的TF-IDF值。','训练时，程序比较预测概率与人工y，调整系数，使真实类别获得较高概率。','拟合后得到12,000个词系数βⱼ，以及一个常数β₀。','处理验证或测试评论时，沿用这些已学好的系数。'],
  '与第5讲的Logit相接；现在解释变量换成了词向量的各列。','TF-IDF值与系数β分别由什么资料、在哪一步计算出来？',{
   formula:'\\eta_i=\\beta_0+\\sum_{j=1}^{12000}\\beta_jx_{ij}'}),
 validation:p('先把验证评论走一遍，核读当前方案','这些评论参与检查，训练出的词表与系数继续沿用',
  ['表中每行保留人工y和模型给出的速度负向概率。','本次配置固定；核读样例与表现后，再用同一方案处理测试集。'],
  '实际验证集4,940条；完整记录见validation-predictions.csv。','验证结果与原句读法不一致时，可以回到哪些中间结果检查？',{
   visual:'text-validation'}),
 input:p('送入模型以前，再读这条测试评论','评论33204：等位、速度与口味写在同一条原文里',[],
  '真实测试评论33204；其中“环境还可以……味道还行”就是前面的B摘句。','请找出“好久”“等”“上菜速度”，看看它们分别出现在哪个语境？',{
   visual:'text-model-input'}),
 probability:p('从相加的数值，算成概率，再作分类','同一条评论33204，沿用刚才算出的η',
  ['η≈1.351，代入得到速度负向概率p≈79.4%。','本次以0.5为阈值，p≥0.5记预测1；这条评论因此预测为1。'],
  'Notebook第5节；以下代码对整份测试集生成概率与预测标签。','概率p、预测标签和人工y，各自来自哪一步？',{
   formula:'p_i=\\frac{1}{1+e^{-\\eta_i}}',
   code:"X_test = vectorizer.transform(test_texts)\np = model.predict_proba(X_test)[:, 1]\npredicted = (p >= 0.5).astype(int)"})
};
/** Existing pages retain their original keys when new explanatory pages are inserted. */
export const textPagePlan:(number|string)[]=[
 ...Array.from({length:10},(_,i)=>i+1),'aggregate',
 ...Array.from({length:20},(_,i)=>i+11),'vocabulary','learning',32,'validation','input',31,'probability',
 ...Array.from({length:16},(_,i)=>i+33)
];
export const textLessonFifteen:ResearchPage[]=textPagePlan.map(entry=>{
 const original=typeof entry==='number';
 return {...(original?originalTextPages[entry-1]!:additions[entry]!),stableKey:'stats-l15-'+(original?String(entry).padStart(2,'0'):entry)};
});
const speech=[60,65,60,70,65,90,35,65,95,70,70,90,80,80,40,80,85,100,80,100,100,40,90,65,75,100,85,40,70,85,100,70,85,90,40,90,85,80,80,75,85,80,90,40,90,65,70,55];
const reductions:Record<number,number>={1:15,2:10,3:30,4:10,5:5,6:5,8:5,10:10,11:10,12:5,13:5,14:15,16:5,18:5,19:10,23:5,24:5,25:10,26:10,29:10,30:10,31:15,32:10,33:10,34:5,36:10,37:10,38:35,39:5,40:5,41:10,42:10,43:10,45:30,46:15,47:30,48:25};
const addedSpeech:Record<string,number>={aggregate:60,vocabulary:75,learning:85,validation:60,input:70,probability:80};
const thinking:Record<number,number>={7:60,15:90,22:90,28:90,35:90,44:180};
const practice:Record<number,number>={4:90,10:150,12:120,13:120,24:180,32:180,40:180,46:180};
export function textTiming(local:number){
 const entry=textPagePlan[local-1]!;
 const spokenSeconds=typeof entry==='number'?speech[entry-1]!-(reductions[entry]??0):addedSpeech[entry]!;
 const pauseSeconds=typeof entry==='number'?(thinking[entry]??practice[entry]??0):0;
 return {spokenSeconds,pauseSeconds,practice:typeof entry==='number'&&entry in practice,
  section:local<=5?'从真实评论开始':local<=19?'分词、计数与词频':local<=25?'从词频到TF-IDF':local<=44?'整理新的速度抱怨':'形成服务分析简报'};
}
export const TEXT_MATERIAL_BASE='/course-assets/statistical-analysis/text-15';
export const textDescriptions:Record<string,string>={
 'text-cover':'从词频开始，依次完成分词、计数、文档频数、TF-IDF、二元分类、六项体验统计和服务简报。',
 'text-review':'评论43901：“芝士好厚 但是做了好久”“不过味道还是不错的”。总体4星。',
 'text-project':'依次产出：词频表看常用表达；速度抱怨分类整理新评论；六项体验统计与原文形成服务简报。',
 'text-excerpts':D.excerpts.map(e=>e.name+'，id'+e.id+'：'+e.text).join('；'),
 'text-count-question':'仅数三词：味道、牛角包、上菜速度。A：'+D.excerpts[0].text+'；B：'+D.excerpts[1].text+'；C：'+D.excerpts[2].text+'。请按三段分别计数。',
 'text-frequency-raw':D.frequency.raw_top.slice(0,10).map(r=>r.word+' '+r.count+'次').join('；'),
 'text-frequency':D.frequency.top.slice(0,10).map(r=>r.word+' '+r.count+'次，出现于'+r.documents+'条评论').join('；'),
 'text-count-matrix':'固定词表：味道、牛角包、上菜速度。A=[2,0,0]，B=[1,0,1]，C=[1,2,0]，各行是段内原始词频TF。',
 'text-weight-matrix':'固定词表：味道、牛角包、上菜速度。IDF分别1、1.693、1.693。A=[2,0,0]，B=[1,0,1.693]，C=[1,3.386,0]。一行是一个词向量。',
 'text-labels':'正向1：18259“感觉上菜速度，整体口味都特别不错”；中性0：33204“上菜速度适中”；负向−1：43901“但是做了好久”；未提及−2：20264的速度标签。',
 'text-splits':'训练36850条学习词表、IDF和模型参数；验证4940条检查方案；测试4940条最后评价。模型使用中文词、普通TF×平滑IDF、二元Logit和0.5阈值。',
 'text-prediction':'实际测试样例'+D.classifier.worked.id+'：'+D.classifier.worked.review+'；Logit线性值'+D.classifier.worked.eta.toFixed(3)+'，概率'+pct(D.classifier.worked.probability)+'。各项贡献：'+D.classifier.worked.top.map(t=>t.word+' '+t.contribution.toFixed(3)).join('；')+'，常数'+D.classifier.worked.intercept.toFixed(3)+'，其余'+D.classifier.worked.other.toFixed(3),
 'text-validation':D.classifier.validation_preview.map(r=>'验证id'+r.id+'，人工y='+r.actual+'，速度负向概率'+pct(r.probability)).join('；'),
 'text-model-input':'实际测试评论33204：'+D.classifier.worked.review,
 'text-prediction-rows':[D.classifier.predictions_preview.find(r=>r.actual===r.predicted)!,D.classifier.worked,...D.classifier.errors.filter(r=>r.id!==D.classifier.worked.id)].map(r=>'id'+r.id+'，人工y='+r.actual+'，概率'+pct(r.probability)+'，预测'+r.predicted).join('；'),
 'text-confusion':'实际测试4940条。真0预测0='+D.classifier.metrics.tn+'；真0预测1='+D.classifier.metrics.fp+'；真1预测0='+D.classifier.metrics.fn+'；真1预测1='+D.classifier.metrics.tp+'。',
 'text-confusion-question':'测试四格人数：行是真实，列是预测。真0预测0='+D.classifier.metrics.tn+'，真0预测1='+D.classifier.metrics.fp+'，真1预测0='+D.classifier.metrics.fn+'，真1预测1='+D.classifier.metrics.tp+'。分别圈出两个问题的分母。',
 'text-metrics':'精确率='+D.classifier.metrics.tp+'/('+D.classifier.metrics.tp+'+'+D.classifier.metrics.fp+')='+pct(D.classifier.metrics.precision)+'；召回率='+D.classifier.metrics.tp+'/('+D.classifier.metrics.tp+'+'+D.classifier.metrics.fn+')='+pct(D.classifier.metrics.recall)+'。',
 'text-error':D.classifier.errors.map(r=>'id'+r.id+'，真实y='+r.actual+'，预测'+r.predicted+'，概率'+pct(r.probability)+'：'+r.review).join('；'),
 'text-workflow':'新评论原文；同一领域词表分词；同一停用词表；按训练词表与IDF转换；Logit概率；0.5阈值给出速度负向1或其他0。',
 'text-two-aspects':D.aspects.map(r=>r.name+'提及'+r.mentioned+'/'+D.n+'='+pct(r.mention_rate)+'，负向'+r.negative+'/'+r.mentioned+'='+pct(r.negative_share)).join('；'),
 'text-priorities':D.aspects.map(r=>r.name+'提及率'+pct(r.mention_rate)+'，提及后负向比例'+pct(r.negative_share)).join('；'),
 'text-service-quotes':'47010：午餐饭点周边商务楼的人都来了，一般点个菜上个菜要挺久的，催了也不快。29189：就是服务不咋地，可能太忙了，态度不耐烦，有待改善。节选用于讨论查看出餐记录和服务回应。',
 'text-brief':'上菜速度提及7190条，负向2508条，提及后负向34.9%。结合47010午餐高峰等待原文，建议记录点单至上菜时间，讨论高峰出餐安排，并继续记录顾客评价。',
 'text-paper':'Chen与Mankad(2025), A Structural Topic and Sentiment-Discourse Model for Text Analysis, Management Science71(7):5767–5787, DOI10.1287/mnsc.2022.00261。中文提要：同时研究谈论内容、情感表达与文档特征。',
 'text-finish':'项目文件：原始CSV；word-counts.csv词频；toy-counts.csv和toy-weights.csv；test-predictions.csv；aspect-summary.csv；classroom.ipynb；service-brief-template.md。'
};
