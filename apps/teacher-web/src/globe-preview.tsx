import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GlobePreviewPage } from "./features/globe/GlobePreviewPage";
import "./features/globe/interactive-earth-globe.css";

createRoot(document.getElementById("globe-preview-root")!).render(
  <StrictMode>
    <GlobePreviewPage />
  </StrictMode>
);
