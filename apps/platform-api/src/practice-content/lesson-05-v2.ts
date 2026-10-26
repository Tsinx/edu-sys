import {pack,question as q,source as s} from './authoring.js';
import {practice05 as previous} from './lesson-05.js';
const questions=[...previous.questions];
const r=(part:string,adaptation:string)=>s('4.1','Exercise 4.1',part,277,adaptation);
questions[3]=q(5,4,'For the constant function $f(x)=5$, which explanation shows why $f\u2032(x)=0$?',
 ['The graph is horizontal, so its tangent slope is zero.','The graph is vertical.','The function value is zero.','The tangent slope equals the height, 5.'],0,
 'Changing $x$ does not change $f(x)$. Its graph is horizontal at height 5, so the rate of change is zero.',
 ['Correct: a derivative measures slope, not height.','A constant function has a horizontal graph.','The function value is 5.','The function value and derivative are different quantities.'],
 r('3','Original function and explanation task retained; graph-sketch instruction replaced by a choice of geometric explanations.'),'0',['0','oo','5','-5'],
 {coefficients:[5],xMin:-2,xMax:2,yMin:0,yMax:7,xLabel:'x',yLabel:'f(x)',caption:'Redrawn textbook graph: f(x) = 5.'});
questions[4]=q(5,5,'For $f(x)=x^2-2x$, find the function value $f(1)$.',['$0$','$-1$','$1$','$2$'],1,
 '$f(1)=1^2-2(1)=-1$. This is the height at $x=1$, not the tangent slope.',
 ['Zero is the tangent slope at the vertex, not the height.','Correct substitution into the function.','The subtraction was omitted.','This is 2x at x=1, not f(1).'],
 r('7, table entry x=1','Original function and x=1 table entry retained; one value selected as a standalone question.'),'1**2-2*1',['0','-1','1','2']);
questions[5]=q(5,6,'For $f(x)=x^2-2x$, estimate $f\u2032(1)$ from the tangent at the vertex.',['$-1$','$1$','$0$','$2$'],2,
 '$f(x)=(x-1)^2-1$. The vertex is $(1,-1)$ and its tangent is horizontal, with slope zero. No power-rule calculation is needed.',
 ['This is the height f(1).','This is the x coordinate of the vertex.','Correct: read the horizontal tangent.','This is not the tangent slope.'],
 r('7(b)','Original function, target x=1 and tangent-slope task retained; table and sketch instructions omitted; graph redrawn.'),'0',['-1','1','0','2'],
 {coefficients:[0,-2,1],xMin:-1,xMax:3,yMin:-2,yMax:4,xLabel:'x',yLabel:'f(x)',caption:'Redrawn textbook graph: f(x) = x² - 2x.'});
questions[6]=q(5,7,'A teaching position model is $d(t)=t^2+3$ metres, with $t$ in seconds. Choose the correct triple: (position at $t=2$; average speed on $[2,3]$; instantaneous speed at $t=2$).',
 ['$4$ m; $5$ m/s; $4$ m/s','$7$ m; $4$ m/s; $5$ m/s','$7$ m; $5$ m/s; $7$ m/s','$7$ m; $5$ m/s; $4$ m/s'],3,
 'Position is $d(2)=7$ m. The interval average is $(12-7)/(3-2)=5$ m/s. For nonzero $h$, $[d(2+h)-d(2)]/h=4+h$, whose limit is 4 m/s.',
 ['The initial position 3 was omitted.','The average and instantaneous rates were interchanged.','The position value was used as a speed.','Correct: distinguish all three quantities and their units.'],
 s('4.1','Original supplementary delivery model','Lecture 5: d(t)=t²+3',268,'Original supplementary question extending the difference-quotient interpretation in section 4.1; not a numbered textbook exercise.'),
 'Tuple(7,5,4)',['Tuple(4,5,4)','Tuple(7,4,5)','Tuple(7,5,7)','Tuple(7,5,4)']);
questions[7]=q(5,8,'For $f(x)=x^2-2x$ and $h\\ne0$, simplify $[f(1+h)-f(1)]/h$.',['$h$','$2h$','$h^2$','$0$'],0,
 '$f(1+h)=-1+h^2$ and $f(1)=-1$. The numerator is $h^2$; dividing by nonzero $h$ gives $h$. Its limit as $h$ approaches zero is 0.',
 ['Correct: cancel one common nonzero factor h.','The cross terms cancel in this numerator.','This is the numerator before division.','This is the limiting value, not the finite quotient.'],
 r('7(b), difference-quotient adaptation','Original function and target x=1 retained; tangent estimation adapted into a first-principles algebra step. The h notation and nonzero condition are explicit additions.'),
 '((1+x)**2-2*(1+x)-(1-2))/x',['x','2*x','x**2','0']);
questions[9]=q(5,10,'OPTIONAL. For $d(t)=t^2+3$ metres and $0<h\\le2$ seconds, find the average speed over $[2-h,2+h]$. Which statement holds for every permitted $h$?',
 ['The average is $(4+h)$ m/s.','The average is $4$ m/s.','The average is $(4-h)$ m/s.','The average is $8$ m/s.'],1,
 '$[d(2+h)-d(2-h)]/(2h)=8h/(2h)=4$ m/s. This symmetric finite average equals the instantaneous rate for this quadratic model; it is not a general identity for all curves.',
 ['This is the forward one-sided average.','Correct: expand both squares and cancel the common factor.','This is the backward one-sided average.','The denominator is 2h, not h.'],
 s('4.1','Original supplementary symmetric-interval challenge','Lecture 5: optional symmetric measurement',268,'Original optional extension of the difference quotient; the interval stays within 0 to 4 seconds. Not a numbered textbook exercise.'),
 '(((2+x)**2+3)-((2-x)**2+3))/(2*x)',['4+x','4','4-x','8']);
export const practice05=pack(5,'Average rates, difference quotients and tangent slopes',questions,'2.0.0');
