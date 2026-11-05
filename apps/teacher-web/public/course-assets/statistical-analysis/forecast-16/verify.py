"""Independent date alignment, linear algebra and recursive forecast checks."""
from pathlib import Path
import json,hashlib,zipfile
import numpy as np
import pandas as pd
from analysis import load_data,forecast,calendar_names

ROOT=Path(__file__).resolve().parent
def verify():
    df=load_data();r=json.loads((ROOT/'outputs/results.json').read_text(encoding='utf-8'))
    expected={'day.csv':'a6bcf826782d3c0fbfdcbeead17cd0884185a0dafe8ff10cd48a874ee7ba18be',
              'hour.csv':'e03de4ee4ef4dc376ac6e04bf829673c6269e8eba5c60fa121640fa2f829504f',
              'Readme.txt':'b92c8628622948bf0828c43a1b315d1517c3d7fd63654730d0dea379b8e88175'}
    with zipfile.ZipFile(ROOT/'data/source.zip') as z:
        for name,digest in expected.items():
            raw=(ROOT/'data/raw'/name).read_bytes()
            assert hashlib.sha256(raw).hexdigest()==digest and raw==z.read(name)
    origin=pd.Timestamp(r['origin']);train=df.loc[:origin];dates=pd.date_range(origin+pd.Timedelta(days=1),periods=7)
    future=df.loc[dates,['holiday']]
    # Construct the same named design independently with pandas categorical dummies.
    def design(index,holidays):
        week=pd.get_dummies(pd.Categorical(index.dayofweek,categories=range(7)),dtype=float).iloc[:,1:]
        month=pd.get_dummies(pd.Categorical(index.month,categories=range(1,13)),dtype=float).iloc[:,1:]
        return np.column_stack([np.ones(len(index)),(index-pd.Timestamp('2011-01-01')).days/100,
                                week.to_numpy(),month.to_numpy(),np.asarray(holidays)])
    aligned=train[['cnt','holiday']].assign(lag1=train.cnt.shift(1),lag7=train.cnt.shift(7))
    checks=[]
    for kind in ['calendar','ar1','arx']:
        frame=aligned if kind=='calendar' else aligned.dropna(subset=['lag1'] if kind=='ar1' else ['lag1','lag7'])
        X=np.column_stack([np.ones(len(frame)),frame.lag1]) if kind=='ar1' else design(frame.index,frame.holiday)
        if kind=='arx':X=np.column_stack([X,frame[['lag1','lag7']]])
        # QR solve is separate from the project's least-squares call.
        q,rr=np.linalg.qr(X,mode='reduced');b=np.linalg.solve(rr,q.T@frame.cnt.to_numpy())
        assert len(frame)==r['parameters'][kind]['n']
        assert np.allclose(b,r['parameters'][kind]['beta'],rtol=1e-9,atol=1e-7)
        hist=train.cnt.to_dict();reference=[]
        for d in dates:
            l1=hist[d-pd.Timedelta(days=1)];l7=hist[d-pd.Timedelta(days=7)]
            row=np.array([1.,l1]) if kind=='ar1' else design(pd.DatetimeIndex([d]),[future.loc[d,'holiday']])[0]
            if kind=='arx':row=np.r_[row,l1,l7]
            pred=float(row@b);hist[d]=pred;reference.append(pred)
        assert np.allclose(reference,[v['prediction'] for v in r['main'][kind]],atol=1e-7)
        checks.append(kind+' independent QR and recursion')
    assert train.cnt.tail(7).sum()==37299
    assert np.allclose([v['prediction'] for v in r['main']['mean7']],37299/7)
    assert [v['prediction'] for v in r['main']['same_weekday']]==df.loc[dates-pd.Timedelta(days=7),'cnt'].tolist()
    for section,n in [('validation',70),('test',56)]:
        pred=pd.read_csv(ROOT/f'outputs/{section}-predictions.csv')
        assert not pred.duplicated(['model','origin','date']).any()
        assert (pd.to_datetime(pred.date)-pd.to_datetime(pred.origin)).dt.days.equals(pred.h)
        for m in r[section+'_metrics']:
            g=pred[pred.model==m['model']];e=g.actual-g.prediction
            assert len(g)==n and np.isclose(m['mae'],e.abs().mean()) and np.isclose(m['rmse'],np.sqrt((e**2).mean()))
        checks.append(section+' dates and independently aggregated errors')
    selected=min(r['validation_metrics'],key=lambda m:m['mae'])['model'];assert selected==r['selected']=='mean7'
    # Future outcomes changed wholesale: an origin's training and forecasts remain identical.
    poisoned=df.copy();poisoned.loc[poisoned.index>origin,'cnt']=-999999
    for kind in r['names']:
        out=forecast(poisoned.loc[:origin],future,kind)
        assert np.allclose([v['prediction'] for v in out],[v['prediction'] for v in r['main'][kind]])
    # Holiday-only perturbation has the algebraic recursive impulse delta*phi1**k.
    delta=r['parameters']['arx']['beta'][-3];phi1=r['parameters']['arx']['beta'][-2]
    for i,row in enumerate(r['holiday_scenario']):assert np.isclose(row['difference'],0 if i<3 else delta*phi1**(i-3),atol=1e-8)
    assert np.isclose(sum(v['contribution'] for v in r['calendar_components']),r['main']['calendar'][3]['prediction'])
    for row in r['trace']:assert np.isclose(row['calendar_part']+row['lag1_part']+row['lag7_part'],row['prediction'])
    checks.extend(['original ZIP bytes and SHA-256','lag dates and simple hand calculations','future outcome perturbation','holiday impulse algebra','all additive contributions'])
    report={'passed':True,'checks':checks,'main_train_rows':len(train),'main_model_rows':{k:r['parameters'][k]['n'] for k in ['calendar','ar1','arx']},'selected':selected}
    (ROOT/'outputs/verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':verify()
