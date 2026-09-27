import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadPureModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}
const { validateProposal, stopFingerprint, parseReview, dayInZone, timeInZone, dayBoundsInZone } = await loadPureModule('../lib/aiReview.ts');
const { forecastForDay } = await loadPureModule('../lib/weather.ts');
const a = { id: 'a', itinerary_id: 'trip', stop_order: 1, name: 'Museum', start_time: '2026-09-26T09:00:00Z', end_time: '2026-09-26T10:00:00Z', latitude: 1, longitude: 2, description: null, google_maps_url: null, image_url: null, created_at: '' };
const b = { ...a, id: 'b', name: 'Lunch', start_time: '2026-09-26T12:00:00Z', end_time: '2026-09-26T13:00:00Z' };
const bounds = { dayStart: '2026-09-26T00:00:00Z', dayEnd: '2026-09-27T00:00:00Z', lockedIds: [] };
const proposal = { id: 'p', title: 'Start later', reason: 'Leave a slower morning', kind: 'reschedule', stopId: 'a', candidateId: '', start: '2026-09-26T10:00:00Z', end: '2026-09-26T11:00:00Z' };

test('a standalone valid reschedule is accepted; locked and overlapping changes are rejected', () => {
  assert.equal(validateProposal(proposal, [a, b], [], bounds), null);
  assert.match(validateProposal(proposal, [a, b], [], { ...bounds, lockedIds: ['a'] }), /locked/);
  assert.match(validateProposal({ ...proposal, end: '2026-09-26T12:30:00Z' }, [a, b], [], bounds), /overlaps/);
});
test('invalid, overnight and unchanged times cannot be applied', () => {
  assert.match(validateProposal({ ...proposal, start: 'tomorrow' }, [a], [], bounds), /invalid/);
  assert.match(validateProposal({ ...proposal, end: '2026-09-28T11:00:00Z' }, [a], [], bounds), /within this day/);
  assert.match(validateProposal({ ...proposal, start: a.start_time, end: a.end_time }, [a], [], bounds), /unchanged/);
  assert.match(validateProposal(proposal, [{ ...a, start_time: '2026-09-25T23:00:00Z' }], [], bounds), /Overnight/);
});
test('AI additions must reference a searched place and its exact feasible slot', () => {
  const candidate = { id: 'place', name: 'Garden', latitude: 1, longitude: 2, start: proposal.start, end: proposal.end, category: 'park', hours: null };
  const add = { ...proposal, kind: 'add', stopId: '', candidateId: 'place' };
  assert.equal(validateProposal(add, [a, b], [candidate], bounds), null);
  assert.match(validateProposal(add, [a, b], [], bounds), /verified search/);
  assert.match(validateProposal({ ...add, end: '2026-09-26T11:30:00Z' }, [a, b], [candidate], bounds), /time slot/);
  assert.match(validateProposal(add, [a, b, { ...a, id: 'c', name: 'Garden' }], [candidate], bounds), /already/);
});
test('revision check ignores ordering but detects collaborator edits and deletions', () => {
  assert.equal(stopFingerprint([a, b]), stopFingerprint([b, a]));
  assert.notEqual(stopFingerprint([a, b]), stopFingerprint([a, { ...b, description: 'Reservation' }]));
  assert.notEqual(stopFingerprint([a, b]), stopFingerprint([a]));
});
test('remaining suggestions are checked against previously accepted changes', () => {
  const saved = { ...a, start_time: proposal.start, end_time: proposal.end };
  const updated = [saved, b];
  const locked = { ...bounds, lockedIds: [a.id] };
  const laterLunch = { ...proposal, stopId: b.id, start: '2026-09-26T13:00:00Z', end: '2026-09-26T14:00:00Z' };
  assert.equal(validateProposal(laterLunch, updated, [], locked), null);
  assert.match(validateProposal({ ...laterLunch, start: '2026-09-26T10:30:00Z', end: '2026-09-26T11:30:00Z' }, updated, [], locked), /overlaps/);
  assert.match(validateProposal({ ...proposal, start: '2026-09-26T08:00:00Z', end: '2026-09-26T09:00:00Z' }, updated, [], locked), /locked/);
});
test('model output must match the executable contract', () => {
  assert.equal(parseReview({ summary: 'A good day', observations: [], proposals: [proposal] }).proposals.length, 1);
  assert.throws(() => parseReview({ summary: 'Oops', observations: [], proposals: [{ ...proposal, kind: 'delete' }] }));
  assert.throws(() => parseReview({ summary: 'Oops', observations: [], proposals: Array(4).fill(proposal) }));
});
test('local forecast date follows the destination timezone across midnight', () => {
  assert.equal(dayInZone('2026-09-26T01:00:00Z', 'America/Toronto'), '2026-09-25');
  assert.equal(dayInZone('2026-09-26T23:30:00Z', 'Asia/Tokyo'), '2026-09-27');
});
test('destination-local times and day bounds honor the city timezone and daylight saving changes', () => {
  assert.equal(timeInZone('2026-09-26', 'Europe/Rome', 8), '2026-09-26T06:00:00.000Z');
  const spring = dayBoundsInZone('2026-03-08', 'America/Toronto');
  const fall = dayBoundsInZone('2026-11-01', 'America/Toronto');
  assert.equal(Date.parse(spring.dayEnd) - Date.parse(spring.dayStart), 23 * 60 * 60_000);
  assert.equal(Date.parse(fall.dayEnd) - Date.parse(fall.dayStart), 25 * 60 * 60_000);
});
const forecast = { timezone: 'Europe/Lisbon', daily: { time: ['2026-09-26'], weather_code: [0], temperature_2m_max: [24], temperature_2m_min: [16], precipitation_probability_max: [0] } };
test('forecast preserves clear skies and zero rainfall instead of treating them as missing', () => {
  const day = forecastForDay(forecast, '2026-09-26', '2026-09-26');
  assert.equal(day.description, 'Clear sky'); assert.equal(day.rainChance, 0); assert.equal(day.high, 24);
});
test('out-of-range, past and missing forecast data are not fabricated', () => {
  assert.equal(forecastForDay(forecast, '2026-12-26', '2026-09-26').status, 'unavailable');
  assert.equal(forecastForDay(forecast, '2026-09-25', '2026-09-26').status, 'past');
  assert.equal(forecastForDay({ ...forecast, daily: { ...forecast.daily, temperature_2m_max: [null] } }, '2026-09-26', '2026-09-26').status, 'unavailable');
  assert.throws(() => forecastForDay({}, '2026-09-26', '2026-09-26'));
});

