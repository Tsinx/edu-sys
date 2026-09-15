export type ManagementScalar = number | string | boolean;
export type ManagementValues = Readonly<Record<string,ManagementScalar>>;
export interface ManagementTable { headers:string[]; rows:(string|number)[][] }
export interface ManagementDiagram { kind:string; items:string[]; center?:string; variant?:string; rows?:string[] }
export type ManagementPhaseTwoDemo = 'rolling-plan'|'pdca-shop'|'club-design'|'span-hierarchy'|'recruitment-flow'|'candidate-evidence'|'culture-layers'|'saic-integration';
export type ManagementDemo = 'efficiency'|'system'|'timeline'|'theory-lenses'|'decision-process'|'payoff-matrix'|'environment-analysis'|'decision-tree'|ManagementPhaseTwoDemo;
export interface ManagementSlide {
  index:number; slideKey:string; lessonNumber:number; lessonTitle:string; section:string;
  localIndex:number; localTotal:number; title:string; summary:string; part:number; partTotal:number;
  layout:string; body:string[]; label:string; note:string; table?:ManagementTable;
  diagram?:ManagementDiagram; demo?:ManagementDemo;
  image?:{src:string;alt:string;label:string};
  referenceImage?:{src:string;alt:string;label:string};
  sources:{id:string;title:string;url:string;period:string}[];
}
