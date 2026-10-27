import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
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
  plugins: [campusBuild(releaseId),react(), {
    name: 'edu-static-pdf-downloads',
    configureServer(server) {
      // Development serves the same verified artifacts as production. This
      // middleware only streams files; requests cannot launch a PDF renderer.
      const exportsRoot = resolve(teacherWebRoot, '../../.runtime/course-pdf-cache/artifacts');
      server.middlewares.use('/course-exports', async (request, response, next) => {
        const name = (request.url ?? '').split('?')[0]!;
        if (!['GET', 'HEAD'].includes(request.method ?? '') ||
          !/^\/(manifest\.json|[a-z0-9-]+\/[a-f0-9]{64}\/[a-z0-9-]+\.(pdf|zip))$/.test(name)) return next();
        const path = resolve(exportsRoot, name.slice(1));
        const file = await stat(path).catch(() => null);
        if (!file?.isFile()) { response.statusCode = 404; response.end(); return; }
        response.setHeader('Content-Type', name.endsWith('.pdf') ? 'application/pdf' : name.endsWith('.zip') ? 'application/zip' : 'application/json');
        response.setHeader('Content-Length', file.size);
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Cache-Control', name === '/manifest.json' ? 'no-cache' : 'public, max-age=31536000, immutable');
        if (request.method === 'HEAD') { response.end(); return; }
        const stream = createReadStream(path); stream.on('error', () => response.destroy());
        response.on('close', () => stream.destroy()); stream.pipe(response);
      });
    }
  }],
  define: { "import.meta.env.VITE_EDU_RELEASE_ID":JSON.stringify(releaseId), "import.meta.env.VITE_EDU_KWS_MODELS":JSON.stringify(JSON.stringify(keywordModels)) },
  build: {
    rollupOptions: {
      input: {
        main: resolve(teacherWebRoot, "index.html"),
        coursePdf: resolve(teacherWebRoot, "course-pdf.html"),
        economicNarration: resolve(teacherWebRoot, "economic-narration.html"),
        statisticalAnalysisPreview: resolve(teacherWebRoot, "statistical-analysis-preview.html"),
        managementPreview: resolve(teacherWebRoot, "management-preview.html"),
        globePreview: resolve(teacherWebRoot, "globe-preview.html"),
        portLblPreview: resolve(teacherWebRoot, "port-lbl-preview.html"),
        portLessonFivePreview: resolve(teacherWebRoot, "port-lesson-five-preview.html"),
        portExpansionPreview: resolve(teacherWebRoot, "port-expansion-preview.html"),
        portLessonSixPreview: resolve(teacherWebRoot, "port-lesson-six-preview.html"),
        portLessonFourPreview: resolve(teacherWebRoot, "port-lesson-four-preview.html"),
        portSimulationPreview: resolve(
          teacherWebRoot,
          "port-simulation-preview.html"
        ),
        portClassLab: resolve(teacherWebRoot, "port-class-lab.html"),
        portQueueLab: resolve(teacherWebRoot, "port-queue-lab.html"),
        portInvestmentLab: resolve(teacherWebRoot, "port-investment-lab.html"),
        portEnterprise: resolve(teacherWebRoot, "port-enterprise.html")
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
        // Realtime voice uses this same-origin WebSocket route. Preserve Host
        // so the API can validate it against the browser's unchanged Origin.
        changeOrigin: false,
        ws: true
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
