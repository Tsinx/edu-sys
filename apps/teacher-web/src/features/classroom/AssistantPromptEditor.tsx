import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { AssistantPromptScope, AssistantPromptWorkspace } from "@edu/contracts";
import { api, ApiError } from "../../api";
import "./assistant-prompts.css";

async function requestPrompts(url: string, body?: unknown): Promise<AssistantPromptWorkspace> {
  const response = await fetch(url, { method: body ? "PATCH" : "GET", credentials: "same-origin", cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? "提示词读取失败");
  return result;
}

export function AssistantPromptEditor() {
  const { courseId = "" } = useParams();
  const [search] = useSearchParams();
  const [index, setIndex] = useState(Number(search.get("index")) || 1);
  const [activity, setActivity] = useState(search.get("activity") || "slides");
  const [scope, setScope] = useState<AssistantPromptScope>("agent");
  const [workspace, setWorkspace] = useState<AssistantPromptWorkspace | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [livePreview, setLivePreview] = useState("");
  const [reload, setReload] = useState(0);
  const saving = useRef(false);
  const url = `/api/courses/${encodeURIComponent(courseId)}/assistant-prompts?index=${index}&activity=${encodeURIComponent(activity)}`;
  const module = workspace?.modules.find(m => m.scope === scope);
  const dirty = Boolean(module && draft !== module.text);
  const selectedPage = workspace?.pages.find(p => p.index === index);
  useEffect(() => {
    let active = true;
    setBusy(true); setError(""); setWorkspace(null); setLivePreview("");
    void (async () => {
      const identity = await api.getIdentitySession().catch(reason => {
        if (reason instanceof ApiError && reason.status === 401) return api.createDevelopmentIdentitySession("teacher");
        throw reason;
      });
      if (!identity.actor.roles.includes("teacher")) throw new Error("请使用教师身份编辑AI提示词");
      return requestPrompts(url);
    })().then(result => { if (active) setWorkspace(result); })
      .catch(reason => { if (active) setError((reason as Error).message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [url, reload]);
  useEffect(() => { setDraft(module?.text ?? ""); }, [module]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(reset = false) {
    if (!module || !workspace || saving.current) return;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await requestPrompts(url, { scope, key: module.key, text: reset ? null : draft, expectedRevision: workspace.revision });
      setWorkspace(result); setLivePreview("");
      setNotice(reset ? "已恢复默认提示词，下次调用生效。" : "已保存到服务器，下次调用小麦老师时生效。正在播报的回答保持原样。");
    } catch (reason) { setError((reason as Error).message); }
    finally { saving.current = false; setBusy(false); }
  }
  return <main className="assistant-prompt-editor">
    <Link to={`/courses/${courseId}`} onClick={e => { if (dirty) { e.preventDefault(); setNotice("请先保存或撤销当前修改，再返回课程。"); } }}>← 返回课程</Link>
    <header><div><p className="prompt-eyebrow">教师备课 · AI设置</p><h1>小麦老师 · 提示词</h1><p>五层提示共同生效，保存后用于文字、语音提问与数字人讲解。</p></div>{workspace && <span className="prompt-revision">配置版本 {workspace.revision}</span>}</header>
    {error && <p role="alert" className="prompt-error">{error} <button disabled={busy} onClick={() => { if (!dirty) setReload(v => v + 1); else setNotice("请复制保留草稿或撤销修改后，再重新载入。"); }}>重新载入</button></p>}
    {notice && <p role="status">{notice}</p>}
    {busy && !workspace && <p role="status">正在读取课程提示词…</p>}
    {workspace && <>
      <div className="prompt-coverage">已配置 {workspace.coverage.coveredSlides} / {workspace.coverage.slides} 页 · {workspace.coverage.lessons} 讲 · {workspace.coverage.experiments} 类实验／演示。每页均有五层上下文。</div>
      <div className="prompt-selection">
        <label>章／讲<select aria-label="选择讲次" disabled={busy || dirty || !workspace.pages.length} value={selectedPage?.lesson ?? ""} onChange={e => setIndex(workspace.pages.find(p => p.lesson === Number(e.target.value))!.index)}>{[...new Set(workspace.pages.map(p => p.lesson))].map(lesson => <option key={lesson} value={lesson}>第{lesson}讲</option>)}</select></label>
        <label>Slide<select aria-label="选择Slide" disabled={busy || dirty || !workspace.pages.length} value={index} onChange={e => setIndex(Number(e.target.value))}>{workspace.pages.filter(p => p.lesson === selectedPage?.lesson).map((p, n) => <option key={p.key} value={p.index}>第{n + 1}页 · {p.title}</option>)}</select></label>
        <label>页面／实验<select aria-label="选择页面或实验" disabled={busy || dirty} value={activity} onChange={e => setActivity(e.target.value)}><option value="slides">当前Slide（含页内实验）</option>{workspace.experiments.map(e => <option key={e.key} value={e.key}>{e.title}</option>)}</select></label>
      </div>
      <nav aria-label="提示词模块" className="prompt-tabs">{workspace.modules.map(m => <button key={m.scope} aria-pressed={scope === m.scope} disabled={busy || (dirty && scope !== m.scope)} onClick={() => { setScope(m.scope); setNotice(""); }}>{m.title}{m.overridden && <small>已修改</small>}</button>)}</nav>
      {module && <section className="prompt-edit-panel">
        <h2>{module.title}</h2><p>{scope === "agent" ? "作用于所有课程。职能、表达风格与教师协作方式在这里统一设置。" : scope === "tools" ? "作用于本课程的工具使用策略。系统实时提供可用动作、参数范围与输出协议。" : scope === "course" ? "作用于本课程全部讲次与页面。" : scope === "lesson" ? "作用于所选讲次的所有页面。" : "作用于所选Slide或实验；每个页内实验随所属Slide配置。"}</p>
        {scope === "page" && <p>默认提示结合本页材料、前置页面、概念联系和后续用途。自定义文本会保留系统提供的关联背景；未揭示答案仍受保护。</p>}
        <label>教师提示词<textarea aria-label="教师提示词" value={draft} maxLength={12000} disabled={busy} onChange={e => setDraft(e.target.value)} /></label>
        <div className="prompt-edit-actions"><button className="button button--primary" disabled={busy || !dirty || !draft.trim()} onClick={() => void save()}>保存修改</button><button disabled={busy || !dirty} onClick={() => setDraft(module.text)}>撤销未保存修改</button><button disabled={busy || dirty || !module.overridden} onClick={() => void save(true)}>恢复默认</button><small>{draft.length} / 12000 字{dirty ? " · 尚未保存，请保存或撤销后切换" : " · 已与服务器同步"}</small></div>
        <details><summary>查看默认提示词</summary><pre>{module.defaultText}</pre></details>
        <details><summary>查看本模块的实时上下文与约束</summary><pre>{module.runtimeContext}</pre></details>
      </section>}
      <section className="prompt-preview"><h2>完整注入预览</h2><p>以下是已保存的五层提示词。备课预览使用实验初始值；课堂预览使用最新页码与参数。答案尚未揭示时，页级自定义提示暂不发送给模型。</p>
        {search.get("session") && <button disabled={busy} onClick={() => { void requestPrompts(`/api/class-sessions/${encodeURIComponent(search.get("session")!)}/assistant-prompts`).then(result => setLivePreview(result.compiled)).catch(reason => setError((reason as Error).message)); }}>刷新当前课堂注入预览</button>}
        <details><summary>{livePreview ? "展开当前课堂实际注入内容" : "展开已保存提示词的备课预览"}</summary><pre>{livePreview || workspace.compiled}</pre></details>
      </section>
    </>}
  </main>;
}
