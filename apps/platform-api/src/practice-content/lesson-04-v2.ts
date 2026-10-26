import {pack,question as q,source as s} from './authoring.js';
import {practice04 as previous} from './lesson-04.js';
const questions=[...previous.questions];
questions[6]=q(4,7,'A teaching growth model is $N(t)=100(1.20)^t$, with $t$ measured in weeks. What does the model predict at $t=2$?',['$120$','$140$','$240$','$144$'],3,
 '$N(2)=100(1.20)^2=144$. The second 20% rise uses the updated amount, 120.',
 ['Only one growth step has been applied.','This adds 20 twice instead of compounding.','This multiplies 120 by 2 instead of by 1.20.','Correct: apply two factors of 1.20.'],
 s('2.3','Original supplementary classroom model','Lecture 4: N(t)=100(1.20)^t',151,'Original supplementary question extending section 2.3. Classroom model and values retained; not a numbered textbook exercise.'),
 '100*Rational(6,5)**2',['120','140','240','144']);
questions[7]=q(4,8,'For $N(t)=100(1.20)^t$, the continuous model reaches $200$ at approximately $3.80$ weeks. If reports are made only at whole weeks, which is the FIRST report at or above $200$?',['Week 4','Week 3','Week 3.80','Week 5'],0,
 '$N(3)=172.8<200$ and $N(4)=207.36>200$. Thus week 4 is the first whole-week report meeting the target.',
 ['Correct: compare the surrounding whole-week reports.','The week-3 amount is below the target.','This is a continuous crossing time, not a whole-week report.','The target has already been reached at week 4.'],
 s('2.4','Original supplementary target-time application','Lecture 4: continuous crossing and whole-week reporting',170,'Original supplementary question extending exponential equations and logarithms. The reporting rule is explicit; not a numbered textbook exercise.'),
 'ceiling(log(2)/log(Rational(6,5)))',['4','3','Rational(19,5)','5']);
export const practice04=pack(4,'Powers, logarithms, growth and target times',questions,'2.0.0');
