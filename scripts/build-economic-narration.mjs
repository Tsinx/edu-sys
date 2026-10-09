import './sync-economic-prelude-data.mjs';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../apps/teacher-web', import.meta.url));
await build({ entryPoints: [path.join(root, 'src/economic-prelude-narration.tsx')], bundle: true, format: 'iife', jsx: 'automatic', minify: true, target: 'es2022', define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.PROD': 'true' }, outfile: path.join(root, 'public/course-assets/economic-mathematics/prelude/narration.js'), nodePaths: [path.join(root, 'node_modules')], legalComments: 'eof' });
console.log('Built shared prelude narration player.');
