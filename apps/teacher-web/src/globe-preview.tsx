import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GlobePreviewPage } from "./features/globe/GlobePreviewPage";
import { PageToolsProvider, PresentationToolbar } from './features/classroom/PageTools';
import "./features/globe/interactive-earth-globe.css";
import './features/classroom/page-tools.css';

createRoot(document.getElementById("globe-preview-root")!).render(
  <StrictMode>
    <PageToolsProvider pageKey="globe-component-preview">
      <div style={{height:'100dvh',display:'grid',gridTemplateRows:'minmax(0,1fr) auto',overflow:'hidden'}}>
        <div style={{overflow:'auto'}}><GlobePreviewPage /></div>
        <PresentationToolbar label="地球仪工具栏" navigation={<span>地球仪预览</span>}/>
      </div>
    </PageToolsProvider>
  </StrictMode>
);
