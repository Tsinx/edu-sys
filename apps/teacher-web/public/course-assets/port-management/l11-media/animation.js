/* Editable, deterministic 1600 × 1000 film composition. No remote assets or live data. */
(()=>{'use strict';
 const W=1600,H=1000,ink='#092d39',teal='#79c9c2',gold='#edba74',cream='#fff3d9';
 let data,images={},bounds=[];
 const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return 1-(1-v)**3;};
 function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
 function line(c,x,y,xx,yy,color=teal,width=3){c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function text(c,s,x,y,size=44,color=cream,weight=500,max=1400){
  c.font=`${weight} ${size}px "Microsoft YaHei", sans-serif`;c.textBaseline='top';c.fillStyle=color;
  const lines=[];let row='';for(const ch of s){if(ch==='\n'||c.measureText(row+ch).width>max){lines.push(row);row=ch==='\n'?'':ch;}else row+=ch;}if(row)lines.push(row);
  lines.forEach((v,i)=>{c.fillText(v,x,y+i*size*1.42);bounds.push({text:v,x,y:y+i*size*1.42,width:c.measureText(v).width,height:size*1.3});});
  return lines.length*size*1.42;
 }
 function photo(c,name,u,alpha=1){const im=images[name];if(!im)return;const scale=Math.max(W/im.width,H/im.height)*(1.035+u*.075),w=im.width*scale,h=im.height*scale;
  c.save();c.globalAlpha=alpha;c.drawImage(im,(W-w)/2+Math.sin(u*1.3)*20,(H-h)/2+u*17,w,h);c.restore();
 }
 function boat(c,x,y,size=1,color=gold){c.save();c.translate(x,y);c.scale(size,size);c.fillStyle=color;c.beginPath();c.moveTo(0,0);c.lineTo(85,0);c.lineTo(100,14);c.lineTo(84,28);c.lineTo(0,28);c.closePath();c.fill();rect(c,8,4,16,20,ink);for(let i=0;i<3;i++)rect(c,30+i*16,5,12,18,'#235562');c.restore();}
 function clock(c,t,y=665){line(c,120,y,1460,y,'#779d9c',5);const ls=['到达','向泊位移动','装卸开始','装卸结束','离泊'];ls.forEach((s,i)=>{const x=130+i*325;const shown=ease((t-i*.11)*2);c.globalAlpha=.25+.75*shown;c.fillStyle=i===4?gold:teal;c.beginPath();c.arc(x,y,12,0,Math.PI*2);c.fill();text(c,String(i+1).padStart(2,'0'),x-16,y-90,28,gold);text(c,s,Math.min(x-30,1320),y+35,27,cream,500,205);c.globalAlpha=1;});}
 function routes(c,u){
  c.save();c.translate(0,15);const points=[[180,425],[400,405],[540,540],[565,660],[665,715],[730,620],[810,470],[940,430],[1030,515],[1160,535],[1230,440],[1390,455]];
  c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineTo(1200,610);c.lineTo(1080,595);c.lineTo(945,550);c.lineTo(820,565);c.lineTo(735,745);c.lineTo(650,780);c.lineTo(560,700);c.lineTo(485,535);c.lineTo(310,510);c.closePath();c.fillStyle='#164956';c.fill();
  const p=[[350,440],[555,805],[755,775],[1000,635],[1230,555]];c.setLineDash([12,9]);c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=gold;c.lineWidth=5;c.stroke();c.setLineDash([]);
  const progress=u*4,seg=Math.min(3,Math.floor(progress)),a=p[seg],b=p[seg+1],f=progress-seg;boat(c,a[0]+(b[0]-a[0])*f-30,a[1]+(b[1]-a[1])*f-12,.7);
  text(c,'欧洲',240,400,28);text(c,'好望角',560,820,28,gold);text(c,'新加坡',1235,590,28);text(c,'线路机制示意 · 非航行或AIS数据',90,800,23,'#b0c8c0');c.restore();
 }
 function arrivals(c,u){['均匀到达','集中到达'].forEach((s,j)=>{const y=450+j*210;text(c,s,90,y+10,31);line(c,330,y+40,1460,y+40,'#759691',2);for(let i=0;i<8;i++){const x=j?400+i*62:360+i*144;boat(c,x,y+20,.53,j?gold:teal);}const x=330+u*1130;line(c,x,y-15,x,y+100,cream,2);});text(c,'两组各8艘 · 独立概念图解',90,790,24,'#b0c8c0');}
 function network(c,u){const pts=[[230,520],[570,680],[915,440],[1320,660]],labels=['岸桥释放','运输接续','场桥入场','闸口交付'];
  pts.forEach(([x,y],i)=>{if(i){const a=pts[i-1];line(c,a[0],a[1],x,y,gold,6);const f=(u*2+i*.2)%1;c.fillStyle=cream;c.beginPath();c.arc(a[0]+(x-a[0])*f,a[1]+(y-a[1])*f,8,0,Math.PI*2);c.fill();}rect(c,x-90,y-31,180,65,'#082b38e8');text(c,labels[i],x-74,y-15,28,cream,600,165);});}
 function sample(c,u,unfinished=false){
  if(unfinished){const values=[4,5,6,8,10],ls=['A 已完成','B 已完成','C 已完成','D 进行中','E 进行中'];values.forEach((v,i)=>{const y=410+i*72;const width=v*85*ease(u*1.7);text(c,ls[i],90,y+2,26);rect(c,335,y,width,43,i>2?'#173f49':teal);if(i>2){c.strokeStyle=gold;c.lineWidth=3;c.setLineDash([8,5]);c.strokeRect(335,y,width,43);c.setLineDash([]);}text(c,`${v}${i>2?' +':''} 小时`,365+width,y+3,26,i>2?gold:cream);});text(c,'教学记录 · “+”表示当前已历时间下界',90,797,23,'#b0c8c0');
  }else{for(let j=0;j<2;j++){const x=120+j*740;rect(c,x,430,620,300,'#164550');boat(c,x+70,480,j?3.8:2.1,j?gold:teal);text(c,j?'更多装卸量':'较少装卸量',x+70,630,37);text(c,'比较前先按任务结构分组',90,790,27,'#b0c8c0');}}
 }
 function stock(c,u){const x=630,y=420;rect(c,x,y,440,300,'#154652');for(let i=0;i<20;i++){const a=i%5,b=Math.floor(i/5);rect(c,x+30+a*78,y+48+b*52,65,37,i%3?teal:gold);}line(c,150,570,x-30,570,teal,8);line(c,x+470,570,1440,570,gold,8);for(let j=0;j<3;j++){const f=(u*1.8+j/3)%1;rect(c,170+f*400,554,38,32,teal);rect(c,1120+f*280,554,38,32,gold);}text(c,'流入',240,475,36,teal);text(c,'边界内存量',715,750,32);text(c,'流出',1240,475,36,gold);text(c,'对象、单位与观察窗口必须一致',90,805,26,'#b0c8c0');}
 function branches(c,u){rect(c,100,535,275,110,'#215d68');text(c,'120分钟',137,557,44,gold,700);const root=[375,590];for(let i=0;i<2;i++){const y=430+i*290;line(c,root[0],root[1],650,y,gold,5);line(c,650,y,1350,y,teal,5);rect(c,660,y-50,540*ease(u*1.5),100,i?'#285c58':'#204c5a');text(c,i?'试验：记录全部改动':'基准：原配置运行',690,y-22,33);text(c,'360分钟',1280,y-90,26,gold,500,250);}text(c,'同一货流 / 同一观察终点 / 同一统计口径',90,810,26,'#b0c8c0');}
 function metrics(c,u){['新增交付','全部未交付','总费用','到期表现'].forEach((s,i)=>{const x=90+i*370;const e=ease(u*2-i*.12);c.globalAlpha=.3+.7*e;rect(c,x,440,325,310,'#153f4be6');text(c,'0'+(i+1),x+25,470,33,gold);text(c,s,x+25,555,37);text(c,'？',x+90,620,82,teal);c.globalAlpha=1;});}
 function shot(c,s,t){const u=clamp((t-s.from)/(s.to-s.from));rect(c,0,0,W,H,ink);if(s.image){photo(c,s.image,u);const g=c.createLinearGradient(0,0,1500,700);g.addColorStop(0,'#041e2df2');g.addColorStop(.58,'#061e2ba0');g.addColorStop(1,'#061e2b33');rect(c,0,0,W,H,g);const bottom=c.createLinearGradient(0,620,0,1000);bottom.addColorStop(0,'#051f2b00');bottom.addColorStop(1,'#051e2efc');rect(c,0,620,W,380,bottom);}
  const enter=ease((t-s.from)/.65);c.save();c.globalAlpha=enter;c.translate(0,(1-enter)*32);const index=data.shots.indexOf(s);
  text(c,'PORT STUDIES / 11',90,58,23,gold,600);text(c,s.image?'AI教学示意 · 非事件实拍':'概念图解 · 非实测数据',1160,58,20,'#c3d6cd',400,380);
  if(s.kind==='evidence'){text(c,'新加坡 / MPA历史说明',90,220,32,teal);text(c,s.title,90,320,128,cream,700);text(c,s.second,96,493,38,gold);text(c,'规模增长，与等泊延长同时出现。',96,630,44);text(c,'来源：MPA · 2024年5月30日',96,736,24,'#c3d6cd');}
  else{const large=s.id==='opening'||s.id==='question';text(c,s.title,90,200,large?88:68,cream,700,1420);text(c,s.second,94,large?338:310,large?41:35,gold,500,1390);
   if(s.kind==='route')routes(c,u);
   if(s.kind==='arrivals')arrivals(c,u);
   if(s.kind==='network')network(c,u);
   if(s.kind==='clock')clock(c,u,615);
   if(s.kind==='mix'||s.kind==='unfinished')sample(c,u,s.kind==='unfinished');
   if(s.kind==='stock')stock(c,u);
   if(s.kind==='branches')branches(c,u);
   if(s.kind==='tradeoff')metrics(c,u);
   if(s.kind==='experiment'){rect(c,90,490,700,215,'#072d3be6');text(c,'120 → 360 分钟',125,525,69,teal,700);text(c,'独立教学情境 · 300箱',129,625,30);}
   if(s.kind==='scene'&&index>3&&index<9){const words=s.second.split(/[·→]/).map(x=>x.trim()),w=(1410-(words.length-1)*20)/words.length;words.forEach((word,i)=>{const x=95+i*(w+20),a=ease((u-i*.1)*2);c.globalAlpha=a;rect(c,x,650,w,90,'#092d3be6');text(c,word,x+20,671,29,cream,500,w-40);});c.globalAlpha=enter;}
  }c.restore();
  // Burned-in Chinese captions remain legible when a classroom projector has no text-track support.
  if(t>=s.from+.4&&t<s.to-.2){rect(c,70,856,1460,96,'#041e2be8');text(c,s.narration,98,868,28,cream,500,1400);}
  for(let i=0;i<18;i++){rect(c,90+i*79,972,68,4,i<index?teal:'#42636c');if(i===index)rect(c,90+i*79,972,68*u,4,gold);}
 }
 async function prepare(){data=await fetch('storyboard.json').then(r=>r.json());await document.fonts.ready;await Promise.all([...new Set(data.shots.map(s=>s.image).filter(Boolean))].map(async name=>{const im=new Image();im.src=name;await im.decode();images[name]=im;}));}
 function render(canvas,t){t=Math.min(data.duration-.001,Math.max(0,t));bounds=[];const c=canvas.getContext('2d');c.save();c.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);const s=data.shots.find(s=>t>=s.from&&t<s.to);shot(c,s,t);const fade=Math.min(1,t/.5,(180-t)/.8);if(fade<1)rect(c,0,0,W,H,`rgba(4,22,32,${1-fade})`);c.restore();return{time:t,shot:s.id,bounds};}
 window.PortElevenFilm={ready:prepare(),render,get data(){return data;}};
})();
