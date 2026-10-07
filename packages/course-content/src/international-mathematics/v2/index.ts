import type {MathematicsLesson} from '../types.js';
import {expandLesson} from './authoring.js';
import {additions01,guides01} from './lesson-01.js';
import {additions02,guides02} from './lesson-02.js';
import {additions03,guides03} from './lesson-03.js';
import {additions04,guides04} from './lesson-04.js';
import {additions05,guides05} from './lesson-05.js';
import {additions06,guides06} from './lesson-06.js';
import {additions07,guides07} from './lesson-07.js';
import {additions08,guides08} from './lesson-08.js';
import {additions09,guides09} from './lesson-09.js';
import {additions10,guides10} from './lesson-10.js';
import {additions11,guides11} from './lesson-11.js';
import {additions12,guides12} from './lesson-12.js';
import {additions13,guides13} from './lesson-13.js';
import {additions14,guides14} from './lesson-14.js';
import {additions15,guides15} from './lesson-15.js';
import {additions16,guides16} from './lesson-16.js';
export const CORE_TARGETS=[72,76,80,74,88,78,86,78,78,82,84,78,78,90,82,76] as const;
export function expandV2(lesson:MathematicsLesson):MathematicsLesson{
 switch(lesson.number){
  case 1:return expandLesson(lesson,additions01,72,guides01,['Units, percentages and payment rules','Equations and price boundaries']);
  case 2:return expandLesson(lesson,additions02,76,guides02,['Functions and lines','Demand, supply and agreement']);
  case 3:return expandLesson(lesson,additions03,80,guides03,['Quadratic revenue and roots','Revenue peaks and profit']);
  case 4:return expandLesson(lesson,additions04,74,guides04,['Powers and multiplicative growth','Logarithms and target times']);
  case 5:return expandLesson(lesson,additions05,88,guides05,['From observations to a difference quotient','From a quotient to an instantaneous rate']);
  case 6:return expandLesson(lesson,additions06,78,guides06,['Constants, powers and cost rates','Negative powers and checks']);
  case 7:return expandLesson(lesson,additions07,86,guides07,['Linked rates and the chain rule','Two contributions and the product rule']);
  case 8:return expandLesson(lesson,additions08,78,guides08,['Exponential levels and growth rates','Logarithmic rates and domains']);
  case 9:return expandLesson(lesson,additions09,78,guides09,['Marginal cost and finite increments','Revenue, profit and local decisions']);
  case 10:return expandLesson(lesson,additions10,82,guides10,['Stationary points and shape','Candidate and endpoint comparisons']);
  case 11:return expandLesson(lesson,additions11,84,guides11,['Profit candidates and feasible output','Capacity, integer output and decisions']);
  case 12:return expandLesson(lesson,additions12,78,guides12,['Relative changes and point elasticity','Elasticity, revenue and finite changes']);
  case 13:return expandLesson(lesson,additions13,78,guides13,['Recovering a family of totals','Fitting the level and verifying totals']);
  case 14:return expandLesson(lesson,additions14,90,guides14,['Rectangle estimates and endpoint evaluation','Signed accumulation and decisions']);
  case 15:return expandLesson(lesson,additions15,82,guides15,['Market equilibrium and consumer surplus','Producer surplus, profit and total gains']);
  case 16:return expandLesson(lesson,additions16,76,guides16,['Rates, totals and crossing times','Accumulated differences and business tools']);
  default:return lesson;
 }
}
