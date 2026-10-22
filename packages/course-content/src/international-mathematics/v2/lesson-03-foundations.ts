import {math,page,source,table,text} from '../authoring.js';
import type {LessonSlide,SlideElement,SourceReference} from '../types.js';
import type {Insertion} from './authoring.js';

const T=String.raw;
const squareRef=source('1.1',16,16,'Original completing-the-square support extending the textbook multiplication of two brackets.');
const derivationRef=source('2.1',124,126,'Original intermediate steps explaining the textbook quadratic formula.');
const exampleRef=source('2.1',124,125);
const repeatedRef=source('2.1',125,125);
const noRealRef=source('2.1',125,126);
const formula=(value:string,y:number,size=65,color:'blue'|'coral'|'green'='blue')=>math(value,90,y,1390,130,size,color);
const note=(value:string,y=730)=>text(value,100,y,1370,105,35);
function step(before:string,id:string,title:string,sequence:string,ref:SourceReference,elements:readonly SlideElement[],cue:string,extras:Partial<LessonSlide>={}):Insertion{
 return {before,slide:page(3,`${before}-scaffold-${id}`,title,'Step by step',ref,elements,{
  publicLabel:'Worked example',pedagogy:{role:'worked-step',sequence,seconds:70},
  teachingCue:cue,
  assistantCue:'Use clear English. Explain one displayed operation at a time. Work over the real numbers. The leading coefficient is nonzero. Keep feedback private until revealed.',
  ...extras,
 })};
}
const options=(values:readonly [string,string,string,string],y=575)=>values.map((v,i)=>
 math(`${'ABCD'[i]}.\\quad ${v}`,90+(i%2)*715,y+Math.floor(i/2)*125,675,105,43,i%2?'coral':'blue'));

