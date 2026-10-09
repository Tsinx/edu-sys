import fs from 'node:fs';
import vm from 'node:vm';
const module = {exports: {}};
vm.runInNewContext(fs.readFileSync(new URL('../apps/teacher-web/public/course-assets/economic-mathematics/prelude/course-data.js', import.meta.url), 'utf8'), {module});
const data = module.exports;
fs.writeFileSync(new URL('../packages/course-content/src/economic-mathematics/prelude-pages.json', import.meta.url), JSON.stringify({pages: data.pages, units: data.units}, null, 2) + '\n');
