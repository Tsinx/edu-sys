"""ASAP classroom project: count, weight, classify, and discuss service."""
import os
for name in ('OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','NUMEXPR_NUM_THREADS'):
    os.environ[name]='1'
from pathlib import Path
from collections import Counter
import json,re,time,logging
import numpy as np
import pandas as pd
import jieba
from scipy.special import expit
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix
from threadpoolctl import threadpool_limits

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'outputs'
ASPECTS={'Food#Taste':'口味','Service#Timely':'上菜速度','Service#Hospitality':'服务态度','Price#Cost_effective':'性价比','Ambience#Sanitary':'卫生','Ambience#Noise':'嘈杂情况'}
LABELS={-2:'未提及',-1:'负向',0:'中性',1:'正向'}
STOPWORDS=set('的 了 是 很 也 都 就 有 和 在 我 我们 你 他们 这 那 一个 一家 这个 那个 还是 就是 感觉 比较 可以 真的 觉得 但是 不过 所以 因为 还有 一下 一些 什么 这么 那么 时候 这里 那里 里面'.split())
DOMAIN_WORDS=['牛角包','上菜速度','服务态度','性价比']
jieba.setLogLevel(logging.ERROR)
TOKENIZER=jieba.Tokenizer()
for word in DOMAIN_WORDS:TOKENIZER.add_word(word)

def load_data():
    return {s:pd.read_csv(ROOT/'data/raw'/f'{s}.csv').assign(split=s) for s in ['train','dev','test']}

def normalize(text):
    text=re.sub(r'\\+n',' ',str(text))
    return re.sub(r'\s+',' ',text).strip()

def tokenize(text,remove_stopwords=True):
    words=[w for w in TOKENIZER.cut(normalize(text)) if re.fullmatch(r'[\u4e00-\u9fff]+',w)]
    return [w for w in words if w not in STOPWORDS] if remove_stopwords else words

def classroom_excerpts(df):
    specs=[(43901,['味道有点像之前在大通冰室喝的丝袜奶茶','不过味道还是不错的']),
           (33204,['环境还可以，上菜速度适中，菜量很少，味道还行']),
           (20264,['牛角包味道很不错，其他两个都有点腻，感觉一般，不过团购还是很划算的。牛角包很不错。推荐。'])]
    result=[]
    for name,(rid,parts) in zip(['A','B','C'],specs):
        row=df.loc[df.id==rid].iloc[0]
        assert all(part in row.review for part in parts),(rid,parts)
        result.append({'name':name,'id':rid,'parts':parts,'text':'……'.join(parts)})
    return result

def toy_tables(excerpts):
    vocab=['味道','牛角包','上菜速度']
    counts=np.array([[Counter(tokenize(e['text']))[w] for w in vocab] for e in excerpts])
    dfreq=(counts>0).sum(axis=0)
    idf=np.log((1+len(excerpts))/(1+dfreq))+1
    return {'vocabulary':vocab,'counts':counts.tolist(),'totals':counts.sum(axis=0).tolist(),
            'document_frequency':dfreq.tolist(),'idf':idf.tolist(),'weights':(counts*idf).tolist(),'total':int(counts.sum())}

def word_counts(df):
    raw_count,clean_count,document_count=Counter(),Counter(),Counter()
    segmented=[]
    for text in df.review:
        words=tokenize(text,remove_stopwords=False)
        raw_count.update(words)
        clean=[w for w in words if w not in STOPWORDS]
        clean_count.update(clean);document_count.update(set(clean));segmented.append(' '.join(clean))
    total=sum(clean_count.values())
    table=pd.DataFrame([{'word':w,'count':n,'documents':document_count[w],'relative_frequency':n/total} for w,n in clean_count.most_common()])
    return pd.DataFrame(raw_count.most_common(),columns=['word','count']),table,segmented,total

def aspect_summary(df):
    result=[]
    for col,name in ASPECTS.items():
        s=df[col];m=int((s!=-2).sum());neg=int((s==-1).sum())
        result.append({'column':col,'name':name,'n':len(df),'mentioned':m,'negative':neg,
            'neutral':int((s==0).sum()),'positive':int((s==1).sum()),'unmentioned':int((s==-2).sum()),
            'mention_rate':m/len(df),'negative_share':neg/m})
    return pd.DataFrame(result)

