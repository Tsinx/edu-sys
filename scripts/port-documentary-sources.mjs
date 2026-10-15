/** Download public, licensed source footage into ignored working output, never the public asset tree. */
import {mkdir,writeFile,readFile,stat,copyFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const out=path.resolve('output/port-documentary-recut/sources');
await mkdir(out,{recursive:true});
export const sources=[
 {id:'30899354',title:'Aerial View of Busy International Container Port',slug:'aerial-view-of-busy-international-container-port',author:'Toàn BDS',file:'13210444_3840_2160_60fps.mp4',scene:'港区航拍',location:'原发布页未确认地点'},
 {id:'33585292',title:'Industrial Container Cranes at Santos Port',slug:'industrial-container-cranes-at-santos-port',author:'FÁBIO REIS DE ABREU (PORTUGA)',file:'14276630_1920_1080_60fps.mp4',scene:'岸桥与过往车辆',location:'巴西桑托斯港（发布者标注）'},
 {id:'11336549',title:'Time Lapse of Loading Cargo in Harbor',slug:'time-lapse-of-loading-cargo-in-harbor',author:'Glenn Langhorst',file:'11336549-uhd_3840_2160_30fps.mp4',scene:'集装箱船装卸延时摄影',location:'西班牙港口（发布页标签；具体港区未确认）'},
 {id:'4778075',title:'Loading A Cargo Ship For Transport',slug:'loading-a-cargo-ship-for-transport',author:'Marian Croitoru',file:'4778075-uhd_2562_1440_25fps.mp4',scene:'货船与港区航拍',location:'原发布页未确认地点'},
 {id:'36375964',title:'Container Yard Operations with Loading Cranes',slug:'container-yard-operations-with-loading-cranes',author:'Riccardo Falconi',file:'15427538_3840_2160_50fps.mp4',scene:'场桥与集装箱堆场',location:'原发布页未确认地点'},
 {id:'5100045',title:'Man in Helmet Checking Logistics and Input Data',slug:'man-in-helmet-checking-logistics-and-input-data',author:'Gustavo Fring',file:'5100045-uhd_3840_2160_30fps.mp4',scene:'戴安全帽的仓储人员核对记录',location:'通用仓储工作场景；非采访、非事故相关人员'},
 {id:'5100055',title:'Man Wearing Hard Hat Holding a Box',slug:'man-wearing-hard-hat-holding-a-box',author:'Gustavo Fring',file:'5100055-uhd_3840_2160_30fps.mp4',scene:'仓储人员核对箱件',location:'通用仓储工作场景；非采访、非事故相关人员'},
 {id:'4291728',title:'Man Working inside the Warehouse',slug:'man-working-inside-the-warehouse',author:'Tiger Lily',file:'4291728-uhd_3840_2160_25fps.mp4',scene:'库内物料搬运',location:'通用仓储工作场景；非事故现场'},
 {id:'4294434',title:'Man Walking towards the Forklift inside the Warehouse',slug:'man-walking-towards-the-forklift-inside-the-warehouse',author:'Tiger Lily',file:'4294434-uhd_3840_2160_25fps.mp4',scene:'库内叉车与作业人员',location:'通用仓储工作场景；非事故现场'},
 {id:'5308785',title:'Night Video of a Fishing Boat at the Port',slug:'night-video-of-a-fishing-boat-at-the-port',author:'Ray Raimundo',file:'5308785-uhd_3840_2160_30fps.mp4',scene:'渔港夜间水面与船舶',location:'渔港氛围实拍；非集装箱作业区、非事件现场'},
 {id:'11335972',title:'Ship in Harbor at Night',slug:'ship-in-harbor-at-night',author:'Glenn Langhorst',file:'11335972-uhd_3840_2160_30fps.mp4',scene:'港城夜景',location:'通用港城夜景；非事件现场'},
 {id:'7018675',title:'A Woman Checking the Document while Walking in the Warehouse',slug:'a-woman-checking-the-document-while-walking-in-the-warehouse',author:'cottonbro studio',file:'7018675-uhd_4096_2160_25fps.mp4',scene:'仓内巡视与记录核对',location:'通用仓储工作场景；非采访、非事故相关人员'},
 {id:'10452020',title:'Container Ship in Commercial Dock',slug:'container-ship-in-commercial-dock',author:'Glenn Langhorst',file:'10452020-hd_3840_2160_30fps.mp4',scene:'靠泊船舶与装卸延时摄影',location:'原发布页未确认地点'},
 {id:'18718867',title:'A large red crane is in the middle of a ship',slug:'a-large-red-crane-is-in-the-middle-of-a-ship',author:'wowi allinsky',file:'18718867-uhd_3840_2160_60fps.mp4',scene:'岸桥吊装集装箱',location:'原发布页未确认地点'}
].map(s=>({...s,url:`https://www.pexels.com/video/${s.slug}-${s.id}/`,download:`https://videos.pexels.com/video-files/${s.id}/${s.file}`,license:'Pexels License',licenseUrl:'https://www.pexels.com/license/',accessed:'2026-10-14',boundary:'实拍素材仅表现一般作业，不指认片中单位或人员与所述事件有关。无采访或当事人发言。'}));
let cursor=0;const records=[];
async function worker(){while(cursor<sources.length){const s=sources[cursor++],file=path.join(out,s.id+'.mp4');try{await stat(file);}catch{const r=await fetch(s.download,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(`${s.id}: HTTP ${r.status}`);await pipeline(Readable.fromWeb(r.body),createWriteStream(file));}
 const bytes=await readFile(file),p=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8',windowsHide:true});if(p.status!==0)throw Error(p.stderr);const probe=JSON.parse(p.stdout),v=probe.streams.find(x=>x.codec_type==='video');
 const record={...s,relativeFile:`${s.id}.mp4`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),duration:+probe.format.duration,width:v.width,height:v.height,fps:v.avg_frame_rate,audio:probe.streams.some(x=>x.codec_type==='audio')};records.push(record);console.log(`${s.id}: ${v.width}x${v.height} / ${record.duration.toFixed(2)}s / audio ${record.audio}`);
}}
await Promise.all([worker(),worker()]);
await writeFile(path.join(out,'manifest.json'),JSON.stringify({notice:'Raw source clips are working files, not offered as a stock download collection.',sources:records.sort((a,b)=>a.id.localeCompare(b.id))},null,2)+'\n');
// Only the small original-title crops enter the edit. Full official PDFs remain working sources.
const archives=[
 {id:'mpa',name:'mpa-20240530.pdf',url:'https://www.mpa.gov.sg/api/media/c11b0452-9181-4c0f-9cbb-22908a525bdd/media-statement---in-response-to-media-queries-on-vessels-extended-waitthsing-times-for-berths-in-the-port-of-singapore-1.pdf',image:'mpa-page1'},
 {id:'tianjin',name:'tianjin-investigation.pdf',url:'https://www.mem.gov.cn/gk/sgcc/tbzdsgdcbg/2016/201602/P020190415543917598002.pdf',image:'tianjin-page1',prior:'output/port-class-lab-qa/tianjin-investigation-source.pdf'}
];
for(const archive of archives){const file=path.join(out,archive.name);try{await stat(file);}catch{let copied=false;if(archive.prior)try{await copyFile(archive.prior,file);copied=true;}catch{}if(!copied){const r=await fetch(archive.url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(`${archive.id}: archive HTTP ${r.status}`);await writeFile(file,Buffer.from(await r.arrayBuffer()));}}
 const target=path.join(out,archive.image);try{await stat(target+'.png');}catch{const p=spawnSync('pdftoppm',['-f','1','-singlefile','-scale-to','1800','-png',file,target],{encoding:'utf8',windowsHide:true});if(p.status)throw Error(p.stderr);}
}
const archiveRecords=await Promise.all(archives.map(async a=>({...a,sha256:createHash('sha256').update(await readFile(path.join(out,a.name))).digest('hex')})));
await writeFile(path.join(out,'archive-manifest.json'),JSON.stringify(archiveRecords,null,2)+'\n');
