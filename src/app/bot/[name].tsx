import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGateway } from '../../lib/context';
import { visibleMessages, type Transcript } from '../../lib/gateway';

export default function BotChat() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { gateway, bots } = useGateway();
  const bot = bots.find(row => row.name === name);
  const [runtimeId, setRuntimeId] = useState('');
  const [messages, setMessages] = useState<Transcript[]>([]);
  const [draft, setDraft] = useState('');
  const [stream, setStream] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useRef<FlatList>(null);
  useEffect(() => {
    if (!gateway || !bot) return;
    let active = true;
    const load = async () => {
      try {
        const snapshot = await gateway.openBot(bot);
        if (active) { setRuntimeId(snapshot.session_id); setMessages(snapshot.messages); if (snapshot.inflight?.streaming) setStream(snapshot.inflight.assistant || ''); }
      } catch (e) { if (active) setError((e as Error).message); }
    };
    load();
    return () => { active = false; };
  }, [gateway, bot]);
  useEffect(() => {
    if (!gateway || !bot || !runtimeId) return;
    let active = true;
    const unlisten = gateway.onEvent(event => {
      if (!active || event.session_id !== runtimeId) return;
      if (event.type === 'message.start') { setBusy(true); setStream(''); }
      if (event.type === 'message.delta') setStream(previous => previous + String(event.payload?.text || ''));
      if (event.type === 'message.complete') { setBusy(false); setStream(''); gateway.request<{ messages: Transcript[] }>('session.history', { profile: bot.name, session_id: runtimeId }).then(result => { if (active) setMessages(result.messages); }).catch(() => {}); }
    });
    const interval = setInterval(() => { if (runtimeId) gateway.request<{ messages: Transcript[] }>('session.history', { profile: bot.name, session_id: runtimeId }).then(result => { if (active) setMessages(result.messages); }).catch(() => {}); }, 4000);
    return () => { active = false; clearInterval(interval); unlisten(); };
  }, [gateway, bot, runtimeId]);
  async function send() {
    if (!gateway || !runtimeId || !bot || !draft.trim() || busy) return;
    const text = draft.trim(); setDraft(''); setBusy(true); setError('');
    setMessages(previous => [...previous, { role: 'user', text }]);
    try { await gateway.sendBot(bot.name, runtimeId, text); }
    catch (e) { setDraft(text); setError((e as Error).message); setMessages(previous => previous.slice(0, -1)); setBusy(false); }
  }
  const display = visibleMessages(messages);
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
    <View style={s.header}><Text style={s.name}>{bot?.display_name || bot?.name || name}</Text><Text style={s.sub}>PERSISTENT BOT CHAT · @{name}</Text></View>
    {!!error && <Pressable onPress={() => router.push('/settings')}><Text accessibilityRole="alert" style={s.error}>{error}</Text></Pressable>}
    {!runtimeId && !error && <ActivityIndicator color="#e9c871" style={{ marginTop: 30 }} />}
    <FlatList ref={list} data={stream ? [...display, { role: 'assistant', text: stream, key: 'stream' }] : display} keyExtractor={(item, index) => `${item.key}:${index}`} style={{ flex: 1 }} contentContainerStyle={s.list}
      onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
      ListEmptyComponent={runtimeId ? <Text style={s.empty}>Say hello to {bot?.display_name || name}.</Text> : null}
      renderItem={({ item }) => <View style={[s.bubble, item.role === 'user' ? s.mine : s.theirs]}><Text style={[s.author, item.role === 'user' && { color: '#bfb39a' }]}>{item.role === 'user' ? 'YOU' : (bot?.display_name || name).toUpperCase()}</Text><Text style={s.text}>{item.text}</Text></View>} />
    {busy && <Text style={s.thinking}>●  Working…</Text>}
    <View style={s.compose}><TextInput multiline style={s.input} placeholder="Message your bot…" placeholderTextColor="#7e899e" value={draft} onChangeText={setDraft} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!runtimeId || !draft.trim() || busy} onPress={send} style={[s.send, (!runtimeId || !draft.trim() || busy) && { opacity: 0.4 }]}><Text style={s.sendText}>↑</Text></Pressable></View>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#10131d' }, header: { padding: 17, borderBottomWidth: 1, borderBottomColor: '#303648' }, name: { color: '#f4f0e9', fontWeight: '800', fontSize: 20 }, sub: { color: '#e9c871', letterSpacing: 1, fontSize: 10, marginTop: 5 }, list: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' }, bubble: { maxWidth: '88%', padding: 14, borderRadius: 16, marginBottom: 10 }, mine: { backgroundColor: '#463d2b', alignSelf: 'flex-end' }, theirs: { backgroundColor: '#202638', alignSelf: 'flex-start' }, author: { color: '#e9c871', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 }, text: { color: '#f4f0e9', lineHeight: 22, fontSize: 15 }, compose: { padding: 12, flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, borderColor: '#303648' }, input: { flex: 1, maxHeight: 130, color: '#f4f0e9', backgroundColor: '#202638', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15 }, send: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#e9c871', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }, sendText: { color: '#131722', fontSize: 24, fontWeight: '700' }, error: { color: '#f49d9d', padding: 16 }, thinking: { color: '#e9c871', paddingHorizontal: 18, paddingVertical: 5, fontSize: 12 }, empty: { color: '#929caf', textAlign: 'center', marginTop: 45 } });
