import { useEffect, useRef, useState } from 'react';
/** Local teacher aid only; never reveals answers or changes the shared slide state. */
export function ExerciseTimer({ minutes }: { minutes: number }) {
  const [remaining, setRemaining] = useState(minutes * 60), [running, setRunning] = useState(false);
  const end = useRef(0);
  useEffect(() => {
    if (!running) return;
    end.current = Date.now() + remaining * 1000;
    const interval = window.setInterval(() => { const next = Math.max(0, Math.ceil((end.current-Date.now())/1000)); setRemaining(next); if (!next) setRunning(false); }, 200);
    return () => clearInterval(interval);
  }, [running]);
  return <section className="em-teacher-controls" aria-label="课堂练习计时"><b>独立作答 · {minutes}分钟</b><div><output>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</output> <button disabled={!remaining} onClick={()=>setRunning(!running)}>{running?'暂停计时':'开始计时'}</button> <button onClick={()=>{setRunning(false);setRemaining(minutes*60);}}>重置</button></div><span>{remaining?'计时由教师启动；结束后手动进入反馈页。':'作答时间结束；答案仍未公开。'}</span></section>;
}
