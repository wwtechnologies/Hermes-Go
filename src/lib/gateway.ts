export type Bot = {
  name: string;
  display_name?: string;
  description?: string;
  canonical_session?: { id: string; resolved_id?: string } | null;
  last_session?: { preview?: string } | null;
};
export type Room = { room_id: string; name: string; members: { display_name?: string; profile?: string }[]; updated_at: number };
export type Transcript = { role: string; text?: string | null; content?: unknown; row_id?: number; display_kind?: string };
export type RoomEvent = { event_id: string; seq: number; kind: string; actor: { kind: string; id: string }; payload: { text?: string; thread_id?: string; member_id?: string }; created_at: number };
export type GatewayEvent = { type: string; session_id?: string; payload?: Record<string, unknown> };
export type SessionRow = { id: string; resolved_id?: string; title: string; preview: string; started_at: number; message_count: number; source?: string };
export type CronJob = { job_id: string; name: string; schedule: string; prompt_preview?: string; enabled: boolean; next_run_at?: string | null; last_status?: string | null; deliver?: string | null };
export type ProfileDetail = { name: string; description: string; soul: string; model: { provider: string; default: string }; skills: { name: string; enabled: boolean }[]; toolsets: { name: string; label: string; enabled: boolean }[] };

type Pending = { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

export function gatewayUrls(input: string, token = '', mode: 'token' | 'basic' = 'token') {
  const url = new URL(input.trim());
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Enter a gateway base URL without credentials or query parameters.');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Use HTTPS for remote gateways so your credentials are not sent in cleartext.');
  if (mode === 'token' && !token.trim()) throw new Error('A gateway session token is required.');
  const base = url.toString().replace(/\/+$/, '');
  const socket = new URL(base + '/api/ws');
  socket.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  if (mode === 'token') socket.searchParams.set('token', token.trim());
  return { base, socket: socket.toString() };
}

export class HermesGateway {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private listeners = new Set<(event: GatewayEvent) => void>();
  private counter = 0;
  private closed = false;
  private socketUrl: string;
  private readonly basic?: { username?: string; password?: string };
  readonly base: string;

