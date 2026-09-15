import { getPortLessonFourDemo, type PortDemoCueId } from '@edu/course-content';

/** Only teaching pages on this origin may be used as a return destination. */
export function lessonFourReturnPath(value: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//')) return null;
  const url = new URL(value, 'https://classroom.invalid');
  if (url.origin !== 'https://classroom.invalid') return null;
  return url.pathname === '/port-lesson-four-preview.html' || /^\/classroom\/[^/]+$/.test(url.pathname)
    ? url.pathname + url.search : null;
}

export function lessonFourExperimentUrl(cueId: PortDemoCueId, returnTo: string, scope: string): string {
  const cue = getPortLessonFourDemo(cueId);
  if (!cue) throw new Error('未知实验分段');
  const query = new URLSearchParams({course: cue.unit, demo: '1', lesson4: cueId, scope});
  const destination = lessonFourReturnPath(returnTo);
  if (destination) query.set('returnTo', destination);
  return '/simulations?' + query.toString();
}
