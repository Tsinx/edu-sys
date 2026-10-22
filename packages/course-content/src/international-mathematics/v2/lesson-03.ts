import {author,type Insertion} from './authoring.js';import {lesson03} from '../lessons/lesson-03.js';
import {beforeFormula03,afterFirstRoots03} from './lesson-03-foundations.js';
import type {MathematicsLesson} from '../types.js';
const {m,c,q,e,t,g}=author(3,lesson03.sources[0]!);
export const additions03:readonly Insertion[]=[
 c('02','a','A larger quantity can lower the price','The ticket model charges p(q)=100−q dollars per ticket.','Price and quantity change together.'),
 t('02','b','Read the price schedule',['q','10','30','50'],[['p(q) ($)','90','70','50']],'Higher modelled sales require a lower price.'),
 m('03','a','Multiply the unit price by quantity',String.raw`R(q)=p(q)q`,'Revenue is money received before costs.',{sequence:'ticket-revenue'}),
 m('03','b','Substitute the price rule',String.raw`R(q)=(100-q)q`,'The same q appears in both factors.',{sequence:'ticket-revenue'}),
 m('04','a','Distribute the quantity',String.raw`q(100-q)=100q-q^2`,'The moving price creates a quadratic term.',{sequence:'ticket-revenue'}),
 m('04','b','Test a twenty-ticket receipt',String.raw`R(20)=100(20)-20^2=1600`,'Twenty tickets at eighty dollars give the same revenue.',{sequence:'ticket-revenue'}),
 t('05','a','Equal quantity steps, unequal revenue steps',['q','20','30','40'],[['R(q) ($)','1600','2100','2400']],'The successive gains are $500 and $300.'),
 q('05','b','Will ten more always add the same revenue?','Revenue rises $500 from 20 to 30 tickets. Must it rise $500 from 30 to 40?','No. The price falls with quantity; the next gain is $300.'),
 m('06','a','Match each coefficient to its term',String.raw`100q-q^2=-1q^2+100q+0`,'The quadratic coefficient is −1, not 100.'),
 c('06','b','A nonzero square term makes it quadratic','The coefficient of q² must be nonzero.','A zero quadratic coefficient reduces the expression to a line.'),
 c('07','a','The leading sign controls the bend','A negative quadratic coefficient gives a downward opening parabola.','It permits a peak, but the feasible domain still matters.'),
 e('07','b','A negative coefficient is not a negative value','“Because the q² coefficient is negative, all revenues are negative.”','The full expression can be positive. At q=20 revenue is $1600.'),
 m('08','a','Use the factored revenue form',String.raw`q(100-q)=0`,'A zero product requires at least one zero factor.',{sequence:'revenue-zeros'}),
 m('08','b','Read the first zero factor',String.raw`q=0`,'Selling no tickets gives no ticket revenue.',{sequence:'revenue-zeros'}),
 m('09','a','Read the second zero factor',String.raw`100-q=0\quad\Longrightarrow\quad q=100`,'The price reaches zero at one hundred tickets.',{sequence:'revenue-zeros'}),
 c('09','b','Two zeros can have different meanings','Zero quantity and zero price both make revenue vanish.','Keep the algebraic roots connected to the receipt.',{sequence:'revenue-zeros'}),
 m('09','c','Check the factors in a second equation',String.raw`(x-2)(x-3)=x^2-3x-2x+6`,'The cross terms combine to −5x.'),
 ...beforeFormula03,
 m('10','a','Signed coefficients in standard form',String.raw`x^2-5x+6=0:\quad a=1,\ b=-5,\ c=6`,'Standard form has zero on the right. Each coefficient includes its sign.',{sequence:'quadratic-roots',cue:'先读a=1，再读b=−5。不可把−5x的系数写成5。对照刚推导的公式逐项定位。'}),
 m('10','b','Calculate the discriminant',String.raw`b^2-4ac=(-5)^2-4(1)(6)=1`,'A positive discriminant permits two real roots.',{sequence:'quadratic-roots'}),
 m('10','c','The square root and the two branches',String.raw`\sqrt{1}=1\qquad \pm\sqrt{1}=+1\ \text{or}\ -1`,'√1 names the positive square root. The ± sign supplies both branches.',{sequence:'quadratic-roots'}),
 q('10','d','The negative of a negative coefficient','If b=−5, what is −b? A: −5   B: +5   C: 25   D: −25','B. −b=−(−5)=+5. Squaring b is a different operation.'),
 m('11','a','The plus branch divides the whole numerator',String.raw`x_+=\frac{5+1}{2(1)}=\frac62=3`,'Both terms in the numerator share the denominator 2a.',{sequence:'quadratic-roots'}),
 m('11','b','The minus branch is a second calculation',String.raw`x_-=\frac{5-1}{2(1)}=\frac42=2`,'The ± symbol asks for two separate calculations.',{sequence:'quadratic-roots'}),
 m('11','c','Check one root in the original expression',String.raw`2^2-5(2)+6=4-10+6=0`,'Substitution checks arithmetic and signs.',{sequence:'quadratic-roots'}),
 m('11','d','Check the other root',String.raw`3^2-5(3)+6=9-15+6=0`,'Both returned values solve the equation.',{sequence:'quadratic-roots'}),
 ...afterFirstRoots03,
 t('12','a','Use test points between and beyond roots',['x','1','2.5','4'],[['x²−5x+6','2','−0.25','2']],'The expression is negative between the two roots.'),
 c('12','b','Roots divide a sign diagram','The factors can change sign only at their zeros.','Test each interval rather than guessing from one point.'),
 m('13','a','Find the midpoint of the revenue zeros',String.raw`\frac{0+100}{2}=50`,'The revenue parabola is symmetric around q=50.'),
 t('13','b','Check a symmetric pair',['q','40','50','60'],[['R(q) ($)','2400','2500','2400']],'Equal distances from the symmetry axis give equal values.'),
 q('13','c','Predict the matching value','If R(30)=2100, what is R(70) by symmetry around q=50?','$2100; both quantities are twenty units from the symmetry axis.'),
 m('14','a','The negative leading coefficient stays outside',String.raw`100q-q^2=-(q^2-100q)`,'Distributing the outside minus sign returns −q²+100q.',{sequence:'revenue-peak',cue:'回用a=2例的“先提出首项系数”。这里先提出−1。括号内一次项系数为−100。'}),
 m('14','b','Half of −100 is −50',String.raw`q^2-100q+2500=(q-50)^2`,'The half-coefficient is −50. Its square is positive 2500.',{sequence:'revenue-peak',cue:'让学生口算−100÷2=−50，再算(−50)²=2500。左式多出的2500需要在下一步减回。'}),
 m('14','c','The outside minus sign changes both terms',[String.raw`q^2-100q=(q-50)^2-2500`,String.raw`R(q)=-[(q-50)^2-2500]=2500-(q-50)^2`],'The outside minus sign changes −2500 to +2500.',{sequence:'revenue-peak',cue:'先减回补入的2500，再把外部−1乘整个括号。英文：“The outside minus sign applies to both terms.”'}),
 c('14','d','Locate the largest possible value','The square is smallest when q=50.','The model revenue cannot exceed $2500.',{sequence:'revenue-peak'}),
 m('15','a','Recover the price at the peak',String.raw`p(50)=100-50=50`,'The quantity answer determines a price answer.',{sequence:'revenue-peak'}),
 m('15','b','Check the peak receipt directly',String.raw`50\times50=2500`,'The multiplication confirms the completed-square result.',{sequence:'revenue-peak'}),
 c('16','a','Costs describe another money flow','C(q)=100+20q+0.5q² contains fixed and variable costs.','The fixed part remains when no tickets are sold.'),
 m('16','b','Calculate costs at twenty tickets',String.raw`C(20)=100+400+200=700`,'Costs must use the same output as revenue.',{sequence:'ticket-profit'}),
 m('16','c','Separate fixed and variable cost',String.raw`VC(20)=400+200=600`,'Adding the $100 fixed part gives total cost $700.',{sequence:'ticket-profit'}),
 m('17','a','Subtract the entire cost function',String.raw`\pi(q)=(100q-q^2)-(100+20q+0.5q^2)`,'The minus sign applies to every cost term.',{sequence:'ticket-profit'}),
 m('17','b','Collect like terms',String.raw`\pi(q)=80q-1.5q^2-100`,'The fixed cost appears with a negative sign in profit.',{sequence:'ticket-profit'}),
 m('18','a','Use equal output on both sides',String.raw`\pi(20)=R(20)-C(20)`,'A comparison at different quantities would not be this profit.',{sequence:'ticket-profit'}),
 m('18','b','Calculate the net result',String.raw`1600-700=900`,'At twenty tickets the model profit is nine hundred dollars.',{sequence:'ticket-profit'}),
 m('18','c','Verify with the collected profit rule',String.raw`80(20)-1.5(20)^2-100=900`,'The direct polynomial evaluation agrees with revenue minus cost.',{sequence:'ticket-profit'}),
 t('19','a','A quantity comparison needs profit too',['q','Revenue','Cost','Profit'],[['20','1600','700','900'],['50','2500','2350','150']],'More revenue can accompany less profit.'),
 q('19','b','Do more sales guarantee more profit?','Compare the model profits at q=20 and q=50. What does the result show?','Profit falls from $900 to $150; higher sales do not guarantee higher profit.'),
 c('20','a','Break-even means two money flows match','Revenue equals total cost, so profit is zero.','Break-even is different from maximizing either flow.'),
 m('20','b','Write the break-even equation',String.raw`80q-1.5q^2-100=0`,'The roots are candidate output levels, subject to the domain.'),
 c('21','a','A root must also be a feasible output','The model permits quantities from zero to one hundred.','An algebraic answer must be checked against business constraints.'),
 q('21','b','Interpret a fractional ticket count','A model root is 1.28 tickets. Can a firm literally sell 1.28 indivisible tickets?','No. The continuous model can locate a boundary; whole-ticket decisions need separate checks.'),
 c('22','a','Change one coefficient at a time','A coefficient change can move the curve, change its curvature, or shift its symmetry axis.','Specify what changed before comparing graphs.'),
 m('22','b','A fixed cost shifts profit vertically',String.raw`\pi_K(q)=80q-1.5q^2-K`,'Changing K does not change the revenue curve.'),
 e('23','a','Revenue leaves out the cost side','“The largest revenue is automatically the largest profit.”','Profit equals revenue minus cost. Changing costs can move the profit-maximizing output.'),
 m('23','b','Repair a missing bracket',String.raw`R-(100+20q)=R-100-20q`,'Subtract both cost terms, not just the first.'),
 q('23','c','Read an empty-operation profit','At q=0, revenue is zero and fixed cost is $100. What is profit?','−$100 under the stated cost model.'),
 c('23','d','Name the objective before optimizing','Maximum sales, maximum revenue and maximum profit are different questions.','Choose the function that answers the stated decision.')
];
/** Give the difficult operations their handbook time, rather than spreading time uniformly. */
export const timing03=[
 ['im-l03-01','im-l03-09',720],
 ['im-l03-10-scaffold-square-01','im-l03-10-scaffold-square-08',780],
 ['im-l03-10-scaffold-origin-01','im-l03-10-scaffold-origin-03',360],
 ['im-l03-10-a','im-l03-11',600],
 ['im-l03-12-scaffold-discriminant-01','im-l03-12-scaffold-discriminant-03',240],
 ['im-l03-12-scaffold-leading-01','im-l03-12-scaffold-leading-02',240],
 ['im-l03-12-scaffold-book-a-01','im-l03-12-scaffold-book-a-04',300],
 ['im-l03-12-a','im-l03-14',360],
 ['im-l03-15-a','im-l03-22',420],
 ['im-l03-23-a','im-l03-24',180],
] as const;
export function schedule03(lesson:MathematicsLesson):MathematicsLesson{
 const slides=[...lesson.slides],covered=new Set<string>();
 for(const [first,last,seconds]of timing03){
  const start=slides.findIndex(s=>s.slideKey===first),end=slides.findIndex(s=>s.slideKey===last);
  if(start<0||end<start)throw Error(`Lecture 3 timing anchor: ${first}`);
  const block=slides.slice(start,end+1),total=block.reduce((n,s)=>n+s.pedagogy!.seconds!,0);
  const durations=block.map(s=>Math.floor(seconds*s.pedagogy!.seconds!/total));
  let remaining=seconds-durations.reduce((a,b)=>a+b,0);
  for(let i=0;remaining>0;i=(i+1)%durations.length,remaining--)durations[i]!++;
  block.forEach((s,i)=>{if(covered.has(s.slideKey)||s.optionalChallenge)throw Error('Overlapping Lecture 3 schedule');covered.add(s.slideKey);slides[start+i]={...s,pedagogy:{...s.pedagogy!,seconds:durations[i]!}};});
 }
 if(covered.size!==slides.filter(s=>!s.optionalChallenge).length)throw Error('Incomplete Lecture 3 schedule');
 return {...lesson,slides};
}
export const guides03=['0–12分钟票价、收入、二次项与因式分解复习；12–25分钟从(x+3)²的四格乘法讲系数一半、补9与减9，并解x²+6x+5=0；25–31分钟把同一配方过程连接到通用求根公式；31–41分钟逐项识别a、b、c，核对−b、D与整个分母2a，分开算±两支并代回；41–45分钟检查两实根、重根和无实根。话术：“Why nine?” “The same addition on both sides.” “Divide the whole numerator.”','0–4分钟a=2时先提出系数再配方；4–9分钟逐步算教材2x²+9x+5=0，两根保留到最后再近似并核对残差；9–15分钟符号、对称与收入模型配方，特别解释外部负号；15–22分钟用熟悉表格区分收入、成本、利润与可行范围；22–25分钟错误诊断和出口检查；25–45分钟全班分层选择题练习，其中说明2分钟、独立作答14分钟、反馈4分钟。英文话术：“A real square is nonnegative.” “The outside factor multiplies the whole bracket.” “A rounded root gives a small residual.”'] as const;
