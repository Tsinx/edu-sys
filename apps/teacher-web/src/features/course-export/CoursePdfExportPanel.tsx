import { useEffect, useState } from 'react';
import type { CourseDeckDescriptor } from '@edu/course-content/deck-registry';
import { Download, LoaderCircle } from 'lucide-react';
import { pdfSelection, validatedPdfFiles, type CoursePdfFiles, type PdfScope } from './pdf-model';

export function CoursePdfExportPanel({ courseId, pageKey }: { courseId: string; pageKey: string }) {
  const [loaded, setLoaded] = useState<{ deck: CourseDeckDescriptor; files: CoursePdfFiles }>();
  const [error, setError] = useState('');
  const [scope, setScope] = useState<PdfScope>('chapter');
  const [chapter, setChapter] = useState(0);
  const [started, setStarted] = useState(false);
  const english = courseId === 'course-international-mathematics';
  const t = (zh: string, en: string) => english ? en : zh;
  useEffect(() => {
    const controller = new AbortController();
    setLoaded(undefined); setError(''); setStarted(false);
    void (async () => {
      const { getCourseDeckByCourseId } = await import('@edu/course-content/deck-registry');
      const deck = getCourseDeckByCourseId(courseId);
      if (!deck) throw new Error('PDF_COURSE_MISSING');
      const response = await fetch('/course-exports/manifest.json', { signal: controller.signal, cache: 'no-cache' });
      if (!response.ok) throw new Error('PDF_NOT_PUBLISHED');
      if (Number(response.headers.get('Content-Length')) > 256_000) throw new Error('PDF_MANIFEST_SIZE');
      const text = await response.text();
      if (text.length > 256_000) throw new Error('PDF_MANIFEST_SIZE');
      const files = validatedPdfFiles(JSON.parse(text), deck, import.meta.env.PROD ? import.meta.env.VITE_EDU_RELEASE_ID : undefined);
      if (controller.signal.aborted) return;
      setChapter(files.chapters.find(item => item.number === deck.getSlideByKey(pageKey)?.lessonNumber)?.number ?? files.chapters[0]!.number);
      setLoaded({ deck, files });
    })().catch(() => {
      if (!controller.signal.aborted) setError(t('当前版本的PDF尚未发布或已更新。请刷新页面后重试。', 'PDFs for this version are not published or have changed. Refresh this page and try again.'));
    });
    return () => controller.abort();
  }, [courseId, pageKey]);
  const selection = loaded ? pdfSelection(loaded.files, scope, chapter) : undefined;
  return <div className="course-pdf-export">
    {!loaded && !error && <p role="status"><LoaderCircle size={16} className="spin"/> {t('正在检查下载文件…', 'Checking download files…')}</p>}
    {error && <p role="alert">{error}</p>}
    {loaded && <>
      <p className="course-pdf-export__title">{loaded.deck.title}</p>
      <fieldset><legend>{t('导出范围', 'Export scope')}</legend>
        {(['chapter', 'course', 'chapters'] as const).map(value => <label key={value}>
          <input type="radio" name="pdf-scope" value={value} checked={scope === value} onChange={() => { setScope(value); setStarted(false); }}/>
          {value === 'chapter' ? t('单个章节', 'One chapter') : value === 'course' ? t('全课程 · 一个PDF', 'Whole course · one PDF') : t('全课程 · 每章一个PDF（ZIP）', 'Whole course · one PDF per chapter (ZIP)')}
        </label>)}
      </fieldset>
      {scope === 'chapter' && <label>{t('章节', 'Chapter')}<select aria-label={t('导出章节', 'Chapter to export')} value={chapter}
        onChange={event => { setChapter(Number(event.target.value)); setStarted(false); }}>
        {loaded.files.chapters.map(item => <option key={item.number} value={item.number}>{item.label} · {item.title} ({item.pages}{t('页', ' pages')})</option>)}
      </select></label>}
      <p>{selection!.pages} {t('页', 'pages')} · {(selection!.file.bytes / 1024 / 1024).toFixed(1)} MB
        {scope === 'chapters' && ` · ${loaded.files.chapters.length} ${t('个PDF', 'PDFs')}`}</p>
      <a className="course-pdf-export__download" href={selection!.file.url} download={selection!.filename} onClick={event => {
        if (started) { event.preventDefault(); return; }
        setStarted(true);
      }} aria-disabled={started}><Download size={18}/>{started ? t('已开始下载', 'Download started') : t('下载', 'Download')}</a>
      {started && <button type="button" onClick={() => setStarted(false)}>{t('重新下载', 'Download again')}</button>}
      <small>{t('包含当前已发布的课件。PDF保留静态画面；动画、视频和交互请在在线课件中使用。', 'Includes the published slides. PDFs contain static views; use the online slides for animation, video and interaction.')}</small>
    </>}
  </div>;
}
