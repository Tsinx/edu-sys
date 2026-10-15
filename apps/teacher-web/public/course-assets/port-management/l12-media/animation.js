/* Explicit lecture-12 film: professional responsibility, evidence and safety barriers. */
(()=>{'use strict';
 const W=1600,H=1000,ink='#102f3b',teal='#8bd1c6',gold='#efbd79',cream='#fff3dc';
 let data,images={},bounds=[];
 const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>1-(1-clamp(v))**3;
 function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
 function line(c,x,y,xx,yy,color=teal,width=3){c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function text(c,s,x,y,size=42,color=cream,weight=500,max=1400){c.font=`${weight} ${size}px "Microsoft YaHei",sans-serif`;c.textBaseline='top';c.fillStyle=color;const lines=[];let row='';
  for(const ch of s){if(ch==='\n'||c.measureText(row+ch).width>max){lines.push(row);row=ch==='\n'?'':ch;}else row+=ch;}if(row)lines.push(row);
  lines.forEach((v,i)=>{c.fillText(v,x,y+i*size*1.42);bounds.push({text:v,x,y:y+i*size*1.42,width:c.measureText(v).width,height:size*1.3});});return lines.length*size*1.42;
 }
 function photo(c,name,u){const im=images[name];if(!im)return;const scale=Math.max(W/im.width,H/im.height)*(1.03+u*.07),w=im.width*scale,h=im.height*scale;c.drawImage(im,(W-w)/2+u*22,(H-h)/2+Math.sin(u*1.5)*14,w,h);}
 function panel(c,x,y,w,h,title,detail,u=1){c.save();c.globalAlpha=.25+.75*ease(u);rect(c,x,y,w,h,'#173f4eea');line(c,x,y,x+w,y,gold,4);text(c,title,x+24,y+24,36,cream,600,w-48);if(detail)text(c,detail,x+24,y+89,26,teal,500,w-48);c.restore();}
 function archive(c,u){
  const labels=[['许可','有效状态 / 持续核验'],['库存','实际记录 / 处置触发'],['人员','能力 / 培训 / 演练'],['监督','职责 / 信息 / 闭环']];
  labels.forEach(([title,detail],i)=>{const x=95+i*372,y=450+(i%2)*35,a=ease(u*2-i*.14);c.save();c.globalAlpha=a;rect(c,x+7,y+10,335,295,'#041c2e');rect(c,x,y,335,295,'#e9e0c8');text(c,'0'+(i+1),x+25,y+25,30,'#a1743f',700);text(c,title,x+25,y+88,55,ink,700);text(c,detail,x+25,y+186,25,'#285763',500,285);c.restore();});text(c,'调查事实、机制解释与课程建议分别核查',95,809,24,'#c0d0c8');
 }
 function responsibility(c,u){const names=[['提供','对象与原始状态'],['复核','来源与差异依据'],['接续','行动与下一次核验']];names.forEach(([a,b],i)=>{const x=100+i*505,y=490;if(i)line(c,x-120,y+115,x-28,y+115,gold,5);panel(c,x,y,425,245,a,b,u*2-i*.18);text(c,'0'+(i+1),x+25,y+173,28,gold);});}
 function bowtie(c,u){const cx=800,cy=595;const xs=[110,1190],ys=[440,675];
  ys.forEach((y,i)=>{line(c,400,y+48,cx,cy,'#7eafa8',4);line(c,cx,cy,1190,y+48,'#7eafa8',4);if(u>.12*i){panel(c,110,y,290,105,i?'状态未识别':'记录不一致','',u*2);panel(c,1190,y,290,105,i?'作业中断':'错误交接','',u*2-.3);}});
  rect(c,620,535,360,125,'#2b6465');text(c,'受控条件丧失',660,576,36,cream,700,300);
  for(const x of [510,1080]){line(c,x,475,x,720,gold,10);text(c,x<800?'预防屏障':'减缓屏障',x-62,760,26,gold);}
  const f=(u*2)%1;for(const [x1,y1,x2,y2]of [[400,488,620,580],[980,615,1190,723]]){c.fillStyle=cream;c.beginPath();c.arc(x1+(x2-x1)*f,y1+(y2-y1)*f,7,0,Math.PI*2);c.fill();}
 }
 function dependency(c,u){const ys=[450,590,730];ys.forEach((y,i)=>{line(c,390,600,650,y,'#7baba6',4);line(c,950,y,1210,600,'#7baba6',4);panel(c,650,y-43,300,88,['申报确认','闸口确认','调度确认'][i],'',u*2-i*.15);});panel(c,90,535,300,150,'同一主数据','来源与版本相同',u*2);panel(c,1210,535,300,150,'错误继续传播','多次签字仍可同源',u*2-.5);}
 function boundary(c,u){rect(c,80,475,1440,295,'#092a3ce0');line(c,800,495,800,750,gold,5);text(c,'依赖故障信息',130,530,47,cream,600,610);text(c,'独立条件待核验',865,530,47,cream,600,610);text(c,'先说明需要停止的理由',135,644,31,teal,500,605);text(c,'保留业务也要有证据',870,644,31,teal,500,605);const x=800+(u-.5)*60;line(c,x,495,x,750,'#efbd7940',15);}
 function restore(c,u){const rows=[['技术可用','工作完成 / 系统响应'],['数据可信','对象、版本、数量一致'],['业务可执行','受控任务与交接证据']];rows.forEach(([a,b],i)=>{const x=95+i*505;if(i)line(c,x-98,605,x-25,605,gold,5);panel(c,x,465,425,270,a,b,u*2-i*.2);text(c,'0'+(i+1),x+25,654,30,gold);});text(c,'三类证据分别核查，依核准制度审查恢复',95,799,26,'#c2d2c8');}
 function choices(c,u){['范围','备用','恢复','交接'].forEach((a,i)=>{const x=95+i*370;panel(c,x,440,325,315,a,'需要哪一项证据？',u*2-i*.17);text(c,'？',x+120,627,76,teal);});}
 function shot(c,s,t){const u=clamp((t-s.from)/(s.to-s.from));rect(c,0,0,W,H,ink);
  if(s.image){photo(c,s.image,u);const shade=c.createLinearGradient(0,0,1500,700);shade.addColorStop(0,'#071f30ee');shade.addColorStop(.56,'#0a263aa8');shade.addColorStop(1,'#09263c44');rect(c,0,0,W,H,shade);const b=c.createLinearGradient(0,560,0,1000);b.addColorStop(0,'#08243b00');b.addColorStop(1,'#071f30fa');rect(c,0,560,W,440,b);}
  const e=ease((t-s.from)/.7);c.save();c.globalAlpha=e;c.translate(0,(1-e)*32);const index=data.shots.indexOf(s);
  text(c,'PORT STUDIES / 12',90,58,23,gold,600);text(c,s.image?'AI教学示意 · 非事件实拍':'概念图解 · 事实见注明来源',1110,58,20,'#c5d5cd',400,430);
  const opening=s.id==='opening',large=opening?100:68;
  text(c,s.title,90,opening?220:200,large,cream,700,1420);text(c,s.second,95,opening?360:312,opening?50:34,gold,500,1390);
  if(s.kind==='principle'){line(c,100,515,1495,515,gold,3);text(c,'发展安全 · 职业责任 · 诚信与协作',100,560,44,cream,600);text(c,'价值依据：安全生产法第三条（2021年修正文本）',100,790,24,'#c0d3ca');}
  if(s.kind==='archive')archive(c,u);
  if(s.kind==='responsibility')responsibility(c,u);
  if(s.kind==='bowtie')bowtie(c,u);
  if(s.kind==='dependency')dependency(c,u);
  if(s.kind==='boundary')boundary(c,u);
  if(s.kind==='restore')restore(c,u);
  if(s.kind==='choices')choices(c,u);
  if(s.kind==='experiment'){rect(c,95,475,920,270,'#07293bea');text(c,'第90分钟',130,505,90,teal,700);text(c,'接口不可信 / 内部设备可用',134,648,36,cream,500,840);text(c,'独立教学情境 · 不重演真实事件',100,796,25,'#c0d3ca');}
  if(s.kind==='scene'&&!opening&&s.id!=='question'&&s.id!=='nagoya'){const words=s.second.split(/[·→]/).map(x=>x.trim()),w=(1410-(words.length-1)*20)/words.length;words.forEach((word,i)=>{const x=95+i*(w+20);c.globalAlpha=ease(u*2-i*.15);rect(c,x,666,w,96,'#0a2e3fe8');text(c,word,x+20,690,29,cream,500,w-40);});c.globalAlpha=e;}
  if(s.id==='nagoya')text(c,'资料：日本国土交通省 · 集装箱搬入搬出范围',95,780,25,'#d2ddd3');
  c.restore();
  if(t>=s.from+.4&&t<s.to-.2){rect(c,70,856,1460,96,'#061f30ed');text(c,s.narration,98,868,28,cream,500,1400);}
  for(let i=0;i<18;i++){rect(c,90+i*79,972,68,4,i<index?teal:'#47656d');if(i===index)rect(c,90+i*79,972,68*u,4,gold);}
 }
 async function prepare(){data=await fetch('storyboard.json').then(r=>r.json());await document.fonts.ready;await Promise.all([...new Set(data.shots.map(s=>s.image).filter(Boolean))].map(async name=>{const im=new Image();im.src=name;await im.decode();images[name]=im;}));}
 function render(canvas,t){t=Math.min(179.999,Math.max(0,t));bounds=[];const c=canvas.getContext('2d');c.save();c.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);const s=data.shots.find(s=>t>=s.from&&t<s.to);shot(c,s,t);const fade=Math.min(1,t/.7,(180-t)/.9);if(fade<1)rect(c,0,0,W,H,`rgba(6,24,38,${1-fade})`);c.restore();return{time:t,shot:s.id,bounds};}
 window.PortOpeningFilm={ready:prepare(),render,get data(){return data;}};
})();
