import type {EnterpriseView} from '@edu/port-simulation-core';
import {enterpriseIncidentLesson,type TeachingStep} from './enterprise-teaching';
export interface EnterpriseGuideAction {id:string;title:string;selector:string;kind:'click'|'field'|'submit'|'observe'|'advance'|'finish';value?:string;submit?:boolean}
export const enterpriseControl=(id:string)=>'[data-enterprise-control="'+id.replaceAll('"','\\"')+'"]';
export function enterpriseGuideActions(step:TeachingStep,_v:EnterpriseView):EnterpriseGuideAction[]{
  const base=enterpriseControl(step.target);
  if(step.fields)return [...step.fields.map(f=>({id:step.id+'-'+f.name,title:f.title,selector:base+' [data-enterprise-field="'+f.name+'"]',kind:'field' as const,value:f.value})),{id:step.id+'-submit',title:'点击亮起的按钮，提交本次管理决定',selector:base+' button[type="submit"]',kind:'submit',submit:true}];
  return [{id:step.id,title:step.now,selector:base,kind:step.kind==='command'?'click':step.kind==='observe'?'observe':step.kind==='finish'?'finish':'advance',submit:step.kind==='command'}];
}
export function resolveEnterpriseGuideAction(step:TeachingStep,tab:string,v:EnterpriseView,readValue:(selector:string)=>string|undefined):EnterpriseGuideAction{
  const incident=enterpriseIncidentLesson(v),destination=incident?.tab??step.tab;
  if(tab!==destination){
    if(tab!=='overview'&&tab!=='menu')return {id:'close-for-'+(incident?.incident.id??step.id),title:incident?'先返回港口，打开异常处置':'点击关闭，回到港口现场',selector:enterpriseControl('window-close'),kind:'click'};
    if(tab==='overview'&&destination!=='overview')return {id:'menu-for-'+(incident?.incident.id??step.id),title:'点击“经营菜单”',selector:enterpriseControl('hud-menu'),kind:'click'};
    if(tab==='menu'&&destination!=='overview')return {id:'entry-'+destination,title:'点击菜单中的“'+({management:'经营方针',yard:'堆场规划',review:'经营周报与收获',finance:'财务与资金',assets:'设备与采购',staff:'人员与排班',energy:'能源与环境',technology:'技术与升级',market:'客户与合同',emergency:'风险与恢复'} as Record<string,string>)[destination]+'”',selector:enterpriseControl('menu-'+destination),kind:'click'};
    return {id:'return-'+step.id,title:'关闭窗口，回到港口现场',selector:enterpriseControl('window-close'),kind:'click'};
  }
  if(incident){
    const base=enterpriseControl(incident.target);
    const field=incident.fields.find(f=>readValue(base+' [data-enterprise-field="'+f.name+'"]')!==f.value);
    return field?{id:incident.incident.id+'-'+field.name,title:field.title,selector:base+' [data-enterprise-field="'+field.name+'"]',kind:'field',value:field.value}:{id:incident.incident.id+'-submit',title:'点击授权，系统将按预算完成核查与排修',selector:base+' button[type="submit"]',kind:'submit',submit:true};
  }
  const actions=enterpriseGuideActions(step,v);
  return actions.find(a=>a.value===undefined||readValue(a.selector)!==a.value)??actions.at(-1)!;
}
