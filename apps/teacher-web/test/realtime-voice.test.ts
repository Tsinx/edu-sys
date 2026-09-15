import test from "node:test";
import assert from "node:assert/strict";
import { LocalKeywordRecording } from "../src/features/classroom/local-keyword-recording.js";
import { pcm16Base64, RealtimeVoiceClient } from "../src/features/classroom/realtime-voice.js";
import type { RealtimeServerEvent } from "@edu/contracts";

test("streaming capture holds all pre-wake audio locally and sends the wake frame exactly once", () => {
  let begun = 0; const chunks: Float32Array[] = [];
  const recorder = new LocalKeywordRecording(10, { begin: () => { begun++; }, append: samples => chunks.push(samples.slice()) });
  recorder.push(new Float32Array([1,2,3,4,5]), [], 0);
  assert.equal(chunks.length, 0);
  recorder.push(new Float32Array([6,7,8,9,10]), [{ kind: "wake", start: .7 }], 100);
  assert.equal(begun, 1);
  assert.deepEqual(chunks.flatMap(chunk => [...chunk]), [8,9,10]);
  recorder.push(new Float32Array([11,12]), [], 200);
  assert.deepEqual(chunks.flatMap(chunk => [...chunk]), [8,9,10,11,12]);
  const events = recorder.push(new Float32Array([13,14]), [{ kind: "finish", start: 1.2 }], 300);
  assert.equal(events[0]?.type, "audio");
  // The local completed recording still excludes the ending word. The new
  // stream includes its boundary audio and commits only after local detection.
  assert.deepEqual(events[0]?.type === "audio" ? [...events[0].samples] : [], [8,9,10,11,12]);
  assert.deepEqual(chunks.flatMap(chunk => [...chunk]), [8,9,10,11,12,13,14]);
  recorder.push(new Float32Array([15]), [], 400);
  assert.equal(chunks.flatMap(chunk => [...chunk]).length, 7);
});
test("cancelling returns to local standby and a new wake begins a fresh stream", () => {
  let begun=0; const sent:number[]=[];
  const recorder=new LocalKeywordRecording(10,{begin:()=>{begun++;},append:samples=>sent.push(...samples)});
  recorder.begin(0);recorder.push(new Float32Array([1,2]),[],10);recorder.cancel();
  recorder.push(new Float32Array([3,4]),[],20);assert.deepEqual(sent,[1,2]);
  recorder.push(new Float32Array([5,6]),[{kind:"wake",start:.4}],30);
  assert.equal(begun,2);assert.deepEqual(sent,[1,2,5,6]);
});
test("PCM16 conversion clips, keeps little endian samples, and preserves silence",()=>{
  const buffer=Buffer.from(pcm16Base64(new Float32Array([-2,-1,0,.5,1,2])),"base64");
  assert.deepEqual(Array.from({length:6},(_,i)=>buffer.readInt16LE(i*2)),[-32768,-32768,0,16383,32767,32767]);
});

test("cancelled turns discard late events; disconnect stops queued playback and reconnect never replays", async () => {
  class Socket {
    static OPEN = 1;
    static all: Socket[] = [];
    readyState = 0; bufferedAmount = 0;
    sent: Array<{type:string;turnId?:string}> = [];
    onmessage?: (event:{data:string})=>void;
    onclose?: ()=>void;
    onerror?: ()=>void;
    constructor(_url:unknown) { Socket.all.push(this); }
    send(data:string) { this.sent.push(JSON.parse(data)); }
    message(event:RealtimeServerEvent) { this.onmessage?.({data:JSON.stringify(event)}); }
    ready() { this.readyState = 1; this.message({type:"session.ready"}); }
    close() { this.readyState = 3; this.onclose?.(); }
  }
  const originals = ["window", "location", "WebSocket"].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  Object.defineProperties(globalThis, {
    window:{configurable:true,value:{setTimeout,clearTimeout,dispatchEvent:()=>true}},
    location:{configurable:true,value:{href:"https://localhost/",protocol:"https:"}},
    WebSocket:{configurable:true,value:Socket}
  });
  const events:RealtimeServerEvent[]=[];
  const client=new RealtimeVoiceClient("test-session",event=>events.push(event));
  try {
    const preparing=client.prepare(),socket=Socket.all[0]!;socket.ready();await preparing;
    client.begin();const oldId=client.turnId!;client.append(new Float32Array(1600));
    const cancelled=client.commit();client.cancel();await assert.rejects(cancelled,/已取消/);
    client.begin();const newId=client.turnId!;client.append(new Float32Array(1600));const done=client.commit();
    socket.message({type:"audio.delta",turnId:oldId,audioBase64:"AAA=",sampleRate:24000});
    socket.message({type:"error",turnId:oldId,code:"LATE",message:"late failure"});
    socket.message({type:"turn.completed",turnId:oldId,timing:{responseCount:1,totalMs:2}});
    assert.equal(events.filter(event=>"turnId" in event&&event.turnId===oldId).length,0);
    assert.equal(client.turnId,newId);
    socket.message({type:"turn.completed",turnId:newId,timing:{responseCount:1,totalMs:2}});await done;
    socket.close();
    assert.ok(events.some(event=>event.type==="error"&&event.code==="DISCONNECTED"),'disconnect also reaches an avatar with completed but queued speech');
    const reconnect=client.prepare(),next=Socket.all[1]!;next.ready();await reconnect;
    assert.equal(next.sent.length,0,'reconnect must not replay an earlier turn');
    client.begin();assert.equal(next.sent[0]?.type,"turn.begin");
    assert.notEqual(next.sent[0]?.turnId,newId);
  } finally {
    client.close();
    for(const [key,descriptor] of originals) { if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key); }
  }
});
