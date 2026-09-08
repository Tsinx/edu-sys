import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import type { ClassroomIdentitySession } from "@edu/contracts";
import { api } from "../api";
import { localGet, localSet } from "./storage";
import { setRuntimeConfig, type RuntimeConfig } from "./runtime";
import { OfflinePanel } from "./OfflinePanel";
import { applyRequestedRecovery } from "./sync";
import "./campus.css";

const TeacherApp=lazy(()=>import("../App").then(module=>({default:module.App})));
const StudentApp=lazy(()=>import("./StudentApp").then(module=>({default:module.StudentApp})));

export function CampusRoot() {
  const [identity,setIdentity]=useState<ClassroomIdentitySession>();
  const [loading,setLoading]=useState(true);
  const [config,setConfig]=useState<RuntimeConfig>();
  const [error,setError]=useState("");
  useEffect(()=> {
    let active=true;
    const bootstrap=async()=> {
      setLoading(true);
      try {
        let next:RuntimeConfig;
        try {const response=await fetch("/api/runtime/config",{cache:"no-store",signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error("平台配置不可用");next=await response.json();await localSet("runtime",next).catch(()=>undefined);}
        catch {const saved=await localGet<RuntimeConfig>("runtime");if(!saved)throw new Error("首次使用需要连接校园服务器。");next=saved;}
        setRuntimeConfig(next);if(active)setConfig(next);
        if(next.profile==="development" && import.meta.env.DEV)return;
        const session=await api.getIdentitySession();await applyRequestedRecovery(session.actor.actorId);if(active)setIdentity(session);
      } catch(reason) {if(active){setIdentity(undefined);if(!(reason instanceof Error) || !/身份|登录/.test(reason.message))setError((reason as Error).message);}}
      finally {if(active)setLoading(false);}
    };
    void bootstrap();
    const expired=()=>{setIdentity(undefined);setError("登录已过期，请重新登录；本机存档仍然保留。");};
    window.addEventListener("edu-auth-expired",expired);
    return()=>{active=false;window.removeEventListener("edu-auth-expired",expired);};
  },[]);
  const login=async(event:FormEvent<HTMLFormElement>)=> {
    event.preventDefault();setError("");const data=new FormData(event.currentTarget);
    try {const session=await api.login(String(data.get("username")),String(data.get("password")));await applyRequestedRecovery(session.actor.actorId);setIdentity(session);}
    catch(reason){setError((reason as Error).message);}
  };
  if(loading)return <main className="campus-login" role="status"><p>正在打开教学平台…</p></main>;
  if(config?.profile==="development" && import.meta.env.DEV)return <Suspense fallback={<p>正在装载课堂…</p>}><TeacherApp/></Suspense>;
  if(!identity)return <main className="campus-login"><form onSubmit={event=>void login(event)}>
    <p className="campus-eyebrow">校园教学平台</p><h1>欢迎回到课堂</h1><p>使用教师发放的账号登录，已下载的课程可在断网时继续学习。</p>
    <label>账号<input name="username" autoComplete="username" required maxLength={80}/></label>
    <label>密码<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label>
    {error&&<p role="alert">{error}</p>}<button type="submit">登录</button>
  </form></main>;
  return <><Suspense fallback={<p className="campus-loading">正在装载教学空间…</p>}>
    {identity.actor.roles.includes("teacher")?<TeacherApp/>:<StudentApp identity={identity}/>}</Suspense>
    <OfflinePanel actorId={identity.actor.actorId}/></>;
}
