"""Reproducible seven-day forecasting project. CPU work stays single-threaded."""
from pathlib import Path
import json,hashlib
import numpy as np
import pandas as pd
from threadpoolctl import threadpool_limits

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'outputs'
ORIGIN=pd.Timestamp('2012-11-18')
MODEL_NAMES={'last_value':'最后一天','same_weekday':'上周同一天','mean7':'最近7天均值','calendar':'日历回归','ar1':'AR(1)','arx':'日历＋滞后1、7天'}
WEEK=['周一','周二','周三','周四','周五','周六','周日']

def load_data():
    df=pd.read_csv(ROOT/'data/raw/day.csv',parse_dates=['dteday']).sort_values('dteday').set_index('dteday')
    assert df.index.is_unique and len(df)==731
    assert df.index.equals(pd.date_range('2011-01-01','2012-12-31',name='dteday'))
    assert df.isna().sum().sum()==0
    assert (df.cnt==df.casual+df.registered).all()
    assert (df.weekday==((df.index.dayofweek+1)%7)).all()
    assert (df.workingday==((df.index.dayofweek<5)&(df.holiday==0)).astype(int)).all()
    return df

def calendar_names():
    return ['constant','trend100']+[f'weekday_{j}' for j in range(1,7)]+[f'month_{j}' for j in range(2,13)]+['holiday']

def calendar_row(date,holiday):
    date=pd.Timestamp(date)
    return [1.,(date-pd.Timestamp('2011-01-01')).days/100]+[float(date.dayofweek==j) for j in range(1,7)]+[float(date.month==j) for j in range(2,13)]+[float(holiday)]

def fit_model(train,kind):
    if kind not in ['calendar','ar1','arx']:return None
    names=['constant','lag1'] if kind=='ar1' else calendar_names()+(['lag1','lag7'] if kind=='arx' else [])
    rows=[];targets=[];dates=[]
    for date,r in train.iterrows():
        if kind in ['ar1','arx'] and date-pd.Timedelta(days=1) not in train.index:continue
        if kind=='arx' and date-pd.Timedelta(days=7) not in train.index:continue
        x=[1.,float(train.loc[date-pd.Timedelta(days=1),'cnt'])] if kind=='ar1' else calendar_row(date,r.holiday)
        if kind=='arx':x += [float(train.loc[date-pd.Timedelta(days=k),'cnt']) for k in [1,7]]
        rows.append(x);targets.append(float(r.cnt));dates.append(date)
    X=np.array(rows);y=np.array(targets)
    with threadpool_limits(limits=1):beta=np.linalg.lstsq(X,y,rcond=None)[0]
    assert np.linalg.matrix_rank(X)==X.shape[1]
    return {'kind':kind,'names':names,'beta':beta,'n':len(y),'X':X,'y':y,'dates':dates,'fitted':X@beta}

def forecast(train,future_calendar,kind,fit=None):
    """future_calendar contains only dates and the pre-known holiday flag."""
    assert list(future_calendar.columns)==['holiday']
    fit=fit_model(train,kind) if fit is None else fit
    history={d:float(v) for d,v in train.cnt.items()};origin=train.index.max();rows=[]
    for date,r in future_calendar.iterrows():
        assert date>origin
        lag1=history[date-pd.Timedelta(days=1)]
        lag7=history[date-pd.Timedelta(days=7)]
        if kind=='last_value':value=float(train.cnt.iloc[-1])
        elif kind=='same_weekday':value=lag7
        elif kind=='mean7':value=float(train.cnt.tail(7).mean())
        else:
            x=[1.,lag1] if kind=='ar1' else calendar_row(date,r.holiday)
            if kind=='arx':x += [lag1,lag7]
            value=float(np.array(x)@fit['beta'])
        history[date]=value
        rows.append({'date':date.strftime('%Y-%m-%d'),'h':(date-origin).days,'prediction':value,
                     'lag1':lag1,'lag1_source':'观测' if date-pd.Timedelta(days=1)<=origin else '前一步预测',
                     'lag7':lag7,'holiday':int(r.holiday),'weekday':WEEK[date.dayofweek]})
    return rows

def rolling(df,origins):
    rows=[]
    for origin in origins:
        train=df.loc[:origin]
        dates=pd.date_range(origin+pd.Timedelta(days=1),periods=7)
        future=df.loc[dates,['holiday']]
        for kind in MODEL_NAMES:
            for r in forecast(train,future,kind):
                actual=float(df.loc[r['date'],'cnt'])
                rows.append({**r,'origin':origin.strftime('%Y-%m-%d'),'model':kind,'actual':actual,
                             'error':actual-r['prediction'],'absolute_error':abs(actual-r['prediction'])})
    return pd.DataFrame(rows)

def metrics(rows):
    return [{'model':k,'name':MODEL_NAMES[k],'n':len(g),'mae':float(g.absolute_error.mean()),
             'rmse':float(np.sqrt(np.mean(g.error**2))),'bias':float(g.error.mean())} for k,g in rows.groupby('model',sort=False)]

def records(frame):
    return json.loads(frame.to_json(orient='records',date_format='iso'))

