import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGateway } from '../../lib/context';
import { visibleMessages, type Transcript } from '../../lib/gateway';
import { colors, ErrorText } from '../../lib/ui';

export default function SessionChat() {
  const { id, profile, runtime: createdRuntime } = useLocalSearchParams<{ id: string; profile: string; runtime?: string }>();
  const { gateway } = useGateway();
  const [runtime, setRuntime] = useState(createdRuntime || '');
  const [messages, setMessages] = useState<Transcript[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stream, setStream] = useState('');
  const list = useRef<FlatList>(null);
  useEffect(() => {
    if (!gateway || !id || !profile) return;
    // A new session has no stored transcript until its first prompt. Use the live
    // ID returned by session.create rather than trying to resume a missing row.
    if (createdRuntime) return;
    let active = true;
    gateway.resumeSession(profile, id).then(result => { if (active) { setRuntime(result.session_id); setMessages(result.messages); setStream(result.inflight?.streaming ? result.inflight.assistant || '' : ''); } }).catch(e => { if (active) setError((e as Error).message); });
    return () => { active = false; };
  }, [gateway, id, profile, createdRuntime]);
  useEffect(() => {
    if (!gateway || !runtime) return;
    let active = true;
    const refresh = () => gateway.request<{ messages: Transcript[] }>('session.history', { profile, session_id: runtime }).then(result => { if (active) { setMessages(result.messages); setBusy(false); } }).catch(() => {});
    const unlisten = gateway.onEvent(event => {
      if (event.session_id !== runtime) return;
      if (event.type === 'message.start') { setBusy(true); setStream(''); }
      if (event.type === 'message.delta') setStream(previous => previous + String(event.payload?.text || ''));
      if (event.type === 'message.complete') { setBusy(false); setStream(''); refresh(); }
    });
    const timer = setInterval(refresh, 4000);
    return () => { active = false; clearInterval(timer); unlisten(); };
  }, [gateway, profile, runtime]);
  async function send() {
    if (!gateway || !runtime || !draft.trim()) return;
    const text = draft.trim(); setDraft(''); setBusy(true); setError('');
    try { await gateway.sendBot(profile, runtime, text); setMessages(previous => [...previous, { role: 'user', text }]); }
    catch (failure) { setDraft(text); setBusy(false); setError((failure as Error).message); }
  }
  async function archive() {
    if (!gateway || !id) return;
    try { await gateway.archiveSession(profile, id); router.replace('/sessions'); }
    catch (failure) { setError((failure as Error).message); }
  }
  const confirmArchive = () => Platform.OS === 'web' ? archive() : Alert.alert('Archive session?', 'The transcript remains stored on the gateway.', [{ text: 'Cancel' }, { text: 'Archive', onPress: archive }]);
  const rows = visibleMessages(messages);
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
    <View style={s.header}><View style={{ flex: 1 }}><Text style={s.title}>{profile || 'Session'}</Text><Text style={s.subtitle}>SESSION · {id?.slice(0, 12)}</Text></View><Pressable accessibilityRole="button" onPress={confirmArchive}><Text style={s.action}>Archive</Text></Pressable></View>
    <ErrorText error={error}/>
    <FlatList ref={list} data={stream ? [...rows, { role: 'assistant', text: stream, key: 'stream' }] : rows} keyExtractor={(item, index) => `${item.key}:${index}`} contentContainerStyle={s.list} onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
      ListEmptyComponent={<Text style={s.empty}>Start a conversation.</Text>} renderItem={({ item }) => <View style={[s.bubble, item.role === 'user' ? s.mine : s.theirs]}><Text style={s.author}>{item.role === 'user' ? 'YOU' : profile?.toUpperCase()}</Text><Text style={s.text}>{item.text}</Text></View>} />
    {busy && <Pressable accessibilityRole="button" onPress={() => gateway?.interruptSession(profile, runtime).catch(e => setError((e as Error).message))}><Text style={s.action}>● Working · Stop</Text></Pressable>}
    <View style={s.compose}><TextInput multiline style={s.input} placeholder="Message this agent…" placeholderTextColor={colors.dim} value={draft} onChangeText={setDraft}/><Pressable accessibilityRole="button" disabled={!runtime || !draft.trim()} onPress={send} style={s.send}><Text style={s.sendLabel}>↑</Text></Pressable></View>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg }, header: { flexDirection: 'row', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderColor: colors.line }, title: { color: colors.text, fontSize: 20, fontWeight: '800' }, subtitle: { color: colors.gold, marginTop: 4, fontSize: 11 }, action: { color: colors.gold, padding: 10, fontWeight: '700' }, list: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' }, empty: { color: colors.dim, textAlign: 'center', marginTop: 50 }, bubble: { maxWidth: '88%', padding: 14, borderRadius: 16, marginBottom: 10 }, mine: { backgroundColor: '#463d2b', alignSelf: 'flex-end' }, theirs: { backgroundColor: '#202638', alignSelf: 'flex-start' }, author: { color: colors.gold, fontWeight: '800', fontSize: 10, marginBottom: 5 }, text: { color: colors.text, fontSize: 15, lineHeight: 22 }, compose: { flexDirection: 'row', padding: 12, alignItems: 'flex-end', borderTopWidth: 1, borderColor: colors.line }, input: { flex: 1, maxHeight: 130, backgroundColor: colors.panel, color: colors.text, borderRadius: 15, padding: 12 }, send: { backgroundColor: colors.gold, borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginLeft: 8 }, sendLabel: { fontSize: 24, color: colors.bg } });
