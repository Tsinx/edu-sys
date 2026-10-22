/** Approved route with explicit implementation status; unwritten lessons are never relabeled as completed decks. */
export const ECONOMIC_MATHEMATICS_NEXT_LESSON_PLAN=[
 {number:10,title:'高阶导数、微分与线性近似',status:'implemented',minutes:90,firstHour:'高阶导数定义、存在性反例、单位；六组个人练习',secondHour:'微分、线性近似、绝对与相对误差；精确残差实验与六组个人练习',prerequisites:['导数定义','基本求导与链式法则'],boundary:'凹凸、拐点的应用统一在第14讲；近似与实际增量必须分开。'},
 {number:11,title:'中值定理：平均与局部之间',status:'planned',minutes:90,firstHour:'第六讲最值存在与第七讲费马条件承接罗尔定理；拉格朗日中值定理',secondHour:'定理条件的正反例；柯西中值定理及导数比的桥梁；个人练习',prerequisites:['闭区间连续函数最值定理','内点可导极值的必要条件','求导'],boundary:'存在不等于唯一；闭区间连续与内部可导分开核对。'},
 {number:12,title:'洛必达法则、未定式与方法选择',status:'planned',minutes:90,firstHour:'0/0与∞/∞型；可导、分母导数非零及导数比极限条件；从中值定理理解法则',secondHour:'逐次核验、其他未定式的转换；导数商不收敛时不能反推原商无极限；个人练习',prerequisites:['求导法则','柯西中值定理','极限'],boundary:'不回头用洛必达作为正弦重要极限的原始证明，避免循环论证。'},
 {number:13,title:'泰勒公式、余项与极限综合计算',status:'planned',minutes:90,firstHour:'局部多项式逼近；有限阶泰勒公式；余项意义与常用函数',secondHour:'相消后的主项、方法对照与误差界；分层个人练习',prerequisites:['高阶导数','微分与线性近似','中值定理'],boundary:'每次舍去余项说明它相对比较尺度的极限或误差界；有限阶公式不等于无穷级数展开。'}
] as const;
