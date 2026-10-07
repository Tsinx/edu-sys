import type {Ink, PlotSpec, SlideElement, SourceReference, LessonSlide} from './types.js';
export const source=(section:string,from:number,to:number,supplement?:string):SourceReference=>({section,printedPages:[from,to],pdfPages:[from+17,to+17],...(supplement?{supplement}:{})});
export const text=(text:string,x:number,y:number,w:number,h:number,size=34,color:Ink='ink',weight=400):SlideElement=>({kind:'text',text,x,y,w,h,size,color,weight});
export const math=(tex:string,x:number,y:number,w:number,h:number,size=46,color:Ink='blue'):SlideElement=>({kind:'math',tex,x,y,w,h,size,color});
export const art=(asset:'opening'|'case'|'module',x:number,y:number,w:number,h:number,alt:string,rotation=0):SlideElement=>({kind:'image',asset,x,y,w,h,alt,rotation});
export const shape=(color:Ink,x:number,y:number,w:number,h:number,rotation=0,form:'rect'|'circle'|'line'='rect'):SlideElement=>({kind:'shape',shape:form,color,x,y,w,h,rotation});
export const plot=(plot:PlotSpec,x:number,y:number,w:number,h:number):SlideElement=>({kind:'plot',plot,x,y,w,h});
export const table=(columns:readonly string[],rows:readonly(readonly string[])[],x:number,y:number,w:number,h:number,highlightRow?:number):SlideElement=>({kind:'table',columns,rows,x,y,w,h,...(highlightRow===undefined?{}:{highlightRow})});
export const diagram=(name:'machine'|'receipt'|'number-line'|'flow'|'balance'|'nested'|'steps',labels:readonly string[],x:number,y:number,w:number,h:number,values?:readonly string[]):SlideElement=>({kind:'diagram',name,labels,x,y,w,h,...(values?{values}:{})});
export function page(lesson:number,id:string,title:string,kicker:string,ref:SourceReference,elements:readonly SlideElement[],extras:Partial<Omit<LessonSlide,'slideKey'|'compositionId'|'title'|'kicker'|'source'|'elements'>>={}):LessonSlide{
 return {slideKey:`im-l${String(lesson).padStart(2,'0')}-${id}`,compositionId:`im-${lesson}-${id}`,title,kicker,source:ref,elements,publicLabel:'Mathematical model',teachingCue:'按本页问题推进，先检查单位和定义域，再揭示结论。',assistantCue:'Answer in clear English. Stay within single-variable calculus. Do not disclose an unrevealed answer.',...extras};
}
