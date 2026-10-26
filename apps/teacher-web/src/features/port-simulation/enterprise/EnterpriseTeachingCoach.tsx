import { useContext, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, LocateFixed, GraduationCap, Download } from 'lucide-react';
import { hourLabel } from '@edu/port-simulation-core';
import { DraftsContext } from './EnterpriseForms';
import { downloadEnterprise } from './enterprise-storage';
import { ENTERPRISE_TEACHING_VERSION, enterpriseIncidentLesson, enterpriseTeachingSteps, type TeachingStep } from './enterprise-teaching';
import type { useEnterprise } from './useEnterprise';

type Runtime = ReturnType<typeof useEnterprise>;
export function EnterpriseTeachingCoach({ runtime, tab, navigate, pause, advance }: {
  runtime: Runtime; tab: string; navigate: (tab: string) => void; pause: () => void; advance: (hours: number) => Promise<void>;
}) {
  const v = runtime.view!, profile = runtime.currentSave?.teaching;
  const eligible = v.config.mode === 'practice' && !runtime.currentSave?.attemptId;
  const compatible = profile?.schema === ENTERPRISE_TEACHING_VERSION;
  const active = eligible && compatible && profile.active;
  const steps = compatible ? enterpriseTeachingSteps(v, runtime.currentSave?.record, profile) : [];
  const step = steps.find(s => s.id === profile?.selected) ?? steps.find(s => !s.complete) ?? steps[0];
  const incident = active ? enterpriseIncidentLesson(v) : undefined;
  const drafts = useContext(DraftsContext);
  const [target, setTarget] = useState(''), [location, setLocation] = useState('');
  const [locateSequence, setLocateSequence] = useState(0);
  const disabled = runtime.busy || runtime.replaying || v.sealed;
  const completed = steps.filter(s => s.complete).length;
  const weakest = v.hour >= 168 ? v.goods.filter(g=>g.due>0&&g.fulfillment!==null).sort((a,b)=>a.fulfillment!-b.fulfillment!)[0] : undefined;
  const fullYards = v.terminals.filter(t=>t.stock/t.storageCapacity>=.8);
  useEffect(()=>{
    if(active&&profile&&step&&!steps.some(s=>s.id===profile.selected))runtime.updateTeaching(p=>({...p,selected:step.id}));
  },[active,profile,step,steps,runtime.updateTeaching]);
  useEffect(() => {
    if (!active || runtime.busy || runtime.replaying || !profile) return;
    const fresh = steps.filter(s => s.complete && !profile.receipts[s.id]);
    if (fresh.length) runtime.updateTeaching(previous => ({ ...previous, receipts: { ...previous.receipts, ...Object.fromEntries(fresh.map(s => [s.id, { hour: v.hour, position: v.journal.length, evidence: s.evidence }])) } }));
  }, [active, profile, steps, runtime.busy, runtime.replaying, runtime.updateTeaching, v.hour, v.journal.length]);
  useEffect(() => {
    if (!target || !active) return;
    const element = document.querySelector<HTMLElement>('[data-enterprise-control="' + CSS.escape(target) + '"]');
    if (!element) { setLocation('当前对象已不在本页；请核对本步条件，或返回教学路线选择尚未完成的步骤。'); return; }
    element.dataset.teachingHighlight = 'true';
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
    const control = element.matches('button,input,select,textarea') ? element : element.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)');
    control?.focus({ preventScroll: true });
    setLocation('已定位并高亮真实操作。请核对数值后亲自提交。');
    return () => { delete element.dataset.teachingHighlight; };
  }, [target, tab, active, step?.id, locateSequence]);
  const locate = (s: Pick<TeachingStep, 'tab' | 'target' | 'drafts'>) => {
    pause(); for (const [key, value] of Object.entries({ 'assets-filter': 'all', ...s.drafts })) drafts.set(key, value);
    navigate(s.tab); setTarget(s.target); setLocation(''); setLocateSequence(n => n + 1);
  };
  const choose = (s: TeachingStep) => { pause(); setTarget(''); setLocation(''); runtime.updateTeaching(p => ({ ...p, selected: s.id })); navigate(s.tab); };
  const runTo = async (hour: number) => { pause(); await advance(Math.min(24 * 93, Math.max(1, hour - v.hour), v.horizon - v.hour)); };
  const toggle = () => { pause(); runtime.updateTeaching(p => ({ ...p, active: !p.active })); };
  const start = () => { pause(); void runtime.createTeaching().then(() => { navigate('learning'); setTarget(''); }).catch(e => runtime.setError(e.message)); };
  const report = () => downloadEnterprise('东湾港-教学过程报告.json', {
    schema: 'port-enterprise-learning-report/1', teachingVersion: ENTERPRISE_TEACHING_VERSION, rules: v.rules, config: v.config,
    hour: v.hour, sealed: v.sealed, completed, total: steps.length, savedAt: runtime.savedAt,
    steps: steps.map(s => ({ id: s.id, title: s.title, complete: s.complete, evidence: profile?.receipts[s.id] ?? { hour: v.hour, position: v.journal.length, evidence: s.evidence } })),
    boundary: '学习过程记录；不替代完整经营存档、平台提交回执或正式评分。知识回答及文字质量不计为服务器核验成绩。',
  });
  if (!active || !step) return tab === 'learning' ? <section className="enterprise-learning-intro" aria-label="详细教学模式入口">
    <GraduationCap size={32}/><span className="enterprise-eyebrow">个人自学 · 实际操作 · 三年经营</span><h2>从接管一艘船，到独立经营整座港口</h2>
    <p>八个学习章节覆盖单证与靠泊、联合调度、班组与培训、设备购租与配套、客户与资金、风险恢复、绩效解释和年度滚动经营。每一步都有操作、参考答案、原因、定位和真实完成证据。</p>
    <p>教学路线使用3年“接管东湾港”练习。首次操作集中于前150日；之后按季度检查，完成三年经营。参考方案用于观察约束与取舍，结果并非最优策略保证。</p>
    {!eligible && <p className="enterprise-notice">当前是正式任务或考核场次。带参考答案的引导只在单独个人练习中开启。</p>}
    {profile && !compatible && <p className="enterprise-notice">此存档的教学进度版本尚不兼容，原数据保留。经营规则未改变，可以另开当前版教学练习。</p>}
    <div className="enterprise-inline-actions">{eligible && compatible && <button className="enterprise-button enterprise-button--primary" onClick={toggle} disabled={runtime.busy}>恢复教学引导 · {completed}/{steps.length}</button>}<button className="enterprise-button enterprise-button--primary" onClick={start} disabled={runtime.busy}>另开三年教学练习，保留当前记录</button></div>
    <p className="enterprise-muted">单人任务，在当前电脑计算和自动保存。可随时切换自由经营；学习进度与经营指令分别保存。旧存档与原实验版本保持兼容。</p>
    <div className="enterprise-learning-chapters">{['接管与单证：底账、引用、独立回执、泊位计划', '生产与人员：运输接续、班组、培训、检修', '投资与配置：购置、租赁、接口、工期、岸电', '客户与资金：报价、合同、借款、还本、库存', '投运与应急：到货、待投运、核查、隔离、修复、恢复', '绩效与解释：财务口径、可比条件、四类决策说明', '年度滚动经营：季度观察、老化、客户、债务与责任', '结业与保存：期末核对、封存、导出与只读回放'].map((text, i) => <article key={text}><b>{String(i + 1).padStart(2, '0')}</b><p>{text}</p></article>)}</div>
  </section> : null;
  const index = steps.indexOf(step), next = steps[index + 1];
  const answer = step.quiz?.options.find(o => o.id === profile.answers[step.id]);
  return <>
    <section className="enterprise-coach" aria-label="详细教学引导" data-teaching-step={step.id} data-teaching-complete={step.complete}>
      <div className="enterprise-coach-heading"><div><span className="enterprise-eyebrow">{step.chapter} · 第{index + 1}/{steps.length}步</span><h2>{step.title}</h2></div><span className="enterprise-coach-progress"><CheckCircle2 size={16}/>{completed}/{steps.length} 已验证</span></div>
      <div className="enterprise-coach-body"><div><h3>现在怎么做</h3><p>{step.now}</p><details open><summary>参考操作与答案</summary><p>{step.answer}</p></details></div><div><h3>为什么这样做</h3><p>{step.why}</p><h3>看到什么才算完成</h3><p>{step.verify}</p></div></div>
      {step.quiz && <fieldset className="enterprise-coach-quiz"><legend>{step.quiz.question}</legend>{step.quiz.options.map(option => <label key={option.id}><input type="radio" name={'teaching-' + step.id} checked={profile.answers[step.id] === option.id} disabled={runtime.replaying || runtime.busy} onChange={() => runtime.updateTeaching(p => ({ ...p, answers: { ...p.answers, [step.id]: option.id } }))}/><span>{option.text}</span></label>)}{answer && <p role="status" className={answer.id === step.quiz.correct ? 'enterprise-success' : 'enterprise-error'}>{answer.feedback}</p>}</fieldset>}
      <div className={'enterprise-coach-evidence ' + (step.complete ? 'is-complete' : '')} role="status"><strong>{step.complete ? '已验证本步' : '待实际操作验证'}</strong>{step.evidence.map((e, i) => <span key={i}>{e}</span>)}{step.complete && profile.receipts[step.id] && <small>证据保存于{hourLabel(profile.receipts[step.id]!.hour)} · 指令节点{profile.receipts[step.id]!.position}</small>}</div>
      {profile.receipts[step.id]?.evidence.length ? <details className="enterprise-coach-receipt"><summary>初次验证时的证据</summary><ul>{profile.receipts[step.id]!.evidence.map((e,i)=><li key={i}>{e}</li>)}</ul></details> : null}
      <div className="enterprise-coach-actions"><button onClick={() => locate(step)} disabled={runtime.busy}><LocateFixed size={16}/>定位并高亮操作</button>{step.planHour !== undefined && !step.complete && <button className="enterprise-button--primary" disabled={disabled || !!incident || v.hour >= v.horizon} onClick={() => void runTo(step.planHour!)}>推进至{hourLabel(step.planHour)}<small>每次最多93日 · 遇新事件停止</small></button>}{next && <button disabled={!step.complete || runtime.busy || runtime.replaying} onClick={() => choose(next)}>已验证，继续下一步<ChevronRight size={16}/></button>}<button onClick={() => { setTarget(''); navigate('learning'); }}><BookOpen size={16}/>完整教学路线</button><button onClick={toggle} disabled={runtime.busy || runtime.replaying}>切换自由经营</button></div>
      {location && <p className="enterprise-muted" role="status">{location}</p>}
      {runtime.replaying && <p className="enterprise-notice">只读回放期间暂停教学验证；返回当前经营现场后继续，原学习进度保留。</p>}
    </section>
    {incident && <section className="enterprise-incident-coach" aria-label="应急插入任务" data-incident-action={incident.action}><span className="enterprise-eyebrow">新事件优先处理 · {incident.incident.id}</span><h3>{incident.incident.title}：{incident.title}</h3><p>{incident.instruction}</p><div className="enterprise-inline-actions"><button onClick={() => locate(incident)} disabled={runtime.busy}>定位本次应急操作</button>{incident.action === 'wait' && <button disabled={disabled || v.hour >= v.horizon} onClick={() => void runTo(incident.planHour!)}>仅推进至技术完成时点</button>}</div><small>恢复后回到原学习步骤。技术修复完成前，“确认恢复”保持禁用；失败指令不产生完成凭据。</small></section>}
    {weakest && <section className="enterprise-live-coach" aria-label="实时经营诊断"><span className="enterprise-eyebrow">按现场结果反馈 · 学习完成与经营绩效分别判断</span><h3>先解释{weakest.name}的到期履约：{(weakest.fulfillment!*100).toFixed(1)}%</h3><p>已到承诺期{weakest.due.toLocaleString('zh-CN')}{weakest.unit}，其中按时交付{weakest.onTime.toLocaleString('zh-CN')}{weakest.unit}。累计已交付{weakest.delivered.toLocaleString('zh-CN')}{weakest.unit}使用不同统计范围；逾期、未完成与货损仍留在到期履约分母。</p><p>{fullYards.length?'当前库场占用超过80%：'+fullYards.map(t=>t.name+' '+(t.stock/t.storageCapacity*100).toFixed(0)+'%').join('；')+'。':'当前没有库场占用超过80%，仍需核查船上、港外和接续等待。'}先看该货种的回执、泊位、班组、库存位置与路径，再判断约束，不能仅凭总分或设备额定能力解释。</p>{weakest.kind==='container'&&<p>本路线把有铁路接口的T2新货批默认交给铁路。已有接口不等于窗口内的运能足够；请核对班列窗口、实际库存与设备/人员。若更换路径，原库存与监管状态继续保留，库场货物还会产生移位。</p>}<p>{v.hour>=v.horizon?'本场已到期末。保留未完成责任，可复制为个人练习，在相同种子、规则和观察时点比较另一个策略。':'可先保存观察结果，再调整后续接续、排班或投资。比较效果应使用同种子、同规则、同观察时点的另一个练习。'}</p><div className="enterprise-inline-actions"><button onClick={()=>{pause();navigate('analysis');}}>查看分货种证据</button><button onClick={()=>{pause();navigate('cargo');}}>核对库场与路径</button><button onClick={()=>{pause();navigate('logistics');}}>检查接续窗口</button></div></section>}
    {tab === 'learning' && <section className="enterprise-learning-route" aria-label="完整教学路线"><div className="enterprise-section-head"><div><h2>我的完整教学路线</h2><p>已验证{completed} / {steps.length}。可查看任意步骤；业务任务必须有成功指令或实际结果，知识题必须选对。</p></div><button onClick={report} disabled={runtime.busy}><Download size={16}/>导出学习报告</button></div>{[...new Set(steps.map(s => s.chapter))].map(chapter => <section key={chapter}><h3>{chapter}</h3><ol>{steps.filter(s => s.chapter === chapter).map(s => <li key={s.id}><button className={s.id === step.id ? 'is-current' : ''} onClick={() => choose(s)} aria-current={s.id === step.id ? 'step' : undefined}><span className={s.complete ? 'is-done' : ''}>{s.complete ? '✓' : String(steps.indexOf(s) + 1).padStart(2, '0')}</span><strong>{s.title}</strong><small>{s.complete ? '已有完成证据' : '查看与操作'}</small><ChevronRight size={16}/></button></li>)}</ol></section>)}<p className="enterprise-muted">学习报告用于复盘。恢复经营使用“导出存档”生成的完整经营记录；本机进度、导出文件与平台正式回执分别确认。</p></section>}
  </>;
}
