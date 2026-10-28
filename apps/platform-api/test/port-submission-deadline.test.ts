import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createPortSession,applyPortCommand,serializePortSession,makePortSubmission} from '@edu/port-simulation-core';
import {buildApp} from '../src/app.js';
import {CampusIdentityProvider} from '../src/campus/accounts.js';

test('the legacy full experiment submits immediately before and exactly at its 48-hour deadline',{timeout:360000},async()=>{
  const dir=await mkdtemp(join(tmpdir(),'edu-port-deadline-')),dataFile=join(dir,'state.json'),provider=new CampusIdentityProvider(dataFile+'.accounts.sqlite');
  for(const [username,role] of [['teacher','teacher'],['before','student'],['at-end','student']] as const)await provider.createAccount(username,username,role,'port-boundary-test-password');
  const app=await buildApp({dataFile,identityProvider:provider,campusMode:true,secureIdentityCookie:false});
  try{
    const login=async(username:string)=>String((await app.inject({method:'POST',url:'/api/identity/login',payload:{username,password:'port-boundary-test-password'}})).headers['set-cookie']).split(';')[0]!;
    const teacher=await login('teacher');assert.equal((await app.inject({method:'POST',url:'/api/port-operations/courses/course-port-management-intro/tasks',headers:{cookie:teacher},payload:{unit:'full'}})).statusCode,200);
    const session=createPortSession('battle');applyPortCommand(session,{kind:'start'});applyPortCommand(session,{kind:'advance',seconds:172799});
    for(const [username,second] of [['before',172799],['at-end',172800]] as const){
      if(second===172800)applyPortCommand(session,{kind:'advance',seconds:1});
      assert.equal(session.second,second);
      const pkg=await makePortSubmission(serializePortSession(session),session),cookie=await login(username);
      assert.equal(pkg.ended,second===172800?'completed':'student');
      const input={requestId:randomUUID(),courseId:'course-port-management-intro',expectedRevision:0,package:pkg};
      const post=()=>app.inject({method:'POST',url:'/api/port-operations/submissions',headers:{cookie},payload:input});
      const first=await post();assert.equal(first.statusCode,202,first.body);const id=first.json().id;
      assert.equal((await post()).json().id,id,'retry returns the original submission');
      let result:any;
      for(let n=0;n<900;n++){
        result=(await app.inject({url:'/api/port-operations/submissions/'+id,headers:{cookie}})).json();
        if(['verified','rejected'].includes(result.status))break;
        await new Promise(resolve=>setTimeout(resolve,200));
      }
      assert.equal(result.status,'verified',JSON.stringify(result));assert.equal(result.result.stateHash,pkg.expected.stateHash);assert.equal(result.result.complete,second===172800);
      assert.equal(result.result.second,second);
    }
  }finally{await app.close();assert.ok(resolve(dir).startsWith(resolve(tmpdir())+sep));await rm(dir,{recursive:true,force:true});}
});
