/** Authored page definitions. Text is written and reviewed here, never imported from the audit corpus. */
export const p=(page,title,layout,text,options={})=>({page,title,layout,parts:(Array.isArray(text)?text:[text]).map(part=>part.split('\n').map(s=>s.trim()).filter(Boolean)),...options});
export const table=(headers,rows)=>({headers,rows});
