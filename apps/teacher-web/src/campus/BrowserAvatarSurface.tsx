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
import "../features/study/study.css";
// Production uses the browser avatar; only development loads the GPU adapter.
// Keep the import behind a compile-time flag so campus builds need no submodules.
const LegacySurface=import.meta.env.PROD?null:lazy(()=>import("../features/classroom/LamAvatarSurface").then(module=>({default:module.LamAvatarSurface})));
const Live2DPlayer=lazy(()=>import("../features/avatar/Live2DAvatarPlayer").then(module=>({default:module.Live2DAvatarPlayer})));

const BrowserSurface=forwardRef<LamAvatarController,LamAvatarSurfaceProps>(function BrowserSurface(props,ref){
  const renderer=useAvatarRenderer();
  const meter=useRef(new SpeechMeter());
  const [cuePack,setCuePack]=useState<AvatarCuePack>();const [state,setState]=useState<AvatarCueState>("idle");const [subtitle,setSubtitle]=useState("");const [notice,setNotice]=useState("");
  const turns=useRef(new Map<string,string>());const active=useRef<AbortController|undefined>(undefined);const context=useRef<AudioContext|undefined>(undefined);const sources=useRef(new Set<AudioBufferSourceNode>());
  const callbacks=useRef(props);callbacks.current=props;
  const realtime=useRef<{id:string;player:StreamingPcmPlayer;text:string}|undefined>(undefined);
  const stop=()=>{realtime.current?.player.stop();realtime.current=undefined;const previous=active.current;active.current=undefined;previous?.abort();for(const source of sources.current){try{source.stop();}catch{}}sources.current.clear();meter.current.reset();};
  const audio=()=>{context.current??=new AudioContext({sampleRate:24000});void context.current.resume().catch(()=>setNotice("请点击页面后启用声音。"));return context.current;};
  useEffect(()=>{
    void api.getAvatarCuePack("/avatar/lanzhou/v1/manifest.json").then(setCuePack).catch(()=>setNotice("角色素材未下载，文字讲解仍可使用。"));
    callbacks.current.onConnectionStateChange("ready");
    return()=>{stop();void context.current?.close();};
  },[]);
  const speak=async(text:string)=>{
    stop();setNotice("");setSubtitle(text);setState("thinking");callbacks.current.onConnectionStateChange("thinking");
    if(!runtimeConfig.speech.tts){setNotice("当前使用字幕讲解；管理员配置语音后可朗读。");setState("idle");callbacks.current.onConnectionStateChange("ready");return;}
    const controller=new AbortController();active.current=controller;let completed=false;
    try{
      const response=await fetch("/api/teacher/tts",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:text.slice(0,3000), voiceProfile:getAvatarVoice(),lipSync:renderer==="live2d"}),signal:controller.signal});
      if(!response.ok || !response.body)throw new Error("语音暂不可用，请阅读字幕。");
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
    beginRealtime:turnId=>{stop();setNotice("");setSubtitle("");realtime.current={id:turnId,player:new StreamingPcmPlayer(audio(),meter.current,turnId),text:""};setState("thinking");callbacks.current.onConnectionStateChange("thinking");},
    pushRealtimeAudio:(turnId,base64,sampleRate)=>{if(realtime.current?.id!==turnId)return;realtime.current.player.push(base64,sampleRate);setState("speaking");callbacks.current.onConnectionStateChange("speaking");},
    pushRealtimeText:(turnId,delta)=>{if(realtime.current?.id!==turnId)return;realtime.current.text+=delta;setSubtitle(realtime.current.text);},
    finishRealtime:async turnId=>{const current=realtime.current;if(current?.id!==turnId)return false;await current.player.finish();if(realtime.current===current){realtime.current=undefined;setState("idle");callbacks.current.onConnectionStateChange("ready");return true;}return false;},
    isConnected:()=>true,
    interrupt:()=>{stop();turns.current.clear();audio();setState("idle");callbacks.current.onConnectionStateChange("ready");return true;},
    pushDialogueDelta:(turnId,delta)=>{const text=(turns.current.get(turnId)??"")+delta;turns.current.set(turnId,text);setSubtitle(text);setState("thinking");callbacks.current.onConnectionStateChange("thinking");return true;},
    finishDialogue:turnId=>{const text=turns.current.get(turnId);turns.current.delete(turnId);if(text)void speak(text);return true;}
  }));
  const fallback=<LanzhouAvatarPlayer cuePack={cuePack} state={state} subtitle={subtitle}/>;
  return <div className="campus-avatar" hidden={props.concealed}>{renderer==="live2d"?<Suspense fallback={fallback}><Live2DPlayer state={state} subtitle={subtitle} concealed={props.concealed} readMouth={meter.current.read} readViseme={meter.current.readViseme} fallback={fallback}/></Suspense>:fallback}{notice&&<p className="campus-avatar-notice" role="status">{notice}</p>}</div>;
});

export const LamAvatarSurface=forwardRef<LamAvatarController,LamAvatarSurfaceProps>(function AdaptiveSurface(props,ref){
  const renderer=useAvatarRenderer();
  return renderer!=="lam" || runtimeConfig.profile==="campus" || !LegacySurface?<BrowserSurface {...props} ref={ref}/>:<Suspense fallback={<p>正在加载本机数字人…</p>}><LegacySurface {...props} ref={ref}/></Suspense>;
});
export type { LamAvatarController, LamConnectionState } from "../features/classroom/LamAvatarSurface";
