import viewerConfig from '../international-mathematics-viewer/vite.config.mjs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url)),repo=resolve(root,'../..');
export default context=>({...viewerConfig(context),root,build:{outDir:resolve(repo,'output/international-mathematics/v2/offline/sync'),emptyOutDir:false}});
