import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{loadEnvFile('.env');}catch{}
const folder='output/port-investment',provider=new DashScopeStudySpeechProvider();
await mkdir(folder,{recursive:true});
const shots=[
 {id:'intro',from:0,duration:6,text:'港口扩建，什么时候值得开始？'},
 {id:'operation',from:6,duration:12,sourceStart:45,text:'眼前是洋山港的历史作业画面。已有港区持续运营，新的能力还要经过规划、施工和投产。'},
 {id:'construction',from:18,duration:12,sourceStart:146,text:'建设期间，资金已经占用，服务能力却不会立刻增加。分期建设，能否少承担一些需求风险？'},
 {id:'decision',from:30,duration:14,text:'转入东湾港的教学情境：立即完整建设，先建一期，还是观察一年？请把需求、工期和现金，放在同一条时间线上比较。'}
];
for(const shot of shots){
 const hash=createHash('sha256').update(shot.text).digest('hex'),path=folder+'/'+shot.id+'.wav';
 try{const saved=JSON.parse(await readFile(folder+'/'+shot.id+'.json','utf8'));if(saved.textSha256===hash){await readFile(path);continue;}}catch{}
 if(!provider.ttsConfigured)throw Error('Existing classroom voice is unavailable');
 const chunks:Buffer[]=[];for await(const chunk of provider.synthesize(shot.text,AbortSignal.timeout(90000),'default'))chunks.push(Buffer.from(chunk.audioBase64,'base64'));
 const pcm=Buffer.concat(chunks),h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
 await writeFile(path,Buffer.concat([h,pcm]));await writeFile(folder+'/'+shot.id+'.json',JSON.stringify({textSha256:hash,seconds:pcm.length/48000,voice:'existing classroom default'}));console.log(shot.id+': '+(pcm.length/48000).toFixed(2)+'s');
}
await writeFile(folder+'/shots.json',JSON.stringify(shots,null,2)+'\n');
