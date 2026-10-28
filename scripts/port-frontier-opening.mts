import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{loadEnvFile('.env');}catch{}
const folder='output/port-frontier-media',provider=new DashScopeStudySpeechProvider();await mkdir(folder,{recursive:true});
const shots=[
 {id:'intro',from:0,duration:5,text:'港口的智能，发生在哪一步？'},
 {id:'vision',from:5,duration:9,source:'smart',sourceStart:34,text:'相机从图像中形成线索，调度系统选择下一步，多家机构还要确认共同的业务状态。'},
 {id:'methods',from:14,duration:9,source:'green',sourceStart:85,text:'从卷积神经网络到深度强化学习，从区块链到数字孪生，每种技术都面对不同的问题。'},
 {id:'close',from:23,duration:13,text:'沿着一票教学货物，讲清模型怎样计算、错误怎样影响业务，以及技术为什么仍需要真实使用和持续经营。'}
];
for(const shot of shots){const hash=createHash('sha256').update(shot.text).digest('hex'),path=folder+'/'+shot.id+'.wav';try{const saved=JSON.parse(await readFile(folder+'/'+shot.id+'.json','utf8'));if(saved.textSha256===hash){await readFile(path);continue;}}catch{}if(!provider.ttsConfigured)throw Error('Existing classroom voice is unavailable');const chunks:Buffer[]=[];for await(const chunk of provider.synthesize(shot.text,AbortSignal.timeout(90000),'default'))chunks.push(Buffer.from(chunk.audioBase64,'base64'));const pcm=Buffer.concat(chunks),h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);await writeFile(path,Buffer.concat([h,pcm]));await writeFile(folder+'/'+shot.id+'.json',JSON.stringify({textSha256:hash,seconds:pcm.length/48000}));console.log(shot.id+': '+(pcm.length/48000).toFixed(2)+'s');}
await writeFile(folder+'/shots.json',JSON.stringify(shots,null,2)+'\n');
