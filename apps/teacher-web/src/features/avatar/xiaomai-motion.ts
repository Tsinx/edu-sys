import type { AvatarCueState } from "@edu/contracts";
import { bakedHeadYaw } from './xiaomai-head-projection';

export const xiaomaiActions = {
  auto: "自然待机", neutral: "回正", blink: "眨眼", half: "半睁眼", close: "轻闭眼",
  gazeLeft: "看左侧", gazeRight: "看右侧", gazeUp: "看上方", gazeDown: "看下方",
  browUp: "抬眉", frown: "皱眉", concern: "内眉抬起", asymmetric: "单侧挑眉",
  smile: "微笑", serious: "收起笑容",
  headUp: "抬头", headDown: "低头", nod: "点头确认", tiltLeft: "左歪头", tiltRight: "右歪头",
  breath: "呼吸", hair: "头发跟随",
  bodyLeft:"身体轻转左",bodyRight:"身体轻转右",leanForward:"稍向前倾",weightShift:"重心移动",
  encourage:"微笑鼓励",thoughtful:"思考疑问",attentive:"专注倾听",surprise:"轻微惊讶",emphasize:"认真强调",
  briefSmile:"短促微笑",softSquint:"柔和眯眼",idleVariation:"待机变化",
  welcome:"欢迎开课",explain:"解释概念",ask:"提出问题",waitAnswer:"等待回答",praise:"肯定答案",finish:"结束讲解"
} as const;
export type XiaomaiAction = keyof typeof xiaomaiActions;
// Acceptance decision: horizontal head yaw is not released. The Blender bake
// and projection helpers remain editable archives, but no classroom, composite
// action or preview action may drive yaw. Keep the old commands as safe no-ops.
type RetiredYawAction = "turnLeft" | "turnRight" | "turnSweep" | "turnBlink";
export interface XiaomaiPose {
  x: number; y: number; z: number; eyeOpen: number; eyeX: number; eyeY: number;
  browL: number; browR: number; browAngle: number; smile: number; breath: number; hair: number;
  volume?: number;
  bodyTurn:number;lean:number;shift:number;expressionOpen:number;
}
export const neutralXiaomaiPose = (): XiaomaiPose => ({ x:0, y:0, z:0, eyeOpen:1, eyeX:0, eyeY:0, browL:0, browR:0, browAngle:0, smile:0, breath:0, hair:0,bodyTurn:0,lean:0,shift:0,expressionOpen:0 });
const clamp = (x:number, a=0, b=1) => Math.max(a, Math.min(b,x));
const ease = (x:number) => (1-Math.cos(Math.PI*clamp(x)))/2;
const pulse = (time:number, duration:number) => time>=0 && time<duration ? Math.sin(Math.PI*time/duration)**2 : 0;

