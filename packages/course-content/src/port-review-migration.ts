/** Semantic aliases prevent the former reviews from opening the new AI chapter. */
export function relocatedPortReviewKey(key:string){
 if(key.startsWith('l19-'))return 'l20-review1-'+key.slice(4);
 if(key.startsWith('l20-')&&!key.startsWith('l20-review1-'))return 'l21-review2-'+key.slice(4);
 return key;
}
export function relocatedPortReviewIndex(version:string|undefined,index:number){return version==='release-port-management-facilities-v21'&&index>=768&&index<=831?index+40:index;}
export function relocatedPortReviewClip<T extends string>(id:T):T|'l20-review-v2'|'l21-review-v2'{return id==='l19-review'?'l20-review-v2':id==='l20-review'?'l21-review-v2':id;}
