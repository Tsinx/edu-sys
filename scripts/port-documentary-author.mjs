/** Authored edit decisions for the two three-minute classroom documentaries. */
import fs from 'node:fs/promises';
import path from 'node:path';
const manifest=JSON.parse(await fs.readFile('output/port-documentary-recut/sources/manifest.json','utf8'));
const factual={
 mpa:{id:'mpa',title:'MPA · 2024年5月30日媒体说明',url:'https://www.mpa.gov.sg/media-centre/details/in-response-to-media-queries-on--vessels--extended-waiting-times-for-berths-in-the-port-of-singapore',boundary:'历史材料；班期失序、集中到港和单船作业量变化；明确锚地并未拥挤。实拍素材不是该事件现场。'},
 law:{id:'law',title:'安全生产法第三条 · 2021年修正文本',url:'https://www.mem.gov.cn/fw/flfgbz/fg/202107/t20210716_416558.shtml',boundary:'价值依据为人民至上、生命至上；流程分析与课堂实验是本课程的应用，不是法条原文或现场作业指令。'},
 tianjin:{id:'tianjin',title:'天津港“8·12”瑞海公司危险品仓库事故调查报告',url:'https://www.mem.gov.cn/gk/sgcc/tbzdsgdcbg/2016/201602/P020190415543917598002.pdf',boundary:'2015年事故、2016年报告；仅引用报告标题及许可、库存、培训、监督等调查主题。不把一般实拍中的企业和人员与案件相联系。'},
 nagoya:{id:'nagoya',title:'日本国土交通省 · 集装箱码头信息安全对策委员会',url:'https://www.mlit.go.jp/kowan/kowan_mn2_000006.html',boundary:'2023年7月NUTS安全事件，集装箱进出作业停止约三天；不说成全港所有物理作业停摆。不使用其他港口实拍冒充名古屋现场。'}
};
const v=(id,from,to,narration,title)=>({id,from,to,narration,title});
const c=(from,to,source,at,extra={})=>({from,to,source,in:at,...extra});
const eleven={
 lesson:11,id:'l11-opening-v2',title:'等待，发生在哪里',subtitle:'一次港口效率追问',duration:180,width:1920,height:1200,fps:30,
 format:'原创教学纪实短片 · 真实拍摄素材剪辑 · 中文合成旁白',
 intent:'保留完整的作业动作，以动作接动作的剪辑观察货流。旁白跨越切点，档案只在必要时进入画面；不使用图表卡片或AI静帧撑时长。',
 shots:[
  v('cold',3,9.5,'这一箱离开船边以后，还要等多久？','一个吊箱动作'),
  v('identity',10,20,'岸桥在动，车辆在走。繁忙的画面背后，交付可能仍在等待。','等待，发生在哪里'),
  v('mpa',20,37.5,'二零二四年五月，新加坡。绕行好望角打乱班期，船舶集中到港。等待，从航线变化传到码头。','班期变化传到码头'),
  v('volume',38,54,'官方说明记录，前四个月箱量同比增长百分之八点八。但总量之外，到港的节奏与单船作业量，也在改变。','原始说明中的证据'),
  v('boundary',54,65.5,'这份说明同时明确，锚地并未拥挤。一个港口的压力，不能只凭一幅画面来判断。','画面与证据的边界'),
  v('chain',66,80.5,'镜头转回作业。船边的一个吊箱动作，后面还接着运输、堆存和交付。每一次接续，都可能留下等待。','追踪货流的接续'),
  v('constraint',81,96,'岸桥多卸一箱，车辆能否接走？堆场能否收下？如果下游不变，上游的提速，可能只是把队列推向下一个位置。','提速以后，谁来接续'),
  v('clock',97,110.5,'要找到损失，先把时间端点记清。到港、开工、完工、离泊；再把货物离开堆场的时刻，接回同一条业务链。','把时间接回记录'),
  v('unfinished',111,124,'平均值还可能遮住另一件事：那些仍未离港的船、仍未交付的箱，是否留在了报表里？','仍在等待的货物'),
  v('experiment',124.5,138.5,'改善需要一次可复核的试验。同一个开局，同一批货物，同一个终点；只改变你声明要改变的条件。','一次能够复核的试验'),
  v('takeover',139,154,'在接下来的现场接管中，先写一个能够被推翻的判断。增加司机会有用吗？你准备观察哪段队列、哪项交付记录？','接管教学现场'),
  v('rival',155,168,'如果局部更快，最终交付却没有增加，你会保留原来的方案，还是重新寻找约束？','让结果改变判断'),
  v('question',168.5,175,'你凭什么证明，等待真的减少了？','带入课堂的问题')
 ],
 cuts:[
  c(0,4,'18718867',1,{sound:1}),c(4,7,'33585292',3),c(7,9,'36375964',4),c(9,11,'18718867',11),c(11,20,'30899354',1),
  c(20,29,'33585292',14),c(29,37,'10452020',.5),c(37,46,'33585292',24,{archive:'mpa'}),c(46,54,'36375964',12),
  c(54,65,'11335972',.3),c(65,73,'18718867',3,{sound:.13}),c(73,81,'33585292',35),c(81,89,'36375964',1),c(89,96,'30899354',5),
  c(96,103,'7018675',2),c(103,110,'5100045',5),c(110,117,'4294434',8),c(117,124,'36375964',21),
  c(124,130,'18718867',9,{sound:.13}),c(130,138,'33585292',43),c(138,146,'10452020',1),c(146,154,'36375964',10),
  c(154,161,'33585292',7),c(161,168,'30899354',6),c(168,175,'18718867',1,{sound:.13}),c(175,180,'11335972',5)
 ],
 chapters:[{from:0,title:'动作与等待'},{from:20,title:'历史材料：新加坡2024'},{from:65,title:'货流的下一环'},{from:96,title:'记录那些仍在等待的'},{from:124,title:'可复核的改善试验'},{from:168,title:'带入课堂的问题'}],
 overlays:[
  {kind:'title',from:11,to:19.5,kicker:'港口观察 / 11',lines:['等待，','发生在哪里'],sub:'一次港口效率追问'},
  {kind:'lower',from:24,to:32,kicker:'资料回看 / SINGAPORE 2024',lines:['班期失序，集中到港'],sub:'史实来源：MPA · 2024.05.30｜背景实拍非事件现场'},
  {kind:'lower',from:46,to:53,kicker:'MPA / 2024年1—4月',lines:['箱量同比 +8.8%'],sub:'总量之外，节奏与单次工作量也在改变'},
  {kind:'lower',from:56,to:63,kicker:'同一份官方说明',lines:['锚地并未拥挤'],sub:'背景画面为一般港城实拍，不能代替事件证据'},
  {kind:'lower',from:98,to:105,kicker:'从镜头回到业务记录',lines:['时间端点，要能够核对'],sub:'到港 / 开工 / 完工 / 离泊 / 货物交付'},
  {kind:'question',from:168,to:174.7,kicker:'带入课堂 / 第11讲',lines:['你凭什么证明，','等待真的减少了？'],sub:'诊断 → 同起点试验 → 结果复盘'}
 ],sources:[factual.mpa]
};
const twelve={
 lesson:12,id:'l12-opening-v2',title:'放行之前',subtitle:'安全、证据与职业责任',duration:180,width:1920,height:1200,fps:30,
 format:'原创教学纪实短片 · 真实拍摄素材剪辑 · 中文合成旁白',
 intent:'以核验和交接动作进入职业责任，事故段只显示调查档案。现实作业与历史材料通过明确切点和短标识区分，不制造采访、事故同期声或违规人员指认。',
 shots:[
  v('cold',3,9.5,'放行之前，谁来确认这一箱货物可以继续向前？','放行之前的确认'),
  v('identity',10,19.5,'一个签名，一次核对，一份交接。日常的动作，连着人的生命安全。','放行之前'),
  v('life',20,35,'安全生产法强调人民至上、生命至上。这个要求，要落实在每次核验、每次暂停和每次有依据的决定中。','人的生命安全'),
  v('archive',35.5,50.5,'二零一五年，天津港瑞海公司危险品仓库发生特别重大事故。回看官方调查报告，我们追问，风险为什么穿过了多道管理环节？','回看调查档案'),
  v('barriers',51,65.5,'许可、库存、培训和监督，不能只看材料是否存在。还要追问：信息是否真实，边界是否清楚，失效时能不能被及时发现。','屏障如何发挥作用'),
  v('digital',66,81,'今天的港口，还把调度和交付连接在数字系统上。设备仍能运转，并不说明身份、指令与回执仍然可信。','设备运转与信息可信'),
  v('nagoya',81.5,96,'二零二三年，名古屋港码头系统发生安全事件，集装箱进出作业一度停止约三天。数字接口，也是一道运行屏障。','名古屋港2023'),
  v('independent',97,109.5,'如果三个确认都抄自同一份记录，它们并不是三份独立证据。真正的复核，必须能够发现共同的错误。','独立核验'),
  v('pause',110,124,'压力到来时，最难的决定，可能是让一段流程暂时停下，同时为后续恢复留下可信的记录与责任人。','暂停也是一种责任'),
  v('restore',125,139,'恢复也有顺序。技术可用、业务对账、限定范围试运行；每一步，都要说清由谁核验、用什么证据通过。','有证据地恢复'),
  v('takeover',140,155,'接下来的教学情境里，你将接管一个信息接口异常的班次。设备还能工作，记录却不能全信。请提交你愿意负责的处置方案。','接管教学班次'),
  v('responsibility',156,168,'把生命安全放在首位，意味着在每一个具体决定里，守住边界，保留证据，也承担说明理由的责任。','把责任落实到决定'),
  v('question',168.5,175,'放行之前，你还缺哪一份证据？','带入课堂的问题')
 ],
 cuts:[
  c(0,5,'5308785',2,{sound:3.5}),c(5,9,'5100045',1),c(9,12,'5100055',4),c(12,19,'7018675',15),
  c(19,27,'4294434',1),c(27,35,'33585292',10),c(35,44,'36375964',9,{archive:'tianjin'}),c(44,51,'18718867',8,{archive:'tianjin-detail'}),
  c(51,58,'36375964',17),c(58,65,'33585292',25),c(65,73,'5100045',3),c(73,81,'7018675',2),
  c(81,89,'10452020',.3),c(89,96,'18718867',3),c(96,103,'5100055',.5),c(103,110,'7018675',22),
  c(110,117,'33585292',40),c(117,124,'4294434',12),c(124,132,'5100045',5),c(132,139,'36375964',2),
  c(139,147,'30899354',4),c(147,155,'18718867',6),c(155,163,'5308785',10,{sound:2.5}),c(163,173,'11335972',1),c(173,180,'33585292',45)
 ],
 chapters:[{from:0,title:'日常动作与生命安全'},{from:35,title:'调查档案：天津2015'},{from:65,title:'数字接口也是屏障'},{from:97,title:'核验、暂停与恢复'},{from:140,title:'接管教学班次'},{from:168,title:'带入课堂的问题'}],
 overlays:[
  {kind:'title',from:12,to:19,kicker:'港口观察 / 12',lines:['放行之前'],sub:'安全、证据与职业责任'},
  {kind:'lower',from:23,to:31,kicker:'安全生产法第三条 / 2021年修正文本',lines:['人民至上　生命至上'],sub:'把保护人民生命安全摆在首位'},
  {kind:'lower',from:67,to:74,kicker:'一般作业实拍 / 与案件无关',lines:['能运转，仍需核验'],sub:'身份、指令、回执，各自需要可信依据'},
  {kind:'lower',from:83,to:92,kicker:'资料回看 / NAGOYA 2023',lines:['集装箱进出作业停止约三天'],sub:'史实来源：日本国土交通省｜背景实拍非名古屋事件现场'},
  {kind:'lower',from:112,to:119,kicker:'职业责任 / 具体的决定',lines:['暂停，要说清范围与理由'],sub:'交接给谁，以什么证据恢复'},
  {kind:'question',from:165,to:172.7,kicker:'带入课堂 / 第12讲',lines:['放行之前，','还缺哪一份证据？'],sub:'接管异常班次 → 核验 → 处置 → 复盘'}
 ],sources:[factual.law,factual.tianjin,factual.nagoya]
};
for(const film of [eleven,twelve]){
 let end=0;for(const cut of film.cuts){if(cut.from!==end||cut.to<=cut.from)throw Error('Invalid edit continuity');const source=manifest.sources.find(s=>s.id===cut.source);if(!source||cut.in+cut.to-cut.from>source.duration+.02)throw Error('Source range exceeds footage '+JSON.stringify(cut));end=cut.to;}if(end!==180)throw Error('Film duration');
 const used=new Set(film.cuts.map(c=>c.source));film.footage=manifest.sources.filter(s=>used.has(s.id)).map(({relativeFile,download,bytes,...s})=>s);
 film.sound={voice:'原创中文讲稿，沿用课程已配置的中文合成声音。非记者或当事人采访。',locationSound:'标有 sound 的剪辑段保留素材原声；其他声音为原创配乐与设计音效。原声不作为历史案件同期声。',score:'原创、独立分段合成配乐，无外部音乐采样。开场与章节转折留出无旁白空间。'};
 film.credits={from:film.lesson===11?175:173,authors:[...new Set(film.footage.map(s=>s.author))],license:'实拍：Pexels License｜完整片段来源与许可见播放器',boundary:'一般港口与仓储实拍，不是所述事件现场；人物与案件无关。'};
 const base=path.resolve(`apps/teacher-web/public/course-assets/port-management/l${film.lesson}-media/documentary-v2`);await fs.mkdir(base,{recursive:true});await fs.writeFile(path.join(base,'storyboard.json'),JSON.stringify(film,null,2)+'\n');
 console.log(`L${film.lesson}: ${film.cuts.length} picture edits, ${film.shots.length} voice passages, ${film.shots.reduce((n,s)=>n+s.narration.length,0)} Chinese characters, ${film.footage.length} licensed video sources.`);
}
