import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {InternationalMathematicsStage} from '../../apps/teacher-web/src/features/international-mathematics/InternationalMathematicsStage';
import {INTERNATIONAL_MATHEMATICS_SLIDES as slides,INTERNATIONAL_MATHEMATICS_LESSONS as lessons,INTERNATIONAL_MATHEMATICS_DECK_ID as deckId,INTERNATIONAL_MATHEMATICS_VERSION_ID as versionId,getInternationalMathematicsInteractionDefaults} from '@edu/course-content/international-mathematics';
import type {SlideInteractionValues} from '@edu/contracts';
import './style.css';

// Isolated QA transport: public snapshots are shared between two actual browser
// pages. API authorization and persistence are covered by API integration tests.
const mode=new URLSearchParams(location.search).get('mode')==='teacher'?'teacher':'student';
const nativeNow=()=>performance.timeOrigin+performance.now();
const channel=new BroadcastChannel('international-mathematics-sync-qa');
let snapshot={index:1,values:{...getInternationalMathematicsInteractionDefaults(slides[0]!.slideKey)},revision:0,serverNowMs:Math.round(nativeNow())};
const listeners=new Set<()=>void>();
function deliver(){for(const listener of listeners)listener();}
function publish(patch:SlideInteractionValues={},index=snapshot.index){snapshot={index,values:index===snapshot.index?{...snapshot.values,...patch}:{...getInternationalMathematicsInteractionDefaults(slides[index-1]!.slideKey),...patch},revision:snapshot.revision+1,serverNowMs:Math.round(nativeNow())};if('anchorMs' in patch)snapshot.values.anchorMs=snapshot.serverNowMs;deliver();channel.postMessage({kind:'snapshot',snapshot});}
channel.onmessage=event=>{if(event.data.kind==='request'&&mode==='teacher'){snapshot={...snapshot,serverNowMs:Math.round(nativeNow())};channel.postMessage({kind:'snapshot',snapshot});}if(event.data.kind==='snapshot'&&mode==='student'){snapshot=event.data.snapshot;deliver();}};
(window as any).imSyncQA={get:()=>snapshot,patch:publish,go:(index:number)=>publish({},index),reenter:()=>{(window as any).imSyncQA.mount(false);setTimeout(()=>{(window as any).imSyncQA.mount(true);channel.postMessage({kind:'request'});},30);},lessons,definitions:slides.map(s=>({index:s.index,slideKey:s.slideKey,teachingCue:s.teachingCue,assistantCue:s.assistantCue,answer:s.answer,teacherGuide:(s as any).teacherGuide}))};
function Harness(){const [,render]=useState(0),[mounted,setMounted]=useState(true);(window as any).imSyncQA.mount=setMounted;useEffect(()=>{const listener=()=>render(n=>n+1);listeners.add(listener);channel.postMessage({kind:'request'});return()=>{listeners.delete(listener);};},[]);const spec=slides[snapshot.index-1]!;const frame={deckId,versionId,slideId:spec.slideKey,index:snapshot.index,total:slides.length,logicalWidth:1600 as const,logicalHeight:1000 as const,aspectRatio:'16:10' as const,title:spec.title,lessonNumber:spec.lesson,lessonTitle:spec.lessonTitle,section:spec.kicker,summary:spec.question??spec.title};return <main>{mounted&&<InternationalMathematicsStage key={spec.slideKey} frame={frame} interaction={{deckId,slideId:spec.slideKey,revision:Math.max(1,snapshot.revision),values:snapshot.values}} readOnly={mode==='student'} playbackMode={mode} serverNowMs={snapshot.serverNowMs} onNavigate={mode==='teacher'?index=>publish({},index):undefined} onInteractionPatch={patch=>publish(patch)} onInteractionReset={()=>publish({...getInternationalMathematicsInteractionDefaults(spec.slideKey)})}/>}</main>;}
createRoot(document.getElementById('root')!).render(<Harness/>);
