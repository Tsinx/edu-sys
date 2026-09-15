import assert from 'node:assert/strict';
import test from 'node:test';
import { lessonFourExperimentUrl, lessonFourReturnPath } from '../src/features/port-lesson-four/experiment-navigation';

test('four lecture entries open corresponding standalone experiments with the original teaching page', () => {
  for (const unit of ['arrival', 'cargo', 'yard', 'departure'] as const) {
    const returnTo = '/port-lesson-four-preview.html?page=19&channel=teacher';
    const url = new URL(lessonFourExperimentUrl(`l4-${unit}`, returnTo, 'class-a'), 'https://example.com');
    assert.equal(url.pathname, '/simulations');
    assert.equal(url.searchParams.get('course'), unit);
    assert.equal(url.searchParams.get('demo'), '1');
    assert.equal(url.searchParams.get('returnTo'), returnTo);
  }
});

test('experiment return links accept teaching pages and reject external or unrelated destinations', () => {
  assert.equal(lessonFourReturnPath('/classroom/session-a'), '/classroom/session-a');
  for (const value of ['https://example.com', '//example.com', '/\\example.com', '/settings', '/classroom/../settings', 'javascript:alert(1)', null]) {
    assert.equal(lessonFourReturnPath(value), null);
  }
});