/** The square pattern precedes the formula, rather than being assumed as prior knowledge. */
export const beforeFormula03:readonly Insertion[]=[
 step('10','square-01','A squared bracket has a middle term','complete-square-foundation',squareRef,[
  math(T`(x+3)^2=(x+3)(x+3)`,90,245,1390,110,67),
  table(['×','x','3'],[['x','x²','3x'],['3','3x','9']],90,410,800,345),
  math(T`x^2+3x+3x+9`,980,430,520,130,49),
  text('The two middle products add to 6x.',990,645,510,155,38),
 ],'从四格乘法开始，逐格指出x²、3x、3x、9。英文：“Both cross products belong in the expansion.” 不把(x+3)²误写成x²+9。'),
 step('10','square-02','Half of the middle coefficient','complete-square-foundation',squareRef,[
  formula(T`(x+h)^2=x^2+2hx+h^2`,255,68),
  formula(T`2h=6\qquad h=\frac62=3`,465,74,'coral'),
  note('The middle coefficient is twice h. Half of 6 gives the bracket number 3.'),
 ],'用上一页两个3x解释为什么是2h。先让学生说出6÷2，再说明还要计算3²。英文：“The middle term contains two copies of hx.”'),
 step('10','square-03','The expression keeps its original value','complete-square-foundation',squareRef,[
  formula(T`x^2+6x=x^2+6x+\color{#14877b}{9}-\color{#ee653f}{9}`,245,60),
  formula(T`x^2+6x=(x+3)^2-9`,465,75),
  note('+9−9 adds zero, so the value stays the same.'),
 ],'区分改写一个表达式与解方程。补进9以后必须减回9，不能凭空改变函数值。可在x=0时口头核对。英文：“We added zero in the form nine minus nine.”'),
 step('10','square-04','The constant moves to the other side','complete-square-foundation',derivationRef,[
  formula(T`x^2+6x+5=0`,265,80),
  formula(T`x^2+6x=-5`,490,80),
  note('Subtract 5 from both sides of the equation.'),
 ],'开始一个完整的新例题：x²+6x+5=0。只做移常数这一步，让学生指出左右两边都减5。此时不同时补平方。'),
 step('10','square-05','The same addition on both sides','complete-square-foundation',derivationRef,[
  formula(T`x^2+6x=-5`,250,75),
  formula(T`x^2+6x+\color{#14877b}{9}=-5+\color{#14877b}{9}`,460,69),
  note('Half of 6 is 3. Its square is 9. Add 9 to both sides.'),
 ],'把“系数一半再平方”与“等式两边同时加”分别说清。英文：“Why nine? Why on both sides?” 等待学生回答后再翻页。'),
 step('10','square-06','The left side becomes one square','complete-square-foundation',derivationRef,[
  formula(T`x^2+6x+9=-5+9`,255,72),
  formula(T`(x+3)^2=4`,480,88),
  note('The bracket square replaces the full left side. The right side is 4.'),
 ],'重新指回四格乘法说明左边为什么等于(x+3)²；右边只做−5+9。不要把开平方与移项也挤到本页。'),
 step('10','square-07','Two signs after taking a square root','complete-square-foundation',derivationRef,[
  formula(T`(x+3)^2=4`,235,76),
  formula(T`x+3=2\quad\text{or}\quad x+3=-2`,410,65),
  ...options([T`-1,\ -5`,T`1,\ 5`,T`-1,\ 5`,T`1,\ -5`],595),
 ],'先把x+3看成一个整体，指出2²与(−2)²都等于4。学生先选根，再揭示反馈。英文：“Both signs matter.”',{
  question:'Which pair solves x²+6x+5=0?',answer:'A. From x+3=2, x=−1. From x+3=−2, x=−5.',
  pedagogy:{role:'checkpoint',sequence:'complete-square-foundation',seconds:100},
 }),
 step('10','square-08','Both values satisfy the original equation','complete-square-foundation',derivationRef,[
  formula(T`f(x)=x^2+6x+5`,240,76),
  table(['Value','Substitution','Result'],[['−1','1−6+5','0'],['−5','25−30+5','0']],90,450,1390,300),
 ],'回到最初方程检验−1和−5。强调根是使原式为0的输入，不是括号里的3，也不是开方后的2。',{
  teachingCue:'回到最初方程检验−1和−5。英文：“A solution makes the original equation true.” 完成本例后再转入一般公式。',
 }),
 step('10','origin-01','A general quadratic equation','formula-origin',derivationRef,[
  formula(T`ax^2+bx+c=0\qquad a\ne0`,245,72),
  formula(T`4a^2x^2+4abx+4ac=0`,455,67),
  note('Multiply both sides by 4a. The first two terms can become part of a square.'),
 ],'把这是同一配方方法的符号版说清。4a可为正或负，但不为0，所以等价变形成立。只需要理解来源，通用推导不要求当场背写。'),
 step('10','origin-02','Completing the general square','formula-origin',derivationRef,[
  formula(T`4a^2x^2+4abx+b^2=b^2-4ac`,245,60),
  formula(T`(2ax+b)^2=b^2-4ac`,465,75),
  note('Subtract 4ac from both sides, then add b² to both sides.'),
 ],'用(2ax+b)²的交叉项4abx解释这一平方。左右同时加b²，右端保留−4ac。此推导避免错误地把√(4a²)写成2a。'),
 step('10','origin-03','The quadratic formula comes from the square','formula-origin',derivationRef,[
  formula(T`(2ax+b)^2=D,\qquad D=b^2-4ac`,230,56),
  formula(T`2ax+b=\pm\sqrt D`,420,69),
  formula(T`x=\frac{-b\pm\sqrt D}{2a}`,620,73),
  text('For real roots, D must be nonnegative.',100,790,1370,60,33),
 ],'限定D≥0，再先减b、后把整个等式除以2a。明确分母作用于完整分子。英文：“The formula solves the same square equation for any nonzero a.”'),
];

