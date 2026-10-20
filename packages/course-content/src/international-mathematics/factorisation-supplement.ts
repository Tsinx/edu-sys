import type {LessonSlide, MathematicsLesson, SlideElement} from './types.js';
import {math, page, plot, source, table, text} from './authoring.js';

/** Append-only storage slot. The course directory and adjacency place it after Lecture 3. */
export const FACTORISATION_LESSON_NUMBER = 17;
export const FACTORISATION_LABEL = 'Lecture 3 supplement';
export const FACTORISATION_TITLE = 'Factoring Quadratics: Step by Step';
export const FACTORISATION_REFERENCE = source('2.1',127,128,
 'Original foundation supplement extending the textbook explanation. Examples and choice questions are supplementary, not quoted textbook exercises.');
export const FACTORISATION_WORKED_EXAMPLES = [
 {id:'F1',coefficients:[6,5,1],factors:[2,3],pages:[3,4,5,6,7]},
 {id:'F2',coefficients:[12,7,1],factors:[3,4],pages:[10,11,12]},
 {id:'F3',coefficients:[6,-5,1],factors:[-2,-3],pages:[13,14,15]},
 {id:'F4',coefficients:[-6,1,1],factors:[3,-2],pages:[17,18]},
 {id:'F5',coefficients:[-6,-1,1],factors:[2,-3],pages:[20,21]},
 {id:'F6',coefficients:[9,6,1],factors:[3,3],pages:[24,25]},
 {id:'F7',coefficients:[-9,0,1],factors:[-3,3],pages:[26,27]},
 {id:'F8',coefficients:[0,5,1],factors:[0,5],pages:[28,29]},
] as const;

const T=String.raw;
const line=(value:string,y=300,size=72,color:'blue'|'coral'|'green'='blue')=>math(value,85,y,1430,125,size,color);
const note=(value:string,y=700,size=37)=>text(value,90,y,1390,110,size);
function slide(n:number,title:string,kicker:string,elements:readonly SlideElement[],extras:Partial<LessonSlide>={}):LessonSlide {
 const example=FACTORISATION_WORKED_EXAMPLES.find(e=>(e.pages as readonly number[]).includes(n));
 return page(FACTORISATION_LESSON_NUMBER,String(n).padStart(2,'0'),title,kicker,FACTORISATION_REFERENCE,elements,{
  teachingCue:'Allow thinking time. Ask for the sum and product before accepting a pair. Reveal the check only after a choice.',
  assistantCue:'Answer in English. This supplement starts with x squared coefficient 1 and integer factor pairs. Distinguish factors from roots. Do not disclose an unrevealed answer.',
  pedagogy:{role:example?'worked-step':'concept',...(example?{sequence:example.id}:{}),seconds:60},
  ...(example?{publicLabel:'Worked example' as const}:{}),...extras,
 });
}
/** Four visible choices, with the key and feedback confined to the existing reveal controller. */
const choices=(options:readonly [string,string,string,string]):SlideElement[]=>options.map((value,i)=>
 math(`${'ABCD'[i]}.\\quad ${value}`,90+(i%2)*730,570+Math.floor(i/2)*130,675,100,43,i%2?'coral':'blue'));

