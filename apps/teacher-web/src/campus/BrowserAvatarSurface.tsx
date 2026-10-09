import { forwardRef, lazy, Suspense, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { AvatarCuePack, AvatarCueState } from "@edu/contracts";
import type { LamAvatarController, LamAvatarSurfaceProps } from "../features/classroom/LamAvatarSurface";
import { LanzhouAvatarPlayer } from "../features/study/LanzhouAvatarPlayer";
import { decodePcm16Base64 } from "../features/study/study-utils";
import { runtimeConfig } from "./runtime";
import { api } from "../api";
import { SpeechMeter } from "../features/avatar/SpeechMeter";
import { StreamingPcmPlayer } from "../features/avatar/StreamingPcmPlayer";
import { useAvatarRenderer, getAvatarVoice } from "../features/avatar/avatar-preference";
import { NARRATION_PRESENTATION_EVENT, type NarrationPresentation } from '../features/economic-mathematics/narration-events';
import "../features/study/study.css";
// Production uses the browser avatar; only development loads the GPU adapter.
// Keep the import behind a compile-time flag so campus builds need no submodules.
const LegacySurface=import.meta.env.PROD?null:lazy(()=>import("../features/classroom/LamAvatarSurface").then(module=>({default:module.LamAvatarSurface})));
const Live2DPlayer=lazy(()=>import("../features/avatar/Live2DAvatarPlayer").then(module=>({default:module.Live2DAvatarPlayer})));

const BrowserSurface=forwardRef<LamAvatarController,LamAvatarSurfaceProps>(function BrowserSurface(props,ref){
  const renderer=useAvatarRenderer();
  const t=(zh:string,en:string)=>props.courseId==="course-international-mathematics"?en:zh;
  const meter=useRef(new SpeechMeter());
  const authored=useRef<NarrationPresentation|undefined>(undefined);
  const [cuePack,setCuePack]=useState<AvatarCuePack>();const [state,setState]=useState<AvatarCueState>("idle");const [subtitle,setSubtitle]=useState("");const [notice,setNotice]=useState("");
  const turns=useRef(new Map<string,string>());const active=useRef<AbortController|undefined>(undefined);const context=useRef<AudioContext|undefined>(undefined);const sources=useRef(new Set<AudioBufferSourceNode>());
  const callbacks=useRef(props);callbacks.current=props;
  const realtime=useRef<{id:string;player:StreamingPcmPlayer;text:string}|undefined>(undefined);
  const stop=()=>{realtime.current?.player.stop();realtime.current=undefined;const previous=active.current;active.current=undefined;previous?.abort();for(const source of sources.current){try{source.stop();}catch{}}sources.current.clear();meter.current.reset();};
  const audio=()=>{context.current??=new AudioContext({sampleRate:24000});void context.current.resume().catch(()=>setNotice(t("请点击页面后启用声音。", "Click the page to enable sound.")));return context.current;};
  useEffect(()=>{
    const interruptNarration=(event:Event)=>{if((event as CustomEvent).detail!==meter.current){stop();authored.current=undefined;setState("idle");callbacks.current.onConnectionStateChange("ready");}};
    const presentNarration=(event:Event)=>{
      const detail=(event as CustomEvent<NarrationPresentation>).detail;
      if(detail.status==='idle'||detail.status==='error'){if(authored.current?.owner===detail.owner){authored.current=undefined;setState('idle');callbacks.current.onConnectionStateChange('ready');}return;}
      authored.current=detail;setSubtitle(detail.subtitle);
      const next=detail.status==='playing'?'speaking':detail.status==='loading'?'thinking':'idle';setState(next);callbacks.current.onConnectionStateChange(next==='idle'?'ready':next);
    };
    window.addEventListener("edu:exclusive-audio",interruptNarration);
    window.addEventListener(NARRATION_PRESENTATION_EVENT,presentNarration);
    void api.getAvatarCuePack("/avatar/lanzhou/v1/manifest.json").then(setCuePack).catch(()=>setNotice(t("角色素材未下载，文字讲解仍可使用。", "Avatar assets are unavailable. Text explanations still work.")));
    callbacks.current.onConnectionStateChange("ready");
    return()=>{window.removeEventListener("edu:exclusive-audio",interruptNarration);window.removeEventListener(NARRATION_PRESENTATION_EVENT,presentNarration);stop();void context.current?.close();};
  },[]);
  const speak=async(text:string)=>{
    authored.current=undefined;
    window.dispatchEvent(new CustomEvent("edu:exclusive-audio",{detail:meter.current}));
    stop();setNotice("");setSubtitle(text);setState("thinking");callbacks.current.onConnectionStateChange("thinking");
    const speechConfigured = callbacks.current.courseId === "course-international-mathematics" ? runtimeConfig.speech.ttsEnglish ?? runtimeConfig.speech.tts : runtimeConfig.speech.tts;
    if(!speechConfigured){setNotice(t("当前使用字幕讲解；管理员配置语音后可朗读。", "Text explanations are active. Speech will resume when configured."));setState("idle");callbacks.current.onConnectionStateChange("ready");return;}
    const controller=new AbortController();active.current=controller;let completed=false;
    try{
      const response=await fetch("/api/teacher/tts",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:text.slice(0,3000), voiceProfile:getAvatarVoice(),lipSync:renderer==="live2d",courseId:callbacks.current.courseId}),signal:controller.signal});
      if(!response.ok || !response.body)throw new Error(t("语音暂不可用，请阅读字幕。", "Speech is unavailable. Please read the text."));
      controller.signal.throwIfAborted();
      const reader=response.body.getReader();const decoder=new TextDecoder();let buffer="";const ctx=audio();let next=ctx.currentTime;const playback:Promise<void>[]=[];
      try{while(true){const chunk=await reader.read();controller.signal.throwIfAborted();buffer+=decoder.decode(chunk.value,{stream:!chunk.done});if(chunk.done)buffer+="\n";const lines=buffer.split("\n");buffer=lines.pop()!;
        for(const line of lines){if(!line.startsWith("data:"))continue;const event=JSON.parse(line.slice(5));if(event.error)throw new Error(event.error);if(!event.audioBase64)continue;
          const samples=decodePcm16Base64(event.audioBase64);if(!samples.length)continue;const block=ctx.createBuffer(1,samples.length,event.sampleRate);block.getChannelData(0).set(samples);
          const source=ctx.createBufferSource();source.buffer=block;meter.current.connect(source);next=Math.max(next,ctx.currentTime+.03);sources.current.add(source);playback.push(new Promise<void>(resolve=>{source.onended=()=>{sources.current.delete(source);resolve();};}));meter.current.schedule(source,next,event.mouthCues);source.start(next);next+=block.duration;setState("speaking");callbacks.current.onConnectionStateChange("speaking");
        }if(chunk.done)break;}
      }finally{reader.releaseLock();}
      await Promise.all(playback);
      completed=playback.length>0;
    }catch(reason){if(!controller.signal.aborted){setNotice((reason as Error).message);for(const source of sources.current){try{source.stop();}catch{}}sources.current.clear();meter.current.reset();}}
    finally{if(active.current===controller){active.current=undefined;setState(completed&&renderer==="live2d"?"affirming":"idle");callbacks.current.onConnectionStateChange("ready");}}
  };
  useImperativeHandle(ref,()=>({
    beginRealtime:turnId=>{authored.current=undefined;window.dispatchEvent(new CustomEvent("edu:exclusive-audio",{detail:meter.current}));stop();setNotice("");setSubtitle("");realtime.current={id:turnId,player:new StreamingPcmPlayer(audio(),meter.current,turnId),text:""};setState("thinking");callbacks.current.onConnectionStateChange("thinking");},
    pushRealtimeAudio:(turnId,base64,sampleRate)=>{if(realtime.current?.id!==turnId)return;realtime.current.player.push(base64,sampleRate);setState("speaking");callbacks.current.onConnectionStateChange("speaking");},
    pushRealtimeText:(turnId,delta)=>{if(realtime.current?.id!==turnId)return;realtime.current.text+=delta;setSubtitle(realtime.current.text);},
    finishRealtime:async turnId=>{const current=realtime.current;if(current?.id!==turnId)return false;await current.player.finish();if(realtime.current===current){realtime.current=undefined;setState("idle");callbacks.current.onConnectionStateChange("ready");return true;}return false;},
    isConnected:()=>true,
    interrupt:()=>{authored.current=undefined;window.dispatchEvent(new CustomEvent("edu:exclusive-audio",{detail:meter.current}));stop();turns.current.clear();audio();setState("idle");callbacks.current.onConnectionStateChange("ready");return true;},
    pushDialogueDelta:(turnId,delta)=>{const text=(turns.current.get(turnId)??"")+delta;turns.current.set(turnId,text);setSubtitle(text);setState("thinking");callbacks.current.onConnectionStateChange("thinking");return true;},
    finishDialogue:turnId=>{const text=turns.current.get(turnId);turns.current.delete(turnId);if(text)void speak(text);return true;}
  }));
  const fallback=<LanzhouAvatarPlayer cuePack={cuePack} state={state} subtitle={subtitle}/>;
  return <div className="campus-avatar" hidden={props.concealed}>{renderer==="live2d"?<Suspense fallback={fallback}><Live2DPlayer state={state} subtitle={subtitle} concealed={props.concealed} readMouth={()=> (authored.current?.meter ?? meter.current).read()} readViseme={()=> (authored.current?.meter ?? meter.current).readViseme()} fallback={fallback}/></Suspense>:fallback}{notice&&<p className="campus-avatar-notice" role="status">{notice}</p>}</div>;
});

export const LamAvatarSurface=forwardRef<LamAvatarController,LamAvatarSurfaceProps>(function AdaptiveSurface(props,ref){
  const renderer=useAvatarRenderer();
  return renderer!=="lam" || runtimeConfig.profile==="campus" || !LegacySurface?<BrowserSurface {...props} ref={ref}/>:<Suspense fallback={<p>正在加载本机数字人…</p>}><LegacySurface {...props} ref={ref}/></Suspense>;
});
export type { LamAvatarController, LamConnectionState } from "../features/classroom/LamAvatarSurface";
