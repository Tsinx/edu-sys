import type { LessonFivePlan } from '@edu/course-content';
export function lessonFiveReturnPath(value:string|null):string|null {
 if(!value?.startsWith('/')||value.startsWith('//'))return null;
 const url=new URL(value,'https://classroom.invalid');
 return url.origin==='https://classroom.invalid'&&(url.pathname==='/port-lesson-five-preview.html'||/^\/(classroom|join|study)\/[^/]+$/.test(url.pathname))?url.pathname+url.search:null;
}
export function lessonFiveExperimentUrl(plan:LessonFivePlan,returnTo:string,scope:string,personal=false) {
 const query=new URLSearchParams({runId:crypto.randomUUID(),experiment:'l5-capacity',plan:personal?'C':plan,purpose:personal?'personal':'demonstration',scope});
 const session=/^\/(?:classroom|join)\/([^/?]+)/.exec(returnTo)?.[1];if(session)query.set('session',decodeURIComponent(session));
 const destination=lessonFiveReturnPath(returnTo);if(destination)query.set('returnTo',destination);
 return '/simulations?'+query.toString();
}
