import {page as p,differentialPractice as practice,writtenTask,type DifferentialPage} from './differentiation-authoring.js';
import {DIFFERENTIATION_WRITTEN_EXERCISES as written} from './differentiation-written-exercises.js';

/** Second 45-minute period: each page has an explicit purpose, script and duration. */
export const differentialRulesPages:readonly DifferentialPage[]=[
 p('同一个基点，曲线与切线给出两个输出',String.raw`f(x)=x^2,\quad a=1,\quad L(x)=1+2(x-1)`,['线性近似 linear approximation在基点匹配函数值与斜率。','先比较真实增量，再识别其中的一次变化。'],'上一课时研究变化率怎样继续变化。现在把基点固定在一，观察曲线与切线面对同一个输入变化时，输出相差什么。',{seconds:45,foundationFigure:{kind:'differential-error',params:{mode:1,h:.3}}}),
 p('把真实增量与一次部分并排写出',String.raw`\Delta y=f(1+h)-f(1)=2h+h^2`,['2h与输入增量成正比。','剩余h²除以h后趋于0。'],'把一加h的平方展开，再减去基点函数值一，得到二h加h平方。一次部分容易计算，剩余部分仍然属于真实变化。',{seconds:60}),
 p('可导的等价表达：一次部分加余项',String.raw`\Delta y=f'(a)h+r(h),\qquad\frac{r(h)}h\to0`,['余项 remainder是精确增量与一次部分的差。','r(h)=o(h)读作“相对于h的高阶无穷小”，定义正是r(h)/h→0。'],'从差商减去导数趋于零出发，乘回h，就得到这条精确分解。小o表达比较尺度，不表示余项已经等于零。',{seconds:90}),
 p('微分：固定基点处的一次变化',String.raw`\boxed{dy=f'(a)\,dx},\qquad dx=\Delta x=h`,['微分 differential是函数增量关于输入增量的线性主部 linear part。','基点a固定，系数f′(a)固定；dy随选定的dx改变。'],'在本课的一元自变量情形，dx取输入增量h。微分就是基点斜率乘这个增量。下面的运算法则都必须在同一个基点、面对同一个输入增量使用。',{seconds:75}),
 practice(10,7),
 p('水平切线的微分为0，真实变化仍可能非零',String.raw`f(x)=x^2,\quad a=0:\quad dy=0,\qquad\Delta y=h^2`,['一次部分为0，函数仍可能发生变化。','h≠0时，用dy估计Δy的相对误差为100%。'],'零处的斜率为零，所以微分为零；但真实增量是h平方。它相对于输入h更小，却占真实输出增量的全部。误差一定要说明比较基准。',{seconds:60}),
 p('余项趋零还不够，必须说明比较尺度',String.raw`r(h)=|h|\to0,\qquad\frac{|h|}{h}=\begin{cases}-1,&h<0,\\1,&h>0\end{cases}`,['|h|虽趋于0，却不是o(h)。','一次近似要求r(h)/h→0。'],'绝对值h会缩小，但与输入本身保持同样的量级。左右两侧的比值分别为负一和一，不能把它当成不影响一次主部的余项。',{seconds:60}),
 practice(10,8),
 p('两条函数，共用一个基点和输入增量',String.raw`u=u(x),\ v=v(x),\qquad du=u'(a)h,\quad dv=v'(a)h`,['以下运算法则均要求u、v在同一个基点a可导。','公式中的u、v若不写自变量，均表示基点值u(a)、v(a)。'],'先把符号说清。u和v都依赖同一个x，面对同一个h；它们的变化不能各自使用不同基点。固定基点后，我们可以组合两个线性变化。',{seconds:45}),
 p('常数、常倍与和差：保留线性关系',String.raw`d(c)=0,\quad d(cu)=c\,du,\qquad d(u\pm v)=du\pm dv`,['c是固定常数。','由d(u±v)=[u′(a)±v′(a)]h得到和差公式。'],'第八讲已经证明求导的常倍与和差法则。现在把共同的输入增量h乘回去，便得到微分公式。常数的微分为零，固定倍数保留。右边仍须有输入增量，不能只留下导数系数。',{seconds:60}),
 practice(10,13),
 p('乘积的真实变化，同时来自两个因素',String.raw`\Delta(uv)=v(a)\Delta u+u(a)\Delta v+\Delta u\,\Delta v`,['先展开[u(a)+Δu][v(a)+Δv]，再减去u(a)v(a)。','最后的交叉项属于精确增量。'],'乘积变化同时来自u变化、v变化，以及两者同时变化。这里每一项都由代数展开得到，整个等式精确成立。下一步才判断哪些项贡献于关于h的一次主部。',{seconds:75}),
 p('交叉项为什么不进入一次主部？',String.raw`\frac{\Delta u\,\Delta v}{h}=\frac{\Delta u}{h}\,\Delta v\longrightarrow u'(a)\cdot0=0`,['可导保证Δu/h有有限极限，也保证Δv→0。','因此交叉项是o(h)，无需把它设成0。'],'u可导使它的差商有有限极限；v可导使v连续，故它的增量趋零。两个量相乘，便说明交叉项除以h趋零。这才是它没有进入一次主部的依据。',{seconds:75}),
 p('乘积微分：两个一阶贡献都保留',String.raw`\boxed{d(uv)=v\,du+u\,dv}`,['这是精确的微分恒等式。','若y=(x²+1)eˣ，则dy=eˣ(2x+x²+1)dx。'],'把精确增量中的一次部分相加，得到乘积微分公式。平方加一乘指数的例子中，前一个因素变化和后一个因素变化都要计算。把右边写成du乘dv，会漏掉两个一次贡献。',{seconds:60}),
 practice(10,14),
 p('商的微分：先看分母能否取值',String.raw`w=\frac uv,\quad u=wv,\quad v(a)\ne0`,['由du=v dw+w dv，解出dw。','u、v在a处可导，且基点分母非零。'],'把商记作w，改写为u等于wv。对这个乘积使用刚刚的公式，再把w换回u除以v，就能解出商的微分。分母非零使原函数有定义，也允许这里的除法。',{seconds:75,steps:[{title:'整理同一基点处的等式',formula:String.raw`\boxed{d\!\left(\frac uv\right)=\frac{v\,du-u\,dv}{v^2}}`,speech:'把w乘dv移到左边，除以v，再代入w等于u除以v，得到分子vdu减udv，分母v平方。'}]}),
 p('约分可以简化计算，原定义域仍须保留',String.raw`f(x)=\frac{x^2-1}{x-1}=x+1\quad(x\ne1)`,['原函数在x≠1处有df=dx。','另定义g(x)=x+1，才得到可在x=1处讨论的新函数。'],'约分等式写明了共同定义域。原函数在一处没有定义，所以不能给它在一处的导数或微分。若补上一处的值，要明确说明正在定义延拓函数。',{seconds:60}),
 practice(10,15),
 p('复合微分：沿对应位置逐层传递',String.raw`u=g(x),\ y=F(u):\qquad du=g'(a)dx,\quad dy=F'(g(a))du`,['代入后dy=F′(g(a))g′(a)dx。','外层在u=g(a)取系数，内层在x=a取系数。'],'四则法则之后再处理复合关系。先算内层的一次变化，再乘外层在对应位置的导数。这个关系来自链式法则，内层导数可以为零，无需做除法。',{seconds:75}),
 p('同一题中，乘积与复合各管一层',String.raw`y=(x^2+1)e^{2x}`,['令u=x²+1、v=e²ˣ：du=2x dx，dv=2e²ˣ dx。','先确认最外层是乘积，再处理指数中的2x。'],'最外层有两个相乘的因素，第二个因素内部又有复合。先各写微分，再用乘积公式组合，规则的层次就不会混淆。',{seconds:75,steps:[{title:'组合后保留共同的dx',formula:String.raw`dy=2e^{2x}(x^2+x+1)dx`,speech:'第一项是二x乘指数再乘dx，第二项是二乘平方加一乘指数再乘dx。合并得到页面上的结果。'}]}),
 practice(10,16),
 p('算得微分以后，再说明怎样使用近似',String.raw`dy=f'(a)h,\qquad\Delta y=dy+r(h),\quad r(h)/h\to0`,['微分公式中的等号是精确的。','用f(a)+dy估计f(a+h)时，省去的部分是r(h)。'],'现在已经能计算复杂函数的微分。下一步把它用于估算时，才需要面对误差。写出一个正确的微分恒等式，还没有自动得到某个有限输入处的精度保证。',{seconds:45}),
 p('根式估算：在容易计算的位置固定基点',String.raw`f(x)=\sqrt x,\quad a=4,\quad h=0.04`,['f(4)=2，dy=f′(4)h=0.01。','因此√4.04的线性估算为2.01。'],'选择基点四，因为函数值和斜率都容易精确计算。导数是四分之一，乘零点零四得到微分零点零一。微分是增量估算，函数值估算还须加上原来的二。',{seconds:75}),
 p('根式误差可以由精确恒等式核验',String.raw`\sqrt{4+h}-2-\frac h4=-\frac{h^2}{4(\sqrt{4+h}+2)^2}`,['4+h>0；右端由有理化得到。','h=0.04时，真值约2.00997512，线性估算偏高约0.00002488。'],'这里保留精确余项，直接看出符号非正，所以切线估算偏高。把h代入以后，还能核对这一次的数值误差。一般函数的误差界需要另外的依据。',{seconds:60}),
 p('回到成本：微分与真实增量逐项核对',String.raw`C(100+h)-C(100)=24h+0.02h^2,\qquad dC=24h`,['C(q)=2000+20q+0.02q²，模型范围0≤q≤200。','本模型的精确残差为0.02h²元。'],'同一个成本函数现在可以通过四则与常倍微分直接计算。基点一百处得到二十四h元，真实增量还多零点零二h平方。输入必须仍在模型允许范围内。',{seconds:60,sourceLabel:'教学情境'}),
 p('把增量调大，误差会放大多少？',String.raw`a=100,\quad C(q)=2000+20q+0.02q^2`,['先预测h减半时，微分和残差各变为多少。','再操作正、负与零增量，核对单位及误差基准。'],'请先写出预测：微分随h成比例，残差随h的平方改变。再使用实验分别核对正向、反向和零增量。h等于零时，绝对误差为零，相对真实增量的误差没有定义。',{seconds:90,foundationLab:'differential-error',foundationFigure:{kind:'differential-error'},layout:'lab',sourceLabel:'教学情境'}),
 p('误差比较什么，必须先声明',String.raw`E_{\rm abs}=|\widehat z-z|,\qquad E_{\rm rel}=\frac{|\widehat z-z|}{|z|}\quad(z\ne0)`,['ẑ表示估算值，z表示真值。','绝对误差 absolute error保留原单位；相对误差 relative error无量纲。','用dy估计Δy时，真值是Δy；用f(a)+dy估计f(a+h)时，真值是f(a+h)。'],'先确认估计的是增量还是总量，再选相应真值作分母。两种相对误差回答不同问题，不能悄悄换分母；真值为零时，应另看绝对误差或明确的新基准。',{seconds:60}),
 p('误差要求与模型范围，需要同时满足',String.raw`|\Delta C-dC|=0.02h^2\le2\quad\Longrightarrow\quad |h|\le10`,['基点a=100时，结合0≤100+h≤200，得−10≤h≤10。','基点a=198时，结合0≤198+h≤200，得−10≤h≤2。'],'先用精确残差解出精度允许的输入范围，再与模型的实际范围取交集。靠近产能上限时，即使误差足够小，也不能允许模型范围以外的产量。',{seconds:75,sourceLabel:'教学情境'}),
 p('一分钟短答：同一切线能否保证同一精度？',String.raw`f(x)=x,\quad g(x)=x+x^2,\quad k(x)=x+100x^2`,['核对0处的函数值、导数与切线。','比较x=0.1处的函数值，说明共同切线提供了什么信息。'],'请独立完成原来的共同切线短答。现在除了算出数值，还要说明微分法则给出了什么，又需要哪些额外信息才能保证固定输入处的精度。',{...writtenTask('l10-written-shared-tangent'),seconds:60}),
 p('短答反馈：一次信息相同，余项仍可不同',String.raw`f'(0)=g'(0)=k'(0)=1,\qquad r_f=0,\quad r_g=h^2,\quad r_k=100h^2`,['在x=0.1处，函数值依次为0.1、0.11、1.1。','每个固定函数有自己的可用范围；共同切线没有提供统一数值精度。'],'三个函数在零处的值和斜率相同，但余项系数不同。在同一个有限输入处，误差可以相差很大。课后的微分进阶题会进一步要求用参数构造反例。',{seconds:60}),
 p('从计算微分，走向严格控制一段变化',undefined,['先识别结构与条件，再算微分，在固定基点代值。','使用近似时，写明对象、余项、误差基准和允许范围。','下一讲的中值定理连接整段增量与内部某点的导数。'],'回看本课的计算顺序：读结构，查条件，算微分，取基点，最后讨论如何使用近似。下一讲从一整段真实变化出发，寻找内部斜率提供的严格保证。',{seconds:45})
];

