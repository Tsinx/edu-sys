import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CampusRoot } from "./campus/CampusRoot";
import "./features/port-simulation/interactive-port-scene.css";
import "./features/port-simulation/port-simulation-runtime.css";
import "./styles.css";
import "./portal.css";
import "./features/globe/interactive-earth-globe.css";
import "./features/port-lbl/port-lbl.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CampusRoot />
  </StrictMode>
);
