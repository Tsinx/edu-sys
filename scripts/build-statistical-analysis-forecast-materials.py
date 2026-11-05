"""Build the portable Lecture 16 student package from the reviewed local project."""
from pathlib import Path
import sys
import json,hashlib,zipfile
import nbformat as nbf

REPO=Path(__file__).resolve().parents[1]
ROOT=REPO/'apps/teacher-web/public/course-assets/statistical-analysis/forecast-16'
def write(name,text):
    (ROOT/name).write_text(text.strip()+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

write('README.md', '''
# 第16讲：经营预测——日历变量与简单自回归

把时间放在2012年11月18日晚，预测11月19—25日每天完成的租借次数。原始数据已经完整放入包内，运行时无需下载。

## 先运行

1. 解压整个学生包，保持目录结构；用VS Code、JupyterLab或其他Notebook环境打开`classroom.ipynb`。
2. 安装依赖：`python -m pip install -r requirements.txt`。
3. 选择相应Python环境，从第1节依次运行。每节先读说明，再看日期输入和中间表。
4. 独立脚本：`python analysis.py`；核查已有结果：`python verify.py`。输出保存在`outputs/`。

完整分析使用单线程线性代数，只拟合小型最小二乘模型，逐轮串行计算。Notebook含已执行结果，可以先看表再运行。日期与日历取自原始文件，未来实际次数在预测完成后才用于误差计算。

## 文件

| 文件 | 内容 |
|---|---|
| `data/source.zip` | UCI官方原始压缩包，保留原始字节 |
| `data/raw/day.csv` | 731天、16列完整原始日记录 |
| `data/raw/hour.csv` | 原始小时记录，供延伸使用 |
| `data/raw/Readme.txt` | 原作者字段说明 |
| `classroom.ipynb` | 七节逐步跟做，含表图和运行结果 |
| `analysis.py` | 六种方案、七步递归、滚动评价 |
| `verify.py` | 独立公式、日期、递归、误差与原始哈希核查 |
| `outputs/results.json` | 课件使用的精确计算值 |
| `outputs/*predictions.csv` | 起点、目标日、h、预测、实际、误差 |
| `outputs/recursive-trace.csv` | 日历、lag1、lag7贡献与逐步合计 |
| `forecast-brief-template.md` | 学生预测简报模板 |
| `DATA-DICTIONARY.md` | 本讲字段、单位、星期编码 |
| `SOURCES.md`、`LICENSE-DATA.md` | 数据与方法出处、数据许可 |

## 页面与Notebook

第1节对应课件5—15页；第2节对应16—29页；第3节对应30—49页；第4节对应50—60页；第5节对应61—70页；第6节对应71—86页；第7节对应87—90页。

## 本次项目设置

- 主起点：2012-11-18；训练688天；未来七天H仅11月22日为1。
- 日历：常数、每100天趋势、6个星期列（周一参照）、11个月份列（1月参照）、H，共20列。
- AR(1)：常数与lag1，687行；日历加lag1/lag7：22列、681行。
- 验证起点：2012-08-26至10-28，逐周10轮、70次预测；选择指标MAE。
- 测试起点：2012-11-04至12-23，逐周8轮、56次预测；按既定规则更新训练输入。
- 验证选择为最近7天均值。原始结果保留所有方案，便于比较。

## 下一步自己修改

可以提出一项新的节日日历输入，例如节前、节后、连休位置，并先写清定义、提前可得的来源和评价起点，再重新做时间顺序一致的评价。中国项目使用所在地公布的假日与调休工作日表，分别保留星期、假日、工作日定义。
''')
write('requirements.txt','numpy>=1.26\npandas>=2.2\nmatplotlib>=3.8\nthreadpoolctl>=3.5')
write('DATA-DICTIONARY.md','''
# 本讲字段与输入

| 字段 | 定义与单位 |
|---|---|
| dteday | 自然日期；读取后排序为日期索引 |
| cnt | 当日租借次数，次/天；casual＋registered |
| casual、registered | 两类使用方式的租借次数；各自单位为次 |
| holiday | 原作者采用的DCHR日历标记，1为节假日，0为其余日期 |
| weekday | 原始编码0周日、1周一……6周六；Python日期dayofweek为0周一……6周日 |
| workingday | 原始综合工作日标记：周一至周五且holiday=0时为1 |
| τ / trend100 | (日期−2011-01-01)的天数/100；一个单位为100天 |
| weekday_1…6 | 日期dayofweek等于1…6的指示列，即周二至周日；周一参照 |
| month_2…12 | 2月至12月指示列；1月参照 |
| lag1 | 当前目标日期向前1个自然日的次数 |
| lag7 | 当前目标日期向前7个自然日的次数 |
| origin、h | 作出预测时的起点、向后提前的天数 |
| prediction、actual、error | 当时预测、后来实际、实际减预测，单位次 |

连续七天在同一起点生成：lag1第一步取观测，随后取前一步预测；本次七步的lag7均能从起点以前查到。future_calendar只传入日期索引与holiday列。天气与未来实际次数各自保存在原始文件；本次预测输入采用日历与起点以前的业务量。

日历模型使用星期与holiday，因此保留workingday用于核对。原作者对温度等其他字段的归一化定义见原始Readme；本次未将这些字段作为预测输入。
''')
write('SOURCES.md','''
# 数据与方法出处

- Fanaee-T, H. (2013). Bike Sharing. UCI Machine Learning Repository. DOI: [10.24432/C5W894](https://doi.org/10.24432/C5W894)。[数据页面](https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset)；[官方ZIP](https://archive.ics.uci.edu/static/public/275/bike+sharing+dataset.zip)。访问2026-11-04。
- 作者原始Readme.txt：Capital Bikeshare 2011—2012日/小时汇总，holiday来自DCHR；字段定义原文保留在包内。
- DCHR, *Schedules, Holidays (2012/2013)*，[原始日历PDF](https://dchr.dc.gov/sites/default/files/dc/sites/dchr/publication/attachments/DCHR_edpm_12_261_schedules_holidays_2012_2013.pdf)。核对11月22日感恩节及11月12日纪念日安排。课堂节假日编码沿用原数据。
- Hyndman & Athanasopoulos, *Forecasting: Principles and Practice*, 3rd ed.：第5章[Forecasting toolbox](https://otexts.com/fpp3/toolbox.html)，简单基准、MAE/RMSE与5.10滚动起点评价；第7章[Time series regression models](https://otexts.com/fpp3/regression.html)，7.4指示变量与日历；第9章[ARIMA models](https://otexts.com/fpp3/arima.html)，9.3自回归模型。

本项目使用numpy最小二乘求解：日历模型688×20，AR(1)687×2，日历加lag1/lag7模型681×22。所有参数只取相应起点以前训练行；验证按MAE选择；测试规格固定后滚动更新输入。演示H切换时保持起点和已估系数一致，ARX后续差由递归继续传播。
''')
write('LICENSE-DATA.md','''
# 数据许可与署名

UCI页面将Bike Sharing数据集按Creative Commons Attribution 4.0 International（CC BY 4.0）提供。

作者：Hadi Fanaee-T；UCI记录年份2013；DOI 10.24432/C5W894。

许可原文：https://creativecommons.org/licenses/by/4.0/

原始ZIP、day.csv、hour.csv、Readme.txt保持原始字节。课堂的日期索引、滞后列、模型、预测与图表由这些原始文件重新计算；原始数据与派生输出分别保存。重新使用数据时请保留作者、数据来源与许可说明。
''')
write('forecast-brief-template.md','''
# 下一周运营预测简报

预测起点：____；目标日期：____至____；预测量：____，单位：____。

## 七行预测

| 日期 | 星期 | 节假日H | 方案 | 预测 | 当时输入/来源 |
|---|---|---:|---|---:|---|
| | | | | | |

## 回测与选择

验证起点：____；统一提前距离：____；选择指标与结果：____。

测试起点：____；预测次数：____；MAE：____；RMSE：____。

附上日历输入表、滞后对齐表与逐步预测表，说明一个自己核对过的具体日期。

## 运营准备

准备动作：____；对应日期：____；节日单列记录：____。

补入实际值与下一次更新日期：____。
''')

cells=[]
def md(s):cells.append(nbf.v4.new_markdown_cell(s.strip()))
def code(s):cells.append(nbf.v4.new_code_cell(s.strip()))
md('''# 经营预测：从历史记录到下一周安排
真实UCI日租借数据，七节跟做。起点2012-11-18，预测随后七天。

先手算一行，再看程序；先运行一个起点，再运行多轮。完整原始数据已在`data/raw`，直接打开即可。
''')
md('''## 1｜读入数据，认清日期与单位（课件5—15页）
cnt是每天完成的租借次数，等于casual与registered之和。先保留一行对应一天的结构；日期排序后核对自然日连续。
''')
code('''from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from IPython.display import display
from analysis import calendar_names, calendar_row, forecast, fit_model, rolling, metrics, MODEL_NAMES
ROOT = Path.cwd()
assert (ROOT / 'data/raw/day.csv').is_file(), '请从学生包解压目录打开Notebook'
df = pd.read_csv('data/raw/day.csv', parse_dates=['dteday'])
print('原始形状:', df.shape)
df = df.sort_values('dteday').set_index('dteday')
display(df[['cnt','casual','registered','holiday','weekday']].head())''')
code('''dates = pd.date_range(df.index.min(), df.index.max(), freq='D', name='dteday')
assert df.index.is_unique and df.index.equals(dates)
assert df.cnt.notna().all()
assert (df.cnt == df.casual + df.registered).all()
assert (df.weekday == (df.index.dayofweek + 1) % 7).all()
origin = pd.Timestamp('2012-11-18')
train = df.loc[:origin].copy()
future_dates = pd.date_range(origin + pd.Timedelta(days=1), periods=7)
future_calendar = df.loc[future_dates, ['holiday']].copy()
print('当前训练天数:', len(train))
display(future_calendar.assign(weekday=future_dates.day_name(), month=future_dates.month))''')
code('''fig, ax = plt.subplots(figsize=(10,3.5))
train.cnt.plot(ax=ax, color='#197f7a', linewidth=0.8)
ax.set(xlabel='Date', ylabel='Rentals / day', title='History available at 2012-11-18')
plt.tight_layout(); plt.show()''')
md('''## 2｜三个简单基准（课件16—29页）
最后一天：每个目标日沿用起点最后一次观测。上周同一天：目标日期向前7天取实际。最近7天均值：七个数相加除以7，再填入本次七行。

本次目标是随后7天，所以这些上周对应日都已经发生。先算11月19日对应的11月12日，再展开七行。
''')
code('''same_weekday = [train.loc[d-pd.Timedelta(days=7), 'cnt'] for d in future_dates]
mean7 = train.cnt.tail(7).mean()
baselines = pd.DataFrame({'last_value':train.cnt.iloc[-1],
                         'same_weekday':same_weekday, 'mean7':mean7}, index=future_dates)
print('最近7天合计:', train.cnt.tail(7).sum(), '平均:', mean7)
display(baselines.round(1))''')
md('''## 3｜日历回归（课件30—49页）
先定义每列：常数、距2011-01-01的天数/100、周二至周日6列、2月至12月11列、H。周一和1月为参照，共20列。

holiday=1按原作者DCHR日历；周末由星期另行记录。11月22日同时是周四、11月、H=1。逐项输入乘自己的系数后相加。
''')
code('''# 展开输入生成函数，便于逐列修改。
def classroom_calendar_row(date, holiday):
    date = pd.Timestamp(date)
    return ([1., (date-pd.Timestamp('2011-01-01')).days/100]
            + [float(date.dayofweek == j) for j in range(1,7)]
            + [float(date.month == j) for j in range(2,13)]
            + [float(holiday)])
X = np.array([classroom_calendar_row(d,r.holiday) for d,r in train.iterrows()])
y = train.cnt.to_numpy()
beta_calendar = np.linalg.lstsq(X,y,rcond=None)[0]
print('X形状:',X.shape)
display(pd.DataFrame({'term':calendar_names(),'coefficient':beta_calendar}).round(6))''')
code('''d = pd.Timestamp('2012-11-22')
row = np.array(classroom_calendar_row(d, 1))
contributions = pd.DataFrame({'term':calendar_names(), 'input':row,
                             'coefficient':beta_calendar, 'contribution':row*beta_calendar})
display(contributions.loc[row != 0].round(3))
print('合计预测:', row @ beta_calendar)
no_holiday = np.array(classroom_calendar_row(d, 0))
print('H从0到1的模型输入差:', row @ beta_calendar - no_holiday @ beta_calendar)''')
code('''residual = pd.Series(y-X@beta_calendar, index=train.index)
fig, ax = plt.subplots(figsize=(10,3))
residual.tail(60).plot(ax=ax,color='#197f7a')
ax.axhline(0,color='gray',linewidth=0.8)
ax.set(xlabel='Date',ylabel='Residual / rentals',title='Calendar model: recent training residuals')
plt.tight_layout(); plt.show()''')
md('''## 4｜lag1与AR(1)（课件50—60页）
滞后1天把昨天的次数放到今天这一行。AR(1)的相加式是`c + phi × lag1`。688天历史形成687对。

连续7天在同一个起点计算：第一天lag1用11月18日实际；第二天开始接前一步预测。递归指后一步使用前一步的计算结果。
''')
code('''ar_frame = train.assign(lag1=train.cnt.shift(1)).dropna()
display(ar_frame[['cnt','lag1']].tail(7))
X_ar = np.column_stack([np.ones(len(ar_frame)), ar_frame.lag1])
beta_ar = np.linalg.lstsq(X_ar,ar_frame.cnt,rcond=None)[0]
c, phi = beta_ar
print('687行，两项系数:', beta_ar)
previous = float(train.cnt.iloc[-1])
ar_steps = []
for h,d in enumerate(future_dates,1):
    pred = c+phi*previous
    ar_steps.append({'date':d,'h':h,'lag1':previous,
                     'source':'observed' if h==1 else 'previous forecast','prediction':pred})
    previous = pred
ar_steps = pd.DataFrame(ar_steps)
display(ar_steps.round(3))
print('固定水平 c/(1-phi):', c/(1-phi))''')
md('''## 5｜日历＋lag1＋lag7（课件61—70页）
lag7向前查7天，保留最近同星期的业务量。组合模型先计算日历部分，再加`phi1 × lag1 + phi7 × lag7`。对齐后保留681行、22列。
''')
code('''frame = train.assign(lag1=train.cnt.shift(1),lag7=train.cnt.shift(7)).dropna()
X_arx = np.array([classroom_calendar_row(d,r.holiday)+[r.lag1,r.lag7]
                  for d,r in frame.iterrows()])
beta_arx = np.linalg.lstsq(X_arx,frame.cnt,rcond=None)[0]
print('X形状:',X_arx.shape)
display(frame[['cnt','lag1','lag7']].tail(7))
display(pd.DataFrame({'term':calendar_names()+['lag1','lag7'],
                      'coefficient':beta_arx}).tail(3).round(6))''')
code('''# 只在预测结束后再接未来实际值；循环内future_calendar只有H与日期。
history = train.cnt.to_dict()
trace = []
for d,r in future_calendar.iterrows():
    lag1 = history[d-pd.Timedelta(days=1)]
    lag7 = history[d-pd.Timedelta(days=7)]
    calendar_part = np.array(classroom_calendar_row(d,r.holiday)) @ beta_arx[:-2]
    part1, part7 = beta_arx[-2]*lag1, beta_arx[-1]*lag7
    pred = calendar_part+part1+part7
    trace.append({'date':d,'lag1':lag1,'lag7':lag7,'calendar':calendar_part,
                   'lag1_part':part1,'lag7_part':part7,'prediction':pred})
    history[d] = pred
trace = pd.DataFrame(trace)
display(trace.round(3))
assert np.allclose(trace.prediction, [r['prediction'] for r in forecast(train,future_calendar,'arx')])''')
code('''alternate = future_calendar.copy()
alternate.loc['2012-11-22','holiday'] = 0
with_h = pd.DataFrame(forecast(train,future_calendar,'arx')).set_index('date').prediction
without_h = pd.DataFrame(forecast(train,alternate,'arx')).set_index('date').prediction
display(pd.DataFrame({'H_original':with_h,'H22_zero':without_h,
                      'difference':with_h-without_h}).round(3))''')
md('''## 6｜误差、验证与测试（课件71—86页）
误差=实际−当时预测。绝对误差保留距离。MAE把绝对误差平均；RMSE把误差平方、平均、开方。先用上周同一天方案手算一周。
''')
code('''actual = df.loc[future_dates,'cnt'].to_numpy()
e = actual-np.array(same_weekday)
error_table = pd.DataFrame({'prediction':same_weekday,'actual':actual,
                           'error':e,'absolute_error':np.abs(e)},index=future_dates)
display(error_table)
print('MAE:',np.mean(np.abs(e)), 'RMSE:',np.sqrt(np.mean(e**2)))
small = np.array([200,-200])
print('两天小例子: 平均方向',small.mean(),'MAE',np.abs(small).mean(),
      'RMSE',np.sqrt(np.mean(small**2)))''')
md('''每轮从历史里模拟一次预测：将起点逐周向后移动，每轮完整预测随后7天。验证10轮用于按MAE选择当前方案，再固定规则，报告后面8轮测试。

`analysis.py`中的rolling先生成预测，然后接目标日期实际值；forecast的未来参数只接收日期与holiday。可以打开脚本逐行查看。
''')
code('''validation_origins = pd.date_range('2012-08-26','2012-10-28',freq='7D')
test_origins = pd.date_range('2012-11-04','2012-12-23',freq='7D')
validation = rolling(df,validation_origins)
validation_metrics = pd.DataFrame(metrics(validation))
display(validation_metrics[['name','n','mae','rmse']].round(3))
selected = validation_metrics.sort_values('mae').iloc[0].model
print('验证按MAE选定:',MODEL_NAMES[selected])
test = rolling(df,test_origins)
display(pd.DataFrame(metrics(test))[['name','n','mae','rmse']].round(3))''')
code('''chosen = test.loc[test.model==selected]
display(chosen.groupby('h').absolute_error.agg(['count','mean']).round(3))
main = chosen.loc[chosen.origin==origin.strftime('%Y-%m-%d')]
display(main[['date','prediction','actual','error']].round(3))
fig, ax = plt.subplots(figsize=(9,3.5))
ax.plot(pd.to_datetime(main.date),main.prediction,label='Selected forecast',color='#197f7a')
ax.plot(pd.to_datetime(main.date),main.actual,label='Actual',color='#b87921')
ax.set(xlabel='Date',ylabel='Rentals / day',title='2012-11-19 to 25');ax.legend()
plt.tight_layout();plt.show()''')
md('''## 7｜自己的项目简报（课件87—90页）
保留七行预测、输入来源、验证选择和测试误差，写一项运营准备动作与下一次更新时间。可使用`forecast-brief-template.md`。

给编程助手的分步任务：
1. 读取day.csv，打印日期检查和cnt定义对应列。
2. 生成未来七天日历，逐项解释H、星期参照、月份参照。
3. 输出基准、日历逐项贡献、lag1/lag7与七步递归表。
4. 先运行一个起点核对，再滚动验证，按MAE选方案，最后测试。
5. 导出预测表、误差表和一段运营准备说明。

先把这一版完整跑通，再提出一个新输入，例如节前或节后。写清取值定义与提前可用的来源。
''')
code('''out = ROOT/'outputs'; out.mkdir(exist_ok=True)
validation.to_csv(out/'validation-predictions.csv',index=False)
test.to_csv(out/'test-predictions.csv',index=False)
trace.to_csv(out/'notebook-recursive-trace.csv',index=False)
print('已导出预测表与递归表；请填写自己的预测简报。')''')
md('数据：Fanaee-T (2013), UCI Bike Sharing, DOI 10.24432/C5W894，CC BY 4.0。完整方法及原始日历链接见SOURCES.md。')
nb=nbf.v4.new_notebook(cells=cells,metadata={'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'},'language_info':{'name':'python','version':'3.11'}})
nbf.validate(nb)
if '--package-only' not in sys.argv:
    nbf.write(nb,ROOT/'classroom.ipynb')
    data=json.loads((ROOT/'outputs/results.json').read_text(encoding='utf-8'))
    (REPO/'packages/course-content/src/statistical-analysis/forecast-data.ts').write_text('export const FORECAST_DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+' as const;\n',encoding='utf-8')

def package():
    files=sorted(p for p in ROOT.rglob('*') if p.is_file() and p.suffix not in ['.pyc'] and '__pycache__' not in p.parts and p.name not in ['forecast-student.zip','package-manifest.json'])
    manifest={'files':[{'path':str(p.relative_to(ROOT)).replace('\\','/'),'bytes':p.stat().st_size,'sha256':sha(p)} for p in files]}
    write('package-manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
    with zipfile.ZipFile(ROOT/'forecast-student.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in [*files,ROOT/'package-manifest.json']:z.write(p,p.relative_to(ROOT))
    print(json.dumps({'files':len(files)+1,'notebook_cells':len(cells),'zip_bytes':(ROOT/'forecast-student.zip').stat().st_size}))
if __name__=='__main__':package()
