import test from 'node:test';
import assert from 'node:assert/strict';
import {bakedHeadYaw} from '../src/features/avatar/xiaomai-head-projection.js';
import {neutralXiaomaiPose,xiaomaiLocalMatrix,xiaomaiPoint,XiaomaiMotion} from '../src/features/avatar/xiaomai-motion.js';

test('baked head keeps its neutral coordinates, moves facial relief and does not fold the visible face',()=>{
  for(let y=180;y<=420;y+=8)for(let x=340;x<=680;x+=4){
    assert.equal(bakedHeadYaw(x,y,0),x);
    for(let a=-18;a<=18;a+=3)assert.ok(bakedHeadYaw(x+1,y,a)>bakedHeadYaw(x,y,a),`${x},${y},${a}`);
  }
  assert.ok(bakedHeadYaw(507,330,18)-507>bakedHeadYaw(645,330,18)-645+10,'nose and distant contour have different depth');
});

test('eye overlays agree with the common baked surface across their full painted patches',()=>{
  for(const a of [-10,-5,0,5,10]){
    const p={...neutralXiaomaiPose(),volume:1,x:a};
    for(const [cx,cy,l,t,r,b] of [[448,280,393,248,490,312],[563,268,528,234,613,297]]){
      const m=xiaomaiLocalMatrix(cx!,cy!,p).slice(7,-1).split(' ').map(Number);
      for(let y=t!;y<=b!;y+=8)for(let x=l!;x<=r!;x+=8){
        const q=xiaomaiPoint(x,y,p);const affine=m[0]!*x+m[2]!*y+m[4]!;
        assert.ok(Math.abs(q[0]-affine)<.12,`${a}, ${x}, ${y}: ${q[0]-affine}`);
      }
    }
  }
});

test('one-shot classroom combinations settle and expressive mouth returns to neutral',()=>{
  for(const action of ['welcome','ask','praise','finish'] as const){
    const m=new XiaomaiMotion(()=>.5);let p=neutralXiaomaiPose();
    for(let i=0;i<600;i++)p=m.update(1/60,'idle',false,0,action);
    assert.ok(Math.abs(p.x)+Math.abs(p.y)+Math.abs(p.z)+Math.abs(p.smile)<.01,action);
  }
  const m=new XiaomaiMotion(()=>.5);
  for(let i=0;i<120;i++)m.update(1/60,'idle',false,0,'surprise');
  let p=neutralXiaomaiPose();for(let i=0;i<180;i++)p=m.update(1/60,'idle',false,0,'neutral');
  assert.ok(p.expressionOpen<.001);
});
