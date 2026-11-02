import React from 'react';
globalThis.React=React;
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createEnterprise,executeEnterprise,enterpriseView} from '@edu/port-simulation-core';
import {EnterpriseFinancePanel} from '../src/features/port-simulation/enterprise/EnterpriseFinancePanel';
import {ScorePanel} from '../src/features/port-simulation/enterprise/EnterprisePanels';
test('tutorial funding controls expose only fixed values and hide discretionary borrowing even after leaving the coach',()=>{
 const v=enterpriseView(createEnterprise({...createEnterprise().config,tutorial:true}));const html=renderToStaticMarkup(<EnterpriseFinancePanel v={v} act={()=>{}} selected="T1" navigate={()=>{}}/>);
 assert.match(html,/前半年资金方案由教程严格固定/);assert.match(html,/退出带教也不会解锁/);assert.doesNotMatch(html,/申请贷款或提前还本|value="90"|value="10000000"/);
});
test('failure presentation preserves the reason and enables sealing while ordinary financing is absent',()=>{
 let s=createEnterprise();for(const c of [{kind:'project',type:'berth-extension',terminalId:'T1'},{kind:'project',type:'channel-depth',terminalId:'T1'},{kind:'advance',hours:720,stopOnIncident:false}] as const)s=executeEnterprise(s,c);
 const v=enterpriseView(s);const html=renderToStaticMarkup(<><EnterpriseFinancePanel v={v} act={()=>{}} selected="T1" navigate={()=>{}}/><ScorePanel score={v.score}/></>);
 assert.match(html,/经营失败已结算，未完成经营期/);assert.match(html,/封存失败记录/);assert.doesNotMatch(html,/申请贷款或提前还本/);assert.ok(v.finance.unpaid>0);
});
