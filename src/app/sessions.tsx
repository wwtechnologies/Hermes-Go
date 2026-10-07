import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useGateway } from '../lib/context';
import type { SessionRow } from '../lib/gateway';
import { Button, colors, ErrorText, Page } from '../lib/ui';

export default function Sessions() {
  const { gateway, bots } = useGateway();
  const [selection, setSelection] = useState('default');
  const profile = bots.some(bot => bot.name === selection) ? selection : bots[0]?.name || 'default';
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!gateway) return;
    try { const result = await gateway.sessions(profile); setSessions(result.sessions); setError(''); }
    catch (failure) { setError((failure as Error).message); }
  }, [gateway, profile]);
  useEffect(() => {
    if (!gateway) return;
    let active = true;
    gateway.sessions(profile).then(result => { if (active) { setSessions(result.sessions); setError(''); } }).catch(failure => { if (active) setError((failure as Error).message); });
    return () => { active = false; };
  }, [gateway, profile]);
  async function start() {
    if (!gateway || busy) return;
    setBusy(true); setError('');
    try {
      const result = await gateway.createSession(profile);
      router.push({ pathname: '/session/[id]', params: { id: result.stored_session_id, profile, runtime: result.session_id } });
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  return <Page title="Sessions" subtitle="Continue a conversation, or start a separate thread with any bot.">
    {!gateway ? <Button label="Connect gateway" onPress={() => router.push('/settings')} /> : <>
      <Text style={s.label}>AGENT</Text><View style={s.pills}>{bots.map(bot => <Pressable accessibilityRole="button" key={bot.name} onPress={() => setSelection(bot.name)} style={[s.pill, profile === bot.name && s.selected]}><Text style={s.pillText}>{bot.display_name || bot.name}</Text></Pressable>)}</View>
      <Button label={busy ? 'Starting…' : '+ New session'} disabled={busy} onPress={start}/>
      <Button label="Refresh" subtle onPress={() => { load(); }}/><ErrorText error={error}/>
      {sessions.length ? sessions.map(row => <Pressable accessibilityRole="button" key={row.id} style={s.row} onPress={() => router.push({ pathname: '/session/[id]', params: { id: row.resolved_id || row.id, profile } })}>
        <Text style={s.name}>{row.title || 'Untitled conversation'}</Text><Text style={s.preview} numberOfLines={2}>{row.preview || `${row.message_count || 0} messages`}</Text>
      </Pressable>) : !error && <Text style={s.empty}>No recent sessions for this agent.</Text>}
    </>}
  </Page>;
}
const s = StyleSheet.create({ label: { color: colors.gold, marginTop: 6, marginBottom: 10, fontSize: 11, fontWeight: '800', letterSpacing: 1 }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 15 }, pill: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 }, selected: { borderColor: colors.gold }, pillText: { color: colors.text, fontSize: 13 }, row: { padding: 15, borderRadius: 14, backgroundColor: colors.panel, marginTop: 8 }, name: { color: colors.text, fontWeight: '700', fontSize: 16 }, preview: { color: colors.dim, fontSize: 13, lineHeight: 19, marginTop: 4 }, empty: { color: colors.dim, marginTop: 25, textAlign: 'center' } });
