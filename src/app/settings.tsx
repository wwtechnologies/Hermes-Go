import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useGateway } from '../lib/context';
import { readConnection } from '../lib/credentials';

export default function Settings() {
  const { gateway, connect, disconnect, status } = useGateway();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<'basic' | 'token'>('basic');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  useEffect(() => { readConnection().then(value => { if (value) { setSavedUrl(value.url); setUrl(value.url); setMode(value.mode || 'token'); setUsername(value.username || ''); } }); }, []);
  async function submit() {
    setBusy(true); setError('');
    try { await connect({ url: url.trim(), token: token.trim(), mode, username: username.trim(), password }); setToken(''); setPassword(''); router.back(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  async function remove() {
    await disconnect(); setSavedUrl(''); setToken(''); router.replace('/');
  }
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.container}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 35 }}>
    <View style={s.card}><Text style={s.eyebrow}>GATEWAY CONNECTION</Text><Text style={s.title}>Connect your bots.</Text>
      <Text style={s.copy}>Use the HTTPS base URL of a reachable <Text style={s.code}>hermes serve</Text> gateway, such as your Tailscale HTTPS address. The iPhone cannot use your computer’s localhost.</Text>
      <Text style={s.label}>Gateway URL</Text><TextInput autoCapitalize="none" autoCorrect={false} keyboardType="url" style={s.input} placeholder="https://hermes.example.ts.net" placeholderTextColor="#727d92" value={url} onChangeText={setUrl} />
      <View style={s.modeRow}><Pressable accessibilityRole="button" style={[s.modeButton, mode === 'basic' && s.selectedMode]} onPress={() => setMode('basic')}><Text style={s.modeText}>Username + password</Text></Pressable><Pressable accessibilityRole="button" style={[s.modeButton, mode === 'token' && s.selectedMode]} onPress={() => setMode('token')}><Text style={s.modeText}>Session token</Text></Pressable></View>
      {mode === 'basic' ? <>
        <Text style={s.label}>Username</Text><TextInput autoCapitalize="none" autoCorrect={false} style={s.input} placeholder="admin" placeholderTextColor="#727d92" value={username} onChangeText={setUsername} />
        <Text style={s.label}>Password</Text><TextInput autoCapitalize="none" autoCorrect={false} secureTextEntry style={s.input} placeholder="Gateway password" placeholderTextColor="#727d92" value={password} onChangeText={setPassword} />
        <Text style={s.note}>Use only with a trusted VPN or private network. The password is not saved; Hermes issues a session cookie and a single-use socket ticket. If the session expires, sign in again.</Text>
      </> : <>
        <Text style={s.label}>Session token</Text><TextInput autoCapitalize="none" autoCorrect={false} secureTextEntry style={s.input} placeholder={savedUrl ? 'Enter token to reconnect' : 'Gateway session token'} placeholderTextColor="#727d92" value={token} onChangeText={setToken} />
        <Text style={s.note}>The token is saved in the device’s secure store. Token mode is for gateways that accept the legacy session-token transport, not public OAuth gateways.</Text>
      </>}
      <Text style={s.note}>Nous Portal/OAuth login and multi-gateway rooms are not in this first version.</Text>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} style={[s.button, busy && { opacity: 0.55 }]} onPress={submit}><Text style={s.buttonText}>{busy ? 'Connecting…' : gateway ? 'Replace connection' : 'Connect gateway'}</Text></Pressable>
      {busy && <ActivityIndicator color="#e9c871" style={{ marginTop: 16 }}/>}</View>
    {gateway && <View style={s.footer}><Text style={s.state}>●  {status}{savedUrl ? ` · ${savedUrl}` : ''}</Text><Pressable accessibilityRole="button" onPress={() => Platform.OS === 'web' ? remove() : Alert.alert('Disconnect?', 'This removes the saved gateway token from this device.', [{ text: 'Cancel' }, { text: 'Disconnect', style: 'destructive', onPress: remove }])}><Text style={s.disconnect}>Disconnect and forget</Text></Pressable></View>}
  </ScrollView></KeyboardAvoidingView>;
}
const s = StyleSheet.create({ container: { flex: 1, backgroundColor: '#10131d', padding: 20 }, card: { backgroundColor: '#1b2030', borderRadius: 20, padding: 22, marginTop: 18 }, eyebrow: { color: '#e9c871', letterSpacing: 2, fontWeight: '700', fontSize: 11 }, title: { color: '#f4f0e9', fontSize: 28, fontWeight: '800', marginTop: 8 }, copy: { color: '#a1aabd', lineHeight: 23, marginTop: 12, marginBottom: 16 }, code: { color: '#e9c871' }, label: { color: '#f4f0e9', fontWeight: '700', marginTop: 16, marginBottom: 8 }, input: { color: '#f4f0e9', backgroundColor: '#111521', borderRadius: 12, borderWidth: 1, borderColor: '#353c51', padding: 14, fontSize: 16 }, note: { color: '#929caf', lineHeight: 19, marginTop: 15, fontSize: 12 }, modeRow: { flexDirection: 'row', gap: 8, marginTop: 18 }, modeButton: { flex: 1, borderWidth: 1, borderColor: '#353c51', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }, selectedMode: { borderColor: '#e9c871', backgroundColor: '#3a3529' }, modeText: { color: '#f4f0e9', fontSize: 12, fontWeight: '700' }, button: { backgroundColor: '#e9c871', borderRadius: 12, padding: 15, marginTop: 20, alignItems: 'center' }, buttonText: { color: '#151825', fontWeight: '800', fontSize: 16 }, error: { color: '#f49d9d', marginTop: 14 }, footer: { marginTop: 24, alignItems: 'center' }, state: { color: '#929caf', marginBottom: 17 }, disconnect: { color: '#f49d9d', fontWeight: '700' } });
