import { PORT_LAB_LEDGER, PORT_LAB_INDEPENDENT_RECORDS, PORT_LAB_SCENARIOS, portLabBackupCapacity, reviewPortLabLedger, comparablePortIncident, portLabFinished, portClassLabMetrics, type PortClassLab, type PortLabCommand } from '@edu/port-simulation-core';
import type {LabArchive} from './port-class-notebook';
import {incidentTarget,type IncidentCoachStep} from './port-incident-coach';

export const PORT_INCIDENT_TASKS = {
  system: [
    {title:'从异常取得证据',minutes:5,body:'固定告警，安排独立范围检查与日志追查。先观察现场，再确定隔离范围；记录哪些事实已经证实、哪些仍未知。'},
    {title:'选择连续性方案',minutes:8,body:'选择维修班组，启动技术工作；调取并核验备用台账，判断24箱双人复核交付是否值得启用。检查可并行进行的工作及实际成本。'},
    {title:'验证并运行另一方案',minutes:10,body:'完成对账、3箱实际试放行与恢复审查，观察到第240分钟。从同一开局重开方案，改变隔离、备用交付或维修人数中的一项，运行到相同终点。'},
    {title:'用实际记录评审',minutes:7,body:'选择已完成方案作为图表对照，统一时间窗与设备。比较闸口状态、车辆等待、交接量、成本和恢复时间，解释RTO、初始恢复点与积压的区别。'},
  ],
  equipment: [
    {title:'判断故障传播',minutes:5,body:'固定保护告警，检查独立设备与场桥1。观察当前交接安全收尾，查明哪个作业区和哪些车辆开始受到影响。'},
    {title:'组织维修与替代',minutes:8,body:'完成安全隔离，选择1或2人维修。判断是否改派场桥3；替代设备会沿道路实际转场，原作业区能力随之减少。保留受影响以外的业务。'},
    {title:'试吊并运行另一方案',minutes:10,body:'维修后完成安全检查，撤回替代场桥并等待其实际返回；由场桥1完成3次实际箱交接，再审查复工。观察到第240分钟，从同一开局重开另一方案。'},
    {title:'比较恢复与代价',minutes:7,body:'选择同场景的已完成方案作为对照。用场桥故障时长、转场与吊装、车辆等待、交付和成本解释替代是否有效，说明设备复工与积压消化为何有时间差。'},
  ],
} as const;

export function PortIncidentEvidence({run}:{run:PortClassLab}) {
  return <section className="pcl-evidence" aria-label="逐步取得的事件证据"><div className="pcl-section-heading"><h2>事件证据台</h2><span>仅显示当前已经取得的回报 · 时间为模拟分钟</span></div><ol>{run.emergency!.clues.map(c=><li key={c.id}><time>第{c.minute.toLocaleString('zh-CN',{maximumFractionDigits:2})}分钟</time><strong>{c.source}</strong><p>{c.text}</p></li>)}</ol></section>;
}

