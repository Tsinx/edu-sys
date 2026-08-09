import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PortSimulationPreviewPage } from "./features/port-simulation/PortSimulationPreviewPage";
import "./features/port-simulation/interactive-port-scene.css";
import "./features/port-simulation/port-simulation-preview.css";
import "./features/port-simulation/port-simulation-runtime.css";

createRoot(document.getElementById("port-simulation-preview-root")!).render(
  <StrictMode>
    <PortSimulationPreviewPage />
  </StrictMode>
);
