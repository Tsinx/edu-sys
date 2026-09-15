import test from "node:test";
import assert from "node:assert/strict";
import { createPortNavigation, navigationPathClear, portLocationPose, portNavigationPose, portNavigationProfile, NAV_KNOT } from "../src/port-navigation.js";
import { createPortSession, applyPortCommand, advancePortSession, serializePortSession, restorePortSession, createPortCourse, serializePortCourse, restorePortCourse } from "../src/index.js";

test("all ship classes and destinations use continuous, clear, radius-limited navigation", () => {
  for(const large of [false,true]) {
    const berths=large?[1]:[0,1];
    const routes:[string,string][]=[...[0,1,2,3].map(i=>["outer",`anchor:${i}`] as [string,string]),...berths.flatMap(i=>[["outer",`berth:${i}`],[`berth:${i}`,"sea"],...[0,1,2,3].map(a=>[`anchor:${a}`,`berth:${i}`])] as [string,string][])];
    for(const [from,to] of routes) {
      const n=createPortNavigation(from,to,large), profile=portNavigationProfile(large);
      assert.ok(navigationPathClear(n.segments,from,to),`${large} ${from} -> ${to}`);
      assert.ok(Number.isFinite(n.duration)&&n.duration>0);
      const start=portNavigationPose(n,0),end=portNavigationPose(n,n.duration), a=portLocationPose(from),b=portLocationPose(to);
      assert.ok(Math.hypot(start.x-a.x,start.z-a.z)<1e-6);
      assert.ok(Math.hypot(end.x-b.x,end.z-b.z)<1e-6);
      assert.equal(start.speedKnots,0);assert.equal(end.speedKnots,0);
      for(let i=1;i<n.segments.length;i++) {
        const prev=n.segments[i-1]!,cur=n.segments[i]!;
        assert.ok(Math.hypot(prev.to.x-cur.from.x,prev.to.z-cur.from.z)<1e-5);
        assert.ok(Math.cos(prev.to.heading-cur.from.heading)>1-1e-5);
      }
      for(const seg of n.segments) if(seg.radius) assert.ok(seg.radius*2>=profile.radiusMetres-1e-6);
      for(let i=1;i<n.samples.length;i++) {
        const a=n.samples[i-1]!,b=n.samples[i]!,acc=(b.speed*b.speed-a.speed*a.speed)/(2*(b.distance-a.distance));
        assert.ok(acc<=profile.acceleration+1e-7&&acc>=-profile.deceleration-1e-7);
        assert.ok(b.speed<=profile.outerKnots*NAV_KNOT+1e-7);
      }
      assert.deepEqual(createPortNavigation(from,to,large),n);
    }
  }
});

test("source footprint is reserved until physically clear and navigation replays across clock partitions",()=>{
  const s=createPortSession("battle");applyPortCommand(s,{kind:"start"});
  for(const document of ["entry","health","border"] as const)applyPortCommand(s,{kind:"document",callId:"S01",document,value:s.calls.S01!.docs[document].reference});
  advancePortSession(s,s.schedules[0]!.ata);
  applyPortCommand(s,{kind:"move",callId:"S01",target:"anchor",slot:0});
  const arriving=s.calls.S01!.move!;advancePortSession(s,arriving.end-s.second);
  applyPortCommand(s,{kind:"move",callId:"S01",target:"berth",slot:1});
  const move=s.calls.S01!.move!,raw=serializePortSession(s),split=restorePortSession(raw),whole=restorePortSession(raw);
  assert.equal(s.anchors[0],"S01");assert.equal(s.berths[1],"S01");
  const clear=move.navigation!.releaseAfter;
  advancePortSession(s,clear-1);assert.equal(s.anchors[0],"S01");
  advancePortSession(s,1);assert.equal(s.anchors[0],null);assert.equal(s.channel,"S01");
  const delta=move.end-move.start+900;
  advancePortSession(whole,delta);
  for(let left=delta;left>0;){const step=Math.min(37,left);advancePortSession(split,step);left-=step;}
  const evidence=(x:typeof s)=>JSON.stringify({calls:x.calls,berths:x.berths,anchors:x.anchors,channel:x.channel,notices:x.notices,cost:Math.round(x.cost*1e8)/1e8});
  assert.equal(evidence(split),evidence(whole));
  assert.equal(evidence(restorePortSession(serializePortSession(whole))),evidence(whole));
  assert.equal(whole.calls.S01!.stage,"berthed");
});

test("legacy 3.0 sessions and 1.0 course fixtures retain their fixed-duration replay rules",()=>{
  const s=createPortSession("battle",undefined,undefined,"port-operations/3.0");applyPortCommand(s,{kind:"start"});
  for(const document of ["entry","health","border"] as const)applyPortCommand(s,{kind:"document",callId:"S01",document,value:s.calls.S01!.docs[document].reference});
  advancePortSession(s,s.schedules[0]!.ata);applyPortCommand(s,{kind:"move",callId:"S01",target:"berth",slot:0});
  assert.equal(s.calls.S01!.move!.end-s.second,1200);assert.equal(s.calls.S01!.move!.navigation,undefined);
  assert.deepEqual(restorePortSession(serializePortSession(s)),s);
  for(const unit of ["arrival","cargo","yard","planning","departure"] as const){const c=createPortCourse(unit,"port-course/1.0");assert.equal(c.simulation.schema,"port-operations/3.0");assert.deepEqual(restorePortCourse(serializePortCourse(c)),c);}
});
