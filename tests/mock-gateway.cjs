// Development-only protocol fixture. No Hermes credentials or user data.
const http = require('node:http');
const { Server: WebSocketServer } = require('ws');
const server = http.createServer((req, res) => { res.writeHead(404); res.end('Mock WebSocket only'); });
const wss = new WebSocketServer({ server, path: '/api/ws' });
const messages = [{ role: 'assistant', text: 'Hello from the test bot.', row_id: 1 }];
const bots = [{ name: 'researcher', display_name: 'Researcher', description: 'Finds and summarizes information', canonical_session: { id: 'demo-chat' } }, { name: 'writer', display_name: 'Writer', description: 'Drafts and edits clear prose', canonical_session: { id: 'writer-chat' } }];
const rooms = [{ room_id: 'demo-room', name: 'Project Team', members: [{ member_id: 'researcher', profile: 'researcher', display_name: 'Researcher' }, { member_id: 'writer', profile: 'writer', display_name: 'Writer' }], updated_at: Date.now() / 1000 }];
const jobs = [{ job_id: 'job-1', name: '[bot:researcher] Morning briefing', schedule: '0 9 * * *', enabled: true, prompt_preview: 'Summarize the latest news' }];
const events = [{ room_id: 'demo-room', event_id: 'seed', seq: 1, kind: 'message.member', actor: { kind: 'member', id: 'researcher' }, payload: { text: 'The demo room is ready.', member_id: 'researcher', thread_id: 'seed' }, created_at: Date.now() / 1000 }];
wss.on('connection', socket => {
  socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'event', params: { type: 'gateway.ready', payload: { change_events: true } } }));
  socket.on('message', raw => {
    const { id, method, params } = JSON.parse(String(raw));
    let result;
    switch (method) {
      case 'profiles.list': result = { profiles: bots }; break;
      case 'profiles.create': bots.push({ name: params.name, display_name: params.name, description: params.description, canonical_session: null }); result = { ok: true, name: params.name }; break;
      case 'profiles.describe': result = { name: params.name, description: bots.find(bot => bot.name === params.name)?.description || '', soul: 'Be helpful and accurate.', model: { provider: '', default: '' }, skills: [], toolsets: [] }; break;
      case 'profiles.configure': bots.find(bot => bot.name === params.name).description = params.description; result = { ok: true, applied: { description: true, soul: true } }; break;
      case 'groups.list': result = { rooms }; break;
      case 'groups.create': { const room = { room_id: params.room_id, name: params.name, members: params.members, updated_at: Date.now() / 1000 }; rooms.push(room); result = { room }; break; }
      case 'groups.state': result = { room: rooms.find(room => room.room_id === params.room_id), driver_status: { working: false, running: false, pending_actions: [] } }; break;
      case 'groups.stop': result = { cancelled: 0 }; break;
      case 'session.list': result = { sessions: params.title ? (bots.find(bot => bot.name === params.profile)?.canonical_session ? [{ id: bots.find(bot => bot.name === params.profile).canonical_session.id }] : []) : [{ id: 'demo-session', title: 'Plan the launch', preview: 'Next we need a release checklist.', started_at: Date.now() / 1000, message_count: 2 }] }; break;
      case 'session.create': result = { session_id: 'live-new', stored_session_id: 'new-session', messages: [] }; break;
      case 'session.title': { const bot = bots.find(item => item.name === params.profile); if (bot) bot.canonical_session = { id: 'new-session' }; result = { title: params.title }; break; }
      case 'session.resume': result = { session_id: `live-${params.profile}`, messages }; break;
      case 'session.history': result = { count: messages.length, messages }; break;
      case 'session.archive': result = { archived: true, session_key: params.session_id }; break;
      case 'session.interrupt': result = { interrupted: true }; break;
      case 'cron.manage': {
        if (params.action === 'list') result = { success: true, jobs };
        else if (params.action === 'add') { const job = { job_id: `job-${jobs.length + 1}`, name: params.name, schedule: params.schedule, enabled: true, prompt_preview: params.prompt }; jobs.push(job); result = { success: true, job_id: job.job_id, job }; }
        else { const job = jobs.find(item => item.job_id === params.name); if (params.action === 'remove') jobs.splice(jobs.indexOf(job), 1); else if (job) job.enabled = params.action === 'resume'; result = { success: true, job }; }
        break;
      }
      case 'prompt.submit': messages.push({ role: 'user', text: params.text, row_id: messages.length + 1 }); result = { status: 'streaming' }; setTimeout(() => { messages.push({ role: 'assistant', text: 'Test reply received.', row_id: messages.length + 1 }); socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'event', params: { type: 'message.complete', session_id: params.session_id, payload: { text: 'Test reply received.' } } })); }, 150); break;
      case 'groups.log': { const page = events.filter(event => event.room_id === params.room_id); result = { events: page, cursor: page.at(-1)?.seq || 0, has_more: false }; break; }
      case 'groups.send': events.push({ room_id: params.room_id, event_id: params.event_id, seq: events.length + 1, kind: 'message.user', actor: { kind: 'user', id: 'user' }, payload: params.payload, created_at: Date.now() / 1000 }); result = { accepted: true, event: events.at(-1) }; break;
      default: socket.send(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unmocked ${method}` } })); return;
    }
    socket.send(JSON.stringify({ jsonrpc: '2.0', id, result }));
  });
});
server.listen(19007, '127.0.0.1', () => console.log('Mock gateway ready on 127.0.0.1:19007'));