const product=written.find(x=>x.id==='l10-written-product-cross')!,mixed=written.find(x=>x.id==='l10-written-mixed-domain')!;
export const differentialRulesOptionalPages:readonly DifferentialPage[]=[
 ...[9,10,11,12].map(n=>({...practice(10,n),title:'复习选做：'+practice(10,n).title,routeRole:'optional' as const,sourceNote:'课后复习 · 独立作答；不计入90分钟'})),
 p('课后论证：交叉项与二阶导数',undefined,[product.stem],'请独立写出精确增量，再用极限说明交叉项为什么不贡献于一次主部。之后重新对导函数求导，寻找两个交叉贡献。',{...writtenTask(product.id),routeRole:'optional'}),
 p('论证反馈：一次主部怎样取出？',String.raw`\Delta(uv)=v\Delta u+u\Delta v+\Delta u\Delta v`,['ΔuΔv/h=(Δu/h)Δv→u′(a)·0=0。','因此d(uv)=vdu+udv；精确增量的交叉项仍然存在。'],'可导性保证一个差商趋于有限值、另一个增量趋零。这两条条件共同说明交叉项相对h更快趋零。这里没有宣称交叉项本身等于零。',{routeRole:'optional',seconds:90}),
 p('论证反馈：二阶中为什么有两个交叉贡献？',String.raw`(uv)''=u''v+2u'v'+uv''`,['对u′v求导，得到u″v+u′v′；对uv′求导，得到u′v′+uv″。','u=v=x、a=1时：Δ(uv)=2h+h²，d(uv)=2h，(uv)″=2。'],'先对原函数求一阶导数，再把它作为随基点变化的新函数求导。两个乘积各贡献一次u撇v撇，因此出现系数二。这与固定基点处的一阶微分是不同层次的计算。',{routeRole:'optional',seconds:90}),
 p('课后计算：化简、基点与延拓',undefined,[mixed.stem],'请写明原函数的定义域，再选择合适的运算顺序。完成一般微分之后才在零处取系数，最后区分原函数与另行定义的延拓函数。',{...writtenTask(mixed.id),routeRole:'optional'}),
 p('计算反馈：先求一般微分，再取基点',String.raw`dy=(2x+3)e^{2x}dx\quad(x\ne1)`,['a=0、dx=0.02时，dy=0.06。','原函数在0处的值为1，所以y(0.02)的线性估算为1.06。'],'共同定义域内先约分为x加一乘指数，乘积与链式法则得到一般微分。代入基点零时，系数为三；微分是零点零六，函数值估算还须加上基点值一。',{routeRole:'optional',seconds:90}),
 p('计算反馈：换基点前，先确认函数存在',String.raw`g(x)=(x+1)e^{2x}\ (x\in\mathbb R),\qquad dg\big|_{x=1}=5e^2dx`,['原函数在1处未定义，没有该点的微分。','延拓函数g在1处可导；新基点的系数是5e²。'],'约分不自动扩充原函数定义域。另行定义g以后，可以在一处计算它的微分。此时取的是一处的导数，不能沿用零处的系数三。',{routeRole:'optional',seconds:90})
];
