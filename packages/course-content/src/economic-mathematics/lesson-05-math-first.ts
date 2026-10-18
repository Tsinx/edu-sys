import {masteryLesson,personalPractice as practice,type MasteryPage} from './limit-mastery-authoring.js';
import {refinedLesson05 as former,lesson05Narration as formerSpeech} from './lesson-05-refined.js';
function use(page:number,seconds:number,changes:Partial<MasteryPage>={}):MasteryPage{
  const s=former.slides[page-1]!;
  const {slideKey,compositionId,kicker,classHour,teachingSeconds,moduleId,assistantCue,...copy}=s;
  return {...copy,seconds,teachingCue:s.teachingCue.replace(/^预计\d+秒。/,''),speech:formerSpeech[s.slideKey]!,...changes};
}
const pages:readonly MasteryPage[]=[
  use(1,30,{title:'用几何夹住一个不能直接相除的比值',lead:'第四讲留下的问题：sin x与x都趋于0，它们的比值为什么趋于1？',body:['先找几何依据，再讨论更一般的微小变化。'],speech:['第四讲已经会用夹逼处理振荡。现在带着同一个方法回到正弦除以角度。两个量都趋于零，不能直接用商法则。我们先从单位圆找到依据，再逐步建立重要极限与等价关系。']}),
  use(3,75),
  practice(5,1),
  use(4,75),
  use(6,45),
  use(7,45),
  use(8,90),
  use(9,90),
  use(10,90),
  {title:'余弦为什么靠近1？也可以从同一张图估计',seconds:90,formula:String.raw`0\le1-\cos x=\frac{\sin^2x}{1+\cos x}\le x^2\qquad(0<x<\pi/2)`,body:['前面的几何关系给出0<sin x<x，且cos x>0。','误差被x²控制，所以cos x→1。'],teachingCue:'补齐夹逼两端极限依据，不用正弦导数或未定义的连续性。',speech:['还差一个依据：余弦为什么趋于一？用平方差恒等式，一减余弦等于正弦平方除以一加余弦。第一象限中分母大于一，而正弦小于角度，因此误差不超过角度平方。这样仍用同一份几何证据，就证明了余弦趋于一。']},
  use(11,75,{body:['上一页已证明cos x→1；上界1的极限也为1。'],speech:['上一页已经用误差估计证明余弦趋于一。现在正弦比值夹在余弦与一之间，可以使用第四讲的夹逼定理。','上下两个界限都趋于一。','任意给定一附近的小误差带，只要余弦最终进入，中间比值也会一起进入。整个证明没有借助导数。']}),
  use(12,60),
  practice(5,2),
  use(14,75),
  use(15,75),
  use(16,60),
  practice(5,3),
  use(17,75),
  {title:'系数为0时，回到原式直接判断',seconds:60,formula:String.raw`\lim_{x\to0}\frac{\sin(kx)}x=k\qquad(k\text{为固定实数})`,steps:[{title:'k≠0：补出同一个内层',formula:String.raw`\frac{\sin(kx)}x=k\frac{\sin(kx)}{kx}\to k`},{title:'k=0：无需构造0作分母',text:'原分子恒为0，非零x处的商恒为0，极限为0。'}],teachingCue:'参数必须固定，处理0避免写sin0/0。',speech:['把比例推广到固定实数k，结果为k。但证明要把k等于零单独检查。','非零k时，补出内层kx的标准比值，外面留下k。','k等于零时，原式的分子恒为零，非零x处的商就是零。不要为了套标准式，反而制造一个零分母。']},
  practice(5,4),
  use(19,45),
  use(20,90),
  {title:'同样趋零，比较基准可以是x，也可以是x²',seconds:75,formula:String.raw`\frac{\sin x}{x}\to1,\qquad\frac{1-\cos x}{x^2}\to\frac12`,body:['正弦与x具有同一级别的大小。','余弦差与x²相比有非零有限比值；再除以x，结果便趋于0。'],prompt:'为什么(1−cos x)/x与(1−cos x)/x²有不同极限？',teachingCue:'先用比值说清尺度，不抢先使用尚未定义的等价符号。',speech:['两个量都趋零，还可以比较它们与什么基准成比例。正弦与x相比趋于一，余弦差与平方的x相比趋于二分之一。如果余弦差改除以x，就会再剩一个趋零的x因子，结果变为零。']},
  practice(5,5),
  {title:'正弦解决了比值，另一类极限把小增量反复相乘',seconds:45,formula:String.raw`\left(1+\frac1n\right)^n`,body:['每个因子靠近1，因子个数却不断增多。','单独看底数趋于1，能确定整体吗？'],teachingCue:'数学结构自然转入第二重要极限，经济复利移到课外应用。',speech:['正弦重要极限来自几何夹逼。接下来遇到另一种结构：每个因子离一越来越近，因子个数却越来越多。底数靠近一，并不表示整个乘积也靠近一。我们先把它作为一个数列研究。']},
  {title:'有限次相乘，先准确理解表达式',seconds:30,formula:String.raw`a_n=\left(1+\frac1n\right)^n`,table:{columns:['n','具体运算'],rows:[['1','2'],['2','(3/2)×(3/2)'],['3','(4/3)×(4/3)×(4/3)']]},teachingCue:'先解释n同时进入底数与指数，不引入利率名词。',speech:['n是正整数，它同时决定底数的增量和相乘次数。n等于二时，每个因子是一点五，共乘两次；n等于三时，每个因子是三分之四，共乘三次。两种变化必须一起看。']},
  {title:'数表提示收敛，证明还需要单调与有界',seconds:60,table:{columns:['n','aₙ'],rows:[['1','2.000000'],['2','2.250000'],['10','2.593742'],['100','2.704814'],['10000','2.718146']]},body:['这个数列递增且小于3；严格证明列在拓展。','第三讲的单调有界准则保证它收敛。'],teachingCue:'把作为定理使用与数表观察的证据边界说清。',speech:['数表显示它上升并逐渐稳定，但表格本身不是证明。我们使用一个已经能够严格证明的事实：这个数列递增且始终小于三。结合第三讲的单调有界准则，它必定收敛。两份证明保留在拓展中。']},
  use(30,105),
  use(32,60),
  practice(5,6),

  use(33,60),
  use(35,75),
  use(36,60),
  practice(5,7),
  {title:'自然对数与指数的基本极限性质',seconds:75,lead:'自然对数 natural logarithm：以e为底的对数，记作ln。',formula:String.raw`y\to b>0\Rightarrow\ln y\to\ln b,\qquad t\to c\Rightarrow e^t\to e^c`,body:['正量趋于正数时，可把相应极限传递给自然对数。','指数的输入趋于实数时，e的幂趋于相应的函数值。'],teachingCue:'不提前使用连续术语；明确引用基本初等函数极限性质。',speech:['要把幂结构转成对数比值，先交代所需的基础性质。以e为底的对数称自然对数，记作ln。正量趋于正数时，对数趋于该数的对数；指数输入趋于确定实数时，e的幂也趋于相应值。本讲将这两条基本性质作为定理使用，避免在推导中悄悄借用导数。']},
  use(38,75,{body:['x→0，且附近1+x>0。','上一页的对数极限性质，将第二重要极限传到ln e=1。'],steps:[{title:'得到一个新的标准比值',formula:String.raw`\lim_{x\to0}\frac{\ln(1+x)}x=1`}],speech:['第二重要极限的底数是正数，极限为e，可以用上一页明确说明的对数性质。再用高中对数运算法则把指数提出，就得到自然对数一加x除以x。','因此这个标准比值趋于一。这里先保留比值形式，稍后再用一个统一定义概括它。']}),
  use(39,60,{body:['利用指数的基本极限性质，x→0时e^x−1→0。','非零x对应非零y，可使用对数标准比值及倒数。'],speech:['令y等于e的x次方减一。由前面说明的指数性质，x趋零时y也趋零；反向关系是x等于一加y的自然对数。','原来的指数增量比值变成y除以一加y的自然对数，正好是前一页标准比值的倒数，因此也趋于一。']}),
  practice(5,8),
  use(23,75),
  use(24,60),
  use(25,60),
  practice(5,9),
  use(40,60),
  use(42,90),
  use(43,75),
  practice(5,10),
  {title:'乘法因子可以逐个控制，减法剩余需要重新检查',seconds:45,formula:String.raw`\alpha\sim\widetilde\alpha,\quad\beta\sim\widetilde\beta\quad\Longrightarrow\quad\frac{\alpha\beta}{\widetilde\alpha\widetilde\beta}\to1`,body:['相关比值在共同的附近范围有定义。','乘积之比能拆成两个趋于1的比值；相减时没有同样的拆法。'],teachingCue:'直接承接商的依据，再提问相减为何不同。',speech:['乘积与商都能把替换前后的比值，拆成几个趋于一的因子。相减时则没有同样的拆法。问题不在符号是不是好看，而在误差进入整体以后是否仍可控制。']},
  use(45,60),
  use(46,90),
  practice(5,11),
  use(48,75),
  {title:'不能无条件逐项相减，也不等于见到减号就停下',seconds:75,formula:String.raw`1-\cos x=2\sin^2(x/2)\sim\frac{x^2}{2}`,body:['这里替换的是已经证明过比值极限的整个表达式。','分别把1与cos x都替成1，会抹掉要研究的差。'],teachingCue:'防止把加减禁用口诀替代数学判断。',speech:['余弦差里面有减号，却仍能整体用平方的一半替换。理由是这个整体的比值极限已经通过恒等式证明。若把一和余弦分别都换成一，再相减成零，就会抹掉整个研究对象。']},
  use(49,75),
  {title:'固定参数改变系数，零参数要回原式',seconds:75,formula:String.raw`\lim_{x\to0}\frac{\ln(1+ax)}x=a`,steps:[{title:'a≠0',formula:String.raw`\frac{\ln(1+ax)}x=a\frac{\ln(1+ax)}{ax}\to a`},{title:'a=0',text:'原分子恒为0，极限直接为0；不要写成“与0等价”。'}],body:['对每个固定a，都能取足够小的范围保证1+ax>0。'],teachingCue:'把参数为零和等价关系分母条件接起来。',speech:['含固定参数a时，先保证对数内部为正。非零a可以补齐内层ax；零a则直接回原式。','非零参数时，标准对数比值趋于一，留下系数a。','参数为零时分子恒为零，结果为零。不要把零拿来作等价关系的比较分母。']},
  {title:'同一重要极限，可以控制相对误差',seconds:75,formula:String.raw`0\le1-\frac{\sin x}{x}\le1-\cos x\le x^2\qquad(0<x<\pi/2)`,body:['若0<x<0.01，比值偏离1小于0.0001。','精度保证来自不等式，不依赖小数显示的位数。'],teachingCue:'回到误差语言，增加数学深度而不增加新公式。',speech:['开头的几何证明还能给出误差保证。正弦比值偏离一的程度，不超过一减余弦，又不超过角度平方。角度小于百分之一弧度时，这个偏离小于万分之一。这样的结论覆盖所有允许输入，不依赖计算器保留几位小数。']},
  practice(5,12),
  {title:'为什么相对误差小，绝对误差仍要看尺度？',seconds:60,formula:String.raw`\frac{x+x^2}{x}\to1,\qquad\frac{(x+x^2)-x}{x^2}=1`,body:['与x相比，差x²可以忽略到比值趋于1。','与x²相比，这个差恰好是全部结果。'],teachingCue:'同一反例从不同基准再解释，形成高质量重复。',speech:['相对误差小，必须说明相对谁。x加平方与x相比，额外平方项的相对影响趋零。但若题目已经把共同的x消去，再与平方相比，这个原先较小的差就成为全部结果。比较基准改变，能忽略的内容也会改变。']},
  {title:'再看一次幂：指数形式相似，仍需核对过程',seconds:45,formula:String.raw`(1+x)^{4/x}\to e^4,\qquad(1+x)^{4x}\to1\qquad(x\to0)`,body:['共同条件：x≠0，附近1+x>0。','增量乘指数分别为4与4x²，目标不同。'],teachingCue:'课末重复关键条件，避免考前口诀化。',speech:['两个式子只有指数位置不同，结果却不同。底数的增量乘指数，第一式保持四，第二式趋于零。所以一个趋于e的四次方，另一个趋于一。看到底数接近一，还必须继续看指数怎样变化。']},
  {title:'两条重要极限，组织成一套有条件的方法',seconds:60,table:{columns:['对象','关键条件'],rows:[['正弦比值','弧度；内层趋零；同一个内层配分母'],['幂结构','正底数；增量趋零；指数与增量关系'],['等价替换','同一过程；比值趋于1；检查运算位置']]},teachingCue:'用条件总结全讲，不引入经济决策支线。',speech:['本讲的三条线索现在合在一起。正弦比值检查角度和内层，幂结构检查正底数以及增量指数的配对，等价替换检查共同过程、比值和运算位置。公式都有明确的适用条件。']},
  use(54,60),

  use(31,0,{title:'课外应用 · 固定名义利率下的复利',routeRole:'optional',sourceLabel:'教学情境',lead:'本金归一为1，一年计息n次，名义年利率r固定；每次按r/n计息，所得继续增长。',formula:String.raw`A_n=(1+r/n)^n\longrightarrow e^r`,body:['名义年利率 nominal annual rate：每次计息利率乘一年计息次数。','Aₙ为年末余额与本金之比；忽略税费、违约和资金进出。'],speech:['这是一项可另行体验的复利应用。名义年利率r固定，一年计息n次，每次按r除以n计息，所得继续参与增长。增长因子是年末余额与本金之比。在所列假设下，次数增多时增长因子趋于e的r次方。它没有改变本讲先建立数学结论的顺序。']}),
  use(55,0,{routeRole:'optional'}),use(56,0,{routeRole:'optional'}),use(57,0,{routeRole:'optional'}),use(58,0,{routeRole:'optional'}),use(62,0,{routeRole:'optional'})
];
const built=masteryLesson(5,'重要极限与等价：依据、条件和边界','怎样有依据地比较微小变化，并判断何时可以替换？',
  ['用单位圆、误差估计和夹逼证明正弦重要极限','区分整数数列与实变量版本，正确配对幂的增量和指数','从比值极限定义等价无穷小','用正反例判断乘除与相消结构中的替换'],
  ['几何夹逼 → 正弦变式与尺度 → e的定义；六组个人练习','幂与指数对数 → 等价的比值定义 → 替换与相消；六组个人练习'],30,pages);
export const mathFirstLesson05=built.lesson;
export const mathFirstLesson05Narration=built.narration;
