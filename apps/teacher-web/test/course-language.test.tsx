import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {VoiceCommandComposer} from "../src/features/classroom/VoiceCommandComposer";
import {stripAuthoringMetadata} from "../campus-build";
import {EnglishReadingAssistant} from "../src/features/study/EnglishReadingAssistant";

test("campus bundles retain English public copy and strip the private teacher handbook", () => {
  const source = 'export const lesson = {title: "How fast does it change?", teacherGuide: "PRIVATE_HANDBOOK", slides: [{teachingCue: "PRIVATE_TEACHER", assistantCue: "PRIVATE_ASSISTANT", title: "Instantaneous rate"}]};';
  const publicSource = stripAuthoringMetadata(source, "international-lesson.ts");
  assert.match(publicSource, /How fast does it change/);
  assert.match(publicSource, /Instantaneous rate/);
  assert.doesNotMatch(publicSource, /PRIVATE_HANDBOOK|PRIVATE_TEACHER|PRIVATE_ASSISTANT/);
});

test("English classroom input has English controls and starts with text without Chinese wake words", () => {
  const html = renderToStaticMarkup(<VoiceCommandComposer locale="en" onCommand={async () => {}}/>);
  assert.match(html, /Ask Math Guide/);
  assert.match(html, /Text instruction/);
  assert.match(html, /Record speech/);
  assert.doesNotMatch(html, /[\p{Script=Han}]/u);
});

test("existing classrooms retain the Chinese input controls by default", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {configurable: true, value: {hidden: false}});
  let html: string;
  try {html = renderToStaticMarkup(<VoiceCommandComposer onCommand={async () => {}}/>);}
  finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
  assert.match(html, /向助教发出指令/);
  assert.match(html, /检测输入/);
  assert.match(html, /开始录音/);
  assert.doesNotMatch(html, /Ask Math Guide/);
});

test("independent mathematics assistant controls and status begin in English",()=>{
  const html=renderToStaticMarkup(<EnglishReadingAssistant courseId="course-international-mathematics" globalIndex={1} onNavigate={()=>{}}/>);
  assert.match(html,/Math Guide/);assert.match(html,/Record question/);assert.match(html,/Read answer aloud/);assert.match(html,/Your question/);assert.doesNotMatch(html,/[\p{Script=Han}]/u);
});
