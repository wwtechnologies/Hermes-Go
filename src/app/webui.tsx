import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { readWebUiUrl, saveWebUiUrl } from '../lib/credentials';
import { Button, colors, ErrorText, Field, Nav } from '../lib/ui';

function validate(input: string) {
  const url = new URL(input.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Use an HTTPS WebUI base URL without credentials or query parameters.');
  return url.toString().replace(/\/+$/, '');
}
export default function WebUi() {
  const [draft, setDraft] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(true);
  useEffect(() => { readWebUiUrl().then(saved => { if (saved) { setDraft(saved); setUrl(saved); setEditing(false); } }).catch(e => setError((e as Error).message)); }, []);
  async function open() {
    try {
      const parsed = validate(draft);
      await saveWebUiUrl(parsed);
      setUrl(parsed); setEditing(false); setError('');
    } catch (failure) { setError((failure as Error).message); }
  }
  return <View style={s.screen}>
    {editing || !url ? <View style={s.form}>
      <Text style={s.kicker}>YOUR FULL WEB WORKSPACE</Text><Text style={s.title}>Hermes WebUI</Text>
      <Text style={s.info}>All your website features remain available here: tasks, kanban, skills, memory, workspaces, profiles, settings, and logs. Enter the HTTPS URL of your separate Hermes WebUI, not the Hermes gateway URL.</Text>
      <Field label="WebUI URL" value={draft} onChangeText={setDraft} placeholder="https://my-webui.example.ts.net"/>
      <ErrorText error={error}/><Button label="Open WebUI" onPress={open}/>
    </View> : <>
      <View style={s.toolbar}><Text style={s.address} numberOfLines={1}>{url}</Text><Button label="Change" subtle onPress={() => setEditing(true)}/></View>
      {Platform.OS === 'web' ? <View style={s.form}><Text style={s.info}>Open your WebUI in a browser tab. On iOS, it opens inside the app.</Text><Button label="Open in browser" onPress={() => Linking.openURL(url).catch(e => setError((e as Error).message))}/></View> : <NativeWebView url={url} onError={setError}/>}
      <ErrorText error={error}/>
    </>}
    <Nav />
  </View>;
}
function NativeWebView({ url, onError }: { url: string; onError: (message: string) => void }) {
  // WebView is native-only. The web preview uses an external browser instead.
  return <WebView source={{ uri: url }} originWhitelist={['https://*']} javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled={false}
    onError={event => onError(event.nativeEvent.description || 'WebUI could not load.')} style={{ flex: 1, backgroundColor: colors.bg }} />;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.bg }, form: { flex: 1, padding: 20, justifyContent: 'center' }, kicker: { color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700' }, title: { color: colors.text, fontSize: 30, fontWeight: '800', marginVertical: 12 }, info: { color: colors.dim, lineHeight: 23, marginBottom: 24 }, toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: colors.panel }, address: { color: colors.dim, flex: 1, fontSize: 12 } });
