import assert from 'node:assert/strict';
import test from 'node:test';
import {practiceClock,practiceSecondsRemaining,practiceTimeLabel} from '../src/features/ranked-practice/practice-clock';

test('countdown follows server time and elapsed monotonic time, not the student wall clock',()=>{
 const clock=practiceClock({serverNow:'2026-10-07T12:00:00Z',deadlineAt:'2026-10-07T12:01:00Z'},1000);
 assert.equal(practiceSecondsRemaining(clock,1000),60);
 assert.equal(practiceSecondsRemaining(clock,59999),2);
 assert.equal(practiceSecondsRemaining(clock,61000),0);
 assert.equal(practiceSecondsRemaining(clock,900000),0);
 assert.equal(practiceSecondsRemaining(clock,0),60);
 assert.equal(practiceTimeLabel(65),'1:05');assert.equal(practiceTimeLabel(0),'0:00');assert.equal(practiceTimeLabel(7200),'120:00');
});
test('legacy untimed practice and invalid timestamps do not fabricate a deadline',()=>{
 assert.equal(practiceClock({},0),null);assert.equal(practiceSecondsRemaining(null,9999),null);
 assert.equal(practiceClock({serverNow:'invalid',deadlineAt:'2026-10-07T12:00:00Z'},0),null);
 assert.equal(practiceSecondsRemaining(practiceClock({serverNow:'2026-10-07T12:01:00Z',deadlineAt:'2026-10-07T12:00:00Z'},0),0),0);
});
