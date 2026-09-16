import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {buildApp} from "../src/app.js";

test("teacher simulation locations are role protected, versioned, validated and cleared on returning to slides",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"edu-student-navigation-"));
  const app=await buildApp({dataFile:join(dir,"state.json"),allowLegacyDevelopmentIdentity:false,portSimulationTickMs:0});
  try {
    const login=async(role:string)=>{const r=await app.inject({method:"POST",url:"/api/identity/development/session",payload:{role}});assert.equal(r.statusCode,201,r.body);return {cookie:String(r.headers["set-cookie"]).split(";")[0]!};};
    const teacher=await login("teacher"),student=await login("student");
    const created=await app.inject({method:"POST",url:"/api/courses/course-port-management-intro/class-sessions",headers:teacher});
    assert.equal(created.statusCode,201,created.body);
    const root=`/api/class-sessions/${created.json().id}`;
    const post=(payload:object,headers=teacher)=>app.inject({method:"POST",url:root+"/events",headers,payload});
    const snapshot=(await post({type:"set_slide",index:163})).json();
    assert.equal(snapshot.simulationNavigation,null);
    const navigation={unit:"arrival",originSlideKey:snapshot.slide.slideId};
    assert.equal((await post({type:"set_simulation_navigation",navigation},student)).statusCode,403);
    assert.equal((await post({type:"set_simulation_navigation",navigation:{...navigation,unit:"unknown"}})).statusCode,400);
    assert.equal((await post({type:"set_simulation_navigation",navigation:{...navigation,originSlideKey:"missing"}})).statusCode,409);
    let current=(await post({type:"set_simulation_navigation",navigation})).json();
    assert.deepEqual(current.simulationNavigation,navigation);
    assert.ok(current.runtimeVersion>snapshot.runtimeVersion);
    assert.deepEqual(current.simulation,snapshot.simulation);
    assert.equal((await post({type:"set_simulation_navigation",navigation})).json().runtimeVersion,current.runtimeVersion);
    for(const unit of ["cargo","yard","departure","planning","full"]) {
      current=(await post({type:"set_simulation_navigation",navigation:{...navigation,unit}})).json();
      const view=(await app.inject({url:root+"/snapshot",headers:student})).json();
      assert.equal(view.simulationNavigation.unit,unit);
      assert.deepEqual(view.simulation,snapshot.simulation);
    }
    const returned=(await post({type:"set_simulation_navigation",navigation:null})).json();
    assert.equal(returned.slide.index,163);assert.equal(returned.simulationNavigation,null);
    await post({type:"set_simulation_navigation",navigation});
    const turned=(await post({type:"next_slide"})).json();assert.equal(turned.simulationNavigation,null);assert.equal(turned.slide.index,164);
    await app.inject({method:"POST",url:root+"/end",headers:teacher});
    assert.equal((await post({type:"set_simulation_navigation",navigation})).statusCode,409);
  }finally{await app.close();await rm(dir,{recursive:true,force:true});}
});
