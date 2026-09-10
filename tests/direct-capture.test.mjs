import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirectCapture } from '../plugin/lib/direct-capture.mjs';
import extension from '../plugin/omp/extension.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
test('direct capture is exclusive, owner scoped and acknowledged after editor insertion', () => {
  const call = createDirectCapture();
  const { id } = call('start', { owner: 'omp:one' });
  assert.throws(() => call('start', { owner: 'omp:two' }), /active/);
  assert.deepEqual(call('next'), { id, command: 'start' });
  assert.throws(() => call('status', { id, owner: 'omp:two' }), /owner/);
  assert.throws(() => call('control', { id, owner: 'omp:two', action: 'cancel' }), /owner/);
  call('update', { id, state: 'recording' });
  call('control', { id, owner: 'omp:one', action: 'finish' });
  assert.equal(call('next').command, 'finish');
  call('update', { id, state: 'transcribing' });
  call('update', { id, state: 'ready', text: '不要部署 version 2。' });
  call('update', { id, state: 'recording' }); // A late native status cannot regress readiness.
  assert.equal(call('status', { id, owner: 'omp:one' }).state, 'ready');
  call('control', { id, owner: 'omp:one', action: 'ack', inserted: true });
  assert.equal(call('next').command, 'inserted');
  assert.equal(call('status', { id, owner: 'omp:one' }).text, undefined);
});
test('cancel suppresses late transcripts and timeout allows a new recording after native cancellation', () => {
  let time = 0; const call = createDirectCapture(() => time);
  const { id } = call('start', { owner: 'omp:one' }); call('next');
  call('control', { id, owner: 'omp:one', action: 'cancel' });
  call('update', { id, state: 'ready', text: 'late' });
  assert.equal(call('status', { id, owner: 'omp:one' }).text, undefined);
  assert.throws(() => call('start', { owner: 'omp:two' }), /active/);
  assert.equal(call('next').command, 'cancel');
  const next = call('start', { owner: 'omp:two' }); call('next');
  time = 331000;
  assert.equal(call('status', { id: next.id, owner: 'omp:two' }).state, 'error');
  assert.equal(call('next').command, 'cancel');
  assert.ok(call('start', { owner: 'omp:three' }).id);
});
function fixture() {
  const broker = createDirectCapture(), shortcuts = new Map(), commands = new Map(), events = new Map();
  let text = '@Voice Prompt', session = 'one', writes = 0;
  const pi = { registerShortcut: (key, value) => shortcuts.set(key, value), registerCommand: (name, value) => commands.set(name, value), on: (name, cb) => events.set(name, cb), sendUserMessage: () => assert.fail('must not submit') };
  extension(pi, async (route, input) => {
    assert.ok(route.startsWith('/api/capture/'), 'recording must not invoke AI');
    return broker(route.slice('/api/capture/'.length), input);
  });
  const ctx = { hasUI: true, sessionManager: { getSessionId: () => session }, ui: { getEditorText: () => text, setEditorText: value => { text = value; writes++; }, setStatus: () => {}, notify: () => {} } };
  return { broker, shortcuts, commands, events, ctx, get text() { return text; }, set text(value) { text = value; }, get writes() { return writes; }, set session(value) { session = value; } };
}
test('OMP shortcut writes directly through editor API and preserves an existing mention', async () => {
  const f = fixture();
  await f.shortcuts.get('ctrl+alt+space').handler(f.ctx);
  const { id } = f.broker('next');
  f.broker('update', { id, state: 'ready', text: '请检查登录。 Do not deploy.' });
  await delay(300);
  assert.equal(f.text, '@Voice Prompt 请检查登录。 Do not deploy.');
  assert.equal(f.writes, 1);
  assert.equal(f.broker('next').command, 'inserted');
  await f.events.get('session_shutdown')({}, f.ctx);
});
test('OMP never overwrites edits made while recording', async () => {
  const f = fixture(); await f.commands.get('voice').handler('input', f.ctx);
  const { id } = f.broker('next'); f.text = 'new input';
  f.broker('update', { id, state: 'ready', text: 'stale transcript' }); await delay(300);
  assert.equal(f.text, 'new input'); assert.equal(f.writes, 0);
  assert.equal(f.broker('next').command, 'rejected');
  await f.events.get('session_shutdown')({}, f.ctx);
});
test('OMP session switch cancels recording and never routes text to the next session', async () => {
  const f = fixture(); await f.commands.get('voice').handler('input', f.ctx);
  const { id } = f.broker('next'); await f.events.get('session_before_switch')({}, f.ctx);
  f.session = 'two'; f.text = 'second session';
  f.broker('update', { id, state: 'ready', text: 'stale transcript' }); await delay(250);
  assert.equal(f.writes, 0); assert.equal(f.text, 'second session');
});
