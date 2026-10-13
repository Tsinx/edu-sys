import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSE_DECKS, type CourseDeckDescriptor } from '@edu/course-content/deck-registry';
import { pdfChapterPlans, pdfSelection, validatedPdfFiles } from '../src/features/course-export/pdf-model';
import { pageToolsAllowed } from '../src/features/classroom/page-tools-policy';
// The builder policy is intentionally shared with a dependency-free Node test.
// @ts-expect-error JavaScript policy has no TypeScript declaration.
import { pdfBatches, waitForPdfResources, PDF_BUILD_LIMITS } from '../../../scripts/course-pdf/build-policy.mjs';

function manifest(deck: CourseDeckDescriptor) {
  const fingerprint = 'a'.repeat(64);
  const artifact = (name: string) => ({ url: `/course-exports/${deck.courseId}/${fingerprint}/${name}`, bytes: 1200, sha256: 'b'.repeat(64) });
  const chapters = pdfChapterPlans(deck).map(chapter => ({ number: chapter.number, label: chapter.label, title: chapter.title, pages: chapter.indices.length, file: artifact(`chapter-${chapter.number}.pdf`) }));
  return { format: 1, releaseId: 'test-release', courses: [{ courseId: deck.courseId, versionId: deck.versionId, title: deck.title,
    fingerprint, slideTotal: chapters.reduce((total, chapter) => total + chapter.pages, 0), chapters, complete: artifact('course.pdf'), archive: artifact('chapters.zip') }] };
}

test('every published slide belongs to exactly one export chapter, in teaching order', () => {
  for (const deck of COURSE_DECKS) {
    const chapters = pdfChapterPlans(deck), indices = chapters.flatMap(chapter => chapter.indices);
    assert.equal(indices.length, deck.slideTotal, deck.courseId);
    assert.equal(new Set(indices).size, deck.slideTotal);
    for (const chapter of chapters) for (const index of chapter.indices) assert.equal(deck.getSlide(index).lessonNumber, chapter.number);
    if (deck.getAdjacentIndex) for (let index = 1; index < indices.length; index++) assert.equal(deck.getAdjacentIndex(indices[index - 1]!, 1), indices[index]);
  }
});
test('chapter, merged course, and chapter ZIP select distinct files with correct counts', () => {
  const deck = COURSE_DECKS.find(deck => deck.courseId === 'statistical-analysis')!;
  const files = validatedPdfFiles(manifest(deck), deck, 'test-release');
  assert.equal(pdfSelection(files, 'chapter', 6).pages, 48);
  assert.match(pdfSelection(files, 'chapter', 6).file.url, /chapter-6\.pdf$/);
  assert.equal(pdfSelection(files, 'course', 6).pages, 350);
  assert.match(pdfSelection(files, 'course', 6).file.url, /course\.pdf$/);
  assert.match(pdfSelection(files, 'chapters', 6).filename, /\.zip$/);
  assert.throws(() => pdfSelection(files, 'chapter', 999));
});
test('stale releases, incomplete chapters, and unsafe or private URLs never become downloads', () => {
  const deck = COURSE_DECKS[0]!;
  assert.throws(() => validatedPdfFiles(manifest(deck), deck, 'different-release'));
  for (const url of ['https://example.com/file.pdf', '/api/courses/private.pdf', '/course-exports/../private.pdf', `/course-exports/${deck.courseId}/${'a'.repeat(64)}/../file.pdf`]) {
    const value = manifest(deck); value.courses[0]!.complete.url = url;
    assert.throws(() => validatedPdfFiles(value, deck));
  }
  const value = manifest(deck); value.courses[0]!.chapters.pop();
  assert.throws(() => validatedPdfFiles(value, deck));
});
test('export is local for following students and teachers and is hidden on projection', () => {
  const tools = { pageKey: 'slide-6', audience: 'local' as const };
  for (const role of ['teacher', 'reader', 'student'] as const) assert.equal(pageToolsAllowed(tools, tools.pageKey, role), true);
  assert.equal(pageToolsAllowed(tools, tools.pageKey, 'projection'), false);
});
test('offline PDF batches cover all pages without exceeding the hard batch limit', () => {
  for (const deck of COURSE_DECKS) {
    const chapters = pdfChapterPlans(deck), batches = pdfBatches(chapters);
    assert.equal(batches.reduce((total: number, item: {count: number}) => total + item.count, 0), deck.slideTotal);
    assert.ok(batches.every((item: {count: number}) => item.count > 0 && item.count <= PDF_BUILD_LIMITS.maximumBatchPages));
    for (let index = 1; index < batches.length; index++) assert.equal(batches[index].offset, batches[index - 1].offset + batches[index - 1].count);
  }
  assert.throws(() => pdfBatches([{ number: 1, indices: [1, 2] }], 9));
  assert.equal(PDF_BUILD_LIMITS.concurrency, 1);
});
test('memory pressure pauses the builder and fails within a bounded time', async () => {
  let time = 0, polls = 0;
  await waitForPdfResources({ freeMemoryMiB: () => ++polls < 3 ? 100 : 2000, now: () => time, wait: async (ms: number) => { time += ms; }, timeoutMs: 3000 });
  assert.equal(time, 2000);
  time = 0;
  await assert.rejects(waitForPdfResources({ freeMemoryMiB: () => 100, now: () => time, wait: async (ms: number) => { time += ms; }, timeoutMs: 3000 }), /MEMORY_PRESSURE/);
});
