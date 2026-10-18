import assert from 'node:assert/strict';
import test from 'node:test';
import type { SlideFrame } from '@edu/contracts';
import { COURSE_DECKS, getCourseDeckByCourseId } from '@edu/course-content/deck-registry';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { classroomDeckIssue, classroomSlidePosition } from '../src/features/classroom/classroom-slide-position';
import { ClassroomDeckNotice } from '../src/features/classroom/ClassroomDeckNotice';
import { studentFrame } from '../src/features/classroom/student-navigation';

test('every published page resolves only against its own course registry', () => {
  for (const deck of COURSE_DECKS) {
    for (const lesson of deck.lessons.filter(lesson => lesson.status === 'ready')) {
      for (let index = lesson.slideStart!; index <= lesson.slideEnd!; index++) {
        const frame = studentFrame(deck, index);
        const position = classroomSlidePosition(deck.courseId, frame, deck);
        assert.ok(position, `${deck.courseId}:${index}`);
        assert.equal(position.globalIndex, index);
        assert.equal(position.lessonNumber, lesson.number);
      }
    }
  }
});

test('the reported v15 page 550 and in-range stale identities cannot become new lesson pages', () => {
  const deck = getCourseDeckByCourseId('course-port-management-intro')!;
  const frame = studentFrame(deck, deck.lessons.find(lesson => lesson.number === 12)!.slideStart!);
  const old = { ...frame, index: 550, total: 581, slideId: 'l12-dangerous-cargo', versionId: 'release-port-management-performance-safety-v15' };
  for (const invalid of [old, { ...old, index: 500 }, { ...frame, index: 99999 }, { ...frame, index: NaN }, { ...frame, index: 0 }, { ...frame, slideId: 'removed-page' }, { ...frame, lessonNumber: 11 }, { ...frame, deckId: 'foreign-deck' }, { ...frame, index: frame.index + 1 }]) {
    assert.equal(classroomSlidePosition(deck.courseId, invalid as SlideFrame, deck), null);
  }
  assert.equal(classroomSlidePosition(deck.courseId, frame, undefined), null);
  assert.equal(classroomSlidePosition('course-economic-mathematics', frame, deck), null);
  assert.equal(classroomSlidePosition(deck.courseId, frame, getCourseDeckByCourseId('statistical-analysis')), null);
  // A late old response must not poison the next valid render.
  for (let i = 0; i < 50; i++) {
    assert.equal(classroomSlidePosition(deck.courseId, old, deck), null);
    assert.equal(classroomSlidePosition(deck.courseId, frame, deck)?.localIndex, 1);
  }
});

test('version recovery is visible, has reload and return controls, and exposes no replacement slide', () => {
  const html = renderToStaticMarkup(<MemoryRouter><ClassroomDeckNotice courseId="course-port-management-intro" /></MemoryRouter>);
  assert.match(html, /role="alert"/);
  assert.match(html, /课堂课件需要重新同步/);
  assert.match(html, /重新加载课堂/);
  assert.match(html, /href="\/courses\/course-port-management-intro"/);
  assert.doesNotMatch(html, /1600|slide-canvas|teachingCue|assistantCue/);
});

test('recognized archived economics releases have a separate recovery path; unfamiliar versions still reload', () => {
  const deck = getCourseDeckByCourseId('course-economic-mathematics')!;
  const current = studentFrame(deck, deck.lessons.find(lesson => lesson.number === 4)!.slideStart!);
  const old = { ...current, deckId: 'deck-economic-mathematics-2026-limits-reinforcement',
    versionId: 'release-economic-mathematics-limits-reinforcement-2026-10-13', slideId: 'em-l04-limits-reinforcement-20261013-p016', index: 200, total: 560 };
  assert.equal(classroomSlidePosition(deck.courseId, old, deck), null);
  assert.equal(classroomDeckIssue(deck.courseId, old, deck), 'archived');
  for (const versionId of [deck.versionId, 'release-from-an-unfamiliar-server'])
    assert.equal(classroomDeckIssue(deck.courseId, { ...old, versionId }, deck), 'sync');
  assert.equal(classroomDeckIssue(deck.courseId, old, undefined), 'sync');
  assert.equal(classroomDeckIssue('course-port-management-intro', old, deck), 'sync');
  const html = renderToStaticMarkup(<MemoryRouter><ClassroomDeckNotice courseId={deck.courseId} issue="archived" lessonNumber={4} onStartNew={() => {}} /></MemoryRouter>);
  assert.match(html, /此课堂使用的课件已归档/);
  assert.match(html, /从第4讲首页开始/);
  assert.match(html, /使用新版新建课堂/);
  assert.doesNotMatch(html, /重新加载课堂|1600|slide-canvas/);
  const student = renderToStaticMarkup(<MemoryRouter><ClassroomDeckNotice courseId={deck.courseId} issue="archived" student onStartNew={() => {}} /></MemoryRouter>);
  assert.match(student, /老师提供的新课堂链接/);
  assert.match(student, /href="\/study\/course-economic-mathematics"/);
  assert.doesNotMatch(student, /新建课堂|重新加载课堂|\/courses\//);
  const english = renderToStaticMarkup(<MemoryRouter><ClassroomDeckNotice courseId={deck.courseId} issue="archived" english lessonNumber={4} busy onStartNew={() => {}} /></MemoryRouter>);
  assert.match(english, /archived slides/);
  assert.match(english, /beginning of Lecture 4/);
  assert.match(english, /disabled=""/);
});
