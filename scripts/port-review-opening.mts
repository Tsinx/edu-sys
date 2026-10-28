import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{loadEnvFile('.env');}catch{}
const folder='output/port-review-media',provider=new DashScopeStudySpeechProvider();
await mkdir(folder,{recursive:true});
const films=[
 {lesson:20,voiceKey:19,title:'从码头作业到可靠交付',shots:[
  {id:'intro',from:0,duration:5,text:'一艘船靠上码头，交付过程才刚刚开始。'},
  {id:'flow',from:5,duration:9,source:'smart',sourceStart:34,text:'岸桥、水平运输与堆场共同组织箱流。一个环节提速，完整系统未必同步变快。'},
  {id:'delivery',from:14,duration:9,source:'smart',sourceStart:43,text:'同样的吞吐量，可能对应不同的等待、交付可靠性与风险承担。'},
  {id:'close',from:23,duration:9,text:'沿着完整案例，重新连接贸易、作业、绩效与恢复，解释可靠交付如何形成。'}
 ]},
 {lesson:21,voiceKey:20,title:'从交付承诺到长期经营',shots:[
  {id:'intro',from:0,duration:5,text:'一批货物的交付，连接着一座港口的长期经营。'},
  {id:'flow',from:5,duration:9,source:'guoyuan',sourceStart:230,text:'通关与保税安排改变业务条件，数字协同连接信息与执行。'},
  {id:'delivery',from:14,duration:9,source:'green',sourceStart:85,text:'绿色改造需要实际使用，扩建投资需要需求、工期与资金共同支持。'},
  {id:'close',from:23,duration:9,text:'从重庆备件到岸电与扩建，案例的计算保留对象、时点和每项选择成立的条件。'}
 ]}
];
for(const film of films)for(const shot of film.shots){
 const name=film.voiceKey+'-'+shot.id,hash=createHash('sha256').update(shot.text).digest('hex'),path=folder+'/'+name+'.wav';
 try{const saved=JSON.parse(await readFile(folder+'/'+name+'.json','utf8'));if(saved.textSha256===hash){await readFile(path);continue;}}catch{}
 if(!provider.ttsConfigured)throw Error('Existing classroom voice is unavailable');
 const chunks:Buffer[]=[];for await(const chunk of provider.synthesize(shot.text,AbortSignal.timeout(90000),'default'))chunks.push(Buffer.from(chunk.audioBase64,'base64'));
 const pcm=Buffer.concat(chunks),h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
 await writeFile(path,Buffer.concat([h,pcm]));await writeFile(folder+'/'+name+'.json',JSON.stringify({textSha256:hash,seconds:pcm.length/48000,voice:'existing classroom default'}));console.log(name+': '+(pcm.length/48000).toFixed(2)+'s');
}
await writeFile(folder+'/films.json',JSON.stringify(films,null,2)+'\n');
