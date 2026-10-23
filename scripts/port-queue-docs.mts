import {writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
import {PORT_LESSON_SEVENTEEN_SLIDES as pages,PORT_QUEUE_SOURCES,expansionTiming,expansionStart} from '../packages/course-content/src/port-expansion.js';
const title='# 第17讲 港口拥堵的非线性\n\n42页，90分钟，第21页后课间。教师逐步展开公式，学生完成三轮独立简化模拟。\n\n';
let minutes=0;
const timing=['| 时间 | 页码 | 内容 |','|---|---|---|',...expansionTiming(17).map(t=>{const start=minutes;minutes+=t.minutes;return '| '+start+'—'+minutes+'分钟 | '+(t.slideStart-expansionStart(17)+1)+'—'+(t.slideEnd-expansionStart(17)+1)+' | '+t.label+' |';})].join('\n');
const body=pages.map(p=>'## '+p.localPage+'. '+p.title+'\n\n'+p.lead+'\n\n'+p.teachingCue+'\n\n'+(p.equations?.map((e,i)=>'推导'+(i+1)+'：'+e.tex+'。'+e.explanation).join('\n\n')??'')+(p.reveal?'\n\n受控解析：'+p.reveal:'')+'\n\n来源：'+p.sourceIds?.map(id=>{const s=PORT_QUEUE_SOURCES[id as keyof typeof PORT_QUEUE_SOURCES];return s?'['+s.label+']('+s.url+')（'+s.date+'）':'';}).filter(Boolean).join('；')).join('\n\n');
await writeFile('docs/course/port-management-lesson-seventeen-teacher.md',title+timing+'\n\n'+body+'\n');
const sources='# 第17讲来源与使用边界\n\n核对日期：2026-10-23。教学数值由本课程独立编制。\n\n'+Object.entries(PORT_QUEUE_SOURCES).map(([id,s])=>'## '+id+' · '+s.label+'\n\n['+s.label+']('+s.url+')，'+s.date+'。\n\n'+s.boundary+'\n\n对应页面：'+pages.filter(p=>p.sourceIds?.includes(id)).map(p=>p.localPage).join('、')+'。').join('\n\n')+'\n';
await writeFile('docs/course/port-management-lesson-seventeen-sources.md',sources);
const student=await readFile('apps/teacher-web/public/handouts/port-queue-lesson17.md','utf8');
await writeFile('docs/course/port-management-lesson-seventeen-student.md',student);
// Production deliberately excludes Markdown and authoring sources. Publish an
// escaped, standalone student handout that also works with browser printing.
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const lines=student.split(/\r?\n/),blocks:string[]=[];
for(let i=0;i<lines.length;){
 const line=lines[i]!.trim();
 if(!line){i++;continue;}
 const heading=line.match(/^(#{1,2})\s+(.+)$/);
 if(heading){const level=heading[1]!.length;blocks.push(`<h${level}>${escape(heading[2]!)}</h${level}>`);i++;continue;}
 if(line.startsWith('|')){
  const rows:string[][]=[];
  while(i<lines.length&&lines[i]!.trim().startsWith('|')){const cells=lines[i++]!.trim().slice(1,-1).split('|').map(c=>c.trim());if(!cells.every(c=>/^:?-+:?$/.test(c)))rows.push(cells);}
  blocks.push('<div class="table-wrap"><table><thead><tr>'+rows[0]!.map(c=>'<th scope="col">'+escape(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(1).map(row=>'<tr>'+row.map(c=>'<td>'+escape(c||'\u00a0')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');continue;
 }
 if(/^(?:- |\d+\. )/.test(line)){
  const ordered=/^\d+\. /.test(line),tag=ordered?'ol':'ul',items:string[]=[];
  while(i<lines.length&&(ordered?/^\d+\. /:/^- /).test(lines[i]!.trim()))items.push('<li>'+escape(lines[i++]!.trim().replace(/^(?:- |\d+\. )/,''))+'</li>');
  blocks.push('<'+tag+'>'+items.join('')+'</'+tag+'>');continue;
 }
 if(/^(课件|模拟)：\//.test(line)){const [label,url]=line.split('：');blocks.push('<p>'+escape(label!)+ '：<a href="'+escape(url!)+'">'+escape(url!)+'</a></p>');i++;continue;}
 const paragraph=[line];i++;while(i<lines.length&&lines[i]!.trim())paragraph.push(lines[i++]!.trim());
 blocks.push('<p>'+escape(paragraph.join(' '))+'</p>');
}
await writeFile('apps/teacher-web/public/handouts/port-queue-lesson17.html',`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第17讲学生手册 · 港口拥堵的非线性</title><style>
*{box-sizing:border-box}body{margin:0;background:#eef2ed;color:#193f4b;font-family:"Microsoft YaHei",sans-serif;line-height:1.8}main{max-width:1080px;margin:24px auto;padding:40px 48px;background:#fffdf5}nav{display:flex;gap:24px;flex-wrap:wrap;border-bottom:1px solid #b8c8b8;padding-bottom:16px;font-size:14px}a{color:#1e6864}h1{font-size:30px;line-height:1.4}h2{font-size:23px;border-top:1px solid #b8c8b8;padding-top:24px;margin-top:32px}p,li{font-size:17px;overflow-wrap:anywhere}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:15px;margin:16px 0}th,td{border:1px solid #afc3bb;padding:8px;min-width:62px;text-align:left}th{background:#e7eee5}td{height:43px}li{margin:7px 0}footer{font-size:14px;border-top:1px solid #b8c8b8;margin-top:32px;padding-top:16px}@media(max-width:600px){main{margin:0;padding:20px}h1{font-size:25px}h2{font-size:21px}nav{gap:12px}}@media print{@page{size:A4;margin:16mm}body{background:#fff;color:#172b30}main{max-width:none;margin:0;padding:0}nav{display:none}h1{font-size:22pt}h2{font-size:16pt;break-after:avoid}p,li{font-size:11pt}table{font-size:9pt;break-inside:avoid}.table-wrap{overflow:visible}tr{break-inside:avoid}thead{display:table-header-group}a{color:inherit;text-decoration:none}}
</style></head><body><main><nav><a href="/port-expansion-preview.html?lesson=17&amp;page=1&amp;student=1">返回课件</a><a href="/port-queue-lab.html">打开模拟</a><span>浏览器按Ctrl+P可打印或保存PDF</span></nav>${blocks.join('\n')}<footer>本手册的空表用于个人计算与记录。学习结果按教师指定渠道提交。</footer></main></body></html>\n`);
console.log('Exported 42 authored teacher cues, source mapping and student handout.');
