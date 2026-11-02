"""Create the student tutorial from the executed, single-representation project."""
from pathlib import Path
import json,importlib.metadata as md,sys
import nbformat as nb
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'apps/teacher-web/public/course-assets/statistical-analysis/text-15'
result=json.loads((BASE/'outputs/results.json').read_text(encoding='utf-8'))
(ROOT/'packages/course-content/src/statistical-analysis/text-analysis-data.ts').write_text('/** Executed ASAP classroom calculations. */\nexport const TEXT_DATA='+json.dumps(result,ensure_ascii=False,indent=1)+' as const;\n',encoding='utf-8')
(BASE/'extensions').mkdir(exist_ok=True)
(BASE/'README.md').write_text('''# 第15讲：从数清一个词，到服务分析

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
''',encoding='utf-8')
(BASE/'extensions/method-card.md').write_text('''# 课后方法卡

课堂主线已经依次解释词频、df、IDF、TF-IDF、二元Logit、混淆矩阵、精确率与召回率。以下设置供复核和课后试改。

## 固定表示与模型

领域词：牛角包、上菜速度、服务态度、性价比。停用词表定义在analysis.py，保留不、没、没有等否定。只保留中文词，原文另存不改。

TfidfVectorizer采用中文分词后的词列表，norm=None，sublinear_tf默认False，smooth_idf默认True。min_df=5表示训练中至少5份文档出现的词才进入候选；max_features=12000表示词表最多12,000项。实际词表只从训练集学习。这些设置缩小计算规模，不改变TF×平滑IDF的计算形式。

二元Logit采用C=1，L2正则，lbfgs求解，最大迭代500，随机种子15。正则化对系数幅度施加约束，C为其强度的倒数。本次固定配置，不在测试集选择设置。验证集用于查看方案，测试集最后评价。阈值固定0.5；课后可在验证集比较阈值与精确率/召回率的变化，再对冻结方案评价。

精确率P=TP/(TP+FP)，召回率R=TP/(TP+FN)。在读懂两个分母后，可继续计算F1=2PR/(P+R)。课堂主任务只要求先算清P与R。

## 进一步阅读

Chen, L. & Mankad, S. (2025). A Structural Topic and Sentiment-Discourse Model for Text Analysis. Management Science,71(7),5767–5787. https://doi.org/10.1287/mnsc.2022.00261 。文章同时研究谈论内容、情感表达和文档特征；本课独立实现预设方面的小项目。

Carlson, N. A. & Burbano, V. (2026). The use of LLMs to annotate data in management research: Foundational guidelines and warnings. Strategic Management Journal,47(3),699–725. https://doi.org/10.1002/smj.70023 。大模型标注可以作为课后扩展，使用同一方面定义与人工标签逐条比较；没有提供未实际运行的大模型输出。
''',encoding='utf-8')
(BASE/'service-brief-template.md').write_text('''# 服务分析简报

我关注的体验是____。全部____条评论中，____条提及它，其中____条为负向，提及后的负向比例为____。

评论id____写道：“____”。它提示我们查看____环节。

建议先试行____，由____负责，同时记录____，再继续观察对应的顾客评价。

我的统计表：____；对应原文：____；计算单元格：____。
''',encoding='utf-8')
deps=['pandas','numpy','scipy','scikit-learn','matplotlib','jieba','nbformat','nbclient','ipykernel']
(BASE/'requirements.txt').write_text('\n'.join(p+'=='+md.version(p) for p in deps)+'\n',encoding='utf-8')
M=nb.v4.new_markdown_cell;C=nb.v4.new_code_cell
cells=[
 M('# 第15讲：从数清一个词，到服务分析\n\n每一步先看输入、自己计算，再检查输出。原始CSV已经在data/raw中。课堂共54页，先做词频，再做TF-IDF，随后分类和简报。'),
 M('## 1. 打开真实评论（课件4—6页）\n\n先核对总行数，再读三段真实摘句。A合并同一评论的两处原句，手算只数显示摘句。'),
 C("from pathlib import Path\nfrom collections import Counter\nimport json, re\nimport pandas as pd\nimport numpy as np\nfrom analysis import load_data, classroom_excerpts, tokenize, STOPWORDS, ASPECTS\nparts=load_data()\ndf=pd.concat(parts.values(),ignore_index=True)\nassert df.shape==(46730,22)\nprint('行列数：',df.shape)\nexcerpts=classroom_excerpts(df)\nfor e in excerpts: print(e['name'],e['id'],e['text'])"),
 M('## 2. 分词、计数与词频（课件6—10页）\n\n先人工数牛角包，再运行Counter。每出现一次加1，重复仍计入。'),
 C("words=['牛角包','味道','很','不错','牛角包']\ncounts=Counter(words)\nprint(counts)\nassert counts['牛角包']==2\nprint(tokenize('牛角包味道很不错。',remove_stopwords=False))"),
 C("toy_words=['味道','牛角包','上菜速度']\ntoy_texts=[e['text'] for e in excerpts]\ntoy_counts=np.array([[Counter(tokenize(t))[w] for w in toy_words] for t in toy_texts])\ncount_table=pd.DataFrame(toy_counts,index=['A','B','C'],columns=toy_words)\nassert toy_counts.tolist()==[[2,0,0],[1,0,1],[1,2,0]]\ndisplay(count_table)\nprint('合计：',toy_counts.sum(axis=0),'，指定三词共',toy_counts.sum(),'次')\nprint('在指定三词中的相对频率：',toy_counts.sum(axis=0)/toy_counts.sum())"),
 M('## 3. 全量词频、停用词与领域词（课件11—15页）\n\n先保留常见虚词，再用公开的停用词表整理。完整分词需要一些时间。否定词继续保留。'),
 C("all_words=[]\nraw_counts=Counter()\nfor review in df.review:\n    words=tokenize(review,remove_stopwords=False)\n    all_words.append(words)\n    raw_counts.update(words)\nraw_table=pd.DataFrame(raw_counts.most_common(),columns=['word','count'])\nraw_table.head(12)"),
 C("print('停用词表：',sorted(STOPWORDS))\nkept_words=[[w for w in words if w not in STOPWORDS] for words in all_words]\nword_counts=Counter(w for words in kept_words for w in words)\ntotal_tokens=sum(word_counts.values())\nfrequency=pd.DataFrame([{'word':w,'count':n,'relative_frequency':n/total_tokens} for w,n in word_counts.most_common()])\nprint('全部保留词的出现总次数：',total_tokens)\nfrequency.head(12)"),
 C("import matplotlib.pyplot as plt\nfrom matplotlib import font_manager\nfonts={f.name for f in font_manager.fontManager.ttflist}\nplt.rcParams['font.sans-serif']=[n for n in ['Microsoft YaHei','Noto Sans CJK SC','SimHei'] if n in fonts]+['DejaVu Sans']\nplt.rcParams['axes.unicode_minus']=False\nfig,axes=plt.subplots(1,2,figsize=(13,4.5))\nfor ax,tab,title in zip(axes,[raw_table,frequency],['保留常见虚词','应用课堂词表']):\n    top=tab.head(10).iloc[::-1]\n    ax.barh(top.word,top['count'],color='#197f7a')\n    ax.set(title=title,xlabel='词出现的次数')\nfig.tight_layout();plt.show()"),
 M('## 4. 从词频到TF-IDF（课件16—25页）\n\n先算df：一个词出现在几段里，每段最多贡献1。再算平滑IDF，最后逐格乘以原始次数。'),
 C("document_frequency=(toy_counts>0).sum(axis=0)\ndisplay(pd.DataFrame({'词':toy_words,'df':document_frequency}))\n# 整批评论也采用每条最多计一次的办法。\ndocument_counts=Counter()\nfor words in kept_words:\n    document_counts.update(set(words))\nfrequency['documents']=frequency.word.map(document_counts)\nfrequency=frequency[['word','count','documents','relative_frequency']]\nfrequency.head(12)"),
 M('### 先有df，再计算IDF与加权值\n\n同一批文字里的每个词使用一个固定IDF，各段分别取自己的次数相乘。'),
 C("idf=np.log((1+len(toy_texts))/(1+document_frequency))+1\nweights=toy_counts*idf\ndisplay(pd.DataFrame({'词':toy_words,'df':document_frequency,'IDF':idf}))\ndisplay(pd.DataFrame(weights,index=['A','B','C'],columns=toy_words).round(3))\nassert np.isclose(weights[2,1],3.386294361119891)"),
 M('### 让工具重做手算\n\n固定三个词，关闭整行归一化；依次核对每个位置。实际模型沿用中文词与同一种TF-IDF公式。'),
 C("from sklearn.feature_extraction.text import TfidfVectorizer\nv=TfidfVectorizer(tokenizer=tokenize,token_pattern=None,vocabulary=toy_words,norm=None)\nX=v.fit_transform(toy_texts)\nassert np.allclose(X.toarray(),weights)\npd.DataFrame(X.toarray(),index=['A','B','C'],columns=toy_words).round(3)"),
 M('## 5. 整理上菜速度抱怨（课件26—44页）\n\n先读四种原标签，再把任务定义为：是否标为速度负向。只有原标签−1对应y=1，其他三类对应y=0。沿用训练、验证、测试划分。'),
 C("y=(df['Service#Timely']==-1).astype(int)\nsegmented=pd.Series([' '.join(words) for words in kept_words])\ntrain=df.split.eq('train');dev=df.split.eq('dev');test=df.split.eq('test')\nprint('三份样本：',train.sum(),dev.sum(),test.sum())\nprint('测试集真实速度负向数：',y[test].sum())"),
 M('### 学习、转换和生成概率分开运行\n\n下面是本次固定配置，参数解释在extensions/method-card.md。课堂重点看每一行读取什么、返回什么。全部计算限制为一个线程。'),
 C("from sklearn.linear_model import LogisticRegression\nfrom threadpoolctl import threadpool_limits\nvectorizer=TfidfVectorizer(tokenizer=str.split,token_pattern=None,lowercase=False,norm=None,min_df=5,max_features=12000)\nmodel=LogisticRegression(C=1.0,max_iter=500,solver='lbfgs',random_state=15)\nwith threadpool_limits(limits=1):\n    X_train=vectorizer.fit_transform(segmented[train])\n    model.fit(X_train,y[train])\nprint('训练矩阵：',X_train.shape,'；词系数数目：',model.coef_.shape[1])"),
 M('### 先转换验证集并核读样例（课件34—35页）\n\n词表、IDF和系数都沿用训练结果。本次固定配置，先完成检查，再处理测试集。'),
 C("with threadpool_limits(limits=1):\n    X_dev=vectorizer.transform(segmented[dev])\n    p_dev=model.predict_proba(X_dev)[:,1]\ndev_rows=df.loc[dev].reset_index(drop=True)\nvalidation=pd.DataFrame({'id':dev_rows.id,'actual':y[dev].to_numpy(),'probability':p_dev,'predicted':(p_dev>=0.5).astype(int)})\nassert X_dev.shape==(4940,12000)\npreview_indices=[0,int(np.flatnonzero((y[dev].to_numpy()==1)&(p_dev>=.5))[0]),int(np.flatnonzero((y[dev].to_numpy()==1)&(p_dev<.5))[0])]\ndisplay(validation.iloc[preview_indices][['id','actual','probability']])\nprint('训练与验证列数相同：',X_train.shape[1],X_dev.shape[1])"),
 M('### 读完整原文，再生成测试概率（课件36—39页）\n\n33204包含前面的B摘句。先读同一条完整原话，再看向量、各词贡献及概率。'),
 C("test_rows=df.loc[test].reset_index(drop=True)\nrid=33204\ni=int(np.flatnonzero(test_rows.id.to_numpy()==rid)[0])\nprint(test_rows.review.iloc[i])\nwith threadpool_limits(limits=1):\n    X_test=vectorizer.transform(segmented[test])\n    p=model.predict_proba(X_test)[:,1]\npredicted=(p>=0.5).astype(int)\npredictions=pd.DataFrame({'id':test_rows.id,'actual':y[test].to_numpy(),'probability':p,'predicted':predicted})\npredictions.head(5)"),
 C("features=vectorizer.get_feature_names_out()\ncontribution=X_test[i].multiply(model.coef_[0]).toarray()[0]\nidx=np.argsort(np.abs(contribution))[::-1][:3]\ndisplay(pd.DataFrame({'词':features[idx],'TF-IDF':X_test[i].toarray()[0][idx],'系数':model.coef_[0][idx],'贡献':contribution[idx]}))\neta=model.intercept_[0]+contribution.sum()\nprobability=1/(1+np.exp(-eta))\nassert np.isclose(probability,p[i])\nprint('常数',model.intercept_[0],'；其余贡献',contribution.sum()-contribution[idx].sum())\nprint('η=',eta,'；概率=',probability,'；预测=',predicted[i],'；人工y=',predictions.actual.iloc[i])"),
 M('### 先数四格，再算两个比例（课件40—42页）\n\n行是真实，列是预测。精确率从预测抱怨这一列出发，召回率从真实抱怨这一行出发。'),
 C("from sklearn.metrics import confusion_matrix\ncm=confusion_matrix(y[test],predicted,labels=[0,1])\ntn,fp,fn,tp=cm.ravel()\ndisplay(pd.DataFrame(cm,index=['真实其他0','真实抱怨1'],columns=['预测其他0','预测抱怨1']))\nprecision=tp/(tp+fp);recall=tp/(tp+fn)\nprint('精确率：',tp,'/',tp+fp,'=',round(precision,4))\nprint('召回率：',tp,'/',tp+fn,'=',round(recall,4))\n# 同样的定义用于验证集，便于回看当前固定方案的表现。\ndev_cm=confusion_matrix(y[dev],validation.predicted,labels=[0,1])\ndisplay(pd.DataFrame(dev_cm,index=['验证真实0','验证真实1'],columns=['验证预测0','验证预测1']))"),
 M('## 6. 从六项体验到服务简报（课件45—51页）\n\n总体表使用作者人工标签。逐列数提及与负向，再画图，不用模型预测替换原标签。'),
 C("rows=[]\nfor column,name in ASPECTS.items():\n    s=df[column]\n    mentioned=int((s!=-2).sum());negative=int((s==-1).sum())\n    rows.append({'name':name,'mentioned':mentioned,'negative':negative,'mention_rate':mentioned/len(df),'negative_share':negative/mentioned})\nsummary=pd.DataFrame(rows)\nassert summary.loc[summary.name=='上菜速度','mentioned'].iloc[0]==7190\nassert summary.loc[summary.name=='上菜速度','negative'].iloc[0]==2508\nsummary.round(4)"),
 C("fig,axes=plt.subplots(1,2,figsize=(13,4.5))\nfor ax,column,title in zip(axes,['mention_rate','negative_share'],['提及率：全部评论为分母','负向比例：提及该方面为分母']):\n    ax.barh(summary.name.iloc[::-1],summary[column].iloc[::-1]*100,color='#197f7a')\n    ax.set(title=title,xlabel='%')\nfig.tight_layout();plt.show()"),
 C("fig,ax=plt.subplots(figsize=(9,4.5))\noffsets=[(6,6),(6,6),(6,6),(-10,18),(10,3),(-12,-18)]\nfor r,offset in zip(summary.itertuples(),offsets):\n    ax.scatter(r.mention_rate*100,r.negative_share*100,color='#197f7a')\n    ax.annotate(r.name,(r.mention_rate*100,r.negative_share*100),xytext=offset,textcoords='offset points')\nax.set(xlabel='提及率（%）',ylabel='提及后的负向比例（%）',xlim=(0,105),ylim=(0,45))\nfig.tight_layout();plt.show()\nprint(df.loc[df.id==47010,'review'].iloc[0])\nprint(df.loc[df.id==29189,'review'].iloc[0])"),
 M('## 7. 保存自己的成果与编程任务（课件50—54页）\n\n用一个比例、一句原文、一项具体安排填写service-brief-template.md。再选择一小步交给编程助手，要求保留中间表，并用A、B、C手算核对。'),
 C("out=Path('outputs');out.mkdir(exist_ok=True)\nfrequency.to_csv(out/'word-counts.csv',index=False)\nraw_table.to_csv(out/'word-counts-raw.csv',index=False)\ncount_table.to_csv(out/'toy-counts.csv')\npd.DataFrame(weights,index=['A','B','C'],columns=toy_words).to_csv(out/'toy-weights.csv')\npredictions.to_csv(out/'test-predictions.csv',index=False)\nvalidation.to_csv(out/'validation-predictions.csv',index=False)\n# 对照同一项目的完整脚本结果；上面的每一步已经独立运行。\nreference=json.loads((out/'results.json').read_text(encoding='utf-8'))\nassert int(word_counts['味道'])==next(r['count'] for r in reference['frequency']['top'] if r['word']=='味道')\nassert tp==reference['classifier']['metrics']['tp']\nassert fp==reference['classifier']['metrics']['fp']\nprint('词频、手算矩阵和分类计数与完整脚本一致。')"),
 M('## 来源\n\nBu等（2021），ASAP，NAACL，2069–2079。https://aclanthology.org/2021.naacl-main.167/ 。三份原始CSV、固定版本、哈希与原许可随包提供。拓展阅读与设置见extensions/method-card.md。')
]
notebook=nb.v4.new_notebook(cells=cells,metadata={'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'},'language_info':{'name':'python','version':sys.version.split()[0]}})
nb.validate(notebook)
if '--keep-notebook' not in sys.argv:nb.write(notebook,BASE/'classroom.ipynb')
print('Built stepped tutorial:',sum(c.cell_type=='code' for c in cells),'code cells')
