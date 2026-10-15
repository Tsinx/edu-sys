/** Keep scene drags inside the canvas. A right drag never becomes a context action. */
export function ownScenePointers(canvas:HTMLElement, pan:(dx:number,dy:number)=>void, context?:(x:number,y:number)=>void) {
  let right:{id:number;x:number;y:number;startX:number;startY:number;moved:boolean}|null=null;
  let suppressUntil=0;
  const consume=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation();};
  const down=(e:PointerEvent)=>{if(e.button!==2)return;consume(e);right={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);};
  const move=(e:PointerEvent)=>{if(!right||right.id!==e.pointerId)return;consume(e);if(Math.hypot(e.clientX-right.startX,e.clientY-right.startY)>=5)right.moved=true;if(right.moved)pan(e.clientX-right.x,e.clientY-right.y);right.x=e.clientX;right.y=e.clientY;};
  const up=(e:PointerEvent)=>{if(!right||right.id!==e.pointerId)return;consume(e);if(right.moved)suppressUntil=performance.now()+700;right=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  const cancel=(e:PointerEvent)=>{if(right?.id===e.pointerId){right=null;suppressUntil=performance.now()+700;}};
  const menu=(e:MouseEvent)=>{consume(e);if(!right?.moved&&performance.now()>suppressUntil)context?.(e.clientX,e.clientY);};
  const mouse=(e:MouseEvent)=>{if(e.button===2||e.buttons&2)consume(e);};
  const drag=(e:DragEvent)=>consume(e);
  canvas.style.touchAction='none';canvas.style.overscrollBehavior='contain';canvas.style.userSelect='none';canvas.setAttribute('draggable','false');
  canvas.addEventListener('pointerdown',down,{capture:true,passive:false});canvas.addEventListener('pointermove',move,{capture:true,passive:false});canvas.addEventListener('pointerup',up,{capture:true,passive:false});canvas.addEventListener('pointercancel',cancel,true);canvas.addEventListener('lostpointercapture',cancel,true);canvas.addEventListener('contextmenu',menu,{capture:true,passive:false});
  canvas.addEventListener('mousedown',mouse,{capture:true,passive:false});canvas.addEventListener('mouseup',mouse,{capture:true,passive:false});canvas.addEventListener('auxclick',mouse,{capture:true,passive:false});canvas.addEventListener('dragstart',drag,true);
  return()=>{canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',up,true);canvas.removeEventListener('pointercancel',cancel,true);canvas.removeEventListener('lostpointercapture',cancel,true);canvas.removeEventListener('contextmenu',menu,true);canvas.removeEventListener('mousedown',mouse,true);canvas.removeEventListener('mouseup',mouse,true);canvas.removeEventListener('auxclick',mouse,true);canvas.removeEventListener('dragstart',drag,true);};
}
