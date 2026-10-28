import {useLayoutEffect,useState,type RefObject} from 'react';

export interface TourRect {left:number;top:number;width:number;height:number}
export function placeTourCard(target:TourRect|null,width:number,height:number,cardWidth:number,cardHeight:number){
  const margin=12,gap=20,w=Math.min(cardWidth,width-margin*2),h=Math.min(cardHeight,height-margin*2);
  if(!target)return {left:Math.max(margin,(width-w)/2),top:Math.max(margin,(height-h)/2),width:w};
  const candidates=[
    {left:target.left+target.width+gap,top:target.top+(target.height-h)/2},
    {left:target.left-w-gap,top:target.top+(target.height-h)/2},
    {left:target.left+(target.width-w)/2,top:target.top+target.height+gap},
    {left:target.left+(target.width-w)/2,top:target.top-h-gap},
  ].map(p=>({left:Math.max(margin,Math.min(width-w-margin,p.left)),top:Math.max(margin,Math.min(height-h-margin,p.top)),width:w}));
  const overlap=(p:typeof candidates[number])=>Math.max(0,Math.min(p.left+w,target.left+target.width+8)-Math.max(p.left,target.left-8))*Math.max(0,Math.min(p.top+h,target.top+target.height+8)-Math.max(p.top,target.top-8));
  return candidates.find(p=>overlap(p)===0)??candidates.sort((a,b)=>overlap(a)-overlap(b))[0]!;
}
const safeSelector='[data-enterprise-tour-ui],button[aria-label*="全屏"]';
const focusable='button,input,select,textarea,a[href],summary,[tabindex]';
const same=(a:TourRect|null,b:TourRect|null)=>a===b||!!a&&!!b&&(['left','top','width','height'] as const).every(k=>Math.abs(a[k]-b[k])<.5);
export function useEnterpriseTourLock({rootRef,selector,enabled,blocked,replay,onObserve,onBlocked}:{rootRef:RefObject<HTMLElement|null>;selector?:string;enabled:boolean;blocked:boolean;replay:number;onObserve?:()=>void;onBlocked:()=>void}){
  const [rect,setRect]=useState<TourRect|null>(null),[bounds,setBounds]=useState({width:1280,height:720});
  useLayoutEffect(()=>{
    const root=rootRef.current;if(!root||!enabled){setRect(null);return;}
    const locked=new Map<HTMLElement,boolean>();let target:HTMLElement|null=null,described:string|null=null,raf=0,observeTimer=0;
    root.dataset.tourActive='true';
    const permitted=(node:EventTarget|null)=>node instanceof Element&&(!!node.closest(safeSelector)||!blocked&&!!target&&(node===target||target.contains(node)));
    const synchronize=()=>{
      raf=0;const next=selector?root.querySelector<HTMLElement>(selector):null;
      if(next!==target){
        if(target){target.classList.remove('enterprise-tour-target');delete target.dataset.teachingHighlight;if(described===null)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',described);}
        target=next;
        if(target){
          for(let parent=target.parentElement;parent&&parent!==root;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;
          described=target.getAttribute('aria-describedby');target.setAttribute('aria-describedby',((described??'')+' enterprise-tour-instruction').trim());
        }
      }
      // A resize or fullscreen change can hide the same field without changing
      // its identity. Keep the active control inside its real scroll window.
      if(target){
        const scroller=target.closest<HTMLElement>('.enterprise-game-window__body');
        if(scroller){
          const r=target.getBoundingClientRect(),s=scroller.getBoundingClientRect(),b=root.getBoundingClientRect();
          const top=Math.max(s.top,b.top)+10,bottom=Math.min(s.bottom,b.bottom)-10;
          if(r.top<top||r.bottom>bottom)scroller.scrollTo({top:Math.max(0,scroller.scrollTop+r.top-top-(bottom-top-r.height)/2),behavior:'instant'});
        }
      }
      for(const el of root.querySelectorAll<HTMLElement>(focusable)){
        if(!locked.has(el))locked.set(el,el.inert);
        const allow=!!el.closest(safeSelector)||!blocked&&!!target&&(el===target||target.contains(el)||el.contains(target));
        el.inert=allow?locked.get(el)!:true;
        if(allow)delete el.dataset.tourLocked;else el.dataset.tourLocked='true';
      }
      const box=root.getBoundingClientRect();setBounds(old=>old.width===box.width&&old.height===box.height?old:{width:box.width,height:box.height});
      if(target&&target.getClientRects().length){
        target.classList.toggle('enterprise-tour-target',!blocked);target.dataset.teachingHighlight=String(!blocked);
        const r=target.getBoundingClientRect(),pad=7;
        const left=Math.max(0,r.left-box.left-pad),top=Math.max(0,r.top-box.top-pad);
        const nextRect={left,top,width:Math.max(0,Math.min(box.width,r.right-box.left+pad)-left),height:Math.max(0,Math.min(box.height,r.bottom-box.top+pad)-top)};
        setRect(old=>same(old,nextRect)?old:nextRect);
        if(!blocked&&!permitted(document.activeElement))target.focus({preventScroll:true});
      }else setRect(old=>old===null?old:null);
    };
    const queue=()=>{if(!raf)raf=requestAnimationFrame(synchronize);};
    const stop=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation();};
    const capture=(e:Event)=>{
      if(permitted(e.target)){
        if(e.type==='click'&&onObserve&&target&&(e.target===target||target.contains(e.target as Node))&&!blocked){clearTimeout(observeTimer);observeTimer=window.setTimeout(onObserve,0);}
        return;
      }
      stop(e);if(e.type==='click'||e.type==='pointerdown')onBlocked();
    };
    const submission=(e:Event)=>{
      const submitter=(e as SubmitEvent).submitter;
      if(!blocked&&target&&submitter===target&&target.matches('button[type="submit"]'))return;
      stop(e);onBlocked();
    };
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){
        // Let Escape close a native select or native fullscreen; keep the business window in place.
        e.stopImmediatePropagation();if(!document.fullscreenElement&&!(e.target instanceof HTMLSelectElement))e.preventDefault();return;
      }
      if(e.key==='Tab'){
        const choices=[...root.querySelectorAll<HTMLElement>(focusable)].filter(el=>!el.inert&&!el.matches(':disabled')&&el.getClientRects().length>0);
        if(!choices.length){stop(e);return;}
        e.preventDefault();e.stopImmediatePropagation();
        const index=choices.indexOf(document.activeElement as HTMLElement),next=e.shiftKey?(index<=0?choices.length-1:index-1):(index+1)%choices.length;
        choices[next]!.focus({preventScroll:true});return;
      }
      if(!permitted(e.target))stop(e);
    };
    const focus=(e:FocusEvent)=>{if(!permitted(e.target)){e.stopImmediatePropagation();const dest=!blocked&&target?target:root.querySelector<HTMLElement>('[data-tour-exit]');dest?.focus({preventScroll:true});}};
    const observer=new MutationObserver(queue);observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['open','disabled']});
    const resize=new ResizeObserver(queue);resize.observe(root);
    for(const name of ['pointerdown','click','dblclick','contextmenu','wheel','touchstart'] as const)document.addEventListener(name,capture,{capture:true,passive:false});
    document.addEventListener('submit',submission,true);document.addEventListener('keydown',key,true);document.addEventListener('focusin',focus,true);
    window.addEventListener('resize',queue);document.addEventListener('scroll',queue,true);synchronize();
    return()=>{
      cancelAnimationFrame(raf);clearTimeout(observeTimer);observer.disconnect();resize.disconnect();
      for(const name of ['pointerdown','click','dblclick','contextmenu','wheel','touchstart'] as const)document.removeEventListener(name,capture,true);
      document.removeEventListener('submit',submission,true);document.removeEventListener('keydown',key,true);document.removeEventListener('focusin',focus,true);window.removeEventListener('resize',queue);document.removeEventListener('scroll',queue,true);
      for(const [el,inert]of locked){el.inert=inert;delete el.dataset.tourLocked;}
      if(target){target.classList.remove('enterprise-tour-target');delete target.dataset.teachingHighlight;if(described===null)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',described);}
      delete root.dataset.tourActive;
    };
  },[rootRef,selector,enabled,blocked,replay,onObserve,onBlocked]);
  return {rect,bounds};
}
