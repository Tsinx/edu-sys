import type {EnterpriseView} from '@edu/port-simulation-core';

/** Calendar time and wall-clock presentation share one authoritative, hourly business controller. */
export function enterpriseClockStep(v:EnterpriseView,goal=v.horizon){
  const remaining=Math.min(goal,v.horizon)-v.hour;
  if(remaining<=0||v.sealed||v.finance.status==='bankrupt'||v.finance.tutorialPaused)return null;
  const remote=v.director.mode==='briefing';
  const hours=Math.min(remote?24:1,remaining,Math.max(1,v.director.boundary-v.hour));
  return {hours,delay:remote?Math.max(40,hours/24*1000):6000,rate:remote?'1秒≈1天':'1秒≈10分钟'};
}
export const DIRECTOR_MODE_LABELS={briefing:'总经理日常简报',observation:'每月现场观察日',emergency:'重大异常现场'};
