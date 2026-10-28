import {investmentOutcome,investmentPolicies,INVESTMENT_DEFAULT,investmentFullThreshold,investmentExpansionThreshold} from './port-investment-model.js';

/** Worked review cases. These inputs never alter the existing assessment engines. */
export const PORT_REVIEW_SOURCES={
 'pr-case':{label:'本课程 · 复习案例与完整演算',url:'/port-expansion-preview.html?lesson=20',date:'2026-10-27',boundary:'港口、货票、工时、价格、税率、排放系数和事件为独立教学设定；各案例的对象与时间窗分别标明。教师完整讲解，无学生操作或成绩提交，不构成真实业务指令。'},
 'pr-concept':{label:'本课程 · 港口管理复习图解',url:'/port-expansion-preview.html?lesson=21',date:'2026-10-28',boundary:'图示综合既有课程概念，位置不按比例。制度、专业条件和实际授权以适用规定核实，复习图不代替现场规程。'},
 'pr-vat':{label:'国家税务总局 · 增值税法第十四条',url:'https://shanghai.chinatax.gov.cn/zcfw/zcfgk/zzs/202412/t474694.html',date:'2026-01-01施行；核对2026-10-27',boundary:'只引用进口增值税组成计税价格的规定。10%关税与13%增值税为课堂给定参数，无消费税；不据此判断某商品实际税率、计税价格或抵扣资格。'},
 'pr-tax':{label:'海关总署令272号 · 征税管理办法',url:'https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2025/art_68923263bddd4e95b6b5d98a93987be2.html',date:'2024-12-01施行；核对2026-10-27',boundary:'采用第十七条计税关系，不提供真实商品归类或申报结论。保税案例另行给定分批内销和支付时点，不推定实际企业满足条件。'}
} as const;
export const PORT_REVIEW_FILMS={
 'l20-review-v2':{id:'l20-review-v2',title:'从码头作业到可靠交付',src:'/course-assets/port-management/review-media-v2/review20-opening.mp4',poster:'/course-assets/port-management/review-media-v2/review20-opening.jpg',captions:'/course-assets/port-management/review-media-v2/review20-opening.vtt',durationMs:32000,source:'px-video-smart'},
 'l21-review-v2':{id:'l21-review-v2',title:'从交付承诺到长期经营',src:'/course-assets/port-management/review-media-v2/review21-opening.mp4',poster:'/course-assets/port-management/review-media-v2/review21-opening.jpg',captions:'/course-assets/port-management/review-media-v2/review21-opening.vtt',durationMs:32000,source:'pt-video-guoyuan'}
} as const;
export type ReviewIcon='factory'|'crane'|'truck'|'yard'|'ship'|'server'|'ledger'|'grid'|'gate'|'rail'|'calendar'|'airplane';
export type ReviewItem={title:string;body:string;value?:string;icon?:ReviewIcon};
export type ReviewContent={
 kind:'cover'|'route'|'process'|'clock'|'bars'|'curve'|'recovery'|'decision'|'energy';
 items:readonly ReviewItem[];
 caption?:string;values?:readonly number[];unit?:string;poster?:string;
 relation?:'sequence'|'parallel'|'branch'|'network';
};
export const REVIEW_MANIFEST=[{flow:'进口',twenty:120,forty:80},{flow:'出口',twenty:80,forty:120}] as const;
export function reviewManifest(){return REVIEW_MANIFEST.map(r=>({...r,boxes:r.twenty+r.forty,teu:r.twenty+r.forty*2}));}
export function reviewQueue(arrival:number,service:number){if(!Number.isFinite(arrival)||!Number.isFinite(service)||arrival<0||arrival>=service)throw new RangeError('稳定单台队列需要0≤λ<μ');const rho=arrival/service,wait=arrival/(service*(service-arrival));return {rho,waitMinutes:wait*60,totalMinutes:60/(service-arrival),queue:arrival*wait};}
export function reviewTax(){const value=100,duty=value*.1,vat=(value+duty)*.13,total=duty+vat,deferred=total*.7,benefit=deferred*.08*90/365;return {value,duty,vat,total,immediate:total*.3,deferred,benefit,extra:.4,net:benefit-.4};}
export function reviewShore(){const kwh=1000*4;return {kwh,gridTonnes:kwh*.55/1000,generatorTonnes:kwh*.7/1000,savedTonnes:kwh*(.7-.55)/1000,energySavingYuan:kwh*(1.4-.9),breakEvenCalls:300000/500};}
export function reviewPortfolio(){return [{name:'A',cost:40,carbon:12},{name:'B',cost:30,carbon:9},{name:'C',cost:20,carbon:4}].reduce<{name:string;cost:number;carbon:number}[]>((plans,p)=>[...plans,...plans.map(q=>({name:q.name?q.name+'＋'+p.name:p.name,cost:q.cost+p.cost,carbon:q.carbon+p.carbon}))],[{name:'',cost:0,carbon:0}]).slice(1);}
export function reviewInvestment(){return {keepHigh:investmentOutcome('phase','keep',30).npv,expandHigh:investmentOutcome('phase','expand',30).npv,fullHigh:investmentOutcome('full','keep',30).npv,fullMiddle:investmentOutcome('full','keep',18).npv,fullTrigger:investmentFullThreshold(),expandTrigger:investmentExpansionThreshold(),policies:investmentPolicies(),shockKeep:investmentOutcome('phase','keep',30,{...INVESTMENT_DEFAULT,mode:'shock'}).npv,shockExpand:investmentOutcome('phase','expand',30,{...INVESTMENT_DEFAULT,mode:'shock'}).npv};}
type ReviewPage={mediaId?:string;rows?:readonly (readonly string[])[];equations?:readonly {tex:string;explanation:string}[];review?:ReviewContent};
export function reviewSlideSteps(p:ReviewPage){return p.equations?.length??(p.rows?Math.max(1,p.rows.length-1):Math.max(1,p.review?.items.length??3));}
export function reviewSlideSummary(p:ReviewPage,s:{progress:number;cinematic?:{elapsedMs:number}}){
 if(p.mediaId)return `32秒复习片头，历史镜头与课程合成旁白。${s.cinematic?'当前'+Math.floor(s.cinematic.elapsedMs/1000)+'秒。':''}后续案例为独立教学设定，观看不等于完成任何操作。`;
 if(s.progress===0)return '本页案例图解尚未展开。';const n=Math.floor(s.progress*reviewSlideSteps(p)+1e-6);
 if(p.equations)return p.equations.slice(0,n).map(e=>e.tex+'：'+e.explanation).join('；');
 if(p.rows)return p.rows.slice(0,n+1).map(r=>r.join(' / ')).join('；');
 return p.review?.items.slice(0,n).map(v=>[v.title,v.body,v.value].filter(Boolean).join('：')).join('；')??'';
}
