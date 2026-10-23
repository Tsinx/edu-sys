import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{loadEnvFile('.env');}catch{}
const folder='output/port-queue-media';
await mkdir(folder,{recursive:true});
const provider=new DashScopeStudySpeechProvider();
if(!provider.ttsConfigured)throw Error('Existing classroom voice is not configured');
const shots=[
 {id:'intro',from:0,duration:4,text:'港口拥堵，为什么会突然加剧？'},
 {id:'operation',from:4,duration:9,sourceStart:34,text:'设备持续作业，不能保证每一票业务都能立刻得到服务。等待，也发生在任务接续之间。'},
 {id:'variation',from:13,duration:9,sourceStart:60,text:'当到达和服务都有波动，即使平均能力大于平均需求，长队仍然可能出现。'},
 {id:'boundary',from:22,duration:8,sourceStart:96,text:'下面把复杂港口缩小为一个核验台，用每辆车的记录，追查等待怎样累积。'},
 {id:'question',from:30,duration:16,text:'假设核验台平均每小时能处理一百票，原来平均到达九十票。现在增加到九十九票。还剩一票能力，就可以放心接单吗？请先留下你的预测。'},
];
for(const shot of shots){
 const textSha256=createHash('sha256').update(shot.text).digest('hex'),path=folder+'/'+shot.id+'.wav';
 let old:{textSha256:string}|undefined;try{old=JSON.parse(await readFile(folder+'/'+shot.id+'.json','utf8'));}catch{}
 if(old?.textSha256===textSha256){try{await readFile(path);continue;}catch{}}
 const chunks:Buffer[]=[];
 for await(const chunk of provider.synthesize(shot.text,AbortSignal.timeout(90000),'default'))chunks.push(Buffer.from(chunk.audioBase64,'base64'));
 const pcm=Buffer.concat(chunks),h=Buffer.alloc(44);
 h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
 await writeFile(path,Buffer.concat([h,pcm]));
 await writeFile(folder+'/'+shot.id+'.json',JSON.stringify({textSha256,seconds:pcm.length/48000,voice:'existing classroom default'},null,2));
 console.log(shot.id+': '+(pcm.length/48000).toFixed(2)+' seconds');
}
await writeFile(folder+'/shots.json',JSON.stringify(shots,null,2)+'\n');