def binary_metrics(y,pred):
    tn,fp,fn,tp=confusion_matrix(y,pred,labels=[0,1]).ravel()
    return {'tn':int(tn),'fp':int(fp),'fn':int(fn),'tp':int(tp),'n':int(len(y)),
        'accuracy':float((tn+tp)/len(y)),'precision':float(tp/(tp+fp)) if tp+fp else None,
        'recall':float(tp/(tp+fn)) if tp+fn else None}

def fit_classifier(df,segmented):
    train=df.split.eq('train').to_numpy();dev=df.split.eq('dev').to_numpy();test=df.split.eq('test').to_numpy()
    texts=np.array(segmented,dtype=object)
    # Counts * smoothed IDF, without sublinear TF or row normalization.
    vectorizer=TfidfVectorizer(tokenizer=str.split,token_pattern=None,lowercase=False,norm=None,min_df=5,max_features=12000)
    with threadpool_limits(limits=1):
        x_train=vectorizer.fit_transform(texts[train])
        model=LogisticRegression(C=1.0,max_iter=500,solver='lbfgs',random_state=15)
        y=(df['Service#Timely']==-1).astype(int).to_numpy()
        model.fit(x_train,y[train])
        x_dev=vectorizer.transform(texts[dev]);x_test=vectorizer.transform(texts[test])
        p_dev=model.predict_proba(x_dev)[:,1];p=model.predict_proba(x_test)[:,1]
    pred=(p>=.5).astype(int);test_df=df.loc[test].reset_index(drop=True)
    table=pd.DataFrame({'id':test_df.id,'actual':y[test],'probability':p,'predicted':pred})
    table.to_csv(OUT/'test-predictions.csv',index=False)
    dev_df=df.loc[dev].reset_index(drop=True)
    validation_table=pd.DataFrame({'id':dev_df.id,'actual':y[dev],'probability':p_dev,'predicted':(p_dev>=.5).astype(int)})
    validation_table.to_csv(OUT/'validation-predictions.csv',index=False)
    preview_indices=[0,int(np.flatnonzero((y[dev]==1)&(p_dev>=.5))[0]),int(np.flatnonzero((y[dev]==1)&(p_dev<.5))[0])]
    vocab=vectorizer.get_feature_names_out()
    selected=int(np.flatnonzero(test_df.id.to_numpy()==33204)[0])
    values=x_test[selected].multiply(model.coef_[0]).toarray()[0]
    inds=np.argsort(np.abs(values))[::-1][:3]
    top=[{'word':str(vocab[j]),'weight':float(x_test[selected,j]),'coefficient':float(model.coef_[0,j]),'contribution':float(values[j])} for j in inds]
    intercept=float(model.intercept_[0]);rest=float(values.sum()-sum(t['contribution'] for t in top))
    eta=intercept+float(values.sum())
    assert abs(expit(eta)-p[selected])<1e-12
    worked={'id':int(test_df.id.iloc[selected]),'review':test_df.review.iloc[selected],'top':top,
            'intercept':intercept,'other':rest,'eta':eta,'probability':float(p[selected]),'actual':int(y[test][selected]),'predicted':int(pred[selected])}
    errors=[]
    for actual,predict in [(1,0),(0,1)]:
        candidates=np.where((y[test]==actual)&(pred==predict))[0]
        if len(candidates):
            i=int(min(candidates,key=lambda j:len(test_df.review.iloc[j])))
            errors.append({'id':int(test_df.id.iloc[i]),'review':test_df.review.iloc[i],'actual':actual,'predicted':predict,'probability':float(p[i])})
    return {'target':'Service#Timely == -1','train_n':int(train.sum()),'dev_n':int(dev.sum()),'test_n':int(test.sum()),
        'vocabulary_size':len(vocab),'threshold':.5,'iterations':model.n_iter_.tolist(),
        'metrics':binary_metrics(y[test],pred),'validation':binary_metrics(y[dev],p_dev>=.5),
        'baseline_accuracy':float(np.mean(y[test]==0)),'worked':worked,'errors':errors,
        'predictions_preview':table.head(4).to_dict('records'),
        'validation_preview':validation_table.iloc[preview_indices].to_dict('records')}