const { reviewGaps, requestedCategories } = await loadPureModule('../lib/reviewDiscovery.ts');
test('single activity discovers free time before and after, with only real travel anchors', () => {
  const stop = { ...a, start_time: new Date('2026-09-27T12:00:00').toISOString(), end_time: new Date('2026-09-27T13:00:00').toISOString() };
  const gaps = reviewGaps([stop], '2026-09-27');
  assert.equal(gaps.length, 2);
  assert.ok(gaps.some(g => g.openStart && g.end === stop.start_time));
  assert.ok(gaps.some(g => g.openEnd && g.start === stop.end_time));
  assert.deepEqual(requestedCategories('add a shopping mall closeby, and any historic place as well in the day'), ['shopping', 'history']);
});
test('discovery never searches occupied time, including nested overlaps', () => {
  const at = h => new Date(`2026-09-27T${h}:00:00`).toISOString();
  const stops = [{ ...a, start_time: at('09'), end_time: at('15') }, { ...a, id: 'b', start_time: at('10'), end_time: at('11') }, { ...a, id: 'c', start_time: at('13'), end_time: at('14') }];
  for (const gap of reviewGaps(stops, '2026-09-27')) {
    for (const stop of stops) assert.ok(Date.parse(gap.end) <= Date.parse(stop.start_time) || Date.parse(gap.start) >= Date.parse(stop.end_time));
  }
  assert.deepEqual(reviewGaps([], '2026-09-27'), []);
  assert.deepEqual(reviewGaps([{ ...stops[0], latitude: null }], '2026-09-27'), []);
});
