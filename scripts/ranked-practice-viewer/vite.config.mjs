import {defineConfig} from '../../apps/teacher-web/node_modules/vite/dist/node/index.js';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import fs from 'node:fs';
const root=fileURLToPath(new URL('.',import.meta.url)),repo=resolve(root,'../..'),web=resolve(repo,'apps/teacher-web'),data=resolve(repo,'apps/platform-api/.runtime/ranked-practice');
const courseId='virtual:public-course',packId='virtual:public-practice';
export default defineConfig({root,base:'./',publicDir:false,plugins:[{name:'public-course-whitelist',resolveId(id){if(id==='@edu/course-content/international-mathematics')return '\0'+courseId;if(id===packId)return '\0'+packId;},load(id){
 if(id==='\0'+packId)return `export default ${fs.readFileSync(resolve(data,'public-packs.json'),'utf8')}`;
 if(id==='\0'+courseId){const p=JSON.parse(fs.readFileSync(resolve(data,'public-course.json'),'utf8'));return `export * from '${resolve(repo,'packages/course-content/src/international-mathematics/models.ts').replaceAll('\\','/')}';
 export const INTERNATIONAL_MATHEMATICS_SLIDES=${JSON.stringify(p.slides)};
 export const INTERNATIONAL_MATHEMATICS_LESSONS=${JSON.stringify(p.lessons)};
 export const INTERNATIONAL_MATHEMATICS_FILMS=${JSON.stringify(p.films)};
 export const INTERNATIONAL_MATHEMATICS_V1_PAGE_MAP=${JSON.stringify(p.migration)};
 export const INTERNATIONAL_MATHEMATICS_DECK_ID='deck-international-mathematics-jacques-2026',INTERNATIONAL_MATHEMATICS_VERSION_ID='release-international-mathematics-jacques-v2';
 export const getInternationalMathematicsSlide=index=>INTERNATIONAL_MATHEMATICS_SLIDES[Math.max(0,Math.min(INTERNATIONAL_MATHEMATICS_SLIDES.length-1,index-1))];
 export const getInternationalMathematicsInteractionDefaults=key=>{const s=INTERNATIONAL_MATHEMATICS_SLIDES.find(s=>s.slideKey===key),v={};if(s?.question)v.revealed=false;if(s?.interaction)v[s.interaction.key]=s.interaction.initial;if(s?.openingFilm)Object.assign(v,{playing:false,positionMs:0,anchorMs:0,runId:'initial'});return v;};`;
 }
 }}],resolve:{alias:[{find:'@edu/contracts',replacement:resolve(repo,'packages/contracts/src/index.ts')},{find:'react-dom',replacement:resolve(web,'node_modules/react-dom')},{find:'react',replacement:resolve(web,'node_modules/react')},{find:/^katex$/,replacement:resolve(web,'node_modules/katex/dist/katex.mjs')},{find:'katex',replacement:resolve(web,'node_modules/katex')}]},build:{outDir:resolve(repo,'output/international-mathematics/practice-v1/offline'),emptyOutDir:false},server:{host:'127.0.0.1',port:5194,strictPort:true,fs:{allow:[repo]}}});
