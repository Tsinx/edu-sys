import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PORT_SUBMISSION_UNITS,createPortClassLab,serializePortClassLab,portClassLabMetrics,type PortClassVerifiedReport} from '@edu/port-simulation-core';
import {PortClassLabSubmission} from '../src/features/port-simulation/PortClassLabSubmission';
import {PortClassLabReplay} from '../src/features/port-simulation/PortClassLabReplay';
import {freshNotebook,classSubmissionRecord} from '../src/features/port-simulation/port-class-notebook';
test('all three new tasks have independent entries and submission panels explain saved-report requirements',()=>{
 for(const lesson of [11,12] as const){const book=freshNotebook(lesson),html=renderToStaticMarkup(<PortClassLabSubmission book={book} playing={false} onPause={()=>{}}/>);assert.match(html,/提交教师/);assert.match(html,/尚未满足提交条件/);assert.match(html,/通过核验后/);assert.match(html,/文字|分析质量/);assert.equal(classSubmissionRecord(book).lesson,lesson);}
 for(const id of ['performance','emergency-system','emergency-equipment'])assert.match(PORT_SUBMISSION_UNITS.find(u=>u.id===id)!.href,/port-class-lab.html\?lesson=(11|12)/);
});
test('teacher class replay shows original findings, report and node controls with no writable experiment forms',()=>{
 const run=createPortClassLab(12,'incident','system'),record=classSubmissionRecord(freshNotebook(12)),report:PortClassVerifiedReport={kind:'class-lab',record:{...record,notes:{scope:'本次原始范围解释应保留在教师只读详情中。'}},runs:[{label:'系统中断恢复',record:serializePortClassLab(run),metrics:portClassLabMetrics(run),finding:'原始实验发现。'}]};
 const html=renderToStaticMarkup(<PortClassLabReplay report={report}/>);assert.match(html,/课堂实验只读复现/);assert.match(html,/原始实验发现/);assert.match(html,/本次原始范围解释/);assert.match(html,/上一节点/);assert.match(html,/最终状态/);assert.doesNotMatch(html,/<textarea|应用岗位配置|完成实战并封存/);
});
