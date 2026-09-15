import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VoiceCommandComposer } from "../src/features/classroom/VoiceCommandComposer";
import { startVoiceCapture } from "../src/features/classroom/continuous-voice";
import type { RealtimeCaptureSink } from "../src/features/classroom/realtime-voice";

function replaceGlobals(values: Record<string, unknown>) {
  const original = Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, {configurable:true,value});
  return () => { for (const [key, descriptor] of original) { if (descriptor) Object.defineProperty(globalThis,key,descriptor); else Reflect.deleteProperty(globalThis,key); } };
}
const sink: RealtimeCaptureSink = {async prepare(){},begin(){},append(){},async commit(){},cancel(){}};

test("classroom voice has no path selector and missing realtime disables capture while retaining text input", () => {
  const restore = replaceGlobals({document:{hidden:false},localStorage:{getItem:()=>"existing"}});
  try {
    const ready = renderToStaticMarkup(<VoiceCommandComposer realtime={sink} onCommand={async()=>{}} />);
    assert.match(ready,/实时语音/); assert.match(ready,/按键输入/); assert.match(ready,/检测输入/); assert.match(ready,/文字输入/);
    assert.doesNotMatch(ready,/语音链路|现有语音|实时语音（试用）/);
    const unavailable = renderToStaticMarkup(<VoiceCommandComposer onCommand={async()=>{}} />);
    assert.match(unavailable,/aria-label="开始录音" disabled/);
    assert.match(unavailable,/实时语音暂不可用/);
    assert.match(unavailable,/文字输入/);
  } finally { restore(); }
});

test("recording cannot start without realtime, and a failed connection never requests microphone or HTTP ASR", async () => {
  let microphone = 0, http = 0;
  const restore = replaceGlobals({window:{isSecureContext:true},AudioWorkletNode:class {},
    navigator:{mediaDevices:{async getUserMedia(){microphone++;throw new Error("must not capture");}}},
    fetch:async()=>{http++;throw new Error("must not call legacy HTTP");}});
  const options = {mode:"manual" as const,realtime:sink,signal:new AbortController().signal,onState(){},onError(){}};
  try {
    await assert.rejects(startVoiceCapture({...options,realtime:undefined!}),/需要实时语音连接/);
    await assert.rejects(startVoiceCapture({...options,realtime:{...sink,async prepare(){throw new Error("realtime offline");}}}),/realtime offline/);
    assert.equal(microphone,0); assert.equal(http,0);
  } finally { restore(); }
});

test("manual capture streams before submit, closes microphone, and commits once without legacy HTTP", async () => {
  let micStopped = 0, begun = 0, committed = 0, http = 0, cancelled = 0;
  const sent: number[] = [];
  class Worklet {
    static last: Worklet;
    port = {onmessage: null as null | ((event:{data:Float32Array})=>void),close(){}};
    constructor(){Worklet.last=this;} connect(){} disconnect(){}
  }
  class Context {
    sampleRate=16000; destination={}; audioWorklet={async addModule(){}};
    async resume(){} async close(){} createMediaStreamSource(){return {connect(){},disconnect(){}};}
  }
  const track = {stop(){micStopped++;},addEventListener(){}};
  const restore = replaceGlobals({window:{isSecureContext:true},AudioContext:Context,AudioWorkletNode:Worklet,
    navigator:{mediaDevices:{async getUserMedia(){return {getTracks:()=>[track],getAudioTracks:()=>[track]};}}},
    fetch:async()=>{http++;throw new Error("legacy HTTP forbidden");}});
  const controller = new AbortController();
  try {
    const capture = await startVoiceCapture({mode:"manual",signal:controller.signal,onState(){},onError(error){throw error;},
      realtime:{async prepare(){},begin(){begun++;},append(samples){sent.push(...samples);},async commit(){committed++;assert.ok(micStopped>0);},cancel(){cancelled++;}}});
    Worklet.last.port.onmessage!({data:new Float32Array([.5,.25])});
    assert.deepEqual(sent,[.5,.25]); assert.equal(committed,0);
    capture.finish(); capture.finish(); await Promise.resolve();
    assert.equal(begun,1); assert.equal(committed,1); assert.equal(http,0);
    controller.abort(); assert.equal(cancelled,0,"releasing capture must not cancel submitted response");
  } finally { controller.abort(); restore(); }
});
