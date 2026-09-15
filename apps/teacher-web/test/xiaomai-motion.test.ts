import assert from "node:assert/strict";
import test from "node:test";
import {XiaomaiMotion,neutralXiaomaiPose,xiaomaiPoint,xiaomaiActions,type XiaomaiAction} from "../src/features/avatar/xiaomai-motion.js";

test("P0 motions remain bounded through all actions, long frames and state changes",()=>{
  const motion=new XiaomaiMotion(()=>.5);
  for(const action of Object.keys(xiaomaiActions) as XiaomaiAction[]){
    for(let frame=0;frame<180;frame++){
      const p=motion.update(frame===0?12:1/60,"speaking",false,.5,action);
      assert.ok(Object.values(p).every(Number.isFinite));
      assert.ok(p.eyeOpen>=0 && p.eyeOpen<=1);
      assert.ok(Math.abs(p.x)<=10.01 && Math.abs(p.y)<=9.01 && Math.abs(p.z)<=4.51 && Math.abs(p.hair)<=4);
      for(const part of ["face_layer","hair_front_main","brow_left","neck_layer","cardigan_body"]){
        for(const [x,y] of [[400,240],[520,370],[580,500],[512,760]])assert.ok(xiaomaiPoint(x!,y!,p,part).every(Number.isFinite));
      }
    }
  }
});
test("the shared head warp keeps feature and skin coordinates together; lower torso stays anchored",()=>{
  const p={...neutralXiaomaiPose(),x:10,y:-8,z:4,breath:1};
  assert.deepEqual(xiaomaiPoint(448,280,p,"face_layer"),xiaomaiPoint(448,280,p,"EyeL_Frame"));
  assert.deepEqual(xiaomaiPoint(513,373,p,"face_layer"),xiaomaiPoint(513,373,p,"Mouth_Open"));
  assert.deepEqual(xiaomaiPoint(512,760,p,"cardigan_body"),[512,760]);
  const neutral=neutralXiaomaiPose();
  assert.deepEqual(xiaomaiPoint(520,300,neutral),[520,300]);
  assert.deepEqual(xiaomaiPoint(420,270,{...p,hair:4},"hair_front_main"),xiaomaiPoint(420,270,p,"hair_front_main"),"hair crossing the eye must remain attached");
});
test("reduced motion freezes decoration while expressions remain bounded; returning to neutral settles hair",()=>{
  const m=new XiaomaiMotion(()=>.5);
  for(let i=0;i<180;i++)m.update(1/60,"speaking",false,.5,"hair");
  const p=m.update(1/60,"idle",true,0,"hair");
  assert.deepEqual(p,neutralXiaomaiPose());
  let rest=p;
  for(let i=0;i<360;i++)rest=m.update(1/60,"idle",false,0,"neutral");
  assert.ok(Math.abs(rest.hair)<.001 && Math.abs(rest.z)<.001);
});
test("confirmation nod runs once on entry; speaking silence does not invent emphasis",()=>{
  const m=new XiaomaiMotion(()=>.5);let lowest=0,last=neutralXiaomaiPose();
  for(let i=0;i<240;i++){last=m.update(1/60,"affirming",false);lowest=Math.min(lowest,last.y);}
  assert.ok(lowest<-4);assert.ok(Math.abs(last.y)<.01);
  const silent=new XiaomaiMotion(()=>.5);
  for(let i=0;i<600;i++)assert.equal(silent.update(1/60,"speaking",false,0).y,0);
});

test("released motions and retired commands never turn the head horizontally",()=>{
  const m=new XiaomaiMotion(()=>.5);
  const retired=['turnLeft','turnRight','turnSweep','turnBlink'] as const;
  for(const action of retired)assert.equal(Object.hasOwn(xiaomaiActions,action),false);
  for(const state of ['idle','thinking','listening','speaking','affirming','goodbye'] as const){
    for(const action of [...Object.keys(xiaomaiActions) as XiaomaiAction[],...retired]){
      for(let i=0;i<360;i++)assert.equal(m.update(1/60,state,false,.5,action).x,0,`${state}/${action}`);
    }
  }
});

test("idle has quiet intervals, blinks and restrained gestures; listening takes priority",()=>{
  const m=new XiaomaiMotion(()=>.5);let quiet=0,gestures=0,blinks=0,wasBlink=false;
  for(let i=0;i<60*120;i++){
    const p=m.update(1/60,'idle',false);
    if(Math.abs(p.shift)<.005 && Math.abs(p.z)<.01)quiet++;
    if(Math.abs(p.shift)>.1)gestures++;
    if(p.eyeOpen<.2&&!wasBlink)blinks++;
    wasBlink=p.eyeOpen<.2;
    assert.ok(Math.abs(p.shift)<=.25 && Math.abs(p.z)<=.45);
    assert.equal(p.expressionOpen,0,'idle never invents speech');
  }
  assert.ok(quiet>60*120*.6,'most idle time should be quiet');
  assert.ok(gestures>60*5,'occasional movement is visible');
  assert.ok(blinks>=18 && blinks<=30,'natural blink spacing');
  let p=neutralXiaomaiPose();
  for(let i=0;i<60*20;i++)p=m.update(1/60,'listening',false);
  assert.ok(Math.abs(p.shift)<.001 && Math.abs(p.eyeX)<.001);
  assert.ok(Math.abs(p.y-1.4)<.001,'listening does not nod repeatedly as if agreeing');
});
