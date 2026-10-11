/* 消失的增量 — original, deterministic motion source.
 * All geometry, formula layout, compositing and camera motion use seconds.
 * Preview and 1920×1200 export call the SAME render(canvas, seconds).
 * Historical reconstructions and portraits are labelled in the picture.
 */
(function (root) {
  'use strict';
  const W=1600,H=1000,TAU=Math.PI*2;
  const C={ink:'#101b32',blue:'#214bff',paper:'#f7f0df',yellow:'#e8ed59',green:'#b0ed82',orange:'#ff8359',muted:'#bcc4ce'};
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const hash=i=>{const n=Math.sin(i*127.1+71.7)*43758.5453;return n-Math.floor(n);};
  const images={};let ready=false,bounds=[],captionBounds=[];
  const fonts={sans:'Film Sans',serif:'Film Serif',display:'Film Display'};
  const data=()=>root.CalculusFilmData;
  const shots=()=>data().chapters;

  function text(ctx,s,x,y,size=40,color=C.paper,options={}) {
    ctx.save();ctx.fillStyle=color;ctx.textAlign=options.align||'left';ctx.textBaseline='alphabetic';
    ctx.font=`${options.italic?'italic ':''}${options.bold?'900':'400'} ${size}px "${fonts[options.family||(options.bold?'display':'sans')]}"`;
    if(options.alpha!==undefined)ctx.globalAlpha*=options.alpha;
    const m=ctx.measureText(s),left=options.align==='center'?x-m.width/2:options.align==='right'?x-m.width:x;
    const record={text:s,x:left,y:y-(m.actualBoundingBoxAscent||size*.85),width:m.width,height:(m.actualBoundingBoxAscent||size*.85)+(m.actualBoundingBoxDescent||size*.15),role:options.role||'picture'};
    (options.role==='caption'?captionBounds:bounds).push(record);ctx.fillText(s,x,y);ctx.restore();return m.width;
  }
  function line(ctx,x1,y1,x2,y2,color=C.paper,width=2,alpha=1) {
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha*=alpha;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
  }
  function circle(ctx,x,y,r,fill,stroke,width=2) {
    ctx.save();ctx.beginPath();ctx.arc(x,y,Math.max(.001,r),0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}ctx.restore();
  }
  function rect(ctx,x,y,w,h,color,alpha=1) {ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.fillRect(x,y,w,h);ctx.restore();}
  function rounded(ctx,x,y,w,h,r,color) {ctx.save();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.restore();}
  function path(ctx,pts,color,width=3,close=false,fill=null) {
    if(!pts.length)return;ctx.save();ctx.beginPath();ctx.moveTo(...pts[0]);for(const p of pts.slice(1))ctx.lineTo(...p);if(close)ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke();ctx.restore();
  }
  function label(ctx,s,x,y,color=C.green) {text(ctx,s,x,y,27,color,{bold:true});}
  function header(ctx,n,title,color=C.paper) {label(ctx,`0${n} / ${title}`,80,80,color);line(ctx,80,102,290,102,color,2,.5);}
  function footer(ctx,s,color=C.muted) {text(ctx,s,80,844,25,color);}
  function base(ctx,color) {rect(ctx,0,0,W,H,color);}
  function fade(q,duration) {return ease(q/.65)*ease((duration-q)/.5);}
  function fraction(ctx,numerator,denominator,x,y,size=64,color=C.ink) {
    ctx.save();ctx.font=`${size}px "${fonts.serif}"`;const width=Math.max(ctx.measureText(numerator).width,ctx.measureText(denominator).width)+32;ctx.restore();
    text(ctx,numerator,x,y-size*.28,size,color,{align:'center',family:'serif'});
    line(ctx,x-width/2,y+6,x+width/2,y+6,color,3);
    text(ctx,denominator,x,y+size*1.05,size,color,{align:'center',family:'serif'});return width;
  }
  function formula(ctx,s,x,y,size=64,color=C.ink,options={}) {return text(ctx,s,x,y,size,color,{family:'serif',...options});}
  function cover(ctx,key,x,y,w,h,zoom=1,dx=0,dy=0,alpha=1) {
    const im=images[key];if(!im)return;
    ctx.save();ctx.globalAlpha*=alpha;ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    const scale=Math.max(w/im.width,h/im.height)*zoom,dw=im.width*scale,dh=im.height*scale;
    ctx.drawImage(im,x+(w-dw)/2+dx,y+(h-dh)/2+dy,dw,dh);ctx.restore();
  }
  function grain(ctx,t,opacity=.05) {
    // Static seeded lines: texture does not flicker between encoded frames.
    ctx.save();ctx.strokeStyle=C.paper;ctx.lineWidth=1;ctx.globalAlpha*=opacity;
    for(let i=0;i<40;i++){const x=hash(i)*W,y=hash(i+71)*H;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+hash(i+101)*60,y+6);ctx.stroke();}ctx.restore();
  }
  function particles(ctx,t,color=C.green,amount=90,focus=null) {
    ctx.save();for(let i=0;i<amount;i++){
      const z=.25+hash(i+37),x=80+hash(i)*1440,y=145+((hash(i+101)*640-t*(10+z*18))%640+640)%640;
      ctx.globalAlpha=.06+.2*z;circle(ctx,x,y,1+3*z,color);
      if(focus&&i%6===0)line(ctx,x,y,mix(x,focus[0],.1),mix(y,focus[1],.1),color,1,.18);
    }ctx.restore();
  }
  function project(x,y,z,q,scale=145,cx=1100,cy=540) {
    const a=q*.17,ca=Math.cos(a),sa=Math.sin(a),u=x*ca-z*sa,v=x*sa+z*ca;
    const b=-.45,yy=y*Math.cos(b)-v*Math.sin(b),zz=y*Math.sin(b)+v*Math.cos(b);
    const k=5.7/(5.7+zz);return[cx+u*scale*k,cy-yy*scale*k];
  }
  function cube(ctx,x,y,z,size,q,color=C.blue,alpha=1) {
    const p=(a,b,c)=>project(x+a*size,y+b*size,z+c*size,q);
    ctx.save();ctx.globalAlpha*=alpha;
    const front=[p(-.5,-.5,-.5),p(.5,-.5,-.5),p(.5,.5,-.5),p(-.5,.5,-.5)];
    const right=[p(.5,-.5,-.5),p(.5,-.5,.5),p(.5,.5,.5),p(.5,.5,-.5)];
    const top=[p(-.5,.5,-.5),p(.5,.5,-.5),p(.5,.5,.5),p(-.5,.5,.5)];
    path(ctx,front,color,1,true,color);path(ctx,right,C.ink,1,true,C.ink);path(ctx,top,C.paper,1,true,C.paper);ctx.restore();
  }
  function orbit(ctx,q,cx,cy,r,color,tilt=.42) {
    ctx.save();ctx.translate(cx,cy);ctx.rotate(q*.12);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=.55;
    ctx.beginPath();ctx.ellipse(0,0,r,r*tilt,0,0,TAU);ctx.stroke();const a=q*.6;circle(ctx,Math.cos(a)*r,Math.sin(a)*r*tilt,10,color);ctx.restore();
  }
  function portrait(ctx,key,x,y,w,h,q,rotation=0) {
    ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rotation+Math.sin(q*.2)*.008);
    rect(ctx,-w/2-9,-h/2-9,w+18,h+18,C.paper);cover(ctx,key,-w/2,-h/2,w,h,1.07+q*.002,0,0);ctx.restore();
  }

  function question(ctx,q) {
    base(ctx,C.ink);particles(ctx,q,C.green,130);
    header(ctx,1,'一个不能取零的增量');
    const settle=ease(q/1.1),shift=(1-settle)*180;
    text(ctx,'它不能',80+shift,260,126,C.paper,{bold:true});
    text(ctx,'等于零',80+shift,397,126,C.yellow,{bold:true});
    text(ctx,'却要无限接近零？',88,471,43,C.paper,{alpha:ease((q-5)/1.2)});
    const h=.65*Math.exp(-q*.18)+.013;
    const px=x=>945+(x-.55)*510,py=y=>790-(y-.3)*245;
    line(ctx,910,804,1480,804,C.muted,2,.65);line(ctx,945,825,945,180,C.muted,2,.65);
    text(ctx,'x',1480,850,35,C.paper,{family:'serif'});text(ctx,'f(x)',901,186,35,C.paper,{family:'serif'});
    const points=[];for(let x=.6;x<=1.64;x+=.008)points.push([px(x),py(x*x)]);path(ctx,points,C.green,7);
    const ax=px(1),ay=py(1),bx=px(1+h),by=py((1+h)**2);
    const slope=2+h;line(ctx,px(.66),py(1+slope*(.66-1)),px(1.64),py(1+slope*(1.64-1)),C.orange,4);
    line(ctx,ax,ay,bx,ay,C.yellow,3);line(ctx,bx,ay,bx,by,C.yellow,3);
    circle(ctx,ax,ay,12,C.paper);circle(ctx,bx,by,13,C.orange);
    text(ctx,'A',ax-38,ay+34,31,C.paper);text(ctx,'B',bx+17,by-20,31,C.orange);
    text(ctx,'非零增量 h',(ax+bx)/2,ay+71,30,C.yellow,{align:'center'});
    text(ctx,'f(x)=x²',1050,193,50,C.green,{family:'serif'});
    ctx.save();ctx.globalAlpha=ease((q-1.2)/1.1);
    formula(ctx,'f′(x) =',87,662,67,C.paper);
    formula(ctx,'lim',402,650,58,C.paper);formula(ctx,'h → 0',410,704,29,C.yellow);
    fraction(ctx,'f(x+h) − f(x)','h',669,636,54,C.paper);ctx.restore();
    footer(ctx,'差商（difference quotient）：函数值增量 ÷ 输入增量',C.muted);
    return{h,quotient:2+h,model:'square at x=1'};
  }

  function discovery(ctx,q) {
    base(ctx,C.ink);cover(ctx,'study',0,0,W,H,1.03+q*.004,-q*1.8,q*.3);
    const g=ctx.createLinearGradient(0,0,1600,0);g.addColorStop(0,'rgba(6,17,43,.82)');g.addColorStop(1,'rgba(6,17,43,.12)');rect(ctx,0,0,W,H,g);
    header(ctx,2,'微积分的诞生');
    orbit(ctx,q,1240,420,287,C.yellow);orbit(ctx,q+4,1240,420,240,C.green,.6);
    if(q<11.5){
      const u=ease(q/1.2);text(ctx,'两条路径',80,244,112,C.paper,{bold:true,alpha:u});
      text(ctx,'共同走向变化的数学',84,312,45,C.green,{alpha:u});
      portrait(ctx,'newton',160,391,257,329,q,-.065);portrait(ctx,'leibniz',521,385,267,337,q,.045);
      text(ctx,'牛顿',145,798,55,C.paper,{family:'serif'});text(ctx,'Isaac Newton',147,841,26,C.muted);
      text(ctx,'莱布尼茨',497,798,55,C.paper,{family:'serif'});text(ctx,'G. W. Leibniz',501,841,26,C.muted);
      label(ctx,'历史场景插画 · 公共领域肖像',1035,809,C.paper);
    }else{
      const r=q-11.5,u=ease(r/.7);text(ctx,'谁先发现？',80,257,108,C.paper,{bold:true,alpha:u});
      text(ctx,'凭什么成立？',80,390,108,C.yellow,{bold:true,alpha:ease((r-2)/.8)});
      text(ctx,'优先权之争 ≠ 推理依据之争',89,490,46,C.paper,{alpha:ease((r-4)/.8)});
      ctx.save();ctx.translate(1250,430);ctx.rotate(-.075+Math.sin(q*.1)*.02);rect(ctx,-190,-253,380,506,C.paper);cover(ctx,'nova',-172,-233,344,466,1);ctx.restore();
      text(ctx,'1684',1052,769,104,C.yellow,{bold:true});text(ctx,'莱布尼茨论文原件',1060,820,32,C.paper);
      for(let i=0;i<22;i++){const t=clamp((r-i*.08)/5);line(ctx,110+40*i,600+55*Math.sin(i*.42),1050+15*i,630+30*Math.cos(i*.24),C.green,1,.1*t);}
    }
    grain(ctx,q,.1);return{historicalSceneLabel:true};
  }

  function quotient(ctx,q) {
    base(ctx,C.paper);header(ctx,3,'用现代记号复述',C.ink);
    text(ctx,'只要 h ≠ 0',80,223,104,C.ink,{bold:true});
    const h=mix(.43,.16,ease(q/17)),unit=294,x=156,y=417,w=unit*h;
    rect(ctx,x,y,unit,unit,C.blue);rect(ctx,x+unit+4,y,w,unit,C.green);rect(ctx,x,y-w-4,unit,w,C.yellow);rect(ctx,x+unit+4,y-w-4,w,w,C.orange);
    // A small perspective echo gives the physical blocks weight, while the
    // front faces above remain an exact 2-D area decomposition for h>0.
    path(ctx,[[x,y+unit],[x+unit,y+unit],[x+unit+14,y+unit+12],[x+14,y+unit+12]],C.ink,1,true,C.ink);
    text(ctx,'1',x+unit/2,y+unit/2+22,70,C.paper,{align:'center',family:'serif'});
    text(ctx,'h',x+unit+w/2+4,y+unit/2+18,51,C.ink,{align:'center',family:'serif'});
    text(ctx,'h',x+unit/2,y-w/2+14,51,C.ink,{align:'center',family:'serif'});
    line(ctx,x+unit+w+4,y-w/2,x+unit+w+20,y-w/2,C.orange,2);
    text(ctx,'h²',x+unit+w+28,y-w/2+14,36,C.ink,{family:'serif'});
    line(ctx,x-31,y,x-31,y+unit,C.ink,3);text(ctx,'1',x-46,y+unit/2+12,36,C.ink,{align:'right',family:'serif'});
    label(ctx,'面积分解图：h > 0',151,279,C.blue);
    const a=ease((q-1)/1.1);ctx.save();ctx.globalAlpha=a;
    formula(ctx,'f(x)=x²  ·  x=1',835,315,60);
    formula(ctx,'Q(h)=',816,478,61);fraction(ctx,'(1+h)² − 1','h',1270,438,56);
    text(ctx,'h ≠ 0',1049,587,39,C.orange,{family:'serif'});ctx.restore();
    ctx.save();ctx.globalAlpha=ease((q-6)/1.1);
    formula(ctx,'(1+h)² − 1 = 2h + h²',80,792,53);
    formula(ctx,'Q(h)=2+h',861,699,77,C.blue);ctx.restore();
    if(q>11){const z=ease((q-11)/.7);rounded(ctx,862,739,617,90,12,C.ink);text(ctx,'直接取 h=0：原差商无定义',891,800,37,C.yellow,{alpha:z});}
    footer(ctx,'每一步化简都保留条件 h≠0；没有将原差商延伸到零处。',C.ink);
    return{h,areaIncrement:2*h+h*h,quotient:2+h,areaDiagramDomain:'h>0'};
  }

  function berkeley(ctx,q) {
    base(ctx,C.ink);cover(ctx,'press',0,0,W,H,1.03+q*.005,-q*2,0);
    const g=ctx.createLinearGradient(0,0,1600,0);g.addColorStop(0,'rgba(9,21,44,.92)');g.addColorStop(.65,'rgba(9,21,44,.8)');g.addColorStop(1,'rgba(9,21,44,.18)');rect(ctx,0,0,W,H,g);
    header(ctx,4,'贝克莱的质疑');
    text(ctx,'1734',77,265,160,C.yellow,{bold:true});text(ctx,'《分析学家》',89,337,50,C.paper,{family:'serif'});
    portrait(ctx,'berkeley',1162,219,290,409,q,.043);
    text(ctx,'George Berkeley',1132,702,31,C.paper);text(ctx,'历史场景插画 · 肖像：Smibert',1020,821,25,C.muted);
    const split=ease((q-2)/1.2);ctx.save();ctx.globalAlpha=split;
    text(ctx,'先承认存在',90,484,53,C.paper);formula(ctx,'h ≠ 0',540,493,84,C.green);
    line(ctx,90,534,967,534,C.paper,2,.3);
    text(ctx,'随后又舍弃',90,636,53,C.paper);formula(ctx,'h = 0',540,641,84,C.orange,{alpha:ease((q-10)/1.2)});ctx.restore();
    if(q>12){
      const u=ease((q-12)/.7);text(ctx,'依据在哪里？',90,769,83,C.yellow,{bold:true,alpha:u});
      ctx.save();ctx.globalAlpha=u*.5;
      for(let i=0;i<80;i++){const a=hash(i)*TAU,r=45+(q-12)*13*hash(i+72);circle(ctx,873+Math.cos(a)*r,639+Math.sin(a)*r,2+hash(i+61)*4,i%2?C.orange:C.green);}ctx.restore();
    }
    footer(ctx,'《分析学家》XIII–XVI · 画面为历史质疑的现代复述',C.muted);
    grain(ctx,q,.06);return{historicalSceneLabel:true,paraphrase:true};
  }

  function ratioPlot(ctx,q,opts={}) {
    const ox=1110,oy=668,sx=440,sy=153,range=.77,h=.54*Math.exp(-q*.25)+.004;
    line(ctx,833,oy,1474,oy,C.muted,2,.8);line(ctx,ox,800,ox,340,C.muted,2,.8);
    text(ctx,'h',1480,706,34,C.paper,{family:'serif'});text(ctx,'Q(h)',1065,330,34,C.paper,{family:'serif'});
    text(ctx,'0',ox-29,oy+39,26,C.muted,{family:'serif'});text(ctx,'2',ox-41,oy-2*sy+8,31,C.yellow,{family:'serif'});
    const pts=[];for(let v=-.55;v<.8;v+=.01)pts.push([ox+v*sx,oy-(2+v)*sy]);path(ctx,pts,C.green,5);
    line(ctx,817,oy-2*sy,1460,oy-2*sy,C.yellow,2,.5);circle(ctx,ox,oy-2*sy,9,C.ink,C.paper,3);
    circle(ctx,ox+h*sx,oy-(2+h)*sy,12,C.orange);circle(ctx,ox-h*sx,oy-(2-h)*sy,12,C.orange);
    // The excluded center stays visibly open even when the two markers get
    // closer than their screen radii; it must never look like an assigned Q(0).
    circle(ctx,ox,oy-2*sy,9,C.ink,C.paper,3);
    text(ctx,'2+h',1292,481,44,C.green,{family:'serif'});
    return{h,quotientPositive:2+h,quotientNegative:2-h,center:'undefined'};
  }
  function newton(ctx,q) {
    base(ctx,C.ink);particles(ctx,q,C.yellow,70);header(ctx,5,'回到较早的牛顿文本');
    text(ctx,'比值的极限',80,252,111,C.paper,{bold:true});text(ctx,'不是零量相除',86,334,54,C.yellow);
    label(ctx,'1726版《原理》 · 1729年英译',84,397,C.green);
    const h=.54*Math.exp(-q*.25)+.004;
    text(ctx,'两个增量都缩小',89,505,42,C.paper);text(ctx,'比值却趋向确定的数',89,560,42,C.paper);
    const length=468*h;
    rect(ctx,90,614,length,32,C.blue);rect(ctx,90,701,468*(2*h+h*h),32,C.orange);
    text(ctx,'Δx=h',91,601,32,C.muted,{family:'serif'});text(ctx,'Δy=2h+h²',91,688,32,C.muted,{family:'serif'});
    const record=ratioPlot(ctx,q);
    text(ctx,'这段论述早于1734年',86,784,45,C.green);
    footer(ctx,'牛顿《原理》第一编第一节末尾附注 · 此处采用现代数学示例',C.muted);
    return record;
  }

  function crises(ctx,q) {
    const chapter=shots().find(s=>s.id==='crises'),segments=chapter.segments;
    const part=segments.findIndex(s=>q+chapter.from>=s.from&&q+chapter.from<s.to),local=q+chapter.from-segments[part].from;
    base(ctx,part===0?C.blue:part===2?C.paper:C.ink);
    const fore=part===2?C.ink:C.paper;header(ctx,6,'数学怎样重建基础（常见教学概括）',fore);
    if(part===0){
      label(ctx,'第一次 · 古希腊',86,149,C.green);
      text(ctx,'无理数',82,282,133,C.paper,{bold:true});label(ctx,'IRRATIONAL NUMBER',87,339,C.green);
      text(ctx,'整数与整数之比',88,440,56,C.paper);text(ctx,'仍有表示不了的长度',88,513,55,C.yellow);
      const outcome=ease((local-8)/1.3),angle=(-.12+Math.sin(local*.3)*.03)*(1-outcome),cx=1120,cy=459,s=303;
      ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);rect(ctx,-s/2,-s/2,s,s,C.paper);
      line(ctx,-s/2,-s/2,s/2,s/2,C.orange,8);circle(ctx,-s/2,-s/2,10,C.ink);circle(ctx,s/2,s/2,10,C.ink);ctx.restore();
      text(ctx,'1',1104,655,45,C.paper,{family:'serif'});formula(ctx,'√2',1268,461,76,C.yellow);
      ctx.save();ctx.globalAlpha=outcome;
      text(ctx,'不可公度 incommensurable',88,593,31,C.green);
      text(ctx,'同一尺度不能用整数次量尽两种长度',88,639,30,C.paper);
      text(ctx,'后续：研究这些量，扩展数的认识',88,692,40,C.yellow);
      line(ctx,885,715,1450,715,C.paper,3);
      circle(ctx,1153,715,6,C.paper);circle(ctx,885+268*Math.SQRT2,715,11,C.orange);
      text(ctx,'1',1153,761,33,C.paper,{align:'center',family:'serif'});
      text(ctx,'√2',885+268*Math.SQRT2,761,38,C.yellow,{align:'center',family:'serif'});
      text(ctx,'无理数也进入数的认识',991,804,29,C.paper);ctx.restore();
      footer(ctx,'《几何原本》V、X卷 · √2为现代记号；数的扩展经历了长期发展。',C.paper);
    }else if(part===1){
      label(ctx,'第二次 · 微积分的依据',86,149,C.green);
      text(ctx,'无穷小',80,282,133,C.paper,{bold:true});label(ctx,'INFINITESIMAL',87,339,C.green);
      text(ctx,'运动、切线、面积',88,440,56,C.paper);text(ctx,'算得出，凭什么成立？',88,513,54,C.yellow);
      // These physical blocks are a visual metaphor, not a purported fixed
      // positive infinitesimal inside the real numbers.
      for(let i=8;i>=0;i--){const s=.82*2**(-i*.2),z=i*.3-1;cube(ctx,(i-4)*.46,Math.sin(local*.5+i*.6)*.3,z,s,local,i%3===0?C.orange:C.blue,.9);}
      orbit(ctx,local,1100,504,295,C.green,.54);
      ctx.save();ctx.globalAlpha=ease((local-8.5)/1.3);
      text(ctx,'后续：实数与极限理论',88,624,43,C.green);text(ctx,'逐步建立严格基础',88,689,43,C.paper);
      text(ctx,'接近 → 条件 → 证明',877,758,43,C.yellow);ctx.restore();
      footer(ctx,'19世纪 · 柯西1821《分析教程》、戴德金1872《连续性与无理数》',C.muted);
    }else if(part===2){
      label(ctx,'第三次 · 20世纪初',86,149,C.blue);
      text(ctx,'集合悖论',80,282,120,C.ink,{bold:true});label(ctx,'SET-THEORETIC PARADOX',87,339,C.blue);
      text(ctx,'任意条件',88,440,57,C.ink);text(ctx,'都能造出集合吗？',88,513,53,C.blue);
      for(let i=0;i<8;i++){const u=(i/8+local*.065)%1,r=40+u*120;ctx.save();ctx.globalAlpha=Math.sin(u*Math.PI)*.65;circle(ctx,1145,469,r,null,i%2?C.orange:C.blue,8);ctx.restore();}
      text(ctx,'所有不包含自己的集合',1145,346,32,C.ink,{align:'center'});
      text(ctx,'它包含自己吗？',1145,480,47,C.ink,{align:'center',bold:true});
      ctx.save();ctx.globalAlpha=ease((local-2)/1);
      text(ctx,'包含自己 ⇒ 不包含自己',872,674,32,C.blue);
      text(ctx,'不包含自己 ⇒ 包含自己',872,727,32,C.orange);ctx.restore();
      ctx.save();ctx.globalAlpha=ease((local-8)/1.2);
      text(ctx,'公理 axioms：推理起点的基本假设',88,589,31,C.ink);
      text(ctx,'后续：限制集合的构造',88,647,42,C.blue);
      text(ctx,'例如：只从已有集合中筛选元素',88,695,31,C.ink);ctx.restore();
      footer(ctx,'罗素1902年的矛盾 · 1908年策梅洛的公理化；这里是现代逻辑示例。',C.ink);
    }else{
      text(ctx,'危机之后',80,244,118,C.paper,{bold:true});
      text(ctx,'重新审查推理的根据',87,323,49,C.green);
      text(ctx,'“三次数学危机”是常见教学概括',87,784,39,C.yellow);
      const centers=[335,800,1265];
      centers.forEach((cx,i)=>{
        if(i===0){rect(ctx,cx-90,430,180,180,C.paper);line(ctx,cx-90,430,cx+90,610,C.orange,6);}
        if(i===1){for(let j=0;j<6;j++)rect(ctx,cx-140+j*53,500,38,92*2**(-j/2),j%2?C.orange:C.green);}
        if(i===2){for(let j=0;j<4;j++)circle(ctx,cx,516,42+j*30,null,j%2?C.orange:C.green,5);}
        text(ctx,['数的认识扩大','极限理论严密化','集合构造有约束'][i],cx,681,38,C.paper,{align:'center'});
      });
      footer(ctx,'质疑旧的依据，推动新的定义与规则。',C.muted);
    }
    const labels=['不可公度','无穷小基础','集合悖论'];
    if(part<3)for(let i=0;i<3;i++){rect(ctx,82+i*201,741,176,6,i===part?C.orange:fore,i===part?1:.2);text(ctx,labels[i],82+i*201,797,27,fore);}
    return{crisisIndex:part,segment:segments[part].id,stage:part===3?'overview':local<8?'problem':'development',teachingOverview:true,...(part===2?{russellBranches:['membership implies non-membership','non-membership implies membership'],restrictionExample:'separation inside an existing set'}:{})};
  }

  function guarantee(ctx,q) {
    base(ctx,C.paper);header(ctx,7,'从接近，到保证',C.ink);
    text(ctx,'接近，可以被检验',80,222,104,C.ink,{bold:true});
    const epsilon=mix(.64,.17,ease((q-1)/18)),delta=epsilon,ox=502,oy=735,sx=314,sy=128;
    const yy=v=>oy-v*sy,xx=v=>ox+v*sx;
    rect(ctx,107,yy(2+epsilon),790,2*epsilon*sy,C.yellow,.62);
    rect(ctx,xx(-delta),292,2*delta*sx,502,C.green,.25);
    line(ctx,107,yy(2),897,yy(2),C.ink,2,.4);
    line(ctx,107,oy,897,oy,C.ink,2,.65);line(ctx,ox,814,ox,281,C.ink,2,.6);
    const pts=[];for(let h=-1.25;h<=1.25;h+=.01)pts.push([xx(h),yy(2+h)]);path(ctx,pts,C.blue,6);
    line(ctx,xx(-delta),289,xx(-delta),810,C.green,3);line(ctx,xx(delta),289,xx(delta),810,C.green,3);
    circle(ctx,ox,yy(2),9,C.paper,C.ink,3);
    for(let i=0;i<12;i++){
      const side=i<6?-1:1,u=.12+.78*(.5+.5*Math.sin(q*.9+i*.87)),h=side*delta*u;
      circle(ctx,xx(h),yy(2+h),7,C.orange);
    }
    circle(ctx,ox,yy(2),9,C.paper,C.ink,3);
    text(ctx,'h',910,oy+10,38,C.ink,{family:'serif'});text(ctx,'Q(h)',439,270,35,C.ink,{family:'serif'});
    text(ctx,'2',ox-42,yy(2)+11,32,C.ink,{family:'serif'});text(ctx,'0',ox-31,oy+35,29,C.ink,{family:'serif'});
    text(ctx,'−δ',xx(-delta),805,34,C.ink,{align:'center',family:'serif'});text(ctx,'δ',xx(delta),805,34,C.ink,{align:'center',family:'serif'});
    text(ctx,'2+ε',109,yy(2+epsilon)-18,31,C.ink,{family:'serif'});
    text(ctx,'2−ε',109,yy(2-epsilon)+37,31,C.ink,{family:'serif'});
    formula(ctx,'Q(h)=2+h',976,366,63,C.blue);
    text(ctx,'h≠0',984,420,35,C.ink,{family:'serif'});
    formula(ctx,'|Q(h)−2|=|h|',974,524,59,C.ink);
    label(ctx,'ε：允许的输出误差',985,591,C.ink);
    label(ctx,'δ：保证结果的输入范围',985,634,C.ink);
    text(ctx,'本例取 δ=ε',978,719,49,C.blue,{bold:true});
    text(ctx,'0<|h|<δ  ⇒  |Q(h)−2|<ε',974,779,33,C.ink,{family:'serif'});
    footer(ctx,'任意 ε>0，先选范围，再保证其中所有非零 h。',C.ink);
    return{epsilon,delta,absoluteError:'|h|',center:'excluded',proof:'delta=epsilon for Q=2+h'};
  }

  function closing(ctx,q) {
    base(ctx,C.blue);particles(ctx,q,C.green,170,[1160,472]);
    const a=ease(q/1.2),b=ease((q-5.5)/1);
    ctx.save();ctx.globalAlpha=1-b;ctx.translate(1160,468);ctx.rotate(-.15+q*.2);
    for(let i=0;i<24;i++){const theta=i/24*TAU,r=mix(242,20,ease(q/6));line(ctx,Math.cos(theta)*r,Math.sin(theta)*r,Math.cos(theta)*(r+45),Math.sin(theta)*(r+45),i%2?C.green:C.paper,4,.5);}
    circle(ctx,0,0,35+Math.sin(q)*9,null,C.yellow,8);ctx.restore();
    if(q<6){
      text(ctx,'极限',79,356,215,C.paper,{bold:true,alpha:a});label(ctx,'LIMIT',93,440,C.green);
      text(ctx,'一个范围',89,636,58,C.paper);text(ctx,'怎样保证所有输入？',89,714,58,C.yellow);
      footer(ctx,'我们没有除以零。我们证明怎样接近。',C.paper);
    }else{
      text(ctx,'消失的增量',80,284,126,C.paper,{bold:true});text(ctx,'微积分之争与数学的自我重建',89,367,50,C.yellow);
      text(ctx,'经济数学 · 李行之',90,535,45,C.paper);
      text(ctx,'原创几何动效、配乐与中文旁白',90,606,37,C.paper);
      text(ctx,'公共领域肖像、论文原件与生成历史插画',90,666,37,C.paper);
      text(ctx,'史料及素材来源见随附清单',90,726,32,C.green);
      orbit(ctx,q,1280,570,200,C.green,.52);
    }
    return{closing:true};
  }

  const painters={question,discovery,quotient,berkeley,newton,crises,guarantee,'return':closing};
  function caption(ctx,t) {
    const cue=data().narration.find(n=>t>=n.from&&t<n.to);if(!cue)return;
    ctx.save();ctx.font=`38px "${fonts.sans}"`;
    const size=Math.min(38,38*1340/ctx.measureText(cue.caption).width);
    if(size<30)throw Error(`Caption ${cue.id} needs splitting.`);
    rounded(ctx,105,886,1390,84,10,'rgba(7,15,30,.9)');
    text(ctx,cue.caption,800,940,size,C.paper,{align:'center',role:'caption'});ctx.restore();
  }
  function render(canvas,seconds) {
    if(!ready)throw Error('Call and await prepare() before rendering.');
    const t=clamp(seconds,0,data().duration-.001),shot=shots().find(s=>t>=s.from&&t<s.to),q=t-shot.from;
    const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);bounds=[];captionBounds=[];
    ctx.clearRect(0,0,W,H);const model=painters[shot.id](ctx,q);
    // Deliberate geometric match-cut: a single diagonal slab sweeps across
    // each cut, not a rapid strobe or an arbitrary fade to a static slide.
    if(t>0&&q<.48){
      const u=q/.48;ctx.save();ctx.translate(mix(-420,1900,ease(u)),500);ctx.rotate(-.16);rect(ctx,-170,-800,340,1600,C.yellow);ctx.restore();
    }
    grain(ctx,t,.023);caption(ctx,t);
    return{time:t,shot:shot.id,model,bounds:[...bounds,...captionBounds]};
  }
  async function prepare() {
    if(ready)return;
    const names={study:'assets/study.png',press:'assets/press.png',newton:'assets/newton.jpg',leibniz:'assets/leibniz.jpg',berkeley:'assets/berkeley.jpg',nova:'assets/nova-methodus.jpg'};
    await Promise.all(Object.entries(names).map(async([key,url])=>{
      const im=new Image();im.src=url;await im.decode();images[key]=im;
    }));
    await Promise.all([document.fonts.load('400 40px "Film Sans"'),document.fonts.load('400 64px "Film Serif"'),document.fonts.load('900 120px "Film Display"')]);
    ready=true;
  }
  root.CalculusHistoryFilm={prepare,render,W,H,FPS:data().fps,DURATION:data().duration,palette:C};
})(typeof window!=='undefined'?window:globalThis);
