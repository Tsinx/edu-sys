import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { campusBuild } from "./campus-build";

const teacherWebRoot = fileURLToPath(new URL(".", import.meta.url));
const openAvatarRendererRoot = fileURLToPath(
  new URL(
    "../../components/openavatarchat/src/service/frontend_service/frontend/src/renderer/src",
    import.meta.url
  )
);
const developmentPort = Number(process.env.EDU_WEB_PORT ?? 5173);
const apiProxyTarget =
  process.env.EDU_API_PROXY_URL ?? "http://127.0.0.1:4300";
const releaseId=process.env.EDU_RELEASE_ID ?? `campus-${new Date().toISOString().replace(/[^0-9]/g,"")}`;
const keywordModels=["original", ...["personal-20260909", "xiaomai-20260909-epoch10"].filter(id=>existsSync(resolve(teacherWebRoot,"public/vendor/local-kws",id)))];

export default defineConfig({
  plugins: [campusBuild(releaseId),react()],
  define: { "import.meta.env.VITE_EDU_RELEASE_ID":JSON.stringify(releaseId), "import.meta.env.VITE_EDU_KWS_MODELS":JSON.stringify(JSON.stringify(keywordModels)) },
  build: {
    rollupOptions: {
      input: {
        main: resolve(teacherWebRoot, "index.html"),
        statisticalAnalysisPreview: resolve(teacherWebRoot, "statistical-analysis-preview.html"),
        managementPreview: resolve(teacherWebRoot, "management-preview.html"),
        globePreview: resolve(teacherWebRoot, "globe-preview.html"),
        portLblPreview: resolve(teacherWebRoot, "port-lbl-preview.html"),
        portLessonFourPreview: resolve(teacherWebRoot, "port-lesson-four-preview.html"),
        portSimulationPreview: resolve(
          teacherWebRoot,
          "port-simulation-preview.html"
        )
      }
    }
  },
  resolve: {
    alias: [
      {
        find: "@openavatarchat-webui",
        replacement: openAvatarRendererRoot
      },
      {
        find: "@renderer",
        replacement: openAvatarRendererRoot
      },
      {
        find: "@",
        replacement: openAvatarRendererRoot
      }
    ]
  },
  server: {
    port: developmentPort,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true
      },
      "/openavatarchat-runtime": {
        target: "http://127.0.0.1:8282",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/openavatarchat-runtime/, "")
      }
    }
  },
  preview: {
    host: "127.0.0.1",
    port: 4173
  }
});
