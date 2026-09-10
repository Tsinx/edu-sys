import { setAvatarRenderer, useAvatarRenderer, type AvatarRenderer } from "./avatar-preference";
import "./live2d.css";

export function AvatarSelector({ allowLam = false, compact = false, onBeforeChange }: { allowLam?: boolean; compact?: boolean; onBeforeChange?: () => void }) {
  const selected = useAvatarRenderer();
  return <label className={`avatar-renderer-select${compact ? " avatar-renderer-select--compact" : ""}`}>{!compact && "数字人"}
    <select aria-label="数字人形象" value={!allowLam && selected === "lam" ? "video" : selected} onChange={event => {
      onBeforeChange?.();
      setAvatarRenderer(event.target.value as AvatarRenderer);
    }}>
      <option value="live2d">Live2D · Haru</option>
      <option value="video">澜舟 · 视频</option>
      {allowLam && <option value="lam">LAM · Barbara</option>}
    </select>
  </label>;
}
