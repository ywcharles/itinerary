import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const pureSource = await readFile(new URL('../lib/aiReview.ts', import.meta.url), 'utf8');
const pureCode = ts.transpileModule(pureSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const pure = await import(`data:text/javascript;base64,${Buffer.from(pureCode).toString('base64')}`);
const routeSource = await readFile(new URL('../app/api/itinerary-review/route.ts', import.meta.url), 'utf8');
const routeCode = ts.transpileModule(routeSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const trip = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const stopId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const stop = { id: stopId, itinerary_id: trip, stop_order: 1, name: 'Fictional museum', start_time: '2026-09-26T09:00:00Z', end_time: '2026-09-26T10:00:00Z', latitude: null, longitude: null, description: null, google_maps_url: null, image_url: null, created_at: '' };
const secondStop = { ...stop, id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Fictional park', start_time: '2026-09-26T14:00:00Z', end_time: '2026-09-26T15:00:00Z' };
const body = { itineraryId: trip, snapshot: pure.stopFingerprint([stop, secondStop]), day: '2026-09-26', dayStart: '2026-09-26T00:00:00Z', dayEnd: '2026-09-27T00:00:00Z', timeZone: 'UTC', preferences: '', lockedIds: [], candidates: [], feedback: [], evidence: {} };
const proposal = { kind: 'reschedule', title: 'Start later', reason: 'Slower morning', stopId, candidateId: '', start: '2026-09-26T10:00:00Z', end: '2026-09-26T11:00:00Z' };

function fixture(options = {}) {
  let modelCalls = 0;
  const env = { GEMINI_API_KEY: 'synthetic-test-key', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture', ...options.env };
  const testModule = { exports: {} };
  const require = (id) => {
    if (id === '@/lib/aiReview') return pure;
    if (id === '@supabase/supabase-js') return { createClient: () => ({ from: () => ({ select: () => ({ eq: async () => ({ data: options.stops ?? [stop, secondStop], error: null }) }) }) }) };
    throw new Error('Unexpected import');
  };
  const mockFetch = async (_url, init) => {
    modelCalls++;
    assert.equal(init.headers['x-goog-api-key'], 'synthetic-test-key');
    assert.ok(JSON.parse(init.body).generationConfig.responseJsonSchema);
    const status = options.statuses?.[modelCalls - 1];
    if (status) return Response.json({ error: { message: 'Provider failure' } }, { status });
    if (options.providerError) return Response.json({ error: { message: 'API key not valid. Please pass a valid API key.' } }, { status: 400 });
    return Response.json({ candidates: [{ finishReason: options.finishReason ?? 'STOP', content: { parts: [{ text: JSON.stringify(options.output ?? { summary: 'A balanced day.', observations: [], proposals: [proposal] }) }] } }] });
  };
  new Function('require', 'module', 'exports', 'process', 'fetch', routeCode)(require, testModule, testModule.exports, { env }, mockFetch);
  return { post: (changes = {}, origin) => testModule.exports.POST(new Request('http://localhost/api/itinerary-review', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify({ ...body, ...changes }) })), modelCalls: () => modelCalls };
}

test('returns validated Gemini proposals without making database writes', async () => {
  const f = fixture(); const response = await f.post();
  assert.equal(response.status, 200); assert.equal((await response.json()).proposals.length, 1); assert.equal(f.modelCalls(), 1);
});
test('stale snapshot and empty days never call Gemini', async () => {
  const stale = fixture(); assert.equal((await stale.post({ snapshot: 'old' })).status, 409); assert.equal(stale.modelCalls(), 0);
  const empty = fixture({ stops: [] }); assert.equal((await empty.post()).status, 400); assert.equal(empty.modelCalls(), 0);
});
test('locked or invented executable changes are removed from model output', async () => {
  const f = fixture(); const response = await f.post({ lockedIds: [stopId] });
  const data = await response.json(); assert.equal(data.proposals.length, 0); assert.match(data.observations[0], /omitted/);
});
test('missing keys, invalid key responses and incomplete generations have safe errors', async () => {
  assert.equal((await fixture({ env: { GEMINI_API_KEY: '' } }).post()).status, 503);
  const invalid = await fixture({ providerError: true }).post(); assert.match((await invalid.json()).error, /key is invalid/);
  const truncated = await fixture({ finishReason: 'MAX_TOKENS' }).post(); assert.equal(truncated.status, 502);
});
test('invalid input and foreign origins are rejected before Gemini calls', async () => {
  const f = fixture(); assert.equal((await f.post({ dayStart: 'tomorrow' })).status, 400);
  assert.equal((await f.post({}, 'https://other.invalid')).status, 403); assert.equal(f.modelCalls(), 0);
});
test('production origin is accepted behind an internal proxy URL', async () => {
  const f = fixture();
  assert.equal((await f.post({}, 'https://tripcident.surf')).status, 200);
  assert.equal(f.modelCalls(), 1);
});
test('localhost same-origin requests remain accepted', async () => {
  assert.equal((await fixture().post({}, 'http://localhost')).status, 200);
});
test('lookalike, insecure and opaque production origins are rejected', async () => {
  const f = fixture();
  for (const origin of ['https://tripcident.surf.attacker.example', 'http://tripcident.surf', 'null']) {
    assert.equal((await f.post({}, origin)).status, 403);
  }
  assert.equal(f.modelCalls(), 0);
});
test('repeated paid reviews are throttled per itinerary', async () => {
  const f = fixture(); for (let i = 0; i < 4; i++) assert.equal((await f.post()).status, 200);
  assert.equal((await f.post()).status, 429); assert.equal(f.modelCalls(), 4);
});


test('temporary overload retries once and can recover', async () => {
  const f = fixture({ statuses: [503] });
  assert.equal((await f.post()).status, 200);
  assert.equal(f.modelCalls(), 2);
});
test('persistent overload is reported accurately without blaming credentials', async () => {
  const f = fixture({ statuses: [503, 503] });
  const response = await f.post();
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /high demand/);
  assert.equal(f.modelCalls(), 2);
});
test('quota and configuration failures are not retried', async () => {
  for (const [status, message] of [[429, /quota/], [404, /model is unavailable/], [403, /denied access/]]) {
    const f = fixture({ statuses: [status] });
    assert.match((await (await f.post()).json()).error, message);
    assert.equal(f.modelCalls(), 1);
  }
});

test('requires two activities in the selected day before calling Gemini', async () => {
  const tomorrow = { ...secondStop, start_time: '2026-09-27T14:00:00Z', end_time: '2026-09-27T15:00:00Z' };
  for (const stops of [[], [stop], [stop, tomorrow], [tomorrow]]) {
    const f = fixture({ stops });
    const response = await f.post({ snapshot: pure.stopFingerprint(stops) });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /at least two activities/);
    assert.equal(f.modelCalls(), 0);
  }
});
