import { setAvatarRenderer, useAvatarRenderer, setLive2DCharacter } from "./avatar-preference";
import "./live2d.css";

export function AvatarSelector({ compact = false, onBeforeChange }: { allowLam?: boolean; compact?: boolean; onBeforeChange?: () => void }) {
  const selected = useAvatarRenderer();
  const selection = selected === "video" ? "video" : "xiaomai";
  return <label className={`avatar-renderer-select${compact ? " avatar-renderer-select--compact" : ""}`}>{!compact && "数字人"}
    <select aria-label="数字人形象" value={selection} onChange={event => {
      onBeforeChange?.();
      const value = event.target.value;
      if (value === "xiaomai") {
        setLive2DCharacter("xiaomai");
        setAvatarRenderer("live2d");
      } else if (value === "video") setAvatarRenderer("video");
    }}>
      <option value="xiaomai">小麦老师 · Live2D</option>
      <option value="video">澜舟 · 视频</option>
    </select>
  </label>;
}
