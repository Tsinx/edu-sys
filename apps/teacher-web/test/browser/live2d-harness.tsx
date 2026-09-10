import { StrictMode, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { LamAvatarSurface, type LamAvatarController, type LamConnectionState } from "../../src/campus/BrowserAvatarSurface";
import { AvatarSelector } from "../../src/features/avatar/AvatarSelector";
import { setRuntimeConfig } from "../../src/campus/runtime";
import "../../src/features/avatar/live2d.css";
import "../../src/campus/campus.css";
setRuntimeConfig({profile:"development",identity:"development",avatar:"lam",simulation:"local_solo",synchronization:"checkpoints-v1",speech:{tts:true,asr:true}});
function Harness() {
  const controller = useRef<LamAvatarController>(null);
  const [state, setState] = useState<LamConnectionState>("loading");
  const [concealed, setConcealed] = useState(false);
  return <main style={{maxWidth:700,margin:"auto",fontFamily:"sans-serif"}}>
    <h1>Live2D 数字人验收</h1><AvatarSelector onBeforeChange={() => controller.current?.interrupt()}/>
    <button onClick={() => {controller.current?.interrupt();controller.current?.pushDialogueDelta("qa","你好，欢迎来到港口管理课堂。");controller.current?.finishDialogue("qa");}}>讲解</button>
    <button onClick={() => controller.current?.interrupt()}>打断</button>
    <button onClick={() => controller.current?.pushDialogueDelta("qa-thinking", "正在整理")}>思考</button>
    <button onClick={() => setConcealed(value=>!value)}>折叠</button>
    <button onClick={() => void document.documentElement.requestFullscreen()}>全屏</button>
    <output>{state}</output>
    <div style={{height:480,width:"min(360px,100%)",margin:"16px auto"}}>
      <LamAvatarSurface ref={controller} runtime={undefined} concealed={concealed} onConnectionStateChange={setState} onHumanTranscript={()=>{}} onRetry={()=>{}}/>
    </div>
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><Harness/></StrictMode>);
