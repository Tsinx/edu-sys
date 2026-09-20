export type ManagementScalar = number | string | boolean;
export type ManagementValues = Readonly<Record<string,ManagementScalar>>;
export interface ManagementTable { headers:string[]; rows:(string|number)[][] }
export interface ManagementDiagram { kind:string; items:string[]; center?:string; variant?:string; rows?:string[]; nodes?:{id:string;label:string;x:number;y:number;active?:boolean}[]; edges?:{from:string;to:string;active?:boolean}[] }
export type ManagementPhaseTwoDemo = 'rolling-plan'|'pdca-shop'|'club-design'|'span-hierarchy'|'recruitment-flow'|'candidate-evidence'|'culture-layers'|'saic-integration';
export type ManagementPhaseThreeDemo = 'situational-leadership'|'fiedler-match'|'equity-comparison'|'zhang-expectancy'|'communication-network'|'dorm-feedback'|'control-timing'|'procurement-controls'|'financial-ratios'|'quality-dmaic'|'risk-response'|'crisis-evidence'|'innovation-types'|'innovation-process'|'organization-change'|'organization-learning'|'course-allocation'|'science-practice';
export type ManagementDemo = 'efficiency'|'system'|'timeline'|'theory-lenses'|'decision-process'|'payoff-matrix'|'environment-analysis'|'decision-tree'|ManagementPhaseTwoDemo|ManagementPhaseThreeDemo;
export interface ManagementSlide {
  index:number; slideKey:string; lessonNumber:number; lessonTitle:string; section:string;
  localIndex:number; localTotal:number; title:string; summary:string; part:number; partTotal:number;
  layout:string; body:string[]; label:string; note:string; table?:ManagementTable;
  diagram?:ManagementDiagram; demo?:ManagementDemo;
  image?:{src:string;alt:string;label:string};
  referenceImage?:{src:string;alt:string;label:string};
  sources:{id:string;title:string;url:string;period:string}[];
}
