import { xiaomaiLocalMatrix, type XiaomaiPose } from "./xiaomai-motion";

// Apertures from the authored v2 layer split, not newly drawn eyes.
const sourceEyes = [
  {box:[393,248,490,312],iris:[448,280,15.8,17],aperture:[[403,281],[416,272],[432,266],[448,264],[462,271],[471,287],[454,296],[429,296],[414,290]]},
  {box:[528,234,613,297],iris:[563,268,16,17.3],aperture:[[536,271],[545,258],[558,250],[575,250],[590,256],[602,264],[591,276],[568,284],[549,285],[537,279]]}
];
type Eye = {canvas:HTMLCanvasElement;wrap:HTMLDivElement;context:CanvasRenderingContext2D;source:ImageData;skin:ImageData;output:ImageData;upper:Float32Array;lower:Float32Array;white:Float32Array;index:number;last?:string};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const smooth=(x:number)=>{x=clamp(x,0,1);return x*x*(3-2*x);};

/** Original painted pixels at rest. On blink, lids move together while irises are
 * clipped rather than flattened. Two tiny canvases avoid the old dense SVG cost.
 */
export class XiaomaiEyes {
  readonly element=document.createElement("div");
  readonly ready:Promise<void>;
  private eyes:Eye[]=[];
  private disposed=false;
  constructor(host:HTMLElement){
    this.element.setAttribute("aria-hidden","true");this.element.setAttribute("data-xiaomai-eyes","");
    this.element.style.cssText="position:absolute;left:0;top:0;width:1024px;height:760px;max-width:none;pointer-events:none;transform-origin:0 0";
    host.append(this.element);
    const skinImage=new Image();skinImage.src="/avatar/live2d/xiaomai/p0/EyeSkin.png";
    const skinReady=skinImage.decode();
    this.ready=Promise.all(sourceEyes.map(async(spec,index)=>{
      const image=new Image();image.src=`/avatar/live2d/xiaomai/p0/Eye${index?"R":"L"}_Full.png`;await Promise.all([image.decode(),skinReady]);
      if(this.disposed)return;
      const [x,y,right,bottom]=spec.box as [number,number,number,number];
      const canvas=document.createElement("canvas");canvas.width=right-x;canvas.height=bottom-y;canvas.dataset.eye=index?"right":"left";
      canvas.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${canvas.width}px;height:${canvas.height}px;max-width:none`;
      const wrap=document.createElement("div");wrap.style.cssText="position:absolute;left:0;top:0;width:1024px;height:760px;transform-origin:0 0";wrap.append(canvas);this.element.append(wrap);
      const context=canvas.getContext("2d")!;context.drawImage(image,-x,-y);
      const source=context.getImageData(0,0,canvas.width,canvas.height),output=context.createImageData(canvas.width,canvas.height);
      const skinCanvas=document.createElement("canvas");skinCanvas.width=canvas.width;skinCanvas.height=canvas.height;
      const skinContext=skinCanvas.getContext("2d")!;skinContext.drawImage(skinImage,-x,-y);
      const skin=skinContext.getImageData(0,0,canvas.width,canvas.height);
      const upper=new Float32Array(canvas.width).fill(-1),lower=new Float32Array(canvas.width).fill(-1);
      for(let col=0;col<canvas.width;col++){
        const px=x+col+.5,ys:number[]=[];
        spec.aperture.forEach((a,i)=>{const b=spec.aperture[(i+1)%spec.aperture.length]!;if((a[0]!<=px&&b[0]!>px)||(b[0]!<=px&&a[0]!>px))ys.push(a[1]!+(px-a[0]!)*(b[1]!-a[1]!)/(b[0]!-a[0]!));});
        if(ys.length>=2){upper[col]=Math.min(...ys)-y;lower[col]=Math.max(...ys)-y;}
      }
      // Sclera samples supply only the narrow strip revealed by a saccade.
      const white=new Float32Array(canvas.height*3);
      for(let row=0;row<canvas.height;row++){
        let count=0;const rgb=[0,0,0];
        for(let col=0;col<canvas.width;col++){
          if(upper[col]!<0||row<upper[col]!+2||row>lower[col]!-1)continue;
          const [ix,iy,rx,ry]=spec.iris as [number,number,number,number];
          if(((col+x-ix)/rx)**2+((row+y-iy)/ry)**2<1.15)continue;
          const k=(row*canvas.width+col)*4;
          if(source.data[k+1]!<145||source.data[k+3]!<240)continue;
          for(let c=0;c<3;c++)rgb[c]!+=source.data[k+c]!;count++;
        }
        for(let c=0;c<3;c++)white[row*3+c]=count?rgb[c]!/count:[239,220,199][c]!;
      }
      this.eyes.push({canvas,wrap,context,source,skin,output,upper,lower,white,index});
    })).then(()=>undefined);
  }
  fit(x:number,y:number,scale:number){this.element.style.transform=`translate(${x}px,${y}px) scale(${scale})`;}
  update(p:XiaomaiPose){
    for(const eye of this.eyes){
      const spec=sourceEyes[eye.index]!,[ox,oy]=spec.box as [number,number,number,number];
      const [ix,iy,rx,ry]=spec.iris as [number,number,number,number];
      eye.wrap.style.transform=xiaomaiLocalMatrix(ix,iy,p).replaceAll(" ",",");
      const open=clamp(p.eyeOpen,0,1),dx=p.eyeX*4.5,dy=p.eyeY*2.8;
      const w=eye.canvas.width,h=eye.canvas.height,src=eye.source.data,out=eye.output.data,skin=eye.skin.data;
      const neutral=open>.9999 && Math.abs(dx)+Math.abs(dy)<.001;
      const left=Math.min(...spec.aperture.map(v=>v[0]!))-ox,right=Math.max(...spec.aperture.map(v=>v[0]!))-ox;
      const il=ix-ox-rx,ir=ix-ox+rx,nl=il+dx,nr=ir+dx;
      const key=neutral?"neutral":`${open.toFixed(4)}:${dx.toFixed(3)}:${dy.toFixed(3)}`;
      if(eye.last===key)continue;eye.last=key;
      if(neutral){eye.context.putImageData(eye.source,0,0);continue;}
      const copy=(k:number,sx:number,sy:number)=>{
        sx=clamp(sx,0,w-1);sy=clamp(sy,0,h-1);
        const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),fx=sx-x0,fy=sy-y0;
        const a=(y0*w+x0)*4,b=(y0*w+x1)*4,c0=(y1*w+x0)*4,d=(y1*w+x1)*4;
        const aa=src[a+3]!/255,ab=src[b+3]!/255,ac=src[c0+3]!/255,ad=src[d+3]!/255;
        for(let c=0;c<3;c++){
          // Transparent source texels carry black RGB. Extend the authored skin
          // behind them before resampling, then retain the fixed outer patch mask.
          const fill=skin[k+c]!;
          out[k+c]=((src[a+c]!*aa+fill*(1-aa))*(1-fx)+(src[b+c]!*ab+fill*(1-ab))*fx)*(1-fy)+((src[c0+c]!*ac+fill*(1-ac))*(1-fx)+(src[d+c]!*ad+fill*(1-ad))*fx)*fy;
        }
        out[k+3]=src[k+3]!;
      };
      for(let x=0;x<w;x++){
        const top=eye.upper[x]!,bottom=eye.lower[x]!,height=bottom-top;
        const newTop=top+height*.85*(1-open),newBottom=bottom-height*.15*(1-open);
        for(let y=0;y<h;y++){
          const k=(y*w+x)*4;
          if(top<0){for(let c=0;c<4;c++)out[k+c]=src[k+c]!;continue;}
          if(y<newTop){
            if(y>=newTop-8){
              copy(k,x,top+y-newTop);
              const fade=(1-smooth((y-newTop+8)/4))*clamp((1-open)*4,0,1);
              for(let c=0;c<3;c++)out[k+c]=out[k+c]!*(1-fade)+skin[k+c]!*fade;
            }
            else if(y>=top-11){const fade=smooth((y-top+11)/3);for(let c=0;c<3;c++)out[k+c]=src[k+c]!*(1-fade)+skin[k+c]!*fade;out[k+3]=src[k+3]!;}
            else for(let c=0;c<4;c++)out[k+c]=src[k+c]!;
            continue;
          }
          if(y>newBottom){
            if(y<newBottom+10){copy(k,x,bottom+y-newBottom);const fade=(1-open)*smooth((bottom+13-y)/3);for(let c=0;c<3;c++)out[k+c]=out[k+c]!*(1-fade)+skin[k+c]!*fade;}
            else if(y<bottom+13){const fade=smooth((bottom+13-y)/3);for(let c=0;c<3;c++)out[k+c]=src[k+c]!*(1-fade)+skin[k+c]!*fade;out[k+3]=src[k+3]!;}
            else for(let c=0;c<4;c++)out[k+c]=src[k+c]!;
            continue;
          }
          // Move the iris as a rigid texture region and stretch only the adjacent
          // sclera. Continuous sampling avoids an ellipse cutout/compositing seam.
          let sx=x<nl?left+(x-left)*(il-left)/Math.max(.1,nl-left):x>nr?ir+(x-nr)*(right-ir)/Math.max(.1,right-nr):x-dx;
          const rim=clamp(Math.min(y-top,bottom-y)/2,0,1);
          sx=x+(sx-x)*rim;
          const sy=y-dy*rim;
          copy(k,sx,clamp(sy,eye.upper[Math.round(clamp(sx,0,w-1))]!+.5,eye.lower[Math.round(clamp(sx,0,w-1))]!-.5));
        }
      }
      // At full closure, resampling a textured lash strip produces alternating
      // dark texels. Resolve the final contact line as a single antialiased curve.
      // The original painted open eye remains untouched, including its lashes.
      const closed=smooth((.35-open)/.3);
      const lidInk=smooth((1-open)/.08);
      if(lidInk>0){
        for(let x=0;x<w;x++){
          const top=eye.upper[x]!,bottom=eye.lower[x]!;if(top<0)continue;
          const moved=top+(bottom-top)*.85*(1-open);
          const side=smooth((x-left)/4)*smooth((right-x)/3);
          for(let y=Math.max(0,Math.floor(top-11));y<Math.min(h,moved+1);y++){
            const k=(y*w+x)*4,weight=lidInk*side*smooth((y-top+11)/3);
            for(let c=0;c<3;c++)out[k+c]=out[k+c]!*(1-weight)+skin[k+c]!*weight;
          }
        }
      }
      if(closed>0){
        for(let x=0;x<w;x++){
          const top=eye.upper[x]!,bottom=eye.lower[x]!;if(top<0)continue;
          const side=smooth((x-left)/5)*smooth((right-x)/4);
          for(let y=Math.max(0,Math.floor(top-11));y<Math.min(h,bottom+10);y++){
            const k=(y*w+x)*4,weight=closed*side*smooth((y-top+11)/3)*smooth((bottom+10-y)/3);
            for(let c=0;c<3;c++)out[k+c]=out[k+c]!*(1-weight)+skin[k+c]!*weight;
          }
        }
      }
      eye.context.putImageData(eye.output,0,0);
      if(lidInk>0){
        const ctx=eye.context;ctx.save();ctx.globalAlpha=lidInk;ctx.strokeStyle='#594331';ctx.lineWidth=1.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
        const points:[number,number][]=[];
        for(let x=Math.ceil(left);x<right;x+=2){
          const top=eye.upper[x]!,bottom=eye.lower[x]!;if(top<0)continue;
          const t=(x-left)/(right-left),rest=(eye.index===0?281+6*t+10*Math.sin(Math.PI*t):271-7*t+11*Math.sin(Math.PI*t))-oy;
          points.push([x,(top+(bottom-top)*.85*(1-open))*(1-closed)+rest*closed]);
        }
        if(points.length){ctx.moveTo(...points[0]!);for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!;ctx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);}ctx.lineTo(...points.at(-1)!);}
        ctx.stroke();ctx.restore();
      }
    }
  }
  destroy(){this.disposed=true;this.element.remove();this.eyes=[];}
}