  constructor(url: string, token: string, basic?: { username?: string; password?: string }) {
    const parsed = gatewayUrls(url, token, basic ? 'basic' : 'token');
    this.base = parsed.base;
    this.socketUrl = parsed.socket;
    this.basic = basic;
  }
  private async getSocketUrl(): Promise<string> {
    if (!this.basic) return this.socketUrl;
    if (this.basic.username && this.basic.password) {
      const response = await fetch(`${this.base}/auth/password-login`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'basic', username: this.basic.username, password: this.basic.password }),
      });
      if (!response.ok) throw new Error(response.status === 401 ? 'Invalid username or password.' : `Sign-in failed (${response.status}).`);
      // Never retain the password after the gateway has accepted it.
      delete this.basic.password;
    }
    const ticketResponse = await fetch(`${this.base}/api/auth/ws-ticket`, { method: 'POST', credentials: 'include' });
    if (!ticketResponse.ok) throw new Error('Gateway session expired or sign-in required. Open Settings to sign in again.');
    const { ticket } = await ticketResponse.json() as { ticket: string };
    if (!ticket) throw new Error('Gateway did not issue a WebSocket ticket.');
    const url = new URL(this.socketUrl);
    url.searchParams.set('ticket', ticket);
    return url.toString();
  }
  onEvent(listener: (event: GatewayEvent) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  async connect(timeoutMs = 12000): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.closed = false;
    const socket = new WebSocket(await this.getSocketUrl());
    this.ws = socket;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { socket.close(); reject(new Error('Gateway connection timed out.')); }, timeoutMs);
      socket.onopen = () => { clearTimeout(timer); resolve(); };
      socket.onerror = () => { clearTimeout(timer); reject(new Error('Could not reach the Hermes gateway. Check HTTPS, token, and network.')); };
      socket.onclose = () => {
        clearTimeout(timer);
        for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Gateway disconnected.')); }
        this.pending.clear();
        if (!this.closed) for (const listener of this.listeners) listener({ type: 'connection.closed' });
      };
      socket.onmessage = (msg) => {
        let frame: any;
        try { frame = JSON.parse(String(msg.data)); } catch { return; }
        if (frame.method === 'event' && frame.params?.type) {
          for (const listener of this.listeners) listener(frame.params as GatewayEvent);
        } else if (frame.id != null) {
          const id = String(frame.id);
          const pending = this.pending.get(id);
          if (!pending) return;
          clearTimeout(pending.timer);
          this.pending.delete(id);
          if (frame.error) pending.reject(new Error(frame.error.message || 'Gateway RPC failed.'));
          else pending.resolve(frame.result);
        }
      };
    });
  }
  request<T>(method: string, params: Record<string, unknown> = {}, timeoutMs = 30000): Promise<T> {
    if (this.ws?.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Gateway is disconnected. Reconnect and retry.'));
    const id = String(++this.counter);
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timed out; check gateway state before retrying.`)); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.ws!.send(JSON.stringify({ jsonrpc: '2.0', id, method, params })); }
      catch (error) { clearTimeout(timer); this.pending.delete(id); reject(error as Error); }
    });
  }
  async logout() {
    if (this.basic) await fetch(`${this.base}/auth/logout`, { method: 'POST', credentials: 'include', redirect: 'manual' }).catch(() => {});
    this.close();
  }
  close() { this.closed = true; this.ws?.close(); this.ws = null; }
  profiles() { return this.request<{ profiles: Bot[] }>('profiles.list', { include_sessions: true }); }
  rooms() { return this.request<{ rooms: Room[] }>('groups.list', {}); }
  sessions(profile: string) { return this.request<{ sessions: SessionRow[] }>('session.list', { profile, limit: 100 }); }
  createSession(profile: string) {
    return this.request<{ session_id: string; stored_session_id: string; messages: Transcript[] }>('session.create', { profile, source: 'mobile', close_on_disconnect: false });
  }
  resumeSession(profile: string, sessionId: string) {
    return this.request<{ session_id: string; stored_session_id?: string; messages: Transcript[]; inflight?: { assistant?: string; streaming?: boolean } }>('session.resume', { profile, session_id: sessionId, inline_images: false });
  }
  archiveSession(profile: string, sessionId: string) { return this.request<{ archived: boolean }>('session.archive', { profile, session_id: sessionId, archived: true }); }
  interruptSession(profile: string, runtimeId: string) { return this.request('session.interrupt', { profile, session_id: runtimeId }); }
  createBot(name: string, description: string, soul?: string) { return this.request<{ name: string; ok: boolean }>('profiles.create', { name, description, ...(soul ? { soul } : {}), mirror_credentials: true }); }
  describeBot(name: string) { return this.request<ProfileDetail>('profiles.describe', { name, profile: name }); }
  configureBot(name: string, fields: { description?: string; soul?: string }) { return this.request<{ ok: boolean }>('profiles.configure', { name, profile: name, ...fields }); }
  createRoom(name: string, members: Bot[], roomId: string) {
    if (members.length < 2 || members.length > 6) throw new Error('Select 2–6 bots for a room.');
    return this.request<{ room: Room }>('groups.create', { room_id: roomId, name, members: members.map(bot => ({ member_id: bot.name, profile: bot.name, handle: bot.name, display_name: bot.display_name || bot.name })) });
  }
  roomState(roomId: string) { return this.request<{ driver_status?: { running: boolean; working: boolean; pending_actions: Record<string, unknown>[] } }>('groups.state', { room_id: roomId }); }
  stopRoom(roomId: string) { return this.request<{ cancelled: number }>('groups.stop', { room_id: roomId }); }
  routineJobs(profile: string) { return this.request<{ jobs?: CronJob[]; success?: boolean; error?: string }>('cron.manage', { action: 'list', profile, include_disabled: true }); }
  routineAction(profile: string, action: 'pause' | 'resume' | 'remove', jobId: string) { return this.request<{ success?: boolean; error?: string }>('cron.manage', { action, profile, name: jobId }); }
  addRoutine(profile: string, name: string, schedule: string, prompt: string) {
    return this.request<{ success?: boolean; error?: string; job_id?: string }>('cron.manage', { action: 'add', profile, name: `[bot:${profile}] ${name}`, schedule, prompt, deliver: 'bot-chat' });
  }
  async openBot(bot: Bot) {
    const scope = { profile: bot.name };
    // A failed or inconsistent lookup is not permission to mint a second canonical chat.
    const lookup = await this.request<{ sessions: { id: string; resolved_id?: string }[] }>('session.list', { ...scope, title: 'Bot Chat', include_hidden: true, limit: 200 });
    let stored = lookup.sessions[0]?.resolved_id || lookup.sessions[0]?.id;
    if (!stored && bot.canonical_session?.id) throw new Error('Could not confirm the Bot Chat registry. Retry after the gateway recovers.');
    if (!stored) {
      const created = await this.request<{ session_id: string; stored_session_id: string }>('session.create', { ...scope, title: 'Bot Chat', hidden: true, follow_profile_config: true, idempotency_key: `mobile-bot-chat-${bot.name}` });
      try { await this.request('session.title', { ...scope, session_id: created.session_id, title: 'Bot Chat' }); }
      catch (error) {
        const retry = await this.request<{ sessions: { id: string; resolved_id?: string }[] }>('session.list', { ...scope, title: 'Bot Chat', include_hidden: true, limit: 200 });
        if (!retry.sessions[0]) throw error;
        stored = retry.sessions[0].resolved_id || retry.sessions[0].id;
      }
      stored ||= created.stored_session_id;
    }
    const snapshot = await this.request<{ session_id: string; messages: Transcript[]; inflight?: { assistant?: string; user?: string; streaming?: boolean } }>('session.resume', { ...scope, session_id: stored, inline_images: false });
    return { ...snapshot, storedId: stored };
  }
  sendBot(profile: string, runtimeId: string, text: string) { return this.request<{ status?: string }>('prompt.submit', { profile, session_id: runtimeId, text }); }
  async roomLog(roomId: string): Promise<RoomEvent[]> {
    const events: RoomEvent[] = [];
    let cursor = 0;
    for (let page = 0; page < 50; page++) {
      const result = await this.request<{ events: RoomEvent[]; cursor: number; has_more: boolean }>('groups.log', { room_id: roomId, since_seq: cursor, limit: 100 });
      events.push(...result.events);
      if (!result.has_more || result.cursor <= cursor) break;
      cursor = result.cursor;
    }
    return events;
  }
  sendRoom(roomId: string, text: string, threadId: string, eventId: string) {
    return this.request('groups.send', { room_id: roomId, event_id: eventId, payload: { text, thread_id: threadId } });
  }
}

export function visibleMessages(rows: Transcript[]) {
  return rows.filter(row => ['user', 'assistant'].includes(row.role) && row.display_kind !== 'hidden')
    .map(row => ({ role: row.role, text: row.text || (typeof row.content === 'string' ? row.content : ''), key: String(row.row_id ?? `${row.role}:${row.text ?? row.content ?? ''}`) }))
    .filter(row => row.text.trim());
}
export function visibleRoomEvents(rows: RoomEvent[]) {
  return rows.filter(row => ['message.user', 'message.member'].includes(row.kind) && typeof row.payload.text === 'string');
}
