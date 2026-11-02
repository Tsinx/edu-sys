import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createEnterprise,executeEnterprise,enterpriseView,type EnterpriseDailyReport} from '@edu/port-simulation-core';
import {EnterpriseTopBar} from '../src/features/port-simulation/enterprise/EnterpriseTopBar';
import {enterpriseClockStep} from '../src/features/port-simulation/enterprise/enterprise-clock';
import {enterpriseAssetVisual} from '../src/features/port-simulation/enterprise/EnterpriseScene';
import {TrendsPanel,sampleTrend,DirectorPanel,CraneAllocationPanel} from '../src/features/port-simulation/enterprise/EnterpriseDirectorPanels';
import {EnterpriseChannel} from '../src/features/port-simulation/enterprise/enterprise-channel';
globalThis.React=React;

test('top menus retain common management entry points without permanent trend graphics',()=>{
 const html=renderToStaticMarkup(<EnterpriseTopBar v={enterpriseView(createEnterprise())} navigate={()=>{}} attention={2} formal={false}/>);
 for(const name of ['经营菜单','资源菜单','建设菜单','市场菜单','财务菜单','报告菜单'])assert.ok(html.includes('aria-label="'+name+'"'));
 assert.ok(!html.includes('<svg viewBox="0 0 560'));
 assert.ok(html.includes('事件与待办，2项'));
});
test('business clock uses daily steps, six-second site hours and exact calendar boundaries',()=>{
 const s=createEnterprise();let clock=enterpriseClockStep(enterpriseView(s))!;assert.equal(clock.hours,24);assert.equal(clock.delay,1000);
 s.hour=167;clock=enterpriseClockStep(enterpriseView(s))!;assert.equal(clock.hours,1);assert.ok(clock.delay<50);
 s.hour=168;clock=enterpriseClockStep(enterpriseView(s))!;assert.equal(clock.hours,1);assert.equal(clock.delay,6000);
 assert.equal(enterpriseClockStep(enterpriseView(s),168),null);
 s.finance.status='bankrupt';assert.equal(enterpriseClockStep(enterpriseView(s)),null);
});
test('device colors distinguish no sample, low load, failure and independent status flags',()=>{
 let s=createEnterprise(),v=enterpriseView(s),a=v.assets[0]!;
 assert.equal(enterpriseAssetVisual(v,a,'load').value,null);
 s=executeEnterprise(s,{kind:'advance',hours:24});v=enterpriseView(s);a=v.assets[0]!;const ordinary=enterpriseAssetVisual(v,a,'load');a.status='failed';const failed=enterpriseAssetVisual(v,a,'load');assert.equal(failed.flag,'故障');assert.notEqual(failed.color,ordinary.color);
 a.status='active';v.finance.halted=true;assert.equal(enterpriseAssetVisual(v,a,'load').flag,'停产');
});
test('long charts retain real peaks, cash troughs and missing-value gaps when reduced',()=>{
 const rows=Array.from({length:1000},(_,i)=>({hour:(i+1)*24,cash:1000+i,meanBerthWait:i%17===0?null:2+i%4} as EnterpriseDailyReport));rows[333]!.cash=1;rows[628]!.cash=9000000;
 const cash=sampleTrend(rows,'cash');assert.ok(cash.length<=180);assert.ok(cash.includes(rows[333]!));assert.ok(cash.includes(rows[628]!));assert.equal(cash[0],rows[0]);assert.equal(cash.at(-1),rows.at(-1));
 assert.ok(sampleTrend(rows,'waiting').some(r=>r.meanBerthWait===null));
});
test('report and calendar windows expose real samples and do not invent zero-valued missing activity',()=>{
 const v=enterpriseView(createEnterprise());const empty=renderToStaticMarkup(<TrendsPanel v={v}/>);assert.ok(empty.includes('完成第一个生产日'));assert.ok(empty.includes('不会补造为零'));
 const calendar=renderToStaticMarkup(<DirectorPanel v={v}/>);assert.ok(calendar.includes('核对本月8日现场观察日'));assert.ok(calendar.includes('不作为本人学习或到场证明'));
 const crane=renderToStaticMarkup(<CraneAllocationPanel v={v}/>);assert.ok(crane.includes('当前没有已就绪的起重装卸任务'));
});
test('legitimate successive clock ticks do not trip duplicate financial-action protection',async()=>{
 const sent:Array<{id:number;type:string}>=[],port={postMessage:(m:{id:number;type:string})=>{sent.push(m);},terminate:()=>{}},callbacks={state:()=>{},busy:()=>{},progress:()=>{},failure:()=>{}};let now=0;
 const channel=new EnterpriseChannel(port,callbacks,10000,()=>now,10000);
 const first=channel.request({type:'command',command:{kind:'advance',hours:1,stopAtVisit:true}});channel.receive({id:sent[0]!.id,type:'state'});await first;now=42;
 const next=channel.request({type:'command',command:{kind:'advance',hours:1,stopAtVisit:true}});channel.receive({id:sent[1]!.id,type:'state'});await next;assert.equal(sent.length,2);
 const financial=channel.request({type:'command',command:{kind:'repay',amount:100000}});channel.receive({id:sent[2]!.id,type:'state'});await financial;now=50;await assert.rejects(channel.request({type:'command',command:{kind:'repay',amount:100000}}),/快速重复/);channel.close();
});
