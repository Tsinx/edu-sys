import type { ClassroomActivity } from "@edu/contracts";
import {
  ChevronLeft, ChevronRight, FlaskConical, Globe2, Home,
  Minimize2, Presentation, Sparkles, UsersRound
} from "lucide-react";

interface FullscreenControlsProps {
  activity: ClassroomActivity;
  allowedActivities: readonly ClassroomActivity[];
  busy: boolean;
  isLive: boolean;
  pageIndex: number;
  pageTotal: number;
  localIndex: number;
  localTotal: number;
  lessonNumber: number;
  avatarCollapsed: boolean;
  onPageTurn: (direction: "previous_slide" | "next_slide") => void;
  onActivityChange: (activity: ClassroomActivity) => void;
  onToggleAvatar: () => void;
  onExit: () => void;
  onWorkspace: () => void;
  onParticipation: () => void;
}

const shortcuts = [
  { id: "slides", label: "课件", icon: Presentation },
  { id: "globe", label: "地球仪", icon: Globe2 },
  { id: "simulation", label: "模拟实验", icon: FlaskConical }
] as const;

export function ClassroomFullscreenControls(props: FullscreenControlsProps) {
  const { busy, isLive, activity } = props;
  return (
    <nav className="classroom-fullscreen-controls" aria-label="全屏课堂快捷操作">
      {activity === "slides" && (
        <div className="fullscreen-page-controls" aria-label="课件翻页">
          <button type="button" aria-label="上一页" title="上一页（←）"
            disabled={busy || !isLive || props.pageIndex <= 1}
            onClick={() => props.onPageTurn("previous_slide")}>
            <ChevronLeft size={19} />
          </button>
          <span className="fullscreen-page-position" aria-live="polite">
            <small>第 {props.lessonNumber} 讲</small>
            <span>{props.localIndex} <span>/ {props.localTotal}</span></span>
          </span>
          <button type="button" aria-label="下一页" title="下一页（→）"
            disabled={busy || !isLive || props.pageIndex >= props.pageTotal}
            onClick={() => props.onPageTurn("next_slide")}>
            <ChevronRight size={19} />
          </button>
        </div>
      )}
      <div className="fullscreen-destination-controls">
        <button type="button" aria-label="返回工作台" title="返回工作台（保留课堂）" onClick={props.onWorkspace}>
          <Home size={18} /><span>工作台</span>
        </button>
        {shortcuts.filter((item) => props.allowedActivities.includes(item.id)).map((item) => (
          <button key={item.id} type="button" aria-label={`切换到${item.label}`}
            title={item.label} aria-pressed={activity === item.id}
            disabled={busy || !isLive} onClick={() => props.onActivityChange(item.id)}>
            <item.icon size={18} /><span>{item.label}</span>
          </button>
        ))}
        <button type="button" aria-label="打开课堂活动" title="点名与选择题" onClick={props.onParticipation}><UsersRound size={18} /><span>课堂活动</span></button>
        <button type="button" aria-label={props.avatarCollapsed ? "展开数字人浮窗" : "收起数字人浮窗"}
          title={props.avatarCollapsed ? "展开数字人浮窗" : "收起数字人浮窗"}
          aria-pressed={!props.avatarCollapsed} onClick={props.onToggleAvatar}>
          <Sparkles size={18} /><span>数字人</span>
        </button>
        <button type="button" aria-label="退出全屏" title="退出全屏（Esc）" onClick={props.onExit}>
          <Minimize2 size={18} /><span>退出全屏</span>
        </button>
      </div>
    </nav>
  );
}
