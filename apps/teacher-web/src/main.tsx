import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CampusRoot } from "./campus/CampusRoot";
import "./features/port-simulation/interactive-port-scene.css";
import "./features/port-simulation/port-simulation-runtime.css";
import "./styles.css";
import "./portal.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CampusRoot />
  </StrictMode>
);
