import test from 'node:test';
import assert from 'node:assert/strict';
import { HermesGateway, gatewayUrls, visibleRoomEvents } from '../src/lib/gateway.ts';

class MockSocket {
  static OPEN = 1;
  static instances = [];
  readyState = 1;
  onopen = null;
  onmessage = null;
  onclose = null;
  onerror = null;
  sent = [];
  constructor(url) { this.url = url; MockSocket.instances.push(this); queueMicrotask(() => this.onopen?.()); }
  send(raw) { this.sent.push(JSON.parse(raw)); }
  respond(method, result) {
    const request = this.sent.findLast(frame => frame.method === method);
    assert.ok(request, `${method} was sent`);
    this.onmessage?.({ data: JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) });
    return request;
  }
  close() { this.readyState = 3; this.onclose?.(); }
}
globalThis.WebSocket = MockSocket;
const tick = () => new Promise(resolve => setImmediate(resolve));

// Exercises the actual JSON-RPC client against a deterministic socket peer.
test('HTTPS-only remote URLs and token transport', () => {
  const url = gatewayUrls('https://box.ts.net/hermes/', 'secret token');
  assert.equal(url.socket, 'wss://box.ts.net/hermes/api/ws?token=secret+token');
  assert.throws(() => gatewayUrls('http://box.ts.net', 'secret'), /HTTPS/);
  assert.throws(() => gatewayUrls('https://u:p@box.ts.net', 'secret'), /credentials/);
});
test('profiles request and RPC error correlation', async () => {
  const client = new HermesGateway('https://box.ts.net', 'token');
  await client.connect();
  const socket = MockSocket.instances.at(-1);
  const request = client.profiles();
  assert.deepEqual(socket.sent.at(-1).params, { include_sessions: true });
  socket.respond('profiles.list', { profiles: [{ name: 'hermes' }] });
  assert.deepEqual((await request).profiles.map(bot => bot.name), ['hermes']);
  const bad = client.rooms();
  const frame = socket.sent.at(-1);
  socket.onmessage({ data: JSON.stringify({ id: frame.id, error: { code: 500, message: 'Unavailable' } }) });
  await assert.rejects(bad, /Unavailable/);
  client.close();
});
test('opening an existing canonical chat does not create another', async () => {
  const client = new HermesGateway('https://box.ts.net', 'token'); await client.connect();
  const socket = MockSocket.instances.at(-1);
  const opened = client.openBot({ name: 'researcher', canonical_session: { id: 'old' } });
  await tick(); const lookup = socket.respond('session.list', { sessions: [{ id: 'old', resolved_id: 'tip' }] });
  assert.equal(lookup.params.title, 'Bot Chat');
  assert.equal(lookup.params.include_hidden, true);
  await tick(); const resume = socket.respond('session.resume', { session_id: 'runtime', messages: [{ role: 'assistant', text: 'Ready' }] });
  assert.equal(resume.params.session_id, 'tip');
  assert.equal((await opened).storedId, 'tip');
  assert.equal(socket.sent.some(frame => frame.method === 'session.create'), false);
  client.close();
});
test('failed canonical lookup never mints a new chat', async () => {
  const client = new HermesGateway('https://box.ts.net', 'token'); await client.connect();
  const socket = MockSocket.instances.at(-1);
  const opened = client.openBot({ name: 'researcher' });
  await tick(); const frame = socket.sent.at(-1);
  socket.onmessage({ data: JSON.stringify({ id: frame.id, error: { message: 'backend restarting' } }) });
  await assert.rejects(opened, /backend restarting/);
  assert.equal(socket.sent.some(sent => sent.method === 'session.create'), false);
  client.close();
});
test('basic sign-in exchanges a cookie session for a one-use WebSocket ticket', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    if (String(url).endsWith('/auth/password-login')) return { ok: true };
    if (String(url).endsWith('/api/auth/ws-ticket')) return { ok: true, json: async () => ({ ticket: 'one-use' }) };
    throw new Error('unexpected endpoint');
  };
  try {
    const client = new HermesGateway('https://box.ts.net', '', { username: 'owner', password: 'test-only-password' });
    await client.connect();
    assert.equal(calls.length, 2);
    assert.deepEqual(JSON.parse(calls[0].init.body), { provider: 'basic', username: 'owner', password: 'test-only-password' });
    assert.equal(calls[1].init.credentials, 'include');
    assert.equal(MockSocket.instances.at(-1).url, 'wss://box.ts.net/api/ws?ticket=one-use');
    client.close();
  } finally { globalThis.fetch = originalFetch; }
});

test('group message sends a server-authored user event with stable thread ID', async () => {
  const client = new HermesGateway('https://box.ts.net', 'token'); await client.connect();
  const socket = MockSocket.instances.at(-1);
  const sent = client.sendRoom('room-1', '@researcher check this', 'thread-1', 'event-1');
  const frame = socket.sent.at(-1);
  assert.deepEqual(frame.params, { room_id: 'room-1', event_id: 'event-1', payload: { text: '@researcher check this', thread_id: 'thread-1' } });
  socket.respond('groups.send', { accepted: true });
  await sent;
  assert.equal(visibleRoomEvents([{ kind: 'message.member', payload: { text: 'Yes' } }, { kind: 'turn.started', payload: {} }]).length, 1);
  client.close();
});

test('bot and group creation use profile and room contracts', async () => {
  const client = new HermesGateway('https://box.ts.net', 'token'); await client.connect();
  const socket = MockSocket.instances.at(-1);
  const created = client.createBot('reviewer', 'Reviews code', 'Be strict');
  assert.deepEqual(socket.sent.at(-1).params, { name: 'reviewer', description: 'Reviews code', soul: 'Be strict', mirror_credentials: true });
  socket.respond('profiles.create', { ok: true, name: 'reviewer' }); await created;
  const room = client.createRoom('Review', [{ name: 'reviewer' }, { name: 'writer' }], 'new-room');
  assert.deepEqual(socket.sent.at(-1).params.members, [
    { member_id: 'reviewer', profile: 'reviewer', handle: 'reviewer', display_name: 'reviewer' },
    { member_id: 'writer', profile: 'writer', handle: 'writer', display_name: 'writer' },
  ]);
  socket.respond('groups.create', { room: { room_id: 'new-room' } }); await room;
  assert.throws(() => client.createRoom('Bad', [{ name: 'only-one' }], 'bad'), /2–6/);
  client.close();
});

test('sessions and routines preserve profile scope and bot-chat delivery', async () => {
  const client = new HermesGateway('https://box.ts.net', 'token'); await client.connect();
  const socket = MockSocket.instances.at(-1);
  const sessions = client.sessions('researcher');
  assert.equal(socket.sent.at(-1).params.profile, 'researcher');
  socket.respond('session.list', { sessions: [{ id: 'a' }] }); await sessions;
  const add = client.addRoutine('researcher', 'Morning', '0 9 * * *', 'Summarize my inbox');
  assert.deepEqual(socket.sent.at(-1).params, { action: 'add', profile: 'researcher', name: '[bot:researcher] Morning', schedule: '0 9 * * *', prompt: 'Summarize my inbox', deliver: 'bot-chat' });
  socket.respond('cron.manage', { success: true, job_id: 'job-1' }); await add;
  const pause = client.routineAction('researcher', 'pause', 'job-1');
  assert.equal(socket.sent.at(-1).params.name, 'job-1');
  socket.respond('cron.manage', { success: true }); await pause;
  client.close();
});
