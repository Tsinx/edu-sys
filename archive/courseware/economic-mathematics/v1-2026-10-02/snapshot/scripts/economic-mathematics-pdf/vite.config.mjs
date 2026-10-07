import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const exportRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(exportRoot, "../..");
const teacherWebNodeModules = resolve(repositoryRoot, "apps/teacher-web/node_modules");

export default {
  root: exportRoot,
  publicDir: resolve(repositoryRoot, "apps/teacher-web/public"),
  resolve: {
    alias: [
      {
        find: /^react\/jsx-runtime$/,
        replacement: resolve(teacherWebNodeModules, "react/jsx-runtime.js")
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: resolve(teacherWebNodeModules, "react/jsx-dev-runtime.js")
      },
      {
        find: /^react$/,
        replacement: resolve(teacherWebNodeModules, "react/index.js")
      },
      {
        find: /^react-dom\/client$/,
        replacement: resolve(teacherWebNodeModules, "react-dom/client.js")
      },
      {
        find: /^react-dom$/,
        replacement: resolve(teacherWebNodeModules, "react-dom/index.js")
      }
    ],
    dedupe: ["react", "react-dom"]
  },
  server: {
    host: "127.0.0.1",
    strictPort: true
  },
  clearScreen: false
};
