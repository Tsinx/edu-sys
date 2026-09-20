import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const {chromium}=createRequire('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.js')('playwright');
await fs.mkdir('output/port-lesson-six-film',{recursive:true});
const b=await chromium.launch({headless:true});try{const p=await b.newPage({viewport:{width:1600,height:1100}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
for(const n of [26,31,34,38]){await p.goto('http://127.0.0.1:5173/port-lesson-six-preview.html?page='+n+'&channel=film-smoke');await p.locator('.earth-globe--ready').waitFor({timeout:60000});await p.getByRole('slider',{name:'动画进度',exact:true}).fill(n===26?'430':'700');await p.waitForTimeout(350);await p.locator('.port-l6-slide').screenshot({path:`output/port-lesson-six-film/smoke-${n}.png`});console.log('shot '+n);}
console.log(JSON.stringify({errors}));}finally{await b.close();}