/** Hour 1 ends with the three discriminant cases. Hour 2 starts with a≠1 examples. */
export const afterFirstRoots03:readonly Insertion[]=[
 step('12','discriminant-01','Zero discriminant gives a repeated root','formula-discriminant',repeatedRef,[
  formula(T`x^2-4x+4=0\qquad D=(-4)^2-4(1)(4)=0`,235,54),
  formula(T`x=\frac{4\pm0}{2}=2`,465,84),
  note('Both branches give the same value. There is one distinct real root.'),
 ],'教材§2.1第125页例(b)。逐一读4+0与4−0，不把±当成两个不同数的保证。'),
 step('12','discriminant-02','A negative discriminant gives no real root','formula-discriminant',noRealRef,[
  formula(T`3x^2-5x+6=0`,245,79),
  formula(T`D=(-5)^2-4(3)(6)=25-72=-47`,445,60),
  note('A real square is never negative. A square equal to −47 has no real solution.'),
 ],'教材§2.1第125–126页例(c)。先判断−47的符号，再停止实数开方。说no real roots，不笼统说所有数域无解。',{
  question:'How many real roots? A: 2   B: 1   C: 0   D: 47',answer:'C. D=−47<0, so there are no real roots.',
  pedagogy:{role:'checkpoint',sequence:'formula-discriminant',seconds:95},
 }),
 step('12','discriminant-03','The discriminant counts distinct real roots','formula-discriminant',derivationRef,[
  table(['Discriminant D','Real roots','Reason'],[['D>0','Two distinct roots','+√D and −√D differ'],['D=0','One repeated root','+0 and −0 agree'],['D<0','No real roots','A real square cannot be negative']],90,255,1390,430),
  note('The sign of D counts roots. It does not give the signs of the roots.',735),
 ],'第一学时收束。区分判别式的正负与根的正负。为下一学时教材例(a)两个负根作准备。',{
  question:'D>0 guarantees: A: positive roots   B: integer roots   C: two distinct real roots   D: opposite signs',
  answer:'C. D>0 guarantees two distinct real roots. Their signs and whether they are integers require further calculation.',
  pedagogy:{role:'misconception',sequence:'formula-discriminant',seconds:100},
 }),
 step('12','leading-01','The leading coefficient stays outside','complete-square-leading',derivationRef,[
  formula(T`2x^2+8x+6=2(x^2+4x+3)`,270,70),
  formula(T`x^2+4x+3=x^2+4x+4-1`,485,65),
  note('Factor out 2 from every term before completing the square inside.'),
 ],'第二学时起点。原创新数值例，先提出2，内部一次项系数变为4。强调不能直接对原来的8取一半。'),
 step('12','leading-02','The outside coefficient multiplies both terms','complete-square-leading',derivationRef,[
  formula(T`x^2+4x+3=(x+2)^2-1`,250,71),
  formula(T`2x^2+8x+6=2(x+2)^2-2`,465,67),
  note('Multiplying the completed form by 2 also multiplies the constant −1.'),
 ],'指出外面的2乘平方项，也乘−1。可口头令x=0检查两边同为6。英文：“The factor outside multiplies the whole bracket.”',{
  question:'The final constant is: A: −1   B: −2   C: +2   D: +6',answer:'B. The outside factor multiplies −1, giving −2.',
  pedagogy:{role:'checkpoint',sequence:'complete-square-leading',seconds:85},
 }),
 step('12','book-a-01','Coefficients when a is not one','formula-textbook-example',exampleRef,[
  formula(T`2x^2+9x+5=0`,245,83),
  table(['a','b','c','−b','2a'],[['2','9','5','−9','4']],90,465,1390,220),
  note('The negative of b is −9. The full denominator is 4.'),
 ],'教材§2.1第124页例(a)，保留原方程与数值。对比前例b=−5与此例b=+9：−b未必为正。'),
 step('12','book-a-02','The discriminant uses signed coefficients','formula-textbook-example',exampleRef,[
  formula(T`D=9^2-4(2)(5)=81-40=41`,275,70),
  formula(T`x=\frac{-9\pm\sqrt{41}}{4}`,495,82),
  note('Keep √41 until the final calculation to avoid early rounding.'),
 ],'先算括号中的4ac，再作81−40。41不是完全平方数，保留根号；这正是公式比凑整数因式更普遍的地方。'),
 step('12','book-a-03','Both branches use the whole denominator','formula-textbook-example',exampleRef,[
  formula(T`x_+=\frac{-9+\sqrt{41}}4\approx-0.649`,255,70),
  formula(T`x_-=\frac{-9-\sqrt{41}}4\approx-3.851`,480,70),
  note('Enter the numerator in brackets, then divide by 4. Round the final roots.'),
 ],'教材第125页保留三位小数。计算器输入(-9+sqrt(41))/4与(-9-sqrt(41))/4，括住完整分子；正判别式也可以得到两个负根。'),
 step('12','book-a-04','Rounded roots give small residuals','formula-textbook-example',exampleRef,[
  formula(T`f(x)=2x^2+9x+5`,240,75),
  table(['Rounded input','f(x)','Interpretation'],[['−0.649','0.001402','Close to zero'],['−3.851','0.001402','Close to zero']],90,440,1390,300),
  note('The exact radical roots give zero. Three-decimal approximations give a small residual.',740),
 ],'与教材第125页的代回检查一致。残差非0是三位小数近似造成，不把近似根说成精确满足0，也不反过来否定正确公式。'),
];

export const LESSON03_FOUNDATION_KEYS=[...beforeFormula03,...afterFirstRoots03].map(i=>i.slide.slideKey);