const n=(v:number|null)=>v===null?'—':v.toLocaleString('zh-CN',{maximumFractionDigits:2});
export function PortIncidentSummary({run}:{run:PortClassLab}) {
  const m=portClassLabMetrics(run),system=run.scenario==='system',target=system?60:90,e=run.emergency!,i=run.incident!;
  return <><div className="pcl-recovery-grid"><div><span>{system?'服务恢复':'设备复工'}耗时 / 目标{target}分钟</span><strong>{m.recoveryMinutes===null?'尚未恢复':`${n(m.recoveryMinutes)}分钟 · ${m.recoveryMinutes<=target?'达标':'超出目标'}`}</strong><p>以通过实际交接验证后的审查时点计时，技术工作完成不自动登记恢复。</p></div><div><span>{system?'初始恢复点 / RPO目标10分钟':'替代调度与原区影响'}</span><strong>{system?m.dataExposureMinutes===null?'尚未取得日志证据':'初始记录暴露窗口15分钟':e.reliefReturned?'替代场桥已返回':e.reliefReturning?'替代场桥返回中':e.reliefUsed?'替代场桥支援中':'未启用替代场桥'}</strong><p>{system?(m.dataExposureMinutes===null?'完成接口日志追查后，核对恢复点与目标。':'初始快照间隔超过目标；最终丢失量需独立重建证据，不能由15分钟直接推定。'):'结合场桥3的转场、吊装及Y3库存评价代价；转场与空载返回不算新增箱交接。'}</p></div><div><span>观察终点的经营影响</span><strong>{n(m.remaining)}箱未交付</strong><p>{portLabFinished(run)?'已到统一第240分钟，可比较同场景方案。':'当前仍在观察，需到第240分钟再比较最终经营结果。'}</p></div></div><div className="pcl-table"><table><caption>处置里程碑：均由实际模拟时钟登记</caption><thead><tr><th>隔离完成</th><th>技术工作完成</th><th>{system?'对账完成':'维修后检查完成'}</th><th>受控交接启动</th><th>{system?'服务恢复':'设备复工'}</th></tr></thead><tbody><tr>{[e.isolatedAt,e.technicalAt,e.checkedAt,e.trialAt,i.restoredAt].map((v,index)=><td key={index}>{v===null?'未完成':`第${n(v)}分钟`}</td>)}</tr></tbody></table></div></>;
}
export function PortIncidentHistory({current,archive}:{current:PortClassLab;archive:LabArchive[]}) {
  return <details className="pcl-log" open><summary>历史处置方案与实际结果（{archive.length}次）</summary><div className="pcl-table"><table><caption>只有同场景、同规则和同一观察终点的记录可比较最终结果；未完成的记录保留为过程证据。</caption><thead><tr><th>方案</th><th>场景</th><th>初始隔离</th><th>观察分钟</th><th>新增交付</th><th>等待箱分钟</th><th>成本</th><th>恢复耗时</th><th>对照条件</th></tr></thead><tbody>{[...archive.map(a=>a.run),current].map((run,index)=>{const m=portClassLabMetrics(run);return <tr key={index}><th>{index===archive.length?'当前':`历史 ${index+1}`}{index<archive.length?(archive[index]!.mode==='practical'?' · 实战':' · 教学'):''}</th><td>{run.scenario?PORT_LAB_SCENARIOS[run.scenario].title:'原版系统中断'}</td><td>{!run.incident?.isolated?'尚未隔离':run.incident.scope==='all'?'全部内部箱流':'受影响环节'}</td><td>{n(m.minute)}</td><td>{n(m.delivered)}</td><td>{n(m.waitingBoxMinutes)}</td><td>{n(m.cost)}</td><td>{n(m.recoveryMinutes)}</td><td>{!comparablePortIncident(run,current)?'场景或规则不同':!portLabFinished(run)?'观察未完成':'同终点，可比较'}</td></tr>;})}</tbody></table></div>{archive.map((a,index)=><details key={index}><summary>历史 {index+1} 的复盘与事件</summary>{Object.values(a.notes).map((text,j)=><p key={j}>{text}</p>)}<ol>{a.run.events.map((e,j)=><li key={j}>第{n(e.minute)}分钟 · {e.text}</li>)}</ol></details>)}</details>;
}

