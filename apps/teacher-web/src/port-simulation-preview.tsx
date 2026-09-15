import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PortSimulationPreviewPage } from "./features/port-simulation/PortSimulationPreviewPage";
import "./features/port-simulation/terminal-studio.css";
import "./features/port-simulation/port-operations.css";

createRoot(document.getElementById("port-simulation-preview-root")!).render(
  <StrictMode>
    <PortSimulationPreviewPage />
  </StrictMode>
);
