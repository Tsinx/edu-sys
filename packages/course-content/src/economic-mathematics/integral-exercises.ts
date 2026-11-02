export interface IntegralQuestion {
 type:'single'|'written';stem:string;options?:readonly string[];answer:string;explanation:string;
 points:number;scoring?:readonly string[];spoken:string;feedbackSpeech?:string;formula?:string;parts?:readonly string[];
}
export interface IntegralActivity {
 id:string;lesson:16;number:number;title:string;minutes:number;level:'基础'|'进阶'|'综合';questions:readonly IntegralQuestion[];
}
export {INTEGRAL_ACTIVITIES} from './integral-merged-exercises.js';
