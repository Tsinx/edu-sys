import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const teacherWebRoot = fileURLToPath(new URL(".", import.meta.url));
const openAvatarRendererRoot = fileURLToPath(
  new URL(
    "../../components/openavatarchat/src/service/frontend_service/frontend/src/renderer/src",
    import.meta.url
  )
);

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(teacherWebRoot, "index.html"),
        globePreview: resolve(teacherWebRoot, "globe-preview.html")
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
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4300",
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
