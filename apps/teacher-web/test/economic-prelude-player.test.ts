import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('../public/course-assets/economic-mathematics/prelude/course-data.js');
const source = fs.readFileSync(new URL('../public/course-assets/economic-mathematics/prelude/course-player.js', import.meta.url), 'utf8');
const key = 'economic-mathematics-prelude-progress';
type Snapshot = { index: number; pageId: string; step: number };
type Player = { getSnapshot: () => Snapshot; subscribe: (listener: () => void) => () => void; go: (index: number) => void; setStep: (step: number) => void; resetPage: () => void; restart: () => void };
function mount(search = '', saved = '') {
  const store = new Map([[key, saved]]), events = new EventTarget();
  let writes = 0;
  const elements = new Map<string, object>();
  for (const id of ['projector', 'stage', 'stage-holder', 'notice']) elements.set(id, { style: {}, clientWidth: 1280, clientHeight: 612, textContent: '', querySelector: () => null, replaceChildren: () => {} });
  const window = Object.assign(events, { EconomicPrelude: data, EconomicPreludeSlides: { renderPage: () => ({}) }, EconomicPreludePlayer: undefined as Player | undefined });
  vm.runInNewContext(source, {
    window, document: { getElementById: (id: string) => elements.get(id), addEventListener: events.addEventListener.bind(events), hidden: false },
    localStorage: { getItem: (name: string) => store.get(name) ?? null, setItem: (name: string, value: string) => { store.set(name, value); writes++; } },
    location: { search, pathname: '/course-assets/economic-mathematics/prelude/index.html' }, history: { replaceState() {} },
    URLSearchParams, Event, CustomEvent, Element: class {}, ResizeObserver: class { observe() {} }, addEventListener: events.addEventListener.bind(events)
  });
  return { player: window.EconomicPreludePlayer!, store, writes: () => writes };
}
test('the shared controls preserve per-page public steps and restart the same progress version', () => {
  const mounted = mount('?page=36'), player = mounted.player;
  let notified = 0;
  const unsubscribe = player.subscribe(() => notified++);
  player.setStep(1);
  player.go(36); player.go(35);
  assert.equal(player.getSnapshot().step, 1);
  assert.equal(player.getSnapshot().pageId, data.pages[35].id);
  player.setStep(NaN);
  assert.equal(player.getSnapshot().step, 0);
  const persisted = JSON.parse(mounted.store.get(key)!);
  assert.equal(persisted.index, 35); assert.equal(persisted.steps[35], 0); assert.equal(persisted.version, data.version);
  assert.equal(notified, 4);
  unsubscribe(); player.restart();
  assert.equal(notified, 4); assert.equal(player.getSnapshot().index, 0);
  assert.ok(JSON.parse(mounted.store.get(key)!).steps.every((step: number) => step === 0));
});
test('reviewing layout never overwrites the teacher saved position or reveal history', () => {
  const saved = JSON.stringify({ version: data.version, index: 35, steps: data.pages.map(() => 0), filmTime: 12 });
  const mounted = mount('?page=36&review=1', saved);
  mounted.player.setStep(2); mounted.player.go(39); mounted.player.restart();
  assert.equal(mounted.writes(), 0); assert.equal(mounted.store.get(key), saved);
});
