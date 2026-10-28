import { createEnterprise, executeEnterprise, enterpriseView, enterpriseRecord, restoreEnterprise, makeEnterprisePackage, enterpriseCsv, enterpriseHash, type EnterpriseConfig, type EnterpriseCommand, type EnterpriseState, type EnterpriseRecord } from '@edu/port-simulation-core';
import {compareEnterpriseYards} from '@edu/port-simulation-core';

let state: EnterpriseState | null = null;
let replaying = false;
type Request = { id: number; type: 'create' | 'restore' | 'command' | 'record' | 'package' | 'csv' | 'seek' | 'live' | 'experiment'; config?: EnterpriseConfig; record?: EnterpriseRecord; command?: EnterpriseCommand; position?: number };
function snapshot(id: number, persist = true, preview?: EnterpriseState) {
  const s = preview ?? state;
  if (!s) throw Error('尚未建立经营场次。');
  postMessage({ id, type: 'state', view: enterpriseView(s), replaying, persist, record: persist ? enterpriseRecord(s) : undefined, hash: persist ? enterpriseHash(s) : undefined });
}
self.onmessage = (event: MessageEvent<Request>) => {
  const m = event.data;
  try {
    if (m.type === 'create') { state = createEnterprise(m.config); replaying = false; snapshot(m.id); return; }
    if (m.type === 'restore') { const next = restoreEnterprise(m.record,undefined,hour=>{if(hour%168===0)postMessage({id:m.id,type:'progress',hour});}); state = next; replaying = false; snapshot(m.id); return; }
    if (!state) throw Error('请先创建或恢复个人经营场次。');
    if(m.type==='experiment'){if(replaying)throw Error('请返回当前经营现场后进行对照。');postMessage({id:m.id,type:'experiment',experiment:compareEnterpriseYards(state)});return;}
    if (m.type === 'command') {
      if (replaying) throw Error('当前为只读回放，请先返回当前经营现场。');
      if (!m.command) throw Error('缺少业务指令。');
      state = executeEnterprise(state, m.command, hour => postMessage({ id: m.id, type: 'progress', hour, horizon: state!.horizon })); snapshot(m.id); return;
    }
    if (m.type === 'seek') { const preview=restoreEnterprise(enterpriseRecord(state),m.position??0,hour=>{if(hour%168===0)postMessage({id:m.id,type:'progress',hour});});replaying = true; snapshot(m.id, false, preview); return; }
    if (m.type === 'live') { replaying = false; snapshot(m.id, false); return; }
    if (m.type === 'record') { postMessage({ id: m.id, type: 'record', record: enterpriseRecord(state) }); return; }
    if (m.type === 'package') { postMessage({ id: m.id, type: 'package', package: makeEnterprisePackage(state) }); return; }
    if (m.type === 'csv') { postMessage({ id: m.id, type: 'csv', csv: enterpriseCsv(state) }); return; }
    throw Error('未知的本机操作，请返回当前经营现场后重试。');
  } catch (error) { postMessage({ id: m.id, type: 'error', error: error instanceof Error ? error.message : String(error) }); }
};
