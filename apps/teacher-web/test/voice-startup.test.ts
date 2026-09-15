import test from "node:test";
import assert from "node:assert/strict";
import { awaitVoiceStartup, microphoneError } from "../src/features/classroom/voice-startup.js";

test("a stalled microphone request times out; a late device is released without reviving capture", async () => {
  let grant!: (stream: {stop():void}) => void;
  let stopped=0;
  const pending=new Promise<{stop():void}>(resolve=>{grant=resolve;});
  await assert.rejects(awaitVoiceStartup(pending,new AbortController().signal,10,"microphone timeout",stream=>stream.stop()),/microphone timeout/);
  grant({stop:()=>{stopped++;}});await Promise.resolve();
  assert.equal(stopped,1);
});

test("cancelling startup promptly releases a permission grant arriving after cancellation", async () => {
  const controller=new AbortController();let grant!:(device:number)=>void;
  const released:number[]=[];
  const starting=awaitVoiceStartup(new Promise<number>(resolve=>{grant=resolve;}),controller.signal,10000,"timeout",value=>released.push(value));
  controller.abort();await assert.rejects(starting,{name:"AbortError"});
  grant(7);await Promise.resolve();assert.deepEqual(released,[7]);
});

test("successful startup retains its device and distinguishes permission, missing device, and device failure",async()=>{
  let released=false;
  assert.equal(await awaitVoiceStartup(Promise.resolve(12),new AbortController().signal,100,"timeout",()=>{released=true;}),12);
  assert.equal(released,false);
  assert.match(microphoneError(new DOMException("denied","NotAllowedError")).message,/允许/);
  assert.match(microphoneError(new DOMException("none","NotFoundError")).message,/没有可用麦克风/);
  assert.match(microphoneError(new DOMException("busy","NotReadableError")).message,/无法启动麦克风设备/);
  assert.equal(microphoneError(new Error("original network failure")).message,"original network failure");
});
