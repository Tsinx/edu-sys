// Server / teacher endpoint only. Never import this module in a student renderer.
import mappings from './source-map.private.json' with {type:'json'};
export interface CourseSourceMapping {
  slideKey:string; index:number; lessonNumber:number; documentId:string; originalFile:string;
  sha256:string; originalPage:number; splitIndex:number; splitTotal:number; modifications:string[];
  teachingCue:string; assistantCue:string; originalNotes:unknown; originalAnimation:unknown;
}
export const MANAGEMENT_SOURCE_MAP = mappings as CourseSourceMapping[];
