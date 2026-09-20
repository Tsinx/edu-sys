// Server / teacher endpoint only. Never import this module in a student renderer.
import mappings from './source-map.private.json' with {type:'json'};
import dispositions from './source-dispositions.private.json' with {type:'json'};
export interface CourseSourceMapping {
  slideKey:string; index:number; lessonNumber:number; documentId:string; originalFile:string;
  sha256:string; originalPage:number; splitIndex:number; splitTotal:number; modifications:string[];
  teachingCue:string; assistantCue:string; originalNotes:unknown; originalAnimation:unknown;
  disposition?:'independent'|'shared';
}
export const MANAGEMENT_SOURCE_MAP = mappings as CourseSourceMapping[];
export interface CourseSourceDisposition {
  documentId:string; originalFile:string; sha256:string; lessonNumber:number; originalPage:number;
  disposition:'independent'|'shared'|'omitted'; targets:{slideKey:string;index:number}[]; reason:string;
  originalNotes:unknown; originalAnimation:unknown;
}
// Earlier phases had one independent conversion per original page.
const previous = [...new Map(MANAGEMENT_SOURCE_MAP.filter(m=>m.lessonNumber>=1&&m.lessonNumber<=8).map(m=>[`${m.documentId}:${m.originalPage}`,m])).values()].map(m=>({
  documentId:m.documentId,originalFile:m.originalFile,sha256:m.sha256,lessonNumber:m.lessonNumber,originalPage:m.originalPage,
  disposition:'independent' as const,targets:MANAGEMENT_SOURCE_MAP.filter(p=>p.documentId===m.documentId&&p.originalPage===m.originalPage).map(p=>({slideKey:p.slideKey,index:p.index})),
  reason:m.modifications.join(' '),originalNotes:m.originalNotes,originalAnimation:m.originalAnimation
}));
export const MANAGEMENT_SOURCE_DISPOSITIONS:CourseSourceDisposition[]=[...previous,...dispositions as CourseSourceDisposition[]];
