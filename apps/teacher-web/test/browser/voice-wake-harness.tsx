import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceCommandComposer } from '../../src/features/classroom/VoiceCommandComposer';
import { useClassroomFullscreen } from '../../src/features/classroom/useClassroomFullscreen';
import '../../src/features/classroom/classroom.css';
import '../../src/features/classroom/classroom-fullscreen.css';
function Harness() {
  const overlay = location.pathname.includes('fullscreen');
  const [busy, setBusy] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [session, setSession] = useState('one');
  const [commands, setCommands] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [fullscreenCollapsed, setFullscreenCollapsed] = useState(false);
  const { containerRef, isFullscreen, toggleFullscreen } = useClassroomFullscreen({
    canTurnPages: false, pageIndex: 1, pageTotal: 1, onPageTurn: async () => {}, onError: message => { throw new Error(message); }
  });
  const concealed = isFullscreen ? fullscreenCollapsed : collapsed;
  Object.assign(window, { voiceHarness: { setBusy, setDisabled, setConfigured, setMounted, setSession, setCollapsed, setFullscreenCollapsed } });
  return <div ref={containerRef} tabIndex={-1} className={overlay ? 'classroom-workspace' : undefined} style={overlay ? { height: '100vh', margin: 0 } : { maxWidth: 370, margin: '20px auto', background: '#f0f6f3', padding: 10 }}>
    <div style={overlay ? { position: 'absolute', bottom: 10, left: 10, zIndex: 90, background: '#fff', padding: 8 } : undefined}>
    <h2>课堂助教 · 输入验证</h2>
    <button type="button" onClick={() => void toggleFullscreen()}>{isFullscreen ? '退出全屏' : '进入全屏'}</button>
    <button type="button" onClick={() => (isFullscreen ? setFullscreenCollapsed : setCollapsed)(!concealed)}>{concealed ? '展开数字人' : '收起数字人'}</button>
    </div>
    <aside className={overlay ? `classroom-avatar-dock ${concealed ? 'classroom-avatar-dock--collapsed' : ''}` : undefined}>
    {overlay && <><header className={concealed ? 'collapsed-avatar-controls' : 'avatar-dock-header'}><strong>课堂助教</strong></header>
      {!concealed && <div className="lam-avatar-surface" style={{ background: '#c5ded5', minHeight: 0 }}>数字人画面占位</div>}
    </>}
    {mounted && <VoiceCommandComposer key={session} concealed={concealed} compact={isFullscreen}
      onExpand={() => (isFullscreen ? setFullscreenCollapsed : setCollapsed)(false)} disabled={disabled} continuousAsrConfigured={configured} assistantBusy={busy}
      onCommand={async (text, source) => {
        const response = await fetch('/api/class-sessions/test/assistant/turns', { method: 'POST', body: JSON.stringify({ text, source }) });
        if (!response.ok) throw new Error('测试：回答流中断');
        setCommands(old => [...old, text]);
      }} />}
    </aside>
    <output aria-label="已提交指令">{JSON.stringify(commands)}</output>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
