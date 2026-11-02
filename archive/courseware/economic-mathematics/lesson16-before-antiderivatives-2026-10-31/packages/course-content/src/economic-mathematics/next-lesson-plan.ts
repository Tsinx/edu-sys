/** Approved route with explicit implementation status; unwritten lessons are never relabeled as completed decks. */
export const ECONOMIC_MATHEMATICS_NEXT_LESSON_PLAN=[
 {number:10,title:'高阶导数、微分与线性近似',status:'implemented',minutes:90,firstHour:'高阶导数定义、存在性反例、单位；六组个人练习',secondHour:'微分、线性近似、四则与复合运算；算子另设45分钟拓展',prerequisites:['导数定义','基本求导与链式法则'],boundary:'凹凸、拐点在新版第13讲；近似与实际增量分开。'},
 {number:11,title:'中值定理：平均与局部之间',status:'implemented',minutes:90,firstHour:'罗尔与拉格朗日中值定理；条件、结论与反例',secondHour:'柯西中值定理及导数比桥梁；个人练习',prerequisites:['闭区间连续函数最值定理','内点可导极值必要条件','求导'],boundary:'存在不等于唯一；闭区间连续与内部可导分开核对。'},
 {number:12,title:'洛必达法则：条件、转型与方法选择',status:'implemented',minutes:90,firstHour:'柯西桥梁→适用条件→逐次核验→未定式转型',secondHour:'10分钟综合个人练习→错因修正→含参数分类',prerequisites:['求导法则','柯西中值定理','极限'],boundary:'合并原12、13讲；不反向推理，不循环证明重要极限。'},
 {number:13,title:'极值与凹凸：从局部判据到全局结构',status:'implemented',minutes:90,firstHour:'极值判据的数学依据与边界；含参数最值；严格单调的论证',secondHour:'弦线定义、命名对照、切线与二阶判据；拐点；凸性与全局保证',prerequisites:['导数与中值定理','闭区间连续函数最值定理'],boundary:'原第14讲前移；convex与concave按弦线不等式命名，区分存在与唯一。'},
 {number:14,title:'边际思想：成本、消费与定价',status:'implemented',minutes:90,firstHour:'统一价格困境、效用与愿付金额；设计并检验版本菜单',secondHour:'IBM、生产路径与沉没成本；社会参照、个人消费与深入练习',prerequisites:['第13讲极值与凹性','第10讲微分与实际增量'],boundary:'历史事实与教学模型区分；菜单核对购买和自我选择；生产路径保留可避免成本；社会效果注明参照。'},
 {number:15,title:'需求弹性：市场反应与定价条件',status:'implemented',minutes:90,firstHour:'点弹性定义、单位不变、收入导数与有限变化；反例与个人练习',secondHour:'局部信息边界、边际收入、完整成本与产能；菜单条件回收',prerequisites:['第14讲价格菜单与成本口径','反函数与链式求导'],boundary:'先例后定义并回到原例；局部与全程分开；E=1不自动最大，加成率需要内点和完整边际成本；匿名菜单另核选择。'}
] as const;

/** Remains unwritten; the merge frees two hours, alongside one existing reserve hour. */
export const ECONOMIC_MATHEMATICS_RESERVE_PLAN={
 title:'泰勒公式、余项与极限综合计算',status:'planned',minutes:90,
 firstHour:'有限阶局部多项式与余项；由线性近似推进',
 secondHour:'相消后的主项、方法对照与误差界；分层个人练习',
 boundary:'尚未制作，不作为已完成讲次；可用合并释放的机动学时安排。'
} as const;