export function PortIncidentControls({run,locked,scope,onScope,quarantine,onQuarantine,onSend,onTimed,guidance,teaching=false,error}:{
  run:PortClassLab;locked:boolean;scope:'gate'|'all';onScope:(value:'gate'|'all')=>void;
  quarantine:string[];onQuarantine:(value:string[])=>void;onSend:(command:PortLabCommand)=>unknown;
  onTimed:(command:PortLabCommand)=>void;guidance?:IncidentCoachStep|null;teaching?:boolean;error?:string;
}) {
  const i=run.incident!,e=run.emergency!,system=run.scenario==='system',outage=run.simulation!.facilities!.yardIncident;
  const focus=(id:string)=>incidentTarget(id,guidance),limit=portLabBackupCapacity(run),review=reviewPortLabLedger(quarantine);
  const draining=!system&&!!outage&&run.simulation!.jobs.some(job=>job.kind==='yard'&&job.resource===outage.failed);
  const ledgerError=!!error&&/核验未通过|隔离记录/.test(error);
  const check=(target:'scope'|'logs'|'backup'|'mechanical',label:string)=><button {...focus(target)} disabled={locked||e.evidence[target]||target==='logs'&&!e.evidence.scope||target==='backup'&&!e.evidence.logs} onClick={()=>onTimed({kind:'inspect',target})}>{label}{e.evidence[target]?' · 已取得':''}</button>;
  const explanations:Record<string,string>={R1:'有效：版本18，12箱与独立凭据一致，保留。',R2:'与R3重复。去重时保留任意一条；全部隔离会减少18箱可信数量。',R3:'与R2重复。本轮示范隔离这一条，保留R2。',R4:'应隔离：版本17、申报10箱，独立凭据为版本18、12箱。',R5:'有效：版本18，8箱与独立凭据一致，保留。'};
  return <>
    <p>{i.restoredAt!==null?`${system?'电子交付':'场桥1作业'}已通过恢复审查。继续观察至第240分钟，核对积压和经营影响。`:system?'电子放行已保护性暂停。先取得独立证据，再决定隔离和恢复方案。RTO目标60分钟，RPO目标10分钟。':'场桥1保护停机。其他设备是否继续作业，由范围证据与处置决定。设备复工目标90分钟。'}</p>
    {error&&!ledgerError&&<p className="pcl-alert" role="alert">{error}</p>}
    <div className="pcl-stack"><button {...focus('record')} disabled={locked||i.recorded} onClick={()=>onSend({kind:'record'})}>固定当前告警证据</button>{check('scope','独立范围检查 · 3分钟')}{system?<>{check('logs','追查接口日志 · 4分钟')}{check('backup','调取备用台账 · 3分钟')}</>:check('mechanical','诊断场桥1 · 5分钟')}</div>
    <div className="pcl-stack">
      <label>隔离范围<select {...focus('isolation-scope')} aria-label="隔离范围" value={scope} disabled={locked||i.isolated} onChange={event=>onScope(event.target.value as 'gate'|'all')}><option value="gate">{system?'仅隔离电子交付接口':'仅隔离故障场桥'}</option><option value="all">同时暂停全部内部箱流</option></select></label>
      <button {...focus('isolate')} disabled={locked||i.isolated||!i.recorded||!system&&(!e.evidence.mechanical||draining)} onClick={()=>onTimed({kind:'isolate',scope})}>{system?'执行所选隔离':'安全隔离检修区 · 2分钟'}</button>
      <button {...focus('resume-internal')} disabled={locked||!i.isolated||!e.evidence.scope} onClick={()=>onSend({kind:'resume-internal'})}>恢复非受影响内部作业</button>
    </div>
    <fieldset disabled={locked||i.repairStarted}><legend>技术工作安排</legend><label className="pcl-number">维修班组<select {...focus('repair-team')} aria-label="维修班组" value={run.terminal.setup.dispatch.technicians} onChange={event=>onSend({kind:'repair-team',people:Number(event.target.value) as 1|2})}><option value={1}>1名技术人员</option><option value={2}>2名技术人员</option></select></label><button {...focus('repair')} disabled={locked||!(system?e.evidence.logs:e.evidence.mechanical)||!i.isolated} onClick={()=>onSend({kind:'repair'})}>启动技术工作</button></fieldset>
    <progress aria-label="技术工作进度" max={e.repairTarget} value={i.repairWork}/><p className="pcl-caption">{i.repairWork.toFixed(1)}/{e.repairTarget}人分钟；运行时累计，暂停不累计。可与其他检查及作业并行。</p>
    {system?<>
      {e.evidence.backup?<details open={!i.backupVerified}><summary>独立备用台账核验</summary>
        <p className="pcl-ledger-rule"><strong>勾选＝隔离排除；未勾选＝保留核验。</strong>保留记录须票号不重复，版本和数量与独立凭据一致。被隔离票据仍待恢复对账。</p>
        <details open={teaching} className="pcl-independent-records"><summary>独立核对凭据 · 值班副本</summary><p className="pcl-caption">独立值班副本为课程预置核对材料。编号与数量均为教学设定。</p><div className="pcl-table"><table><caption>对照依据：可信版本18，不使用故障接口的重复行作为另一份凭据。</caption><thead><tr><th>凭据</th><th>票号</th><th>可信版本</th><th>独立箱数</th></tr></thead><tbody>{PORT_LAB_INDEPENDENT_RECORDS.map(record=><tr key={record.reference}><td>{record.reference}</td><td>{record.ticket}</td><td>{record.version}</td><td>{record.quantity}</td></tr>)}</tbody></table></div></details>
        <div {...focus('ledger')} className="pcl-table pcl-ledger-table" tabIndex={-1}><table><caption>待核验台账 · 勾选需要排除的行</caption><thead><tr><th>隔离此行</th><th>票号</th><th>版本</th><th>申报/独立</th>{teaching&&<th>参考答案与原因</th>}</tr></thead><tbody>{PORT_LAB_LEDGER.map(row=><tr key={row.id} data-quarantined={quarantine.includes(row.id)}><td><label><input type="checkbox" aria-label={`隔离${row.id}`} checked={quarantine.includes(row.id)} disabled={locked||i.backupVerified} onChange={event=>onQuarantine(event.target.checked?[...quarantine,row.id]:quarantine.filter(id=>id!==row.id))}/>{row.id}</label></td><td>{row.ticket}</td><td>{row.version}</td><td>{row.declared}/{row.independent}</td>{teaching&&<td className="pcl-ledger-explanation">{explanations[row.id]}</td>}</tr>)}</tbody></table></div>
        {teaching&&!i.backupVerified&&<div className="pcl-ledger-answers"><strong>可以直接跟做，再看理由</strong><button disabled={locked} onClick={()=>onQuarantine(['R3','R4'])}>采用去重选择：隔离R3、R4</button><p>R2、R3只留一条，R1与R5保留，共38箱可信记录；备用最多24箱。隔离R2、R4也等效。</p><button disabled={locked} onClick={()=>onQuarantine(['R2','R3','R4'])}>采用保守选择：隔离R2、R3、R4</button><p>重复的两行一并隔离，剩余R1、R5共20箱；备用最多20箱，T02待恢复对账。</p></div>}
        {i.backupVerified?<p className="pcl-feedback">保留记录已核验，本轮备用上限{limit}箱；被隔离票据不能计入额度。</p>:review.valid?<p className="pcl-feedback">当前选择保留{review.quantity}箱，预计备用上限{review.limit}箱；还须完成10分钟核验。</p>:teaching&&<p className="pcl-alert">当前选择尚不能通过：{review.errors.join('')}请按上方参考答案调整。</p>}
        <button {...focus('audit')} disabled={locked||i.backupVerified||!i.isolated} onClick={()=>onTimed({kind:'start-audit',quarantine})}>核验备用记录 · 10分钟</button>
        {ledgerError&&<p className="pcl-alert" role="alert">{error}{teaching?'去重方案只勾R3、R4；保守方案勾R2、R3、R4，然后重新核验。':''}</p>}
      </details>:<p className="pcl-undiscovered">备用台账尚未调取；取得资料后才显示待核验台账和独立凭据。</p>}
      <div className="pcl-stack"><button {...focus('manual')} disabled={locked||!i.isolated||!i.backupVerified||i.manual||i.manualDelivered>=limit||i.testing||i.dataChecked||i.restoredAt!==null} onClick={()=>onSend({kind:'manual'})}>{i.backupVerified?`启用${limit}箱双人复核备用交付`:'启用有限备用交付'}</button><small>{i.backupVerified?`实际交付${i.manualDelivered}/${limit}箱；单道核验，另计2名复核人员成本。`:'备用额度待独立核验；本情境上限24箱，不能超过保留记录数量。'}</small><button {...focus('check')} disabled={locked||i.repairWork<e.repairTarget||!i.backupVerified||i.dataChecked} onClick={()=>onTimed({kind:'start-reconcile'})}>恢复记录对账 · 10分钟</button></div>
    </>:<div className="pcl-stack"><button {...focus('relief')} disabled={locked||!i.isolated||e.reliefUsed||i.testing||i.restoredAt!==null} onClick={()=>onSend({kind:'relief',enabled:true})}>改派场桥3支援故障区</button><small>沿实际道路转场；Y3暂失场桥3。检修区与替代作业区按教学情境独立隔离。</small><button {...focus('return')} disabled={locked||!outage?.reliefActive||outage.returnRequested||i.testing} onClick={()=>onSend({kind:'relief',enabled:false})}>撤回替代场桥至原区</button><small>{e.reliefReturning?'撤回中：先完成当前任务，再沿道路返回，请连续推进。':e.reliefReturned?'替代场桥已实际返回。':e.reliefUsed?'替代调度已启动，观察转场与原区影响。':'尚未使用替代方案。'}</small><button {...focus('check')} disabled={locked||i.repairWork<e.repairTarget||i.dataChecked} onClick={()=>onTimed({kind:'start-reconcile'})}>维修后安全检查 · 5分钟</button></div>}
    <div className="pcl-stack"><button {...focus('test')} disabled={locked||!i.dataChecked||i.testing||i.testPassed||!system&&outage?.relief!==null} onClick={()=>onSend({kind:'test'})}>{system?'启动3箱实际试放行':'启动场桥1的3次实际试吊'}</button><small>已验证{i.testDelivered}/3{system?'箱':'次交接'}；须连续推进至完成，空驶与转场不计为通过。</small><button {...focus('restore')} className="pcl-primary" disabled={locked||!i.testPassed||i.restoredAt!==null} onClick={()=>onSend({kind:'restore'})}>{system?'审查证据并恢复电子交付':'审查证据并恢复场桥1作业'}</button></div>
  </>;
}
