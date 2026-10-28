import { createContext, useCallback, useContext, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import {readEnterpriseDrafts,writeEnterpriseDrafts} from './enterprise-drafts';
export const DraftsContext = createContext<{ values: Record<string, string>; set: (key: string, value: string) => void;selectScope:(scope:string)=>void;scope?:string;error?:string }>({ values: {}, set: () => {},selectScope:()=>{},scope:'initial' });
export const EnterpriseFeedbackContext = createContext<{control?:string;result?:{ok:boolean;message:string};submit:(id:string)=>void}>({submit:()=>{}});
export function EnterpriseDrafts({ children }: PropsWithChildren) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [scope,setScope]=useState('initial'),[error,setError]=useState('');
  const currentValues=useRef(values),currentScope=useRef(scope);
  const selectScope=useCallback((next:string)=>{
    if(currentScope.current===next)return;
    const prefix=next+'::';
    if(!Object.keys(currentValues.current).some(key=>key.startsWith(prefix))){
      try{currentValues.current={...currentValues.current,...Object.fromEntries(Object.entries(readEnterpriseDrafts(window.localStorage,next)).map(([key,value])=>[prefix+key,value]))};setError('');}
      catch{setError('本机草稿无法读取，请重新核对未提交字段；已提交业务仍以经营记录为准。');}
    }
    currentScope.current=next;setScope(next);setValues(currentValues.current);
  },[]);
  const set=useCallback((key:string,value:string)=>{
    const prefix=currentScope.current+'::',next={...currentValues.current,[prefix+key]:value};
    currentValues.current=next;setValues(next);
    if(currentScope.current==='initial')return;
    try{writeEnterpriseDrafts(window.localStorage,currentScope.current,Object.fromEntries(Object.entries(next).filter(([key])=>key.startsWith(prefix)).map(([key,value])=>[key.slice(prefix.length),value])));setError('');}
    catch{setError('本机草稿保存失败，请先复制未提交内容。已提交业务仍以经营记录为准。');}
  },[]);
  const prefix=scope+'::',scoped=Object.fromEntries(Object.entries(values).filter(([key])=>key.startsWith(prefix)).map(([key,value])=>[key.slice(prefix.length),value]));
  return <DraftsContext.Provider value={{values:scoped,set,selectScope,scope,error}}>{children}</DraftsContext.Provider>;
}
export function useEnterpriseDraft(key: string, initial: string): [string, (value: string) => void] {
  const context = useContext(DraftsContext); return [context.values[key] ?? initial, v => context.set(key, v)];
}
export interface EnterpriseField {
  name: string; label: string; type?: 'text' | 'number' | 'select' | 'textarea' | 'checkbox'; value?: string | number;
  options?: Array<[string, string]>; min?: number; max?: number; step?: number;
  disabledOptions?: Record<string,string>;
  minLength?:number;
}
export function CommandForm({ id, title, fields, onSubmit, disabled, submit = '确认安排', help,draftGroup }: { id: string; title: string; fields: EnterpriseField[]; onSubmit: (values: Record<string, string>) => void; disabled?: boolean; submit?: string; help?: string;draftGroup?:string }) {
  const context = useContext(DraftsContext);
  const feedback = useContext(EnterpriseFeedbackContext);
  const [validation, setValidation] = useState('');
  const grouping=fields.find(f=>f.name===draftGroup);
  const groupValue=draftGroup?context.values[id+'.'+draftGroup]??String(grouping?.value??grouping?.options?.[0]?.[0]??''):'';
  const draftKey=(f:EnterpriseField)=>id+(draftGroup&&f.name!==draftGroup?'.'+groupValue:'')+'.'+f.name;
  const value = (f: EnterpriseField) => {
    const v = context.values[draftKey(f)] ?? String(f.value ?? (f.type === 'select' ? f.options?.[0]?.[0] ?? '' : ''));
    return f.type === 'select' && !f.options?.some(o => o[0] === v) ? f.options?.[0]?.[0] ?? '' : v;
  };
  return <form className="enterprise-form" aria-label={title} data-enterprise-control={id} onInvalidCapture={e=>{const input=e.target as HTMLInputElement;setValidation('请检查“'+(input.getAttribute('aria-label')??'输入值')+'”：'+input.validationMessage);}} onChangeCapture={()=>setValidation('')} onSubmit={e => { e.preventDefault(); setValidation(''); feedback.submit(id); onSubmit(Object.fromEntries(fields.map(f => [f.name, value(f)]))); }}>
    <h3>{title}</h3>{help && <p className="enterprise-muted">{help}</p>}
    <div className="enterprise-form__fields">{fields.map(f => <label key={f.name} className={f.type === 'textarea' ? 'enterprise-field enterprise-field--wide' : 'enterprise-field'}><span>{f.label}</span>
      {f.type === 'select' ? <select data-enterprise-field={f.name} aria-label={f.label} value={value(f)} onChange={e => context.set(draftKey(f), e.target.value)} disabled={disabled}>{f.options?.map(([v, label]) => <option key={v} value={v} disabled={!!f.disabledOptions?.[v]}>{label}{f.disabledOptions?.[v]?' · '+f.disabledOptions[v]:''}</option>)}</select>
        : f.type === 'textarea' ? <textarea data-enterprise-field={f.name} aria-label={f.label} rows={4} value={value(f)} maxLength={5000} minLength={f.minLength} required={!!f.minLength} onChange={e => context.set(draftKey(f), e.target.value)} disabled={disabled}/>
        : f.type === 'checkbox' ? <input data-enterprise-field={f.name} type="checkbox" aria-label={f.label} checked={value(f) === 'true'} onChange={e => context.set(draftKey(f), String(e.target.checked))} disabled={disabled}/>
        : <input data-enterprise-field={f.name} aria-label={f.label} type={f.type ?? 'text'} value={value(f)} min={f.min} max={f.max} step={f.step} onChange={e => context.set(draftKey(f), e.target.value)} disabled={disabled}/>}
    </label>)}</div>
    <button className="enterprise-button enterprise-button--primary" type="submit" disabled={disabled || fields.some(f => f.type === 'select' && !f.options?.length)}>{submit}</button>
    {feedback.control===id&&feedback.result&&<p role={feedback.result.ok?'status':'alert'} className={feedback.result.ok?'enterprise-success':'enterprise-error'}>{feedback.result.message}</p>}
    {validation&&<p className="enterprise-error" role="alert">{validation}</p>}
  </form>;
}
export function EnterpriseTable({ headings, rows, empty = '当前没有相关业务。' }: { headings: string[]; rows: ReactNode[][]; empty?: string }) {
  return <div className="enterprise-table"><table><thead><tr>{headings.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>) : <tr><td colSpan={headings.length}>{empty}</td></tr>}</tbody></table></div>;
}
export function Metric({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) { return <div className="enterprise-metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>; }
export const fmt = (n: number, decimals = 0) => n.toLocaleString('zh-CN', { maximumFractionDigits: decimals });
export const wan = (n: number) => fmt(n / 10000, 1) + '万元';
export const pct = (n: number) => fmt(n * 100, 1) + '%';
export function SparkChart({ series, label, color = '#168c86' }: { series: number[]; label: string; color?: string }) {
  const width = 640, height = 170, low = Math.min(0, ...series), high = Math.max(1, ...series), range = high - low;
  const points = series.map((v, i) => (20 + i / Math.max(1, series.length - 1) * 600) + ',' + (145 - (v - low) / range * 125)).join(' ');
  return <figure className="enterprise-chart"><figcaption>{label}</figcaption><svg viewBox={'0 0 ' + width + ' ' + height} role="img" aria-label={label}><path d="M20 20V145H620" fill="none" stroke="#d3dfdd"/>{series.length ? <><polyline points={points} fill="none" stroke={color} strokeWidth="3"/>{series.map((v, i) => <circle key={i} cx={20 + i / Math.max(1, series.length - 1) * 600} cy={145 - (v - low) / range * 125} r="3" fill={color}/>)}</> : <text x="30" y="90" fill="#60756e" fontSize="15">完成生产后显示月度记录</text>}<text x="22" y="16" fontSize="11" fill="#60756e">{fmt(high)}</text><text x="22" y="163" fontSize="11" fill="#60756e">{fmt(low)}</text></svg></figure>;
}
