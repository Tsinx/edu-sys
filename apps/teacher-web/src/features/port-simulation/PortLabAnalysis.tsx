import { useEffect, useMemo, useRef, useState } from 'react';
import { PORT_RESOURCE_STATES, portStatisticsResources, type PortClassLab, type PortResource, type PortResourceState } from '@edu/port-simulation-core';
import { ANALYSIS_CHARTS, ANALYSIS_KINDS, ANALYSIS_METRICS, allowedAnalysisCharts, decodePortAnalysis, defaultPortAnalysis, newPortAnalysisChart, type PortAnalysisChart, type PortAnalysisDashboard, type PortAnalysisMetric } from './port-analysis-config';
import { portAnalysisCsv, portAnalysisData, portAnalysisRange, portAnalysisValue, type PortAnalysisData } from './port-analysis-data';
import { newLocalPortId } from './local-port-id';
import type { LabCoachEvent } from './port-lab-coach';

const number = (n: number, digits = 1) => n.toLocaleString('zh-CN', { maximumFractionDigits: digits });
const minute = (second: number) => number(second / 60, 2);
const colors = ['#246d77', '#b96e40', '#658c4f', '#8b6e9e', '#3c80af', '#c39435', '#8a5a63', '#697caa', '#4b998a', '#ae8470', '#7b913b', '#908d97'];
const states = Object.keys(PORT_RESOURCE_STATES) as PortResourceState[];
const saveCsv = (content: string, id: string) => { const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a'); a.href = url; a.download = `port-chart-${id}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };

function StatePlot({ run, config, data, baseline, onInspect }: { run: PortClassLab; config: PortAnalysisChart; data: PortAnalysisData; baseline: PortAnalysisData | null; onInspect: (message: string, resource: string, deliberate?:boolean) => void }) {
  const stats = run.simulation!.resourceStatistics!;
  const timeline = config.chart === 'timeline', rowHeight = timeline ? 35 : baseline ? 60 : 42;
  const rows = timeline ? data.rows.map(row => ({ key: row.resource.id, label: row.resource.label })) : data.series;
  const left = 112, width = 610, right = 740, height = 40 + rows.length * rowHeight;
  return <div className="pla-plot-scroll" data-tutorial-target="lab:plot"><svg className="pla-state-plot" viewBox={`0 0 760 ${height}`} role="img" aria-label={`${config.title} · ${ANALYSIS_CHARTS[config.chart]}`}>
    {Array.from({ length: 5 }, (_, i) => <g key={i}><line x1={left + i * width / 4} y1="20" x2={left + i * width / 4} y2={height - 18} stroke="#dce3d8"/><text x={left + i * width / 4} y="13" textAnchor="middle">{timeline ? minute(data.range.from + (data.range.to - data.range.from) * i / 4) : `${i * 25}%`}</text></g>)}
    {rows.map((row, index) => <g key={row.key}>
      <text x="4" y={40 + index * rowHeight}>{row.label}</text>
      {timeline ? stats.resources.find(r => r.resource.id === row.key)!.intervals.filter(i => i.to > data.range.from && i.from < data.range.to).map((item, i) => {
        const from = Math.max(item.from, data.range.from), to = Math.min(item.to, data.range.to), x = left + (from - data.range.from) / (data.range.to - data.range.from) * width;
        const message = `${row.label} · 第${minute(from)}—${minute(to)}分钟 · ${PORT_RESOURCE_STATES[item.state].label} · ${number((to - from) / 60, 2)}分钟${item.job !== undefined ? ` · 任务${item.job}` : ''}${item.box ? ` · ${item.box}` : ''}。${item.reason}`;
        return <rect key={`${item.from}-${i}`} x={x} y={26 + index * rowHeight} width={Math.max(.4, (to - from) / (data.range.to - data.range.from) * width)} height="21" fill={PORT_RESOURCE_STATES[item.state].color} tabIndex={0} role="button" aria-label={message} onFocus={() => onInspect(message, row.key)} onMouseEnter={() => onInspect(message, row.key,false)} onClick={() => onInspect(message, row.key)} onKeyDown={e => { if (e.key === 'Enter') onInspect(message, row.key); }}><title>{message}</title></rect>;
      }) : [data, ...(baseline ? [baseline] : [])].map((source, sourceIndex) => {
        const series = source.series.find(s => s.key === row.key); if (!series) return null;
        let x = left;
        return <g key={sourceIndex} opacity={sourceIndex ? .58 : 1}>{states.map(state => { const length = series.seconds ? series.states[state] / series.seconds * width : 0, start = x; x += length; if (!length) return null;
          const message = `${row.label}${sourceIndex ? '（基准）' : '（当前）'} · ${PORT_RESOURCE_STATES[state].label}：${number(series.states[state] / 60, 2)}设备分钟，占${number(length / width * 100)}%`;
          return <rect key={state} x={start} y={26 + index * rowHeight + sourceIndex * 23} width={length} height="18" fill={PORT_RESOURCE_STATES[state].color} tabIndex={0} role="button" aria-label={message} onFocus={() => onInspect(message, series.rows[0]!.resource.id)} onMouseEnter={() => onInspect(message, series.rows[0]!.resource.id,false)} onClick={() => onInspect(message, series.rows[0]!.resource.id)} onKeyDown={e => { if (e.key === 'Enter') onInspect(message, series.rows[0]!.resource.id); }}><title>{message}</title></rect>;
        })}<text x={right} y={39 + index * rowHeight + sourceIndex * 23} textAnchor="end">{sourceIndex ? '基准' : '当前'}</text></g>;
      })}
    </g>)}
  </svg></div>;
}

function ValuePlot({ config, data, baseline, onInspect, onLegend }: { config: PortAnalysisChart; data: PortAnalysisData; baseline: PortAnalysisData | null; onInspect: (message: string, resource: string, deliberate?:boolean) => void; onLegend?:()=>void }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const sources = [data, ...(baseline ? [baseline] : [])], histogram = config.metric === 'cycle';
  const cycleStep = Math.max(1, config.binMinutes) * 60;
  const maxCycle = Math.max(cycleStep, ...sources.flatMap(d => d.series.flatMap(s => s.cycles)));
  const histogramCount = Math.ceil(maxCycle / cycleStep);
  const count = histogram ? histogramCount : data.bins.length;
  const values = (source: PortAnalysisData, key: string, i: number) => histogram ? source.series.find(s => s.key === key)?.cycles.filter(n => Math.min(histogramCount - 1, Math.floor(n / cycleStep)) === i).length ?? 0 :
    source.bins[i]?.series.find(s => s.key === key) ? portAnalysisValue(source.bins[i]!.series.find(s => s.key === key)!, config, source.bins[i]!.to - source.bins[i]!.from) : 0;
  const visible = data.series.filter(s => !hidden.includes(s.key)), percent = ['occupancy', 'inventory'].includes(config.metric);
  const peak = Math.max(0, ...sources.flatMap(d => visible.flatMap(s => Array.from({ length: count }, (_, i) => values(d, s.key, i)))));
  let max = config.metric === 'occupancy' ? Math.max(100, peak) : Math.max(1, Math.ceil(peak / 4)) * 4, axisDigits = 1;
  if (config.metric === 'inventory') {
    const target = Math.max(.1, peak) / 4, unit = 10 ** Math.floor(Math.log10(target));
    const step = [1, 2, 2.5, 5, 10].find(n => n * unit >= target)!;
    max = Number((step * unit * 4).toPrecision(12));
    axisDigits = Math.min(4, Math.max(0, -Math.floor(Math.log10(unit)) + (step === 2.5 ? 1 : 0)));
  }
  const left = 44, top = 24, width = 670, height = 180, groupWidth = width / Math.max(1, count), isBar = config.chart !== 'line';
  return <>
    <div className="pla-plot-scroll" data-tutorial-target="lab:plot"><svg viewBox="0 0 750 250" className="pla-value-plot" role="img" data-metric={config.metric} data-y-max={max} aria-label={`${config.title} · ${ANALYSIS_CHARTS[config.chart]}`}>
      {[0, .25, .5, .75, 1].map(n => <g key={n}><line x1={left} x2={left + width} y1={top + height * (1 - n)} y2={top + height * (1 - n)} stroke="#dce3d8"/><text x="38" y={top + height * (1 - n) + 4} textAnchor="end">{number(max * n, axisDigits)}{percent ? '%' : ''}</text></g>)}
      <text x="44" y="12">{percent ? config.metric === 'inventory' ? '时间加权平均容量占用' : '任务占用（含等待）' : histogram ? '完成任务数' : '完成交接／箱次'}</text>
      {sources.map((source, sourceIndex) => visible.map((series, seriesIndex) => {
        const color = colors[data.series.findIndex(s => s.key === series.key) % colors.length]!;
        const points = Array.from({ length: count }, (_, i) => ({ x: left + groupWidth * (i + .5), y: top + height * (1 - values(source, series.key, i) / max), value: values(source, series.key, i), i }));
        return <g key={`${sourceIndex}-${series.key}`} opacity={sourceIndex ? .55 : 1}>
          {!isBar && <polyline fill="none" stroke={color} strokeWidth="2" strokeDasharray={sourceIndex ? '5 4' : undefined} points={points.map(p => `${p.x},${p.y}`).join(' ')}/>}
          {points.map(p => {
            const bin = source.bins[p.i], seriesAt = bin?.series.find(s => s.key === series.key);
            const message = `${series.label}${sourceIndex ? '（基准）' : '（当前）'} · ${histogram ? `任务周期${p.i * config.binMinutes}—${(p.i + 1) * config.binMinutes}分钟` : `第${minute(bin?.from ?? 0)}—${minute(bin?.to ?? 0)}分钟`}：${number(p.value, 2)}${percent ? '%' : histogram ? '次任务' : '次交接'}${config.metric === 'inventory' && seriesAt && bin ? `，平均${number(seriesAt.inventorySeconds / (bin.to - bin.from), 2)}箱／容量${seriesAt.capacity}箱` : ''}`;
            const rectWidth = Math.max(.5, groupWidth * .85 / Math.max(1, visible.length * sources.length)), x = left + p.i * groupWidth + groupWidth * .075 + (seriesIndex * sources.length + sourceIndex) * rectWidth;
            const events = { tabIndex: 0, role: 'button', 'aria-label': message, 'data-value': p.value, 'data-series': series.key, 'data-source': sourceIndex ? 'baseline' : 'current', 'data-bin': p.i, onFocus: () => onInspect(message, series.rows[0]!.resource.id), onMouseEnter: () => onInspect(message, series.rows[0]!.resource.id,false), onClick: () => onInspect(message, series.rows[0]!.resource.id), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') onInspect(message, series.rows[0]!.resource.id); } };
            return isBar ? <rect key={p.i} x={x} y={p.y} width={rectWidth} height={Math.max(0, top + height - p.y)} fill={color} stroke={sourceIndex ? color : undefined} strokeDasharray={sourceIndex ? '2 2' : undefined} {...events}><title>{message}</title></rect> : <circle key={p.i} cx={p.x} cy={p.y} r="4" fill={sourceIndex ? '#f6f8f0' : color} stroke={color} {...events}><title>{message}</title></circle>;
          })}
        </g>;
      }))}
      {Array.from({ length: count }, (_, i) => i).filter(i => i % Math.max(1, Math.ceil(count / 7)) === 0 || i === count - 1).map(i => <text key={i} x={left + groupWidth * (i + .5)} y="224" textAnchor="middle">{histogram ? `${i * config.binMinutes}–${(i + 1) * config.binMinutes}` : `${minute(data.bins[i]!.from)}–${minute(data.bins[i]!.to)}`}</text>)}
      <text x="714" y="244" textAnchor="end">{histogram ? '完整任务周期／分钟' : '模拟分钟'}</text>
    </svg></div>
    <div className="pla-series-legend" aria-label="图例筛选" data-tutorial-target="lab:legend">{data.series.map((series, i) => <button key={series.key} aria-pressed={!hidden.includes(series.key)} onClick={() => {setHidden(p => p.includes(series.key) ? p.filter(k => k !== series.key) : [...p, series.key]);onLegend?.();}}><i style={{ background: colors[i % colors.length] }}/>{series.label}</button>)}</div>
    {config.metric === 'inventory' && <p className="pla-hint">纵轴随数据缩放，始终从0%起算；当前与基准共用同一刻度。</p>}
    {baseline && <p className="pla-hint">当前：实线／实心；基准：虚线／浅色。点击设备图例可同时隐藏或显示两组数据。</p>}
  </>;
}

function AnalysisCard({ run, baseline, config, onEdit, onChange, onRemove, onCopy, onMove, first, last, onFocus, onGuideEvent }: { run: PortClassLab; baseline: PortClassLab | null; config: PortAnalysisChart; onEdit: () => void; onChange: (config: PortAnalysisChart) => void; onRemove: () => void; onCopy: () => void; onMove: (delta: number) => void; first: boolean; last: boolean; onFocus: (id: string) => void; onGuideEvent?:(event:LabCoachEvent)=>void }) {
  const [inspection, setInspection] = useState<{ message: string; resource: string } | null>(null);
  const previousSecond = useRef(run.simulation!.second);
  useEffect(() => { if (run.simulation!.second < previousSecond.current) setInspection(null); previousSecond.current = run.simulation!.second; }, [run.simulation!.second]);
  useEffect(() => setInspection(null), [config]);
  const stats = run.simulation!.resourceStatistics!, range = portAnalysisRange(run, config);
  const data = useMemo(() => portAnalysisData(stats, config, range), [stats, config, range.from, range.to]);
  const base = useMemo(() => baseline?.simulation?.resourceStatistics && config.baseline ? portAnalysisData(baseline.simulation.resourceStatistics, config, range) : null, [baseline, config, range.from, range.to]);
  const inspect = (message: string, resource: string,deliberate=true) => {setInspection({ message, resource });if(deliberate)onGuideEvent?.({kind:'inspect'});};
  const resources = data.rows.map(r => r.resource);
  return <article className={`pla-card pla-${config.width}`} data-chart-id={config.id} aria-label={config.title}>
    <header><div><span>{ANALYSIS_METRICS[config.metric]}</span><h3>{config.title || '未命名图表'}</h3></div><button data-tutorial-target="lab:chart-settings" onClick={onEdit} aria-label={`设置图表 ${config.title}`}>设置</button></header>
    <p className="pla-range" data-range-from={range.from} data-range-to={range.to}>第{minute(range.from)}—{minute(range.to)}分钟 · {resources.length}个对象 · {config.binMinutes}分钟分段{base && config.chart !== 'timeline' ? ' · 基准与当前使用相同区间（基准浅色／虚线）' : ''}</p>
    {range.to <= range.from ? <div className="pla-empty">此区间尚无已推进的模拟时间。推进后自动显示；中途添加图表仍可查看此前记录。</div> : config.metric === 'state' ? <StatePlot run={run} config={config} data={data} baseline={base} onInspect={inspect}/> : <ValuePlot config={config} data={data} baseline={base} onInspect={inspect} onLegend={()=>onGuideEvent?.({kind:'legend'})}/>}
    {config.metric === 'state' && <div className="pla-state-legend">{states.filter(s => data.rows.some(r => r.states[s] > 0) || config.chart !== 'timeline' && base?.rows.some(r => r.states[s] > 0)).map(s => <span key={s}><i style={{ background: PORT_RESOURCE_STATES[s].color }}/>{PORT_RESOURCE_STATES[s].label}</span>)}</div>}
    <details className="pla-numbers" onToggle={e=>{if(e.currentTarget.open)onGuideEvent?.({kind:'details'});}}><summary data-tutorial-target="lab:numbers">查看数值与统计口径</summary><p>{config.metric === 'occupancy' ? '任务占用率＝任务、载箱等待或协同移机占用的设备秒÷观察设备秒；包含等待，不等于效率。按类型汇总时，分母为所选设备数×实际区间秒数。' : config.metric === 'inventory' ? '每段库存按实际堆存箱数进行时间加权，再除以容量。车载箱与交接位箱不计入堆存。' : config.metric === 'output' ? '只计已实际完成的交接；同一箱会经过多个环节，各环节次数不能相加作为最终交付量。' : config.metric === 'cycle' ? '按结束时点选取完整完成任务，周期包含该任务的接车、作业与等待；开始时点可能早于所选区间。空车返回不计为完成箱任务。' : '各状态按事件起止时间累计，全部状态之和等于观察时长。分组数值为设备分钟。'}</p><p>按模拟时间统计，暂停播放不累计；最后不足一段按实际观察时间计算。时间轴保留单台设备；图例可临时隐藏系列，保存的对象选择以“设置”为准。</p>
      <div className="pla-table-scroll">{config.metric === 'inventory' ?
        <table><thead><tr><th>对象</th><th>观察分钟</th><th>平均库存／箱</th><th>容量／箱</th><th>平均容量占用率</th></tr></thead><tbody>{data.series.map(s => {
          const seconds = range.to - range.from, average = seconds ? s.inventorySeconds / seconds : 0;
          return <tr key={s.key}><th>{s.label}</th><td>{number(seconds / 60, 2)}</td><td>{number(average, 2)}</td><td>{s.capacity}</td><td>{seconds && s.capacity ? `${number(average / s.capacity * 100, 2)}%` : '—'}</td></tr>;
        })}</tbody></table> :
        <table><thead><tr><th>对象</th><th>观察／设备分钟</th><th>任务占用</th><th>完成交接／箱次</th><th>作业／重载分钟</th>{config.metric === 'cycle' && <th>平均任务周期／分钟</th>}</tr></thead><tbody>{data.series.map(s => <tr key={s.key}><th>{s.label}</th><td>{number(s.seconds / 60, 2)}</td><td>{s.seconds ? `${number(s.occupiedSeconds / s.seconds * 100)}%` : '—'}</td><td>{s.completed}</td><td>{number((s.states.service + s.states.loaded) / 60, 2)}</td>{config.metric === 'cycle' && <td>{s.cycles.length ? number(s.cycles.reduce((a,b)=>a+b,0)/s.cycles.length/60,2) : '—'}</td>}</tr>)}</tbody></table>}
      </div>
    </details>
    {inspection && <div className="pla-inspection" role="status"><strong>历史统计</strong> {inspection.message}<button onClick={() => { const r = resources.find(r => r.id === inspection.resource); if (r) onFocus(r.sceneId); }}>定位当前现场</button><small>只定位设备；现场时钟保持在第{minute(run.simulation!.second)}分钟。</small></div>}
    {config.baseline && !baseline && <p className="pla-hint">{run.lesson===12?'完成一个方案并从同一开局重开后，可选择历史方案叠加对照。':'保存基准后可按同一时间区间叠加对照。'}</p>}
    <footer><button data-tutorial-target="lab:chart-layout" onClick={() => {onChange({ ...config, width: config.width === 'half' ? 'full' : 'half' });onGuideEvent?.({kind:'layout'});}}>{config.width === 'half' ? '展开宽图' : '恢复半宽'}</button><button onClick={()=>{onCopy();onGuideEvent?.({kind:'layout'});}} aria-label={`复制图表 ${config.title}`}>复制</button><button onClick={() => {onMove(-1);onGuideEvent?.({kind:'layout'});}} disabled={first} aria-label={`上移图表 ${config.title}`}>上移</button><button onClick={() => {onMove(1);onGuideEvent?.({kind:'layout'});}} disabled={last} aria-label={`下移图表 ${config.title}`}>下移</button><button data-tutorial-target="lab:chart-export" onClick={() => {saveCsv(portAnalysisCsv(run, config), config.id);onGuideEvent?.({kind:'export'});}}>下载记录 CSV</button><button onClick={onRemove} aria-label={`移除图表 ${config.title}`}>移除图表</button></footer>
  </article>;
}

function ChartEditor({ draft, resources, run, onSave, onCancel }: { draft: PortAnalysisChart; resources: PortResource[]; run: PortClassLab; onSave: (value: PortAnalysisChart) => void; onCancel: () => void }) {
  const [value, setValue] = useState(draft), [error, setError] = useState('');
  const storage = value.metric === 'inventory', available = resources.filter(r => (r.kind === 'storage') === storage);
  const patch = (changes: Partial<PortAnalysisChart>) => setValue(p => ({ ...p, ...changes }));
  const metric = (metric: PortAnalysisMetric) => { const selected = value.resources.filter(id => (id.startsWith('storage-')) === (metric === 'inventory')); patch({ metric, chart: allowedAnalysisCharts(metric)[0]!, resources: selected.length ? selected : resources.filter(r => (r.kind === 'storage') === (metric === 'inventory')).slice(0, 1).map(r => r.id) }); };
  return <form className="pla-editor" data-tutorial-target="lab:chart-editor" aria-label="图表设置" onSubmit={e => { e.preventDefault(); try { const clean = decodePortAnalysis({ version: 1, charts: [value] }, run, run.lesson).charts[0]!; onSave(clean); } catch (e) { setError((e as Error).message); } }}>
    <div className="pla-editor-fields"><label>图表名称<input aria-label="图表名称" value={value.title} maxLength={80} onChange={e => patch({ title: e.target.value })}/></label><label>分析指标<select aria-label="分析指标" value={value.metric} onChange={e => metric(e.target.value as PortAnalysisMetric)}>{Object.entries(ANALYSIS_METRICS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>图表形式<select aria-label="图表形式" value={value.chart} onChange={e => patch({ chart: e.target.value as PortAnalysisChart['chart'] })}>{allowedAnalysisCharts(value.metric).map(id => <option key={id} value={id}>{ANALYSIS_CHARTS[id]}</option>)}</select></label><label>系列分组<select aria-label="系列分组" value={value.group} disabled={value.chart === 'timeline'} onChange={e => patch({ group: e.target.value as PortAnalysisChart['group'] })}><option value="individual">每台设备分别显示</option><option value="type">按设备类型汇总</option></select></label><label>观察范围<select aria-label="观察范围" value={value.window} onChange={e => patch({ window: e.target.value as PortAnalysisChart['window'] })}><option value="all">本次检查点至当前</option><option value="recent30">最近30模拟分钟</option><option value="custom">指定模拟时间区间</option></select></label><label>{value.metric === 'cycle' ? '周期分组宽度' : '统计分段'}<select aria-label="统计分段" value={value.binMinutes} onChange={e => patch({ binMinutes: Number(e.target.value) as PortAnalysisChart['binMinutes'] })}>{[1, 5, 10, 15].map(n => <option value={n} key={n}>{n}模拟分钟</option>)}</select></label>{value.window === 'custom' && <><label>起始模拟分钟<input aria-label="起始模拟分钟" type="number" min={run.checkpoint} max={run.endpoint} step="any" value={value.fromMinute} onChange={e => patch({ fromMinute: Number(e.target.value) })}/></label><label>结束模拟分钟<input aria-label="结束模拟分钟" type="number" min={run.checkpoint} max={run.endpoint} step="any" value={value.toMinute} onChange={e => patch({ toMinute: Number(e.target.value) })}/></label></>}</div>
    <fieldset><legend>选择一个或多个分析对象（{value.resources.length}）</legend><div className="pla-group-buttons">{Object.entries(ANALYSIS_KINDS).filter(([kind]) => available.some(r => r.kind === kind)).map(([kind, label]) => <button type="button" key={kind} onClick={() => patch({ resources: available.filter(r => r.kind === kind).map(r => r.id) })}>选择全部{label}</button>)}</div><div className="pla-resource-list">{available.map(r => <label key={r.id}><input type="checkbox" aria-label={`分析对象 ${r.label}`} checked={value.resources.includes(r.id)} onChange={e => patch({ resources: e.target.checked ? [...value.resources, r.id] : value.resources.filter(id => id !== r.id) })}/>{r.label}</label>)}</div></fieldset>
    {value.chart !== 'timeline' && <label className="pla-check"><input type="checkbox" checked={value.baseline} onChange={e => patch({ baseline: e.target.checked })}/>{run.lesson===12?'叠加已选对照方案':'叠加已保存基准'}（使用相同观察区间）</label>}
    {error && <p role="alert">{error}</p>}<div className="pla-editor-actions"><button className="pcl-primary" type="submit" data-tutorial-target="lab:chart-save">保存图表配置</button><button type="button" onClick={onCancel}>取消设置</button><span>只修改分析配置，设备与模拟时钟继续保持原状态。</span></div>
  </form>;
}

export function PortLabAnalysis({ run, baseline, dashboard, selected, onChange, onSelect, onFocus, onGuideEvent }: { run: PortClassLab; baseline: PortClassLab | null; dashboard: PortAnalysisDashboard; selected: string; onChange: (value: PortAnalysisDashboard) => void; onSelect: (id: string) => void; onFocus: (id: string) => void; onGuideEvent?:(event:LabCoachEvent)=>void }) {
  const resources = useMemo(() => portStatisticsResources(run.simulation!), [run.simulation?.plan, run.simulation?.facilities?.vehicles.length]);
  const selectedResource = resources.find(r => r.id === selected || r.sceneId === selected);
  const [choice, setChoice] = useState('crane-0'), [editing, setEditing] = useState<PortAnalysisChart | null>(null), [error, setError] = useState('');
  const top = useRef<HTMLElement>(null);
  const chosen = selectedResource?.id ?? choice;
  const update = (charts: PortAnalysisChart[]) => { try { onChange(decodePortAnalysis({ version: 1, charts }, run, run.lesson)); setError(''); } catch (e) { setError((e as Error).message); } };
  const edit = (chart: PortAnalysisChart) => { setEditing(chart);onGuideEvent?.({kind:'add-chart'}); top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
  const add = () => { if (dashboard.charts.length >= 12) { setError('最多保留12张图；可先移除一张图表，模拟记录会保留。'); return; } edit(newPortAnalysisChart(run, newLocalPortId(), [chosen])); };
  return <section className="pla" aria-label="设备自定义分析台" ref={top}>
    <div className="pla-heading"><div><span className="pcl-eyebrow">OPERATIONS ANALYSIS</span><h2>我的分析台</h2><p>设备状态、分时段占用与多设备对比 · 从第{run.checkpoint}分钟持续记录 · 配置随实验自动保存</p></div><div className="pla-heading-actions"><a href="/port-lab-guide.html#charts" target="_blank" rel="noopener">图表怎么用 ↗</a><button onClick={() => update(defaultPortAnalysis(run, run.lesson).charts)}>恢复本讲分析模板</button></div></div>
    <div className="pla-add"><label>当前分析设备<select data-tutorial-target="lab:resource" aria-label="当前分析设备" value={chosen} onChange={e => { setChoice(e.target.value); onSelect(e.target.value);onGuideEvent?.({kind:'resource'}); }}>{resources.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label><button className="pcl-primary" data-tutorial-target="lab:add-chart" onClick={add}>为所选设备添加图表</button><button data-tutorial-target="lab:locate" onClick={() => {onFocus(resources.find(r => r.id === chosen)!.sceneId);onGuideEvent?.({kind:'locate'});}}>定位所选设备</button><span>点击三维设备也可选中；在图表设置中勾选多台设备进行对比。</span></div>
    {error && <p role="alert">{error}</p>}
    {editing && <ChartEditor key={editing.id} draft={editing} resources={resources} run={run} onCancel={() => setEditing(null)} onSave={chart => { update(dashboard.charts.some(c => c.id === chart.id) ? dashboard.charts.map(c => c.id === chart.id ? chart : c) : [...dashboard.charts, chart]);setEditing(null);onGuideEvent?.({kind:'chart',chart}); }}/>}
    <div className="pla-grid">{dashboard.charts.map((config, i) => <AnalysisCard key={config.id} run={run} baseline={baseline} config={config} first={i === 0} last={i === dashboard.charts.length - 1} onEdit={() => edit(config)} onChange={next => update(dashboard.charts.map(c => c.id === next.id ? next : c))} onRemove={() => update(dashboard.charts.filter(c => c.id !== config.id))} onCopy={() => update([...dashboard.charts, { ...config, id: newLocalPortId(), title: `${config.title.slice(0, 75)} 副本` }])} onMove={delta => { const charts = [...dashboard.charts]; [charts[i], charts[i + delta]] = [charts[i + delta]!, charts[i]!]; update(charts); }} onFocus={onFocus} onGuideEvent={onGuideEvent}/>)}</div>
    {!dashboard.charts.length && <p className="pla-empty">选择设备并添加第一张图表。已有模拟记录仍然保留。</p>}
  </section>;
}
