import test from 'node:test';
import assert from 'node:assert/strict';
import {concessionScenario,portChoiceScenario,storageScenario,PORT_LESSON_NINE_SLIDES,PORT_LESSON_TEN_SLIDES} from '@edu/course-content';
test('governance and pricing scenarios conserve money and keep customer units separate',()=>{
 for(const i of [0,1,2]){const c=concessionScenario(i);assert.equal(c.operating+c.fixedFee+c.fixedRemainder,c.revenue);assert.equal(c.operating+c.sharedFee+c.sharedRemainder,c.revenue);const p=portChoiceScenario(i);p.totals.forEach((total,j)=>assert.equal(total,p.cash[j]!+p.days[j]!*p.daily));const b=storageScenario(i);assert.equal(b.total,b.handling+b.storage);}
 assert.deepEqual([0,1,2].map(i=>storageScenario(i).total),[360,440,560]);
 assert.deepEqual(portChoiceScenario(1).totals,[1500,1300,1550]);
 assert.deepEqual([0,1,2].map(i=>concessionScenario(i).sharedFee),[40,80,120]);
 for(const f of [concessionScenario,portChoiceScenario,storageScenario])for(const n of [-1,3,NaN,.5])assert.throws(()=>f(n));
 assert.equal(PORT_LESSON_NINE_SLIDES[0]!.index,390);assert.equal(PORT_LESSON_TEN_SLIDES.at(-1)!.index,485);
});
