import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compile = async path => ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const code = await compile('../lib/suggestions.ts');
test('single-activity search finds later opening hours without requiring a return trip', async () => {
  const moduleFixture = { exports: {} };
  const requests = [];
  const require = id => {
    if (id === './googleMaps') return { loadGoogleLibrary: async () => ({ Place: { searchNearby: async request => {
      requests.push(request);
      return { places: [{ id: 'mall', displayName: 'Fictional mall', location: { toJSON: () => ({ lat: 1, lng: 2 }) }, regularOpeningHours: { periods: [], weekdayDescriptions: [] }, utcOffsetMinutes: 0 }] };
    } } }) };
    if (id === './routes') return { metersBetween: () => 750 };
    if (id === './openingHours') return { hoursForWeekday: () => 'Open from 10am', placeLocal: () => ({ weekday: 0 }), visitStatus: (_periods, start) => ({ kind: new Date(start).getUTCHours() >= 10 ? 'open' : 'closed' }) };
    throw Error(id);
  };
  new Function('require', 'module', 'exports', code)(require, moduleFixture, moduleFixture.exports);
  const anchor = { name: 'Existing stop', position: { lat: 1, lng: 2 } };
  const result = await moduleFixture.exports.fetchSuggestions({ start: '2026-09-27T08:00:00Z', end: '2026-09-27T11:30:00Z', from: anchor, to: anchor, openEnd: true }, 'shopping', new Set());
  assert.equal(result.length, 1);
  assert.equal(result[0].start, '2026-09-27T10:00:00.000Z');
  assert.equal(result[0].end, '2026-09-27T11:30:00.000Z');
  assert.deepEqual(requests[0].includedPrimaryTypes, ['shopping_mall']);
});