/** Bounded motions driven by elapsed visible time, with independent inertial hair. */
export class XiaomaiMotion {
  private time=0;
  private state:AvatarCueState="idle";
  private action:XiaomaiAction|RetiredYawAction="auto";
  private changed=0;
  private stateChanged=0;
  private blinkAt=-10;
  private nextBlink=3.5;
  private nextGlance=12;
  private glanceAt=-10;
  private glanceX=0;
  private glanceY=0;
  private nextIdleGesture=10;
  private idleGestureAt=-10;
  private idleGestureSide=1;
  private nextEmphasis=4;
  private emphasisAt=-10;
  private hairSpeed=0;
  private pose=neutralXiaomaiPose();
  constructor(private random:()=>number=Math.random) {}
  update(dt:number,state:AvatarCueState,reduced:boolean,level=0,action:XiaomaiAction|RetiredYawAction="auto"):XiaomaiPose {
    dt=clamp(Number.isFinite(dt)?dt:0,0,.05); this.time+=dt;
    if(state!==this.state){this.state=state;this.stateChanged=this.time;this.nextEmphasis=this.time+3.5;this.emphasisAt=-10;this.idleGestureAt=-10;this.nextIdleGesture=this.time+10+this.random()*8;this.glanceAt=-10;}
    if(action!==this.action){this.action=action;this.changed=this.time;}
    const t=this.time-this.changed, st=this.time-this.stateChanged;
    if(this.time>=this.nextBlink){this.blinkAt=this.time;this.nextBlink=this.time+3.2+this.random()*3.5;}
    if(this.time>=this.nextGlance){this.glanceAt=this.time;this.glanceX=(this.random()-.5)*.5;this.glanceY=(this.random()-.5)*.24;this.nextGlance=this.time+12+this.random()*10;}
    // Quiet intervals between gestures: one 4.5-second shift every 14–24 seconds,
    // with a small smile. Listening/thinking/speech take priority immediately.
    if(state==="idle" && this.time>=this.nextIdleGesture){this.idleGestureAt=this.time;this.idleGestureSide=this.random()<.5?-1:1;this.nextIdleGesture=this.time+14+this.random()*10;}
    if(state==="speaking" && level>.08 && this.time>=this.nextEmphasis){this.emphasisAt=this.time;this.nextEmphasis=this.time+5+this.random()*3;}
    const b=this.time-this.blinkAt;
    const blink=b<.085?ease(b/.085):b<.12?1:1-ease((b-.12)/.16);
    const glance=pulse(this.time-this.glanceAt,2.6);
    const p=neutralXiaomaiPose();
    p.eyeOpen=1-blink; p.eyeX=this.glanceX*glance;p.eyeY=this.glanceY*glance;
    p.breath=Math.sin(this.time*Math.PI*2/5.6);
    const idleGesture=pulse(this.time-this.idleGestureAt,4.5);
    if(state==="idle"){p.shift=.25*idleGesture*this.idleGestureSide;p.bodyTurn=.12*idleGesture*this.idleGestureSide;p.z=.45*idleGesture*this.idleGestureSide;p.smile=.16*idleGesture;}
    if(state==="thinking"){p.y=1.5;p.z=-2;p.eyeX=-.3;p.eyeY=-.18;p.browL=.2;p.browAngle=.2;p.bodyTurn=-.15;}
    if(state==="listening"){p.eyeX=p.eyeY=0;p.y=1.4-2*pulse(st-4,1.4);p.z=1.5;p.browL=.25;p.browR=.25;p.eyeOpen*=.97;p.lean=.25;}
    if(state==="speaking"){p.z=Math.sin(this.time*.6)*.65;p.y=-3*pulse(this.time-this.emphasisAt,.95);p.smile=.12;p.bodyTurn=.12*Math.sin(this.time*.3);}
    if(state==="affirming"){p.y=-7*pulse(st,1.3);p.smile=.7*Math.exp(-Math.max(0,st-1.5));p.browL=p.browR=.1;}
    if(state==="goodbye"){p.z=1.8;p.smile=.6;}
    if(action!=="auto") {
      Object.assign(p,neutralXiaomaiPose());
      switch(action){
        case "blink": {const b=t%2.3;p.eyeOpen=b<.16?1-ease(b/.16):b<.25?0:ease((b-.25)/.25);break;}
        case "half":p.eyeOpen=.5;break;case "close":p.eyeOpen=0;break;
        case "gazeLeft":p.eyeX=-1;break;case "gazeRight":p.eyeX=1;break;
        case "gazeUp":p.eyeY=-1;break;case "gazeDown":p.eyeY=1;p.eyeOpen=.88;break;
        case "browUp":p.browL=p.browR=1;break;
        case "frown":p.browL=p.browR=-.35;p.browAngle=-1;p.smile=-.7;break;
        case "concern":p.browAngle=1;p.browL=p.browR=.25;break;
        case "asymmetric":p.browL=.9;p.browR=-.1;break;
        case "smile":p.smile=1;p.eyeOpen=.92;break;case "serious":p.smile=-1;break;
        // Disabled after visual acceptance: preserve the old action IDs as
        // neutral no-ops, rather than reintroducing the rejected 2D/3D yaw.
        // Former targets: turnLeft=-10, turnRight=10, sweep=10*sin(t*pi/4).
        case "turnLeft":case "turnRight":case "turnSweep":case "turnBlink":break;
        case "headUp":p.y=8;break;case "headDown":p.y=-8;break;
        case "nod":p.y=-9*pulse(t%2.7,1.3);p.smile=.5;break;
        case "tiltLeft":p.z=-4.5;break;case "tiltRight":p.z=4.5;break;
        case "breath":p.breath=Math.sin(t*Math.PI*2/5.6);break;
        case "hair":p.z=3*Math.sin(t*2);break;
        case "bodyLeft":p.bodyTurn=-1;break;
        case "bodyRight":p.bodyTurn=1;break;
        case "leanForward":p.lean=1;p.y=-1.4;break;
        case "weightShift":p.shift=Math.sin(t*.8);p.bodyTurn=.3*Math.sin(t*.8);break;
        case "encourage":p.smile=.85;p.eyeOpen=.9;p.y=-4*pulse(t,1.3);break;
        case "thoughtful":p.z=-2;p.eyeX=-.3;p.eyeY=-.15;p.browAngle=.5;break;
        case "attentive":p.lean=.35;p.z=1.2;p.browL=p.browR=.18;p.y=-2*pulse(t%7,1.4);break;
        case "surprise":p.browL=p.browR=.75;p.y=1.8;p.expressionOpen=1;p.smile=-.2;break;
        case "emphasize":p.browAngle=-.45;p.browL=p.browR=-.1;p.y=-5*pulse(t,1.1);p.lean=.25;break;
        case "briefSmile":p.smile=.8*pulse(t%5,2.1);p.eyeOpen=1-.09*pulse(t%5,2.1);break;
        case "softSquint":p.eyeOpen=.82;p.smile=.3;break;
        case "idleVariation":p.eyeOpen=1-blink;p.eyeX=this.glanceX*glance;p.eyeY=this.glanceY*glance;p.shift=.25*idleGesture*this.idleGestureSide;p.bodyTurn=.12*idleGesture*this.idleGestureSide;p.z=.45*idleGesture*this.idleGestureSide;p.smile=.16*idleGesture;p.breath=Math.sin(t*Math.PI*2/5.6);break;
        case "welcome":p.smile=.7*pulse(t,4);p.browL=p.browR=.25*pulse(t,4);p.y=-4*pulse(t-.5,1.4);break;
        case "explain":p.bodyTurn=.2*Math.sin(t*.3);p.y=-2*pulse(t%6,1.3);p.smile=.15;p.eyeOpen=1-blink;break;
        case "ask":p.browAngle=.4*pulse(t,4);p.z=2*pulse(t,4);p.lean=.4*pulse(t,4);break;
        case "waitAnswer":p.eyeOpen=1-blink;p.z=1.1;p.lean=.2;p.breath=Math.sin(t*Math.PI*2/5.6);break;
        case "praise":p.smile=.9*pulse(t,4.2);p.eyeOpen=1-.13*pulse(t,4.2);p.y=-5*pulse(t-.5,1.3);break;
        case "finish":p.smile=.55*pulse(t,4);p.y=-5*pulse(t-.5,1.7);p.bodyTurn=.15*pulse(t,4);break;
      }
    }
    // Final release guard covers automatic states and all future combinations.
    p.x=0;this.pose.x=0;
    // Accessibility changes settle immediately; speech articulation stays audio driven.
    if(reduced){this.pose={...neutralXiaomaiPose(),smile:p.smile};this.hairSpeed=0;return {...this.pose};}
    for(const k of Object.keys(p) as (keyof XiaomaiPose)[]){
      if(k==="hair")continue;
      const tau=k==="eyeOpen"?.018:k==="eyeX"||k==="eyeY"?.13:.24;
      if(k!=="volume")this.pose[k]+=(p[k]-this.pose[k])*(1-Math.exp(-dt/tau));
    }
    const target=-this.pose.z*.65-this.pose.x*.12;
    this.hairSpeed+=(45*(target-this.pose.hair)-10*this.hairSpeed)*dt;
    this.pose.hair=clamp(this.pose.hair+this.hairSpeed*dt,-4,4);
    return {...this.pose};
  }
}

