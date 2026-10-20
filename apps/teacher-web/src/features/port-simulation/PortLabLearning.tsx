import {portClassLabMetrics} from '@edu/port-simulation-core';
import {currentTrialSaved,trialNumber,type Notebook,type LabGuideTopic} from './port-class-notebook';
import {LAB_GUIDE_TOPICS,labCoachPhase,labGuideVisible} from './port-lab-coach';

export function PortLabEntry({book,hasSaved,onFresh,onResume}:{book:Notebook;hasSaved:boolean;onFresh:()=>void;onResume:()=>void}){
 const label=book.run.kind==='baseline'?'基准实验':`试验 ${trialNumber(book)}`;
 return <section className="pcl-entry" aria-label="选择实验起点">
  <span className="pcl-eyebrow">第11讲 · 绩效诊断实验</span><h1>先看原配置，再验证你的改进</h1>
  <p>两艘船、300箱，从同一第120分钟检查点出发。先取得原配置的基准，再用岗位变化检验瓶颈判断。</p>
  <ol className="pcl-entry-flow"><li><b>01</b><strong>基准观察</strong><span>保持原岗位，先运行5分钟；有数据后添加图表，读证据并完成第360分钟观察。</span></li><li><b>02</b><strong>首次验证</strong><span>回顾基准发现，选择岗位、修改并应用；在同段图表和同一终点比较改善与代价。</span></li><li><b>03</b><strong>自主试验</strong><span>独立设计后续试验，按需打开功能帮助。每次保存前简写发现，可随时重置。</span></li></ol>
  <div className="pcl-entry-choices"><article><h2>从基准开始新练习</h2><p>从原岗位开始，分析台为空。操作引导随实际进度展开。</p><button className="pcl-primary" onClick={onFresh}>从基准开始新练习</button></article>{hasSaved&&<article><h2>继续本机场次</h2><p>{label} · 第{Math.round(book.run.terminal.minute)}分钟<br/>{book.baseline?'已保存基准':'基准尚未保存'} · 已保存{book.trials.length}份试验{currentTrialSaved(book)?' · 当前结果已保存':''}</p><button onClick={onResume}>继续本机场次</button></article>}</div>
  <p className="pcl-caption">新练习会另存，原场次可从页面底部“恢复本机历史场次”找回。进度在本机保存，未上传教学平台。</p>
 </section>;
}

export function PortLabLearning({book,onGuide,onHide,onFresh}:{book:Notebook;onGuide:(topic:LabGuideTopic)=>void;onHide:()=>void;onFresh:()=>void}){
 const phase=labCoachPhase(book),index=book.run.kind==='baseline'?0:trialNumber(book)===1?1:2,open=labGuideVisible(book);
 const content=[['基准观察','原岗位固定。先运行观察，再添加图表；读证据后完成统一终点，保存1—2句发现。'],['首次验证','依据基准发现选择岗位，开跑前修改并应用；比较同段数据，完成终点后评审改善与代价。'],['自主试验','独立提出假设、设计改动并比较结果。图表沿用，专题帮助随时可开；试验次数不设上限。']];
 return <section className="pcl-learning" aria-label="实验学习阶段">
  <ol className="pcl-learning-stages">{content.map(([title],i)=><li key={title} aria-current={index===i?'step':undefined}><b>{i+1}</b><span>{title}</span><small>{i===0?'原配置':i===1?'有引导':'独立验证'}</small></li>)}</ol>
  <div className="pcl-learning-current"><div><span className="pcl-eyebrow">当前 · {book.run.kind==='baseline'?'基准实验':`试验 ${trialNumber(book)}`}</span><h2>{content[index]![0]}</h2><p>{content[index]![1]}</p></div><div className="pcl-learning-actions">{phase&&<button onClick={()=>open?onHide():onGuide('core')}>{open?'暂时关闭引导':'显示操作引导'}</button>}<button onClick={onFresh}>从基准新开练习</button></div></div>
  <div className="pcl-learning-help"><p>“重置本次实验”随时可用，保留已保存结果与图表。保存结果或进入下一试验时才需填写发现。</p><details><summary>按需学习更多功能</summary><div>{LAB_GUIDE_TOPICS.map(([topic,label])=><button key={topic} onClick={()=>onGuide(topic)}>{label}</button>)}</div></details></div>
 </section>;
}

export function PortLabBaselineSummary({book}:{book:Notebook}){
 if(!book.baseline)return null;
 const m=portClassLabMetrics(book.baseline);
 return <section className="pcl-baseline-summary" aria-label="已保存的基准依据"><h3>先回顾基准</h3><p>{book.learning?.baseline?.finding||'旧记录未填写发现，请查看已保存的基准数据。'}</p><dl><div><dt>新增交付</dt><dd>{m.delivered}箱</dd></div><div><dt>未交付</dt><dd>{m.remaining}箱</dd></div><div><dt>本段成本</dt><dd>{m.cost.toFixed(1)}</dd></div></dl><small>第120—360分钟完整结果。试验开局重新回到第120分钟。</small></section>;
}
