import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const repository = resolve(fileURLToPath(new URL('..', import.meta.url)));
export async function currentPdfCatalog() {
  const result = await build({ stdin: { contents: `import {COURSE_DECKS} from './packages/course-content/src/deck-registry.ts';
    export default COURSE_DECKS.map(deck=>({courseId:deck.courseId,versionId:deck.versionId,
      chapters:deck.lessons.filter(lesson=>lesson.status==='ready'&&lesson.slideTotal>0).map(lesson=>({number:lesson.number,pages:lesson.slideTotal}))}));`, resolveDir: repository },
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  const path = resolve(repository, '.runtime/course-pdf-catalog.mjs');
  await mkdir(dirname(path), { recursive: true }); await writeFile(path, result.outputFiles[0].text);
  return (await import(pathToFileURL(path).href + `?run=${Date.now()}`)).default;
}

/** Release gate only: validates files without launching Chrome or any renderer. */
export async function verifyCoursePdfPackage(webRoot, catalog = undefined) {
  catalog ??= await currentPdfCatalog();
  const manifest = JSON.parse(await readFile(resolve(webRoot, 'course-exports/manifest.json'), 'utf8'));
  const offline = JSON.parse(await readFile(resolve(webRoot, 'offline-manifest.json'), 'utf8'));
  if (manifest.format !== 1 || manifest.releaseId !== offline.releaseId || manifest.courses.length !== catalog.length) throw new Error('PDF_RELEASE_INCOMPLETE');
  let pdfs = 0, archives = 0, slides = 0, bytes = 0;
  for (const expected of catalog) {
    const entry = manifest.courses.find(course => course.courseId === expected.courseId);
    if (!entry || entry.versionId !== expected.versionId || entry.chapters.length !== expected.chapters.length || !/^[a-f0-9]{64}$/.test(entry.fingerprint)) throw new Error(`PDF_RELEASE_VERSION:${expected.courseId}`);
    for (const [index, chapter] of expected.chapters.entries()) {
      if (entry.chapters[index].number !== chapter.number || entry.chapters[index].pages !== chapter.pages) throw new Error(`PDF_RELEASE_CHAPTER:${expected.courseId}`);
    }
    const total = expected.chapters.reduce((sum, chapter) => sum + chapter.pages, 0);
    if (entry.slideTotal !== total) throw new Error(`PDF_RELEASE_PAGES:${expected.courseId}`);
    slides += total;
    const files = [...entry.chapters.map(chapter => chapter.file), entry.complete, entry.archive];
    for (const [index, file] of files.entries()) {
      const extension = index === files.length - 1 ? 'zip' : 'pdf', prefix = `/course-exports/${entry.courseId}/${entry.fingerprint}/`;
      if (!file.url.startsWith(prefix) || !new RegExp(`^[a-z0-9-]+\\.${extension}$`).test(file.url.slice(prefix.length))) throw new Error('PDF_RELEASE_PATH');
      const path = resolve(webRoot, file.url.slice(1));
      if ((await stat(path)).size !== file.bytes) throw new Error(`PDF_RELEASE_SIZE:${path}`);
      const hash = createHash('sha256'); for await (const chunk of createReadStream(path)) hash.update(chunk);
      if (hash.digest('hex') !== file.sha256) throw new Error(`PDF_RELEASE_HASH:${path}`);
      bytes += file.bytes; if (extension === 'pdf') pdfs++; else archives++;
    }
  }
  return { courses: catalog.length, pdfs, archives, slides, bytes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await verifyCoursePdfPackage(resolve(process.argv[2] ?? resolve(repository, 'apps/teacher-web/dist'))), null, 2));
}
