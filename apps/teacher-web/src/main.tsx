import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./features/port-simulation/interactive-port-scene.css";
import "./features/port-simulation/port-simulation-runtime.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
