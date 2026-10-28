export interface EnterpriseDraftStorage {getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void;}
const draftKey=(scope:string)=>'edu-port-enterprise-ui-drafts/2:'+scope;
function checkedDrafts(value:unknown):Record<string,string>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('草稿格式不正确');
  const entries=Object.entries(value);
  if(entries.length>2000||entries.some(([key,item])=>key.length>240||typeof item!=='string'||item.length>5000))throw Error('草稿内容超出限制');
  return Object.fromEntries(entries);
}
export function readEnterpriseDrafts(storage:EnterpriseDraftStorage,scope:string):Record<string,string>{
  const raw=storage.getItem(draftKey(scope));
  if(raw===null)return {};
  if(raw.length>1_000_000)throw Error('草稿文件过大');
  return checkedDrafts(JSON.parse(raw));
}
export function writeEnterpriseDrafts(storage:EnterpriseDraftStorage,scope:string,values:Record<string,string>){
  const raw=JSON.stringify(checkedDrafts(values));
  if(raw.length>1_000_000)throw Error('草稿文件过大');
  storage.setItem(draftKey(scope),raw);
}
