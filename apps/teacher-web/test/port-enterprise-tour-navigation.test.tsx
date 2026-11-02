import test from 'node:test';
import assert from 'node:assert/strict';
import React,{useCallback,useRef,useState} from 'react';
import {JSDOM} from 'jsdom';
import {useEnterpriseTourLock} from '../src/features/port-simulation/enterprise/enterprise-tour-lock';

test('observing a scene control records the receipt before its click navigates and cleans up the lock',async()=>{
 const dom=new JSDOM('<!doctype html><body></body>',{url:'http://tour-navigation.test/'});
 Object.assign(globalThis,{React,window:dom.window,document:dom.window.document,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,HTMLDetailsElement:dom.window.HTMLDetailsElement,HTMLSelectElement:dom.window.HTMLSelectElement,MutationObserver:dom.window.MutationObserver});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:dom.window.navigator});
 Object.assign(globalThis,{requestAnimationFrame:(fn:FrameRequestCallback)=>setTimeout(()=>fn(0),0),cancelAnimationFrame:clearTimeout,ResizeObserver:class{observe(){}disconnect(){}}});
 dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:100,bottom:40,width:100,height:40,toJSON(){}});
 dom.window.HTMLElement.prototype.getClientRects=()=>[{width:100,height:40}] as unknown as DOMRectList;
 const {render,fireEvent,cleanup}=await import('@testing-library/react');
 let receipts=0,blocked=0,unrelated=0;
 function Page(){const rootRef=useRef<HTMLDivElement>(null),[open,setOpen]=useState(false),observe=useCallback(()=>{receipts++;},[]),onBlocked=useCallback(()=>{blocked++;},[]);
  useEnterpriseTourLock({rootRef,selector:open?'#close':'#inspect',enabled:true,blocked:false,replay:0,onObserve:open?undefined:observe,onBlocked});
  return <div ref={rootRef}><button id="inspect" onClick={()=>setOpen(true)}>查看现场</button><button onClick={()=>unrelated++}>其他管理</button>{open&&<button id="close" onClick={()=>setOpen(false)}>关闭窗口</button>}</div>;
 }
 try{const page=render(<Page/>);fireEvent.click(page.getByText('其他管理'));assert.equal(unrelated,0);assert.equal(receipts,0);assert.ok(blocked>0);
  fireEvent.click(page.getByText('查看现场'));assert.ok(page.getByText('关闭窗口'));assert.equal(receipts,1,'a successful navigation must not discard the observation');
  fireEvent.click(page.getByText('关闭窗口'));assert.equal(receipts,1,'closing another window is not another observation');
 }finally{cleanup();dom.window.close();}
});