/** Shared art-space warp. Every skin, feature and overlay uses the same head coordinates. */
export function xiaomaiPoint(x:number,y:number,p:XiaomaiPose,part="face_layer",projectedX?:number):[number,number] {
  const head=1-ease((y-420)/140);
  const breath=p.breath*1.6*clamp((760-y)/300);
  let nx=x,ny=y-breath;
  const depth=clamp(1-((x-512)/175)**2);
  if(p.volume){nx=projectedX??bakedHeadYaw(x,y,p.x*1.8);}
  else {
    nx+=(p.x*.35+p.x*.65*depth)*head;
    nx=512+(nx-512)*(1-.0003*p.x*p.x*head);
  }
  ny+=(-p.y*.65+(y-300)*p.y*.0015)*head;
  const a=p.z*Math.PI/180*head, dx=nx-512,dy=ny-445;
  nx=512+dx*Math.cos(a)-dy*Math.sin(a);ny=445+dx*Math.sin(a)+dy*Math.cos(a);
  // The same bounded torso transform includes neck and overlays, anchored at
  // the bottom of the bust; no independently sliding collar or shoulder patches.
  const torso=clamp((760-y)/340),bodyAngle=p.bodyTurn*.045;
  const torsoDepth=45*Math.sqrt(Math.max(0,1-((x-512)/350)**2));
  nx+=((x-512)*(Math.cos(bodyAngle)-1)+torsoDepth*Math.sin(bodyAngle))*torso;
  nx+=(nx-512)*p.lean*.012*torso+p.shift*5*torso;
  ny-=p.lean*4*torso;
  if(part.startsWith("hair_")){
    const tip=ease((y-(part==="hair_front_main"?100:150))/(part==="hair_front_main"?230:300));
    // Some crossing strands belong to facial patches in the authored layer split.
    // Pin contact edges; free outer tips can sway without pulling those seams apart.
    const free=part==="hair_front_main"||part==="hair_left_side"?1-ease((x-360)/45):part==="hair_right_side"?ease((x-625)/45):.35;
    nx+=p.hair*tip*free;ny+=Math.abs(p.hair)*tip*free*.18;
  }
  if(part==="brow_left"||part==="brow_right"){
    const left=part==="brow_left";
    const inner=clamp(left?(x-420)/60:(600-x)/78);
    // Keep the painted patch perimeter (and the hair crossing the left brow) fixed.
    // Moving a whole cropped rectangle would reveal a rectangular hole in the face.
    const bounds=left?[411,227,483,253]:[522,215,604,244];
    const feather=ease((x-bounds[0]!)/10)*ease((bounds[2]!-x)/7)*ease((y-bounds[1]!)/5)*ease((bounds[3]!-y)/5);
    const hairMask=left?ease((x-432)/12):1;
    const weight=feather*hairMask;
    ny-=((left?p.browL:p.browR)*4.5+p.browAngle*(inner-.25)*5)*weight;
    nx+=(left?1:-1)*Math.max(0,-p.browAngle)*1.4*weight;
  }
  if(part==="Mouth_Closed") {
    const corner=clamp(Math.abs(x-513)/36);
    ny+=p.smile*(2-5*corner);
  }
  return [nx,ny];
}

export function xiaomaiLocalMatrix(x:number,y:number,p:XiaomaiPose):string {
  const a=xiaomaiPoint(x,y,p),b=xiaomaiPoint(x+1,y,p),c=xiaomaiPoint(x,y+1,p);
  const xx=b[0]-a[0],yx=b[1]-a[1],xy=c[0]-a[0],yy=c[1]-a[1];
  return `matrix(${xx} ${yx} ${xy} ${yy} ${a[0]-xx*x-xy*y} ${a[1]-yx*x-yy*y})`;
}