export const FACTORISATION_SLIDES:readonly LessonSlide[]=[
 slide(1,'Two brackets, one quadratic','Lecture 3 supplement',[
  line(T`x^2+5x+6`,285,96),line(T`(x+\square)(x+\square)`,505,88),
  note('The coefficient of x² is 1. What belongs in the two spaces?',740),
 ],{question:'Which operation lets you check a proposed factorisation?',answer:'Expand the two brackets and collect like terms. The result must match every coefficient.'}),
 slide(2,'Multiply every term inside the bracket','Before two brackets',[
  line(T`x(x+3)=x\cdot x+x\cdot3`,275,72),line(T`=x^2+3x`,465,84),
  note('The outside x multiplies both inside terms.',700),
 ],{question:'Which expansion equals 2(x+3)? A: 2x+3   B: 2x+6   C: x+6   D: 6x',answer:'B. Multiply both terms by 2: 2x+6.',pedagogy:{role:'checkpoint',seconds:60}}),
 slide(3,'Four products fill the grid','Example 1 of 8',[
  math(T`(x+2)(x+3)`,85,245,1400,100,70),
  table(['×','x','+3'],[['x','x²','3x'],['+2','2x','6']],90,395,880,365),
  text('Each row term multiplies each column term.',1040,420,440,210,42),
  text('Four products. Keep every sign.',1040,660,440,140,36,'coral'),
 ]),
 slide(4,'The middle terms describe the same power','Example 1 of 8',[
  line(T`x^2+\color{#2357d8}{3x}+\color{#ee653f}{2x}+6`,280,84),
  line(T`=x^2+\color{#14877b}{5x}+6`,490,84),
  note('3x+2x=5x. The x² term and the constant stay separate.',710),
 ]),
 slide(5,'Reverse the multiplication','Example 1 of 8',[
  line(T`x^2+5x+6=(x+m)(x+n)`,280,72),
  math(T`m+n=5`,90,505,670,120,76,'coral'),math(T`mn=6`,835,505,660,120,76,'green'),
  note('The same two numbers must satisfy both conditions.',720),
 ]),
 slide(6,'Find a pair with product 6 and sum 5','Example 1 of 8',[
  table(['Pair','Product','Sum'],[['1 and 6','6','7'],['2 and 3','6','5']],90,275,1390,325,1),
  note('2 and 3 pass both checks. 1 and 6 pass only the product check.',680),
 ]),
 slide(7,'Build the factors and check the result','Example 1 of 8',[
  line(T`x^2+5x+6=(x+2)(x+3)`,270,74),
  line(T`(x+2)(x+3)=x^2+3x+2x+6`,455,63),
  note('The expansion returns x²+5x+6, so the factorisation is correct.',685),
 ],{question:'In (x+2)(x+3), which operation produces the constant 6?',answer:'Multiply the bracket constants: 2×3=6.'}),
 slide(8,'Why the sum and product test works','The general rule',[
  line(T`(x+m)(x+n)=x^2+nx+mx+mn`,245,65),
  line(T`=x^2+(m+n)x+mn`,440,76),
  math(T`\color{#ee653f}{m+n=b}`,90,665,660,120,69),math(T`\color{#14877b}{mn=c}`,835,665,660,120,69),
 ],{question:'For x²+bx+c, which target is the sum, and which target is the product?',answer:'The sum is b. The product is c.'}),
 slide(9,'Decide the signs before searching','Nonzero integer factors',[
  table(['Constant c','Middle coefficient b','Signs of m and n'],[
   ['Positive','Positive','Both positive'],['Positive','Negative','Both negative'],
   ['Negative','Positive or negative','Opposite signs'],
  ],90,265,1390,380),
  note('With opposite signs, the number with larger absolute value decides the sign of the sum.',695,35),
 ],{question:'If c>0 and b<0, which signs work? A: +,+   B: −,−   C: +,−   D: either number is 0',answer:'B. A positive product needs matching signs. A negative sum makes both numbers negative.'}),
 slide(10,'Search systematically for a new pair','Example 2 of 8',[
  line(T`x^2+7x+12`,270,94),
  math(T`m+n=7`,90,500,660,120,76,'coral'),math(T`mn=12`,835,500,660,120,76,'green'),
  note('Both numbers are positive. List factor pairs of 12 in order.',715),
 ]),
 slide(11,'One factor pair passes both checks','Example 2 of 8',[
  table(['Pair','Product','Sum'],[['1 and 12','12','13'],['2 and 6','12','8'],['3 and 4','12','7']],90,265,1390,390,2),
  note('Stop when the two conditions match. Reversing a pair gives the same factors.',710,35),
 ]),
 slide(12,'Complete the second factorisation','Example 2 of 8',[
  line(T`x^2+7x+12=(x+3)(x+4)`,265,73),
  line(T`x^2+4x+3x+12=x^2+7x+12`,465,64),
  note('Try the next pair yourself: product 15 and sum 8.',705),
 ],{question:'Which numbers fit? A: 1 and 15   B: 2 and 6   C: 3 and 5   D: −3 and −5',answer:'C. 3×5=15 and 3+5=8.'}),
 slide(13,'Positive product, negative sum','Example 3 of 8',[
  line(T`x^2-5x+6`,275,94),
  math(T`m+n=-5`,90,500,660,120,73,'coral'),math(T`mn=6`,835,500,660,120,76,'green'),
  note('A positive product gives matching signs. The negative sum makes both signs negative.',710,35),
 ]),
 slide(14,'Keep the negative signs in the search','Example 3 of 8',[
  table(['Pair','Product','Sum'],[['−1 and −6','6','−7'],['−2 and −3','6','−5']],90,285,1390,325,1),
  line(T`(-2)(-3)=6\qquad -2+(-3)=-5`,675,65),
 ]),
 slide(15,'Two negative constants give these brackets','Example 3 of 8',[
  line(T`x^2-5x+6=(x-2)(x-3)`,265,75),
  line(T`(x-2)(x-3)=x^2-3x-2x+6`,465,66),
  note('The two middle terms combine to −5x.',710),
 ],{question:'What creates the positive constant 6?',answer:'The product of the two negative constants: (−2)(−3)=+6.'}),
 slide(16,'A correct product can hide a wrong sum','Check a proposed factorisation',[
  line(T`x^2-5x+6\;\stackrel{?}{=}\;(x-1)(x-6)`,265,66),
  ...choices([T`\text{Both checks pass}`,T`\text{The product is wrong}`,T`\text{The sum is }-7`,T`\text{The sum is }+7`]),
 ],{question:'Which diagnosis is correct?',answer:'C. (−1)(−6)=6, but −1−6=−7. The expansion gives x²−7x+6.',pedagogy:{role:'misconception',seconds:60}}),
 slide(17,'A negative product needs opposite signs','Example 4 of 8',[
  math(T`x^2+x-6`,90,240,1390,100,86),
  table(['Pair','Product','Sum'],[['−1 and 6','−6','5'],['1 and −6','−6','−5'],['−2 and 3','−6','1'],['2 and −3','−6','−1']],90,405,1390,365,2),
 ],{question:'The coefficient of x is 1. Which pair has sum 1?',answer:'−2 and 3. The larger absolute value is positive.'}),
 slide(18,'Collect the positive and negative middle terms','Example 4 of 8',[
  line(T`x^2+x-6=(x+3)(x-2)`,265,74),
  line(T`(x+3)(x-2)=x^2-2x+3x-6`,455,65),
  note('−2x+3x=+x. Keep the constant product −6.',710),
 ]),
 slide(19,'Try another opposite-sign pair','Choose one answer',[
  line(T`x^2+2x-8`,255,88),
  ...choices([T`(x+4)(x-2)`,T`(x-4)(x+2)`,T`(x+4)(x+2)`,T`(x+8)(x-1)`]),
 ],{question:'Which factorisation has product −8 and middle coefficient +2?',answer:'A. 4×(−2)=−8 and 4−2=2.',pedagogy:{role:'checkpoint',seconds:60}}),
 slide(20,'Change the sum from +1 to −1','Example 5 of 8',[
  line(T`x^2-x-6`,260,92),
  table(['Pair','Product','Sum'],[['3 and −2','−6','+1'],['2 and −3','−6','−1']],90,465,1390,290,1),
 ],{question:'Which number needs the larger absolute value when the sum is negative?',answer:'The negative number. Here −3 has larger absolute value than +2.'}),
 slide(21,'The middle coefficient fixes the order of signs','Example 5 of 8',[
  line(T`x^2-x-6=(x+2)(x-3)`,265,75),
  line(T`(x+2)(x-3)=x^2-3x+2x-6`,455,65),
  note('The middle terms now combine to −x.',710),
 ]),
 slide(22,'Moving a minus sign changes the polynomial','Compare two expansions',[
  line(T`(x+3)(x-2)=x^2+x-6`,265,74),
  line(T`(x-3)(x+2)=x^2-x-6`,465,74,'coral'),
  note('The constant stays −6. The middle coefficient changes sign.',710),
 ],{question:'Which check detects this difference? A: leading coefficient   B: product only   C: sum   D: constant only',answer:'C. The sums are +1 and −1.',pedagogy:{role:'misconception',seconds:60}}),
 slide(23,'Use both targets without a factor table','Choose one answer',[
  line(T`x^2-2x-8`,255,88),
  ...choices([T`(x-4)(x-2)`,T`(x+4)(x-2)`,T`(x-4)(x+2)`,T`(x-8)(x+1)`]),
 ],{question:'Which factorisation has product −8 and sum −2?',answer:'C. −4×2=−8 and −4+2=−2.',pedagogy:{role:'checkpoint',seconds:60}}),
 slide(24,'A factor pair can use the same number twice','Example 6 of 8',[
  line(T`x^2+6x+9`,250,88),
  math(T`3+3=6`,90,450,660,115,73,'coral'),math(T`3\times3=9`,835,450,660,115,73,'green'),
  line(T`x^2+6x+9=(x+3)(x+3)=(x+3)^2`,660,62),
 ]),
 slide(25,'Squaring a bracket includes a middle term','Example 6 of 8',[
  line(T`(x+3)^2=x^2+3x+3x+9`,270,73),
  line(T`=x^2+6x+9`,475,82),
  note('When (x+3)²=0, both equal factors give the same root x=−3.',715,36),
 ],{question:'How many distinct real roots does (x+3)²=0 have? A: 0   B: 1   C: 2   D: 3',answer:'B. One distinct root, x=−3, repeated in both factors.'}),
 slide(26,'A missing middle term means b=0','Example 7 of 8',[
  line(T`x^2-9=x^2+0x-9`,270,85),
  math(T`m+n=0`,90,490,660,120,76,'coral'),math(T`mn=-9`,835,490,660,120,76,'green'),
  note('Equal absolute values and opposite signs give a zero sum.',715),
 ]),
 slide(27,'The cross terms cancel','Example 7 of 8',[
  line(T`x^2-9=(x-3)(x+3)`,255,80),
  line(T`(x-3)(x+3)=x^2+3x-3x-9`,450,67),
  note('The same sum-and-product rule explains the difference of two squares.',710,36),
 ],{question:'Which factors give x²−16? A: (x−4)²   B: (x+4)²   C: (x−8)(x+2)   D: (x−4)(x+4)',answer:'D. The constants multiply to −16 and add to 0.'}),
 slide(28,'A zero constant leaves a common factor','Example 8 of 8',[
  line(T`x^2+5x=x^2+5x+0`,260,84),
  line(T`x^2+5x=x\cdot x+x\cdot5`,460,75),
  note('Both terms contain x. Take that common factor outside.',710),
 ]),
 slide(29,'Keep the root zero','Example 8 of 8',[
  line(T`x^2+5x=x(x+5)`,245,84),
  line(T`x(x+5)=0`,440,82),
  line(T`x=0\quad\text{or}\quad x=-5`,660,77),
 ],{question:'Why would dividing immediately by x lose a solution?',answer:'Division by x excludes x=0. The original product is zero at x=0, so that root must stay.'}),
 slide(30,'An expression and an equation ask different things','Two instructions',[
  table(['Instruction','Result'],[['Factor x²+5x+6','(x+2)(x+3)'],['Solve x²+5x+6=0','x=−2 or x=−3']],90,280,1390,345),
  note('An expression has equivalent forms. An equation asks which values make a statement true.',700,36),
 ],{question:'When can the zero-product rule identify roots?',answer:'After writing an equation as a product equal to zero.'}),
 slide(31,'Why a zero product gives two possibilities','The zero-product rule',[
  line(T`AB=0\quad\Longrightarrow\quad A=0\ \text{or}\ B=0`,265,66),
  line(T`(x+2)(x+3)=0`,465,83),
  note('For real numbers, two nonzero factors have a nonzero product. At least one factor must be zero.',705,35),
 ],{question:'Does AB=6 let us conclude A=0 or B=0?',answer:'No. This rule requires a product equal to zero. For example, 2×3=6 with neither factor zero.'}),
 slide(32,'Solve a linear equation for each factor','From Example 1 to roots',[
  line(T`(x+2)(x+3)=0`,245,84),
  math(T`x+2=0`,90,450,660,115,76),math(T`x+3=0`,835,450,660,115,76,'coral'),
  math(T`x=-2`,90,675,660,110,80),math(T`x=-3`,835,675,660,110,80,'coral'),
 ]),
 slide(33,'The bracket constant and the root have opposite signs','From Example 3 to roots',[
  line(T`(x-2)(x-3)=0`,245,84),
  math(T`x-2=0`,90,450,660,115,76),math(T`x-3=0`,835,450,660,115,76,'coral'),
  math(T`x=2`,90,675,660,110,80),math(T`x=3`,835,675,660,110,80,'coral'),
 ],{question:'What operation changes x−2=0 into x=2?',answer:'Add 2 to both sides.'}),
 slide(34,'Read the roots from opposite-sign factors','Choose one answer',[
  line(T`(x+3)(x-2)=0`,250,84),
  ...choices([T`x=3\ \text{or}\ -2`,T`x=-3\ \text{or}\ 2`,T`x=-3\ \text{or}\ -2`,T`x=3\ \text{or}\ 2`]),
 ],{question:'Which pair solves the equation?',answer:'B. x+3=0 gives x=−3. x−2=0 gives x=2.',pedagogy:{role:'checkpoint',seconds:60}}),
 slide(35,'Substitute into the original equation','Verify the roots',[
  line(T`f(x)=x^2+x-6`,240,83),
  table(['Value','Substitution','Result'],[['−3','9−3−6','0'],['2','4+2−6','0'],['3','9+3−6','6']],90,440,1390,345),
 ],{question:'Why is x=3 excluded?',answer:'It gives 6 rather than 0 in the original equation.'}),
 slide(36,'The roots are the horizontal-axis crossings','A graphical check',[
  plot({axesAtZero:true,xRange:[-4,4],yRange:[-8,8],xLabel:'x',yLabel:'f(x)=x²+x−6',curves:[{kind:'polynomial',coefficients:[-6,1,1],label:'x²+x−6',color:'blue'}],points:[{x:-3,y:0,label:'(−3, 0)'},{x:2,y:0,label:'(2, 0)'}]},75,245,980,575),
  math(T`(x+3)(x-2)`,1100,310,420,110,47),
  text('Both roots give output zero.',1100,500,410,150,39),
  text('The graph checks the signs of the roots.',1100,690,410,125,34),
 ]),
 slide(37,'Some quadratics have no integer factor pair','Know the method’s boundary',[
  line(T`x^2+x-1`,255,88),
  table(['Integer pair','Product','Sum'],[['1 and −1','−1','0']],90,445,1390,195),
  note('No integer pair has product −1 and sum 1. Another method is needed to find its real roots.',700,35),
 ],{question:'Does the failed integer search prove there are no real roots?',answer:'No. It only rules out integer factor pairs. The quadratic formula gives (−1±√5)/2.'}),
 slide(38,'Keep the same checking routine','From coefficients to factors',[
  table(['Step','Check'],[['1. Read','The x² coefficient is 1. Identify b and c, including their signs.'],['2. Search','Choose signs and list integer factor pairs of c.'],['3. Compare','Find a pair whose sum is b. For c=0, take out x.'],['4. Verify','Expand the brackets and compare all three coefficients.'],['5. Solve, if asked','Set each factor to zero, then check in the original equation.']],90,260,1390,520),
 ]),
 slide(39,'Exit check: factor before solving','Choose one answer',[
  line(T`x^2-7x+12=0`,255,86),
  ...choices([T`x=-3\ \text{or}\ -4`,T`x=2\ \text{or}\ 6`,T`x=3\ \text{or}\ 4`,T`x=-2\ \text{or}\ -6`]),
 ],{question:'Which roots survive factorisation and substitution?',answer:'C. (x−3)(x−4)=0 gives x=3 or x=4. Both make the original expression zero.',pedagogy:{role:'exit',seconds:60}}),
 slide(40,'Choose a practice rank and keep checking','24 questions to practise',[
  table(['Rank','Questions','Focus'],[['1 · Foundation','1–8','Products, sums, signs and expansion'],['2 · Core','9–16','Factor monic quadratics'],['3 · Application','17–22','Roots, graphs and error diagnosis'],['4 · Challenge (optional)','23–24','Missing coefficients and integer-factor limits']],90,260,1390,430),
  note('Work at your own pace. Choose one answer per question. Return to the example you need.',725,35),
 ],{question:'Which two conditions must your chosen numbers meet?',answer:'Their sum equals b and their product equals c. Expand to verify before using the factors.',pedagogy:{role:'exit',seconds:60}}),
];

