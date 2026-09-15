import assert from 'node:assert/strict';
import test from 'node:test';
import {getAvatarRenderer,getLive2DCharacter,getAvatarVoice,setAvatarRenderer,setLive2DCharacter} from '../src/features/avatar/avatar-preference.js';

test('fresh and retired avatar preferences resolve to Xiaomai and her default voice',()=>{
  const savedStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const savedWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  const values=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:new EventTarget()});
  try{
    assert.equal(getAvatarRenderer(),'live2d');assert.equal(getLive2DCharacter(),'xiaomai');
    for(const renderer of ['lam','live2d'])for(const character of ['haru','natori','hiyori','xiaomai']){
      values.set('edu-avatar-renderer-v1',renderer);values.set('edu-live2d-character-v1',character);
      assert.equal(getAvatarRenderer(),'live2d');assert.equal(getLive2DCharacter(),'xiaomai');assert.equal(getAvatarVoice(),'default');
    }
    setLive2DCharacter('natori');assert.equal(values.get('edu-live2d-character-v1'),'xiaomai');
    setAvatarRenderer('video');assert.equal(getAvatarRenderer(),'video');assert.equal(getAvatarVoice(),'default');
    setAvatarRenderer('live2d');
  }finally{
    if(savedStorage)Object.defineProperty(globalThis,'localStorage',savedStorage);else Reflect.deleteProperty(globalThis,'localStorage');
    if(savedWindow)Object.defineProperty(globalThis,'window',savedWindow);else Reflect.deleteProperty(globalThis,'window');
  }
});
