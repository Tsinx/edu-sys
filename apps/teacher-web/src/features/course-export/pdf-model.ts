import type { CourseDeckDescriptor } from '@edu/course-content/deck-registry';

export interface PdfArtifact { url: string; bytes: number; sha256: string }
export interface PdfChapter { number: number; title: string; label: string; pages: number; file: PdfArtifact }
export interface CoursePdfFiles {
  courseId: string; versionId: string; title: string; fingerprint: string; slideTotal: number;
  chapters: PdfChapter[]; complete: PdfArtifact; archive: PdfArtifact;
}
export interface CoursePdfManifest { format: 1; releaseId: string; createdAt: string; courses: CoursePdfFiles[] }
export type PdfScope = 'chapter' | 'course' | 'chapters';

/** Preserve teaching order, including decks whose storage indices are not their playback order. */
export function pdfChapterPlans(deck: CourseDeckDescriptor) {
  return deck.lessons.filter(lesson => lesson.status === 'ready' && lesson.slideTotal > 0).map(lesson => {
    const indices = Array.from({ length: deck.slideTotal }, (_, index) => index + 1)
      .filter(index => deck.getSlide(index).lessonNumber === lesson.number);
    if (indices.length !== lesson.slideTotal) throw new Error(`PDF_CHAPTER_COUNT:${lesson.number}`);
    let ordered = indices;
    if (deck.getAdjacentIndex) {
      const members = new Set(indices);
      const first = indices.find(index => !members.has(deck.getAdjacentIndex!(index, -1) ?? -1));
      ordered = [];
      let next: number | null = first ?? null;
      while (next !== null && members.delete(next)) {
        ordered.push(next); next = deck.getAdjacentIndex(next, 1);
      }
      if (members.size) throw new Error(`PDF_CHAPTER_ORDER:${lesson.number}`);
    }
    return { number: lesson.number, title: lesson.title, label: lesson.displayLabel ??
      (deck.locale === 'en' ? `Lecture ${lesson.number}` : lesson.kind === 'introduction' ? '绪论' : `第${lesson.number}讲`), indices: ordered };
  });
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

/** Accept only immutable same-origin files in this course's export directory. */
export function validatedPdfFiles(value: unknown, deck: CourseDeckDescriptor, releaseId?: string): CoursePdfFiles {
  if (!record(value) || value.format !== 1 || !Array.isArray(value.courses) ||
    (releaseId && value.releaseId !== releaseId)) throw new Error('PDF_MANIFEST_VERSION');
  const entry = value.courses.find(item => record(item) && item.courseId === deck.courseId);
  if (!record(entry) || entry.versionId !== deck.versionId || !digest(entry.fingerprint) ||
    entry.title !== deck.title || !Array.isArray(entry.chapters)) throw new Error('PDF_COURSE_VERSION');
  const prefix = `/course-exports/${deck.courseId}/${entry.fingerprint}/`;
  const artifact = (item: unknown, extension: 'pdf' | 'zip'): item is PdfArtifact => record(item) &&
    typeof item.url === 'string' && item.url.startsWith(prefix) &&
    new RegExp(`^[a-z0-9-]+\\.${extension}$`).test(item.url.slice(prefix.length)) && positive(item.bytes) && digest(item.sha256);
  const plans = pdfChapterPlans(deck);
  if (entry.chapters.length !== plans.length || entry.slideTotal !== plans.reduce((total, chapter) => total + chapter.indices.length, 0) ||
    !artifact(entry.complete, 'pdf') || !artifact(entry.archive, 'zip')) throw new Error('PDF_MANIFEST_INCOMPLETE');
  for (const [index, plan] of plans.entries()) {
    const chapter = entry.chapters[index];
    if (!record(chapter) || chapter.number !== plan.number || chapter.title !== plan.title || chapter.label !== plan.label ||
      chapter.pages !== plan.indices.length || !artifact(chapter.file, 'pdf')) throw new Error('PDF_MANIFEST_INCOMPLETE');
  }
  return entry as unknown as CoursePdfFiles;
}

export function pdfSelection(files: CoursePdfFiles, scope: PdfScope, chapter: number) {
  const selected = files.chapters.find(item => item.number === chapter);
  if (scope === 'chapter' && !selected) throw new Error('PDF_CHAPTER_MISSING');
  const label = scope === 'chapter' ? selected!.label : scope === 'chapters' ? '分章' : '全课程';
  return {
    file: scope === 'chapter' ? selected!.file : scope === 'chapters' ? files.archive : files.complete,
    filename: `${files.title}-${label}.${scope === 'chapters' ? 'zip' : 'pdf'}`.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-'),
    pages: scope === 'chapter' ? selected!.pages : files.slideTotal
  };
}
