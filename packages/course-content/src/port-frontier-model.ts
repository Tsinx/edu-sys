/** Lecture 19 uses complete explanatory cases; none of these models operates a port or student experiment. */
export const PORT_FRONTIER_SOURCES={
 'pf-case':{label:'本课程 · AI港口教学算例',url:'/port-expansion-preview.html?lesson=19',date:'2026-10-28',boundary:'像素、分类结果、奖励、费用与投资均为独立教学设定；完整演算由教师讲解，不是港口实测、已训练模型或现场指令。'},
 'pf-concept':{label:'本课程 · 港口AI原理图解',url:'/port-expansion-preview.html?lesson=19',date:'2026-10-28',boundary:'概念关系与示意尺寸，不按空间比例，不把技术名称等同具体港口已部署的算法。'},
 'pf-cnn':{label:'D2L作者教材 · 图像卷积',url:'https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html',date:'作者教材；核对2026-10-28',boundary:'采用局部感受野、共享核及互相关的入门关系；手工边缘核用于解释，不称为真实港口训练权重或完整CNN。'},
 'pf-dqn':{label:'Mnih等 · Deep Q-Network原始论文',url:'https://www.nature.com/articles/nature14236',date:'2015-02-25',boundary:'原论文任务是Atari游戏。只借用动作价值、神经网络与经验学习概念；不能把其结果当成港口部署或安全保证。'},
 'pf-hhla':{label:'HHLA/HPC · 码头机器学习技术论文',url:'https://hhla.de/fileadmin/module/its/ITS_Tech_Paper-HPC_machine_learning.pdf',date:'2021-10，ITS大会技术论文',boundary:'区分作者给出的场景、算法及试验范围与真实连续运行；研究过场位分配不代表全部码头已采用DRL。'},
 'pf-cq':{label:'重庆市政府 · 果园港无人集卡',url:'https://www.cq.gov.cn/zt/xblhxtd/jdtp/202503/t20250314_14407887.html',date:'2025-03-14',boundary:'采用当时图文报道中的无人集卡、有人集卡混行及系统接续事实。不据报道推断使用CNN、DQN或任何未披露网络。'},
 'pf-rotterdam':{label:'鹿特丹港务局 · 港口AI应用',url:'https://www.portofrotterdam.com/en/port-future/innovation/artificial-intelligence-port',date:'2023-09-14',boundary:'港方说明摄像头和计算机视觉用于陆侧资产维护识别；未披露的网络结构、识别率和财务收益不补写。'},
 'pf-jiangsu':{label:'交通运输部 · AI赋能江苏散货码头',url:'https://www.mot.gov.cn/xinwen/jiaotongyaowen/202610/t20261028_4226796.html',date:'2026-10-28',boundary:'使用当日官方转载报道中的数字孪生、点云识别、边缘控制与远控清舱场景；不把综合改善归因于某一种算法，未披露的DRL结构不推定。'},
 'pf-apica':{label:'安特卫普—布鲁日港 · APICA项目材料',url:'https://sustainableworldports.org/wp-content/uploads/IAPH-WPSP-POAB-APICA-Digital-Twin_Final.pdf',date:'2025项目材料；核对2026-10-28',boundary:'港方项目材料支持多源数据、数字孪生及决策支持关系；3D外观不单独证明预测准确或形成自主生产控制。'},
 'pf-nist':{label:'NISTIR 8202 · Blockchain Technology Overview',url:'https://nvlpubs.nist.gov/nistpubs/ir/2018/NIST.IR.8202.pdf',date:'2018-10',boundary:'采用哈希链接、数字签名、共识与许可网络的基本区别。摘要不是加密；链上完整性不验证线下事实真实，也不自动赋予监管许可。'},
 'pf-tradelens':{label:'马士基 · 停止TradeLens公告',url:'https://www.maersk.com/news/articles/2022/11/29/maersk-and-ibm-to-discontinue-tradelens',date:'2022-11-29',boundary:'公告称行业协同未达到所需水平、商业可行性不足，并计划2023年第一季度末下线。不得将计划当成另行核实的实际完成日，或推广为全部区块链失败。'},
 'pf-gsbn':{label:'GSBN · Cargo Release中国上线公告',url:'https://gsbn.trade/gsbns-blockchain-enabled-cargo-release-launched-across-china/',date:'2021-07-21',boundary:'这是平台方的历史上线公告，支持连接船公司、收货人、代理和码头的无纸化应用关系；效率宣传不作为独立因果评估或2026年运行规模。'},
 'pf-agent':{label:'Hu等 · PortAgent研究预印本',url:'https://arxiv.org/abs/2512.14417',date:'2025-12-16，v1',boundary:'预印本研究车辆调度系统迁移，包含检索、建模、编码与调试角色。论文提出与试验表现不等于所有港口已部署，更不能取消实际专业人员和权限。'},
 'pf-policy':{label:'交通运输部等 · 人工智能应用场景行动方案',url:'https://xxgk.mot.gov.cn/jigou/kjs/202606/t20260624_4208160.html',date:'2026-06-24',boundary:'政策部署与试点方向不等于所有场景均已投用或已实现收益；本讲区分研究、试点、报道中的投用与远期设想。'}
} as const;
export const PORT_FRONTIER_FILMS={
 'l19-frontier':{id:'l19-frontier',title:'港口的眼睛、选择与协同',src:'/course-assets/port-management/frontier-media/frontier-opening.mp4',poster:'/course-assets/port-management/frontier-media/frontier-opening.jpg',captions:'/course-assets/port-management/frontier-media/frontier-opening.vtt',durationMs:36000,source:'px-video-smart'}
} as const;
export type FrontierItem={title:string;body:string;value?:string};
export type FrontierContent={kind:'cover'|'news'|'flow'|'convolution'|'network'|'confusion'|'threshold'|'tree'|'dqn'|'hash'|'twin'|'synthesis';items:readonly FrontierItem[];photo?:string;caption?:string;variant?:string;steps?:number;news?:{headline:string;publisher:string;date:string}};
export const FRONTIER_PIXELS=[[0,0,1,1,1],[0,0,1,1,1],[0,0,1,1,1],[0,0,1,1,1],[0,0,1,1,1]] as const;
export const FRONTIER_KERNEL=[[-1,0,1],[-1,0,1],[-1,0,1]] as const;
export function frontierCorrelation(){return Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>FRONTIER_KERNEL.reduce<number>((sum,row,j)=>sum+row.reduce<number>((s,k,i)=>s+k*FRONTIER_PIXELS[y+j]![x+i]!,0),0)));}
export const FRONTIER_CLASSIFIERS=[{id:'基准阈值',tp:16,fn:4,fp:8,tn:72},{id:'降低阈值',tp:19,fn:1,fp:24,tn:56}] as const;
export function frontierClassification(){return FRONTIER_CLASSIFIERS.map(c=>({...c,total:c.tp+c.fn+c.fp+c.tn,precision:c.tp/(c.tp+c.fp),recall:c.tp/(c.tp+c.fn),accuracy:(c.tp+c.tn)/(c.tp+c.fn+c.fp+c.tn),reviews:c.tp+c.fp,cost:(c.tp+c.fp)*100+c.fn*2000}));}
export function frontierDispatch(gamma=.9){if(!Number.isFinite(gamma)||gamma<0||gamma>1)throw new RangeError('折扣因子应在0至1之间');return [{action:'先服务A',now:-2,next:-12,total:-2+gamma*-12},{action:'先服务B',now:-5,next:-1,total:-5+gamma*-1}];}
export function frontierQUpdate(){const before=-8,reward=-5,gamma=.9,next=-1,alpha=.2,target=reward+gamma*next;return{before,reward,gamma,next,alpha,target,error:target-before,after:before+alpha*(target-before)};}
export function frontierAIInvestment(net=60){const factor=Array.from({length:5},(_,i)=>(1.1)**-(i+1)).reduce((a,b)=>a+b,0);return{initial:200,net,factor,npv:net*factor-200};}
type FrontierPage={mediaId?:string;visual:string;rows?:readonly(readonly string[])[];equations?:readonly{tex:string;explanation:string}[];frontier?:FrontierContent};
export function frontierSlideSteps(p:FrontierPage){return p.frontier?.steps??p.equations?.length??(p.rows?Math.max(1,p.rows.length-1):Math.max(1,p.frontier?.items.length??3));}
export function frontierSlideSummary(p:FrontierPage,s:{progress:number;cinematic?:{elapsedMs:number}}){if(p.mediaId)return `第19讲36秒历史画面与课程旁白片头。${s.cinematic?'当前'+Math.floor(s.cinematic.elapsedMs/1000)+'秒。':''}新闻未披露的算法结构不推定。`;if(s.progress===0)return '本页图解尚未展开；标题、导语和已显示的新闻影像为当前材料。';const n=Math.floor(s.progress*frontierSlideSteps(p)+1e-6);if(p.equations)return p.equations.slice(0,n).map(e=>e.tex+'：'+e.explanation).join('；');if(p.rows)return p.rows.slice(0,n+1).map(r=>r.join(' / ')).join('；');return p.frontier?.items.slice(0,n).map(i=>[i.title,i.body,i.value].filter(Boolean).join('：')).join('；')??'';}

export const FRONTIER_HASH_CHAIN=[
  {
    "text": "C01|received|09:20|terminal",
    "previous": "0000000000000000000000000000000000000000000000000000000000000000",
    "hash": "c2f95c2b88cc830adc026474fc9b034330b0e273045e00dcf06a46b436e9e34b"
  },
  {
    "text": "C01|release_message|10:00|carrier",
    "previous": "c2f95c2b88cc830adc026474fc9b034330b0e273045e00dcf06a46b436e9e34b",
    "hash": "82e941c8f824090166b6c23d12fe77525df21121e42d25e171a2e998814571fe"
  },
  {
    "text": "C01|accepted|10:05|terminal",
    "previous": "82e941c8f824090166b6c23d12fe77525df21121e42d25e171a2e998814571fe",
    "hash": "49bd12a23140a12823a28d5203e4568097af94bea3b9e2f43872915bb038633e"
  }
] as const;
export const FRONTIER_CHANGED_HASH="978df939b3521b56d5c11b9fcd5b954beac3fe67407f9cf4dd4b29cd0a06abb1";