def run():
    OUT.mkdir(exist_ok=True);df=load_data();train=df.loc[:ORIGIN]
    validation_origins=pd.date_range('2012-08-26','2012-10-28',freq='7D')
    test_origins=pd.date_range('2012-11-04','2012-12-23',freq='7D')
    validation=rolling(df,validation_origins);test=rolling(df,test_origins)
    vm=metrics(validation);tm=metrics(test)
    selected=min(vm,key=lambda x:x['mae'])['model']
    dates=pd.date_range(ORIGIN+pd.Timedelta(days=1),periods=7)
    main={k:forecast(train,df.loc[dates,['holiday']],k) for k in MODEL_NAMES}
    fits={k:fit_model(train,k) for k in ['calendar','ar1','arx']}
    parameters={k:{'names':f['names'],'beta':f['beta'].tolist(),'n':f['n']} for k,f in fits.items()}
    example_date=pd.Timestamp('2012-11-22')
    calendar=fits['calendar'];x=calendar_row(example_date,1)
    components=[{'term':name,'x':float(v),'coefficient':float(b),'contribution':float(v*b)} for name,v,b in zip(calendar['names'],x,calendar['beta']) if v!=0]
    arx=fits['arx'];trace=[]
    for r in main['arx']:
        d=pd.Timestamp(r['date']);xx=calendar_row(d,r['holiday'])
        base=float(np.array(xx)@arx['beta'][:-2]);c1=float(arx['beta'][-2]*r['lag1']);c7=float(arx['beta'][-1]*r['lag7'])
        assert abs(base+c1+c7-r['prediction'])<1e-8
        trace.append({**r,'calendar_part':base,'lag1_part':c1,'lag7_part':c7})
    short=train.tail(14).reset_index();short['date']=short.dteday.dt.strftime('%Y-%m-%d');short['weekday_name']=[WEEK[d.dayofweek] for d in short.dteday]
    lag_table=df[['cnt']].assign(lag1=df.cnt.shift(1),lag7=df.cnt.shift(7)).loc['2012-11-12':'2012-11-18'].reset_index();lag_table['date']=lag_table.dteday.dt.strftime('%Y-%m-%d')
    weekday=train.groupby(train.index.dayofweek).cnt.agg(['count','mean']).reset_index()
    holiday=train.groupby('holiday').cnt.agg(['count','mean']).reset_index()
    month=train.groupby(train.index.month).cnt.agg(['count','mean']).reset_index()
    residual=calendar['y']-calendar['fitted']
    result={'source':'UCI Bike Sharing','n':len(df),'date_start':'2011-01-01','date_end':'2012-12-31',
        'origin':ORIGIN.strftime('%Y-%m-%d'),'train_n':len(train),'holiday_train_n':int(train.holiday.sum()),
        'validation_origins':[d.strftime('%Y-%m-%d') for d in validation_origins],
        'test_origins':[d.strftime('%Y-%m-%d') for d in test_origins],
        'names':MODEL_NAMES,'selected':selected,'parameters':parameters,'validation_metrics':vm,'test_metrics':tm,
        'main':main,'main_actual':[int(df.loc[d,'cnt']) for d in dates],'trace':trace,'calendar_components':components,
        'series':[{'date':d.strftime('%Y-%m-%d'),'y':int(r.cnt),'holiday':int(r.holiday)} for d,r in df.iterrows()],
        'last14':records(short[['date','weekday_name','cnt','holiday']]),
        'lag_table':records(lag_table[['date','cnt','lag1','lag7']]),
        'weekday':[{'name':WEEK[int(r.iloc[0])],'n':int(r['count']),'mean':float(r['mean'])} for _,r in weekday.iterrows()],
        'holiday':records(holiday),'month':[{'month':int(r.iloc[0]),'n':int(r['count']),'mean':float(r['mean'])} for _,r in month.iterrows()],
        'calendar_residual_lag1_r':float(np.corrcoef(residual[:-1],residual[1:])[0,1]),
        'raw_lag1_r':float(np.corrcoef(train.cnt.to_numpy()[:-1],train.cnt.to_numpy()[1:])[0,1]),
        'horizon_metrics':records(test.loc[test.model==selected].groupby('h').absolute_error.mean().reset_index()),
        'main_error_rows':records(test[(test.origin==ORIGIN.strftime('%Y-%m-%d'))&(test.model==selected)]),
        'residual_series':[{'date':d.strftime('%Y-%m-%d'),'error':float(v)} for d,v in zip(calendar['dates'],residual)]}
    alternate=df.loc[dates,['holiday']].copy();alternate.loc['2012-11-22','holiday']=0
    alternate_forecast=forecast(train,alternate,'arx',arx)
    result['holiday_scenario']=[{'date':a['date'],'with_holiday':a['prediction'],'without_holiday':b['prediction'],'difference':a['prediction']-b['prediction']} for a,b in zip(main['arx'],alternate_forecast)]
    result['future_calendar']=[{'date':d.strftime('%Y-%m-%d'),'weekday':WEEK[d.dayofweek],'holiday':int(df.loc[d,'holiday']),'trend100':calendar_row(d,0)[1]} for d in dates]
    result['main_metrics']=metrics(test[test.origin==ORIGIN.strftime('%Y-%m-%d')])
    result['ar1_mean']=float(fits['ar1']['beta'][0]/(1-fits['ar1']['beta'][1]))
    result['holiday_all_n']=int(df.holiday.sum())
    validation.to_csv(OUT/'validation-predictions.csv',index=False);test.to_csv(OUT/'test-predictions.csv',index=False)
    pd.DataFrame(trace).to_csv(OUT/'recursive-trace.csv',index=False)
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'train_n':len(train),'holiday_n':int(train.holiday.sum()),'selected':selected,'validation':vm,'test':tm,'parameters':parameters,'main':trace,'actual':result['main_actual']},ensure_ascii=False,indent=2))
    return result

if __name__=='__main__':run()
