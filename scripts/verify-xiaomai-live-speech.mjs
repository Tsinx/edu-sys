import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const output=process.env.EDU_QA_OUTPUT || 'output/live2d-qa/lip-sync-v2';
await mkdir(output,{recursive:true});
const start=performance.now();
const response=await fetch(`${process.env.EDU_API_ORIGIN||'http://127.0.0.1:4300'}/api/teacher/tts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'大家好，我是小麦老师。啊，衣，乌，喔。请比较计划、组织和控制。我们一起分析这个问题。',voiceProfile:'default',lipSync:true})});
assert.equal(response.status,200);
const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',firstMs;const chunks=[];
while(true){const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){if(line.startsWith('data:')){const event=JSON.parse(line.slice(5));assert.ok(!event.error,event.error);if(event.audioBase64){firstMs??=performance.now()-start;chunks.push(event);}}}if(done)break;}
const pcm=Buffer.concat(chunks.map(chunk=>Buffer.from(chunk.audioBase64,'base64')));
const report={firstMs,totalMs:performance.now()-start,chunks:chunks.length,bytes:pcm.length,cueCount:chunks.reduce((n,c)=>n+(c.mouthCues?.length||0),0),shapes:[...new Set(chunks.flatMap(c=>c.mouthCues?.map(x=>x.value)||[]))]};
assert.ok(report.cueCount>20,'live backend must produce audio-derived cues');assert.ok(report.shapes.length>=5);
for(const chunk of chunks){const duration=Buffer.from(chunk.audioBase64,'base64').length/48000;for(const cue of chunk.mouthCues||[])assert.ok(cue.start>=0&&cue.end<=duration&&cue.end>cue.start);}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
await writeFile(`${output}/live-speech.wav`,Buffer.concat([header,pcm]));
await writeFile(`${output}/live-tts.json`,JSON.stringify(chunks));await writeFile(`${output}/live-tts-report.json`,JSON.stringify(report,null,2));console.log(report);
