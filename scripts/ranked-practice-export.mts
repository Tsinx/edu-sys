import {mkdir,writeFile} from 'node:fs/promises';
import {rankedPracticePacks,publicPack} from '../apps/platform-api/src/practice-content/index.js';
import {INTERNATIONAL_MATHEMATICS_SLIDES as slides,INTERNATIONAL_MATHEMATICS_LESSONS as lessons,INTERNATIONAL_MATHEMATICS_FILMS as films,INTERNATIONAL_MATHEMATICS_V1_PAGE_MAP as migration,INTERNATIONAL_MATHEMATICS_DEFINITIONS as definitions} from '../packages/course-content/src/international-mathematics/index.js';
const out=process.argv[2] ?? '.runtime/ranked-practice';
await mkdir(out,{recursive:true});
await writeFile(`${out}/private-packs.json`,JSON.stringify(rankedPracticePacks,null,2));
await writeFile(`${out}/public-packs.json`,JSON.stringify(rankedPracticePacks.map(publicPack),null,2));
const publicSlides=slides.map(s=>({index:s.index,slideKey:s.slideKey,lesson:s.lesson,lessonTitle:s.lessonTitle,localIndex:s.localIndex,localTotal:s.localTotal,title:s.title,kicker:s.kicker,compositionId:s.compositionId,publicLabel:s.publicLabel,elements:s.elements,question:s.question,source:s.source,optionalChallenge:s.optionalChallenge,openingFilm:s.openingFilm,interaction:s.interaction}));
await writeFile(`${out}/public-course.json`,JSON.stringify({slides:publicSlides,lessons:lessons.map(l=>({...l,outcomes:undefined})),films:films.map(({shots,...f})=>f),migration},null,2));
// Preserve the authored guides, compressing only the second teaching block to 25 minutes.
const revisedGuides:Record<number,readonly [string,string]>={
 13:['0–8分钟辨认总量与边际量；8–20分钟反向幂法则逐项恢复；20–32分钟比较不同积分常数的同斜率曲线；32–40分钟代回求导验证；40–45分钟停顿检查积分常数。话术：“What stays the same when we change the constant?”','0–10分钟使用已知总成本确定常数；10–22分钟在新产量求总成本并核对单位；22–34分钟从边际收入恢复收入和价格；34–40分钟用消费与储蓄检查初始条件；40–45分钟停顿完成出口检查。话术：“Does this datum tell us a slope or a level?”'],
 15:['0–10分钟联立需求与供给并拒绝负数量；10–24分钟辨认支付与愿意支付的面积；24–35分钟逐步计算线性消费者剩余；35–41分钟比较曲线与三角形近似；41–45分钟停顿检查市场价格和单位。话术：“Which area is already paid for?”','0–10分钟在供给图上辨认收入和可变成本；10–23分钟逐步求生产者剩余；23–35分钟区分剩余、固定成本与利润；35–41分钟比较总剩余和价格变化；41–45分钟停顿检查两个剩余的边界。话术：“Which cost is missing from the marginal-cost area?”'],
 16:['0–10分钟确认投资流的时间单位；10–23分钟把流量积分为累计资本；23–35分钟核对时间区间和年末年中；35–41分钟逐年比较累计门槛；41–45分钟停顿检查速率与总量。话术：“Is this number a rate or a total?”','0–12分钟用差额积分比较两种投资；12–25分钟复核经营判断的时间窗口；25–35分钟复用边际成本和可行优化；35–41分钟比较幂增长与指数投资流；41–45分钟停顿完成附单位的出口检查。话术：“Which quantity does this question ask us to find?”']
};
const schedules=definitions.map((l,i)=>({lesson:l.number,title:l.title,core:lessons[i]!.coreSlideTotal,optional:2,blocks:l.hours!.map((h,j)=>{
 const guide=revisedGuides[l.number]?.[j]??h.guide;
 const pairs=[...guide.matchAll(/(\d+)–(\d+)分钟([^；。]+)/g)];
 const segments=pairs.map((m,k)=>({start:j===0?Number(m[1]):Math.round(Number(m[1])*25/45),end:j===0?Number(m[2]):Math.round(Number(m[2])*25/45),cue:m[3],localStart:h.localStart+Math.floor(k*(h.localEnd-h.localStart+1)/pairs.length),localEnd:h.localStart+Math.floor((k+1)*(h.localEnd-h.localStart+1)/pairs.length)-1}));
 return {hour:j+1,duration:j===0?45:25,title:h.title,localStart:h.localStart,localEnd:h.localEnd,segments,guide:guide.split('话术：')[1]??''};
}),practice:{start:70,end:90,phases:[{start:70,end:72,label:'Instructions / 说明',cue:'Choose one answer for each question. Start wherever you feel ready. Rank 4 is optional.'},{start:72,end:86,label:'Individual work / 独立作答',cue:'Work at your own pace. You may revise your answers while the set is open.'},{start:86,end:90,label:'Feedback / 反馈',cue:'We will discuss two common errors. Not attempted is different from incorrect.'}],feedback:rankedPracticePacks[i]!.questions.filter(q=>q.rank===3).map(q=>q.id)}}));
await writeFile(`${out}/teaching-schedules.json`,JSON.stringify(schedules,null,2));
console.log(`Exported ${rankedPracticePacks.length} packs to ${out}`);
