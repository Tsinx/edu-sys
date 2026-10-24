import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {DashScopeStudySpeechProvider} from '../apps/platform-api/src/study/speech.js';
import {queueJobs,runQueue} from '../packages/course-content/src/port-queue-model.js';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
try{loadEnvFile('.env');}catch{/* The existing process environment may already supply the classroom voice. */}
const folder='output/port-queue-explainer';
await mkdir(folder,{recursive:true});
const provider=new DashScopeStudySpeechProvider();
if(!provider.ttsConfigured)throw Error('Existing classroom voice is not configured');
// Individually authored scenes. Timings expand to the natural speech, never speed it up.
const authored=[
 {id:'question',title:'车到了，为什么还不能开工？',minimum:8,text:'一辆车到了闸口，就能立刻开始核验吗？盯住第三辆车，看看它究竟在等什么。'},
 {id:'arrive',title:'跟住T03：到达不等于开工',minimum:13,text:'初始核验台空闲，每辆车服务两分钟。第一分钟，第二辆和第三辆同时到达。按编号先到先服务，第三辆排在后面。车已经进来，却还没有接受核验。'},
 {id:'serve',title:'同一辆车，经历两种状态',minimum:14,text:'第二分钟，第一辆完成，第二辆接着核验。第三辆仍在等。直到第四分钟，它才开始服务，第六分钟完成。黄色的等待和蓝色的服务，必须分开记录。'},
 {id:'clocks',title:'核验只用2分钟，为什么停留5分钟？',minimum:15,text:'把第三辆车的经历压成一条时间轴。到达、开始、完成，是三个时刻。中间三分钟在排队，两分钟在服务，系统里一共待了五分钟。只看核验用时，就会漏掉等待。'},
 {id:'car-first',title:'车先到：车等服务台',minimum:13,text:'开工要同时满足两项条件：车已经到，台已经空。先看车在第一分钟到达、前车第四分钟完成。第一道门已经打开，第二道门还关着。开工只能等到第四分钟。'},
 {id:'server-first',title:'台先空：服务台等车',minimum:14,text:'再把顺序倒过来。核验台第三分钟已经空闲，本车第五分钟才到。开工要等到第五分钟，但这辆车没有排队。先前空着的两分钟，也不能存起来补偿别人的等待。'},
 {id:'rule',title:'两个现场，压缩为同一条规则',minimum:12,text:'所以，开始时刻取本车到达与前车完成中较晚的那个。公式只是把两项开工条件写在一起。它适用于这里的单台、先到先服务排程，不是所有港口的通用等待预测。'},
 {id:'propagate',title:'一次核验变慢，影响怎样向后传？',minimum:19,text:'现在只把第二辆的核验延长一分钟，其他条件不变。第二辆晚一分钟完成，第三辆就多等一分钟，第四辆也多等一分钟。新增一分钟服务，造成后面两辆合计多等两分钟。影响沿着连续占用的队伍传下去。'},
 {id:'gap',title:'空闲间隙，可以截断延误',minimum:13,text:'延误会一直传下去吗？第五辆第十分钟才到。两种排程都在它到达前腾空了核验台，所以它仍在第十分钟开工。这一次，空闲间隙截断了延误。'},
 {id:'challenge',title:'下一步，只改变到达节奏',minimum:13,text:'接下来，保持八辆车、每车两分钟服务，只改变到达节奏。先预测：谁会等待，等待从哪一刻开始，什么时候消失？再到模拟一，用逐车过程检验你的解释。'},
];
const shots=[];
let from=0;
for(const scene of authored){
 const path=folder+'/'+scene.id+'.wav',textSha256=createHash('sha256').update(scene.text).digest('hex');
 let cached:{textSha256:string;seconds:number}|undefined;
 try{cached=JSON.parse(await readFile(folder+'/'+scene.id+'.json','utf8'));await readFile(path);}catch{cached=undefined;}
 let seconds=cached?.textSha256===textSha256?cached.seconds:undefined;
 if(seconds===undefined){
  const chunks:Buffer[]=[];
  for await(const chunk of provider.synthesize(scene.text,AbortSignal.timeout(90000),'default'))chunks.push(Buffer.from(chunk.audioBase64,'base64'));
  const pcm=Buffer.concat(chunks),header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  await writeFile(path,Buffer.concat([header,pcm]));seconds=pcm.length/48000;
  await writeFile(folder+'/'+scene.id+'.json',JSON.stringify({textSha256,seconds,voice:'existing classroom default'},null,2));
 }
 const duration=Math.ceil(Math.max(scene.minimum,seconds+1.2)*25)/25;
 shots.push({...scene,from,duration,spokenSeconds:seconds});from=Math.round((from+duration)*25)/25;
 console.log(`${scene.id}: speech ${seconds.toFixed(2)}s / scene ${duration.toFixed(2)}s`);
}
const base=runQueue(queueJobs([0,1,1,4,10]));
const slow=runQueue(queueJobs([0,1,1,4,10]).map((job,i)=>({...job,service:i===1?3:2})));
await writeFile(folder+'/shots.json',JSON.stringify({lesson:17,title:'等待怎样形成：车、服务台与两道开工条件',duration:from,shots,base,slow,boundary:'课程原创过程示意；单台、先到先服务、同到按编号。前四车到达0/1/1/4分钟；第五车10分钟用于检查延误中断。基准每车2分钟，慢服务仅T02改为3分钟。不是实港测量。'},null,2)+'\n');
console.log(`Total: ${from.toFixed(2)}s; exact records exported.`);
