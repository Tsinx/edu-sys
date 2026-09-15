import { Fragment, useEffect, useState } from "react";
import type { AvatarCueState, SpeechVisemeCue } from "@edu/contracts";
import { Live2DAvatarPlayer } from "./Live2DAvatarPlayer";
import { xiaomaiActions, type XiaomaiAction } from "./xiaomai-motion";
import "./xiaomai-preview.css";

export function XiaomaiAnimationPreview(){
  const [action,setAction]=useState<XiaomaiAction>("auto");
  const [state,setState]=useState<AvatarCueState>("idle");
  const [viseme,setViseme]=useState<SpeechVisemeCue["value"]|"off">("off");
  const [cycle,setCycle]=useState(false);
  const [eyeOpen,setEyeOpen]=useState("auto");
  useEffect(()=>{
    if(!cycle)return;
    const keys=Object.keys(xiaomaiActions) as XiaomaiAction[];
    let index=0;setAction(keys[0]!);
    const timer=window.setInterval(()=>{index=(index+1)%keys.length;setAction(keys[index]!);},3000);
    return()=>clearInterval(timer);
  },[cycle]);
  return <main className="xiaomai-preview">
    <header><a href="/">返回教学系统</a><h1>小麦老师 · 动作预览</h1><p>预览已实装的基础动作、教学表情和课堂组合。左右转头已停用。</p></header>
    <div className="xiaomai-preview__layout">
      <div className="xiaomai-preview__stage"><Live2DAvatarPlayer characterOverride="xiaomai" previewEyeOpen={eyeOpen==="auto"?undefined:Number(eyeOpen)} state={viseme==="off"?state:"speaking"} subtitle="" animationAction={action} readMouth={()=>viseme==="X"?0:.55} readViseme={()=>viseme==="off"?undefined:viseme}/></div>
      <aside>
        <label>叠加眼睑<select aria-label="叠加眼睑" value={eyeOpen} onChange={event=>setEyeOpen(event.target.value)}><option value="auto">跟随动作</option><option value="1">睁眼</option><option value="0.5">半闭眼</option><option value="0">闭眼</option></select></label>
        <button type="button" onClick={()=>setCycle(v=>!v)} aria-pressed={cycle}>{cycle?"停止轮播":"自动轮播动作"}</button>
        <div className="xiaomai-preview__actions" role="group" aria-label="P0 动作">
          {(Object.entries(xiaomaiActions) as [XiaomaiAction,string][]).map(([key,label])=><Fragment key={key}>{key==="auto"||key==="bodyLeft"||key==="briefSmile"?<strong style={{gridColumn:"1 / -1",padding:"8px 0"}}>{key==="auto"?"P0 · 基础交流":key==="bodyLeft"?"P1 · 教学表达":"P2 · 细节与组合"}</strong>:null}<button type="button" aria-pressed={action===key} onClick={()=>{setCycle(false);setAction(key);}}>{label}</button></Fragment>)}
        </div>
        <label>课堂状态<select aria-label="课堂状态" value={state} onChange={event=>{setState(event.target.value as AvatarCueState);setAction("auto");setCycle(false);}}><option value="idle">待机</option><option value="listening">聆听</option><option value="thinking">思考</option><option value="speaking">讲解</option><option value="affirming">确认完成</option></select></label>
        <label>口型示范（无声）<select aria-label="口型示范" value={viseme} onChange={event=>setViseme(event.target.value as typeof viseme)}><option value="off">关闭示范</option>{["A","B","C","D","E","F","G","H","X"].map(value=><option key={value}>{value}</option>)}</select></label>
        <p>课堂中的嘴型仍由实际语音驱动；这里的示范方便暂停检查。名称和唤醒词仍是“小麦老师”。</p>
      </aside>
    </div>
  </main>;
}
