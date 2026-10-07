import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGateway } from '../../lib/context';
import { visibleRoomEvents, type RoomEvent } from '../../lib/gateway';

function uniqueId() { return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
export default function RoomChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gateway, rooms } = useGateway();
  const room = rooms.find(row => row.room_id === id);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const list = useRef<FlatList>(null);
  useEffect(() => {
    if (!gateway || !id) return;
    let active = true;
    const refresh = () => {
      gateway.roomLog(id).then(rows => { if (active) { setEvents(rows); setError(''); } }).catch(e => { if (active) setError((e as Error).message); });
      gateway.roomState(id).then(state => { if (active) setWorking(!!(state.driver_status?.working || state.driver_status?.running)); }).catch(() => {});
    };
    refresh(); const interval = setInterval(refresh, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [gateway, id]);
  async function send() {
    if (!gateway || !id || !draft.trim() || busy) return;
    const text = draft.trim();
    const eventId = uniqueId();
    setBusy(true); setError('');
    try {
      // Each top-level message starts a new discussion thread. The event ID
      // remains fixed across an uncertain send; never auto-retry that outcome.
      await gateway.sendRoom(id, text, eventId, eventId);
      setDraft(''); setEvents(await gateway.roomLog(id));
    } catch (failure) { setError(`${(failure as Error).message} Check the room before trying again.`); }
    finally { setBusy(false); }
  }
  const shown = visibleRoomEvents(events);
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
    <View style={s.header}><Text style={s.name}>{room?.name || 'Group Chat'}</Text><Text style={s.sub}>{room?.members.map(m => m.display_name || m.profile).join(' · ') || 'HERMES ROOM'}</Text>{working && <Pressable accessibilityRole="button" onPress={() => gateway?.stopRoom(id).then(() => setWorking(false)).catch(e => setError((e as Error).message))}><Text style={{ color: '#e9c871', paddingTop: 9 }}>● Agents working · Stop room</Text></Pressable>}</View>
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!events.length && !error && <ActivityIndicator color="#e9c871" style={{ marginTop: 25 }} />}
    <FlatList ref={list} data={shown} keyExtractor={item => item.event_id} contentContainerStyle={s.list} onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
      ListEmptyComponent={!error ? <Text style={s.empty}>Start a conversation with the group.</Text> : null}
      renderItem={({ item }) => {
        const mine = item.kind === 'message.user';
        const name = mine ? 'YOU' : (room?.members.find(m => m.profile === item.actor.id || m.display_name === item.actor.id)?.display_name || item.actor.id).toUpperCase();
        return <View style={[s.bubble, mine ? s.mine : s.theirs]}><Text style={s.author}>{name}</Text><Text style={s.text}>{item.payload.text}</Text></View>;
      }} />
    <View style={s.compose}><TextInput multiline style={s.input} placeholder="Message the group · @bot to mention" placeholderTextColor="#7e899e" value={draft} onChangeText={setDraft} /><Pressable accessibilityRole="button" accessibilityLabel="Send group message" disabled={busy || !draft.trim()} onPress={send} style={[s.send, (busy || !draft.trim()) && { opacity: 0.4 }]}><Text style={s.sendText}>↑</Text></Pressable></View>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#10131d' }, header: { padding: 17, borderBottomWidth: 1, borderColor: '#303648' }, name: { color: '#f4f0e9', fontSize: 20, fontWeight: '800' }, sub: { color: '#e9c871', marginTop: 6, fontSize: 11 }, error: { color: '#f49d9d', padding: 14 }, list: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' }, empty: { color: '#929caf', textAlign: 'center', marginTop: 45 }, bubble: { maxWidth: '88%', padding: 14, borderRadius: 16, marginBottom: 10 }, mine: { backgroundColor: '#463d2b', alignSelf: 'flex-end' }, theirs: { backgroundColor: '#202638', alignSelf: 'flex-start' }, author: { color: '#e9c871', fontSize: 10, fontWeight: '800', marginBottom: 6, letterSpacing: 1 }, text: { color: '#f4f0e9', fontSize: 15, lineHeight: 22 }, compose: { padding: 12, flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, borderColor: '#303648' }, input: { flex: 1, maxHeight: 130, color: '#f4f0e9', backgroundColor: '#202638', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15 }, send: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#e9c871', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }, sendText: { color: '#131722', fontSize: 24, fontWeight: '700' } });
