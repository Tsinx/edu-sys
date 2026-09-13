import { TerminalStudio } from "./TerminalStudio";

export function PortSimulationPreviewPage() {
  let storage: Storage | null = null;
  try { storage = window.localStorage; } catch { /* The laboratory also works without persistent storage. */ }
  return <TerminalStudio storage={storage} storageScope="preview" sourceLabel="独立实验" />;
}
