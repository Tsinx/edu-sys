import { PORT_LESSON_FOUR_LABS, PORT_LESSON_FOUR_TIMING, type PortDemoCueId, type PortLessonFourPage } from '@edu/course-content';

export function PortLessonFourTeacherGuide({page,onPage,onOpen}:{page:PortLessonFourPage;onPage:(page:number)=>void;onOpen:(cueId:PortDemoCueId)=>void}) {
  const block=PORT_LESSON_FOUR_TIMING.find(b=>page.index>=b.slideStart&&page.index<=b.slideEnd)!;
  const elapsed=PORT_LESSON_FOUR_TIMING.slice(0,PORT_LESSON_FOUR_TIMING.indexOf(block)).reduce((n,b)=>n+b.minutes,0);
  const lab=PORT_LESSON_FOUR_LABS.find(l=>page.localPage<=l.reviewPage)??PORT_LESSON_FOUR_LABS.at(-1)!;
  return <aside className="port-l4-teacher-guide" aria-label="第4讲教师授课提示">
    <h2>教师授课台</h2><span className="port-l4-time">{elapsed}—{elapsed+block.minutes} 分钟 · {block.label}</span>
    <h3>本页讲授与操作</h3><p>{page.teachingCue}</p>
    <h3>分段演示 · {lab.name}</h3><p>停点：{lab.stop}</p>
    <button onClick={()=>onOpen(lab.cueId)}>打开实验系统 · {lab.name}</button>
    {lab.taskPage&&<button className="port-l4-jump" onClick={()=>onPage(lab.taskPage)}>回到实机任务页 · {lab.minutes}分钟</button>}
    <button className="port-l4-jump" onClick={()=>onPage(lab.reviewPage)}>转到复核讲解页</button>
    <p>验收关注：{lab.acceptance}</p>
    <details><summary>四段演示与任务导航</summary>{PORT_LESSON_FOUR_LABS.map(l=><div key={l.unit}><h3>{l.name}</h3><button onClick={()=>onOpen(l.cueId)}>打开实验系统</button><button className="port-l4-jump" onClick={()=>onPage(l.demoPage)}>第{l.demoPage}页 · 观察问题</button>{l.taskPage&&<button className="port-l4-jump" onClick={()=>onPage(l.taskPage)}>第{l.taskPage}页 · 学生实机</button>}</div>)}</details>
    <details><summary>90分钟进度表</summary>{PORT_LESSON_FOUR_TIMING.map(b=><button className="port-l4-jump" key={b.label} onClick={()=>onPage(b.slideStart-153)}>{b.label} · {b.minutes}分钟</button>)}</details>
    <details><summary>课堂准备与卡点处理</summary><p>学生使用现有“教学模式／自主练习”。首次操作可看操作教学，返回后再做自己的练习。三个必做任务共25分钟；离港以教师示范为主。</p><p>推荐60×或120×；讲解时暂停，跨过纯等待可用300×。里程碑停点需手动继续。真实等待时长以现场业务时间为准。</p><p>卡住时依次检查：时钟是否暂停、有效回执、货批堆场、岗位可用数、异常限制。装卸结束并不保证进口已全部提离。</p><p>每段是独立情境。演示不写学生记录，操作教学也不构成自主完成。可行方案并非唯一；本讲不要求最优配置。</p></details>
    <details><summary>教师参考答案与评价</summary><p>第41页三项推断均不成立：应分别核对实际提离、限制解除、泊位与航道各自释放。</p><p>形成性评价看“状态与证据、操作与解释”。软件短分段没有综合挑战的100分成绩；不按最快完成或点击数量排名。</p><p>课后保存三段自主记录；选择一次等待，写100—150字“起始状态—动作—结果—仍缺证据”。</p></details>
  </aside>;
}