export const FACTORISATION_SUPPLEMENT:MathematicsLesson={
 number:FACTORISATION_LESSON_NUMBER,title:FACTORISATION_TITLE,filmTitle:'',openingQuestion:'How can two brackets rebuild a quadratic?',
 outcomes:['Factor x²+bx+c using integer factor pairs when they exist.','Check every coefficient by expansion.','Solve factorable quadratic equations and verify their roots.'],
 vocabulary:[['factor','An expression multiplied by another to form a product.'],['factorise','Rewrite an expression as a product of factors.'],['coefficient','The number multiplying a variable term.'],['constant','A term with no variable.'],['root','A value making the expression zero.'],['repeated root','The same root returned by equal factors.']],
 sources:[FACTORISATION_REFERENCE],slides:FACTORISATION_SLIDES,exercises:[],film:[],
 teacherGuide:'Separate foundation supplement after Lecture 3. Allow 40 minutes for the slides: 0–9 expansion, the first example and the sum/product rule; 9–16 systematic search and negative factors; 16–23 opposite signs and misconception checks; 23–29 repeated factors, missing terms and the zero root; 29–36 equations, roots, substitution and graphs; 36–40 method boundaries and exit checks. Pause on every choice before revealing. The separate 24-question practice bank can be opened with a teacher-set timer or used for follow-up. Rank 4 is optional. This supplement adds support time outside the original 32-hour timetable. All examples are original teaching extensions of Jacques §2.1, printed pp.127–128. Classroom wording: “Which two conditions must hold?” “Show me the sum and the product.” “Expand to check.” “Solve each linear factor.”',
};