def make_figures(result):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    fonts={f.name for f in font_manager.fontManager.ttflist}
    plt.rcParams['font.sans-serif']=[n for n in ['Microsoft YaHei','Noto Sans CJK SC','SimHei'] if n in fonts]+['DejaVu Sans']
    plt.rcParams.update({'axes.unicode_minus':False,'font.size':12,'figure.facecolor':'#f4f0e7','axes.facecolor':'#f4f0e7','savefig.facecolor':'#f4f0e7'})
    for key,name in [('raw_top','word-frequency-raw'),('top','word-frequency')]:
        rows=result['frequency'][key][:12][::-1]
        fig,ax=plt.subplots(figsize=(10,5));ax.barh([r['word'] for r in rows],[r['count'] for r in rows],color='#197f7a')
        ax.set(xlabel='词出现的次数',title='46,730条评论的词频'+('（保留常见虚词）' if key=='raw_top' else '（按课堂停用词表整理）'))
        ax.spines[['top','right']].set_visible(False);fig.tight_layout();fig.savefig(OUT/(name+'.png'),dpi=150);plt.close(fig)
    for metric,label in [('mention_rate','全部评论中的提及率'),('negative_share','提及该方面后的负向比例')]:
        fig,ax=plt.subplots(figsize=(10,4.5));rows=result['aspects'][::-1]
        ax.barh([r['name'] for r in rows],[r[metric]*100 for r in rows],color='#197f7a')
        ax.set(xlabel='%',title=label);ax.spines[['top','right']].set_visible(False);fig.tight_layout();fig.savefig(OUT/(metric+'.png'),dpi=150);plt.close(fig)
    fig,ax=plt.subplots(figsize=(10,5));offsets=[(6,6),(6,6),(6,6),(-10,18),(10,3),(-12,-18)]
    for r,offset in zip(result['aspects'],offsets):
        ax.scatter(r['mention_rate']*100,r['negative_share']*100,color='#197f7a')
        ax.annotate(r['name'],(r['mention_rate']*100,r['negative_share']*100),xytext=offset,textcoords='offset points')
    ax.set(xlabel='提及率（%）',ylabel='提及后的负向比例（%）',xlim=(0,105),ylim=(0,45));fig.tight_layout();fig.savefig(OUT/'service-priorities.png',dpi=150);plt.close(fig)

def run():
    start=time.perf_counter();OUT.mkdir(exist_ok=True)
    df=pd.concat(load_data().values(),ignore_index=True)
    assert len(df)==46730 and df.id.is_unique and df.review.is_unique
    excerpts=classroom_excerpts(df);toy=toy_tables(excerpts)
    raw,words,segmented,total=word_counts(df)
    raw.to_csv(OUT/'word-counts-raw.csv',index=False);words.to_csv(OUT/'word-counts.csv',index=False)
    summary=aspect_summary(df);summary.to_csv(OUT/'aspect-summary.csv',index=False)
    classifier=fit_classifier(df,segmented)
    pd.DataFrame(toy['counts'],columns=toy['vocabulary'],index=['A','B','C']).to_csv(OUT/'toy-counts.csv')
    pd.DataFrame(toy['weights'],columns=toy['vocabulary'],index=['A','B','C']).to_csv(OUT/'toy-weights.csv')
    quotes=[]
    for rid in [47010,29189,43901,33204,20264,18259]:
        r=df.loc[df.id==rid].iloc[0]
        quotes.append({'id':rid,'review':r.review,'star':int(r.star),'labels':{c:int(r[c]) for c in ASPECTS}})
    result={'n':len(df),'excerpts':excerpts,'toy':toy,'frequency':{'total_tokens':total,'vocabulary':len(words),
        'raw_top':raw.head(20).to_dict('records'),'top':words.head(20).to_dict('records'),
        'stopwords':sorted(STOPWORDS),'domain_words':DOMAIN_WORDS},
        'aspects':summary.to_dict('records'),'classifier':classifier,'quotes':quotes}
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    make_figures(result)
    print(words.head(12).to_string(index=False));print(toy);print(classifier['metrics'])
    print('计算用时（秒）：',round(time.perf_counter()-start,1))
    return result

if __name__=='__main__':run()
