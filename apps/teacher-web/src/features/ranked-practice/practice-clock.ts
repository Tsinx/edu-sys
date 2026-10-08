import type { PracticeRunView } from '@edu/contracts';

export interface PracticeClock { remainingMs:number; receivedAt:number }
/** Server time plus a monotonic browser clock avoids incorrect local clock/timezone settings. */
export function practiceClock(run:Pick<PracticeRunView,'deadlineAt'|'serverNow'>,receivedAt:number):PracticeClock|null {
 if(!run.deadlineAt||!run.serverNow)return null;
 const remainingMs=Date.parse(run.deadlineAt)-Date.parse(run.serverNow);
 return Number.isFinite(remainingMs)?{remainingMs,receivedAt}:null;
}
export function practiceSecondsRemaining(clock:PracticeClock|null,now:number):number|null {
 return clock?Math.ceil(Math.max(0,clock.remainingMs-Math.max(0,now-clock.receivedAt))/1000):null;
}
export function practiceTimeLabel(seconds:number):string {
 return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
