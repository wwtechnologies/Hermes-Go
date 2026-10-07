import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useGateway } from '../../lib/context';
import { Button, colors, ErrorText, Field, Page } from '../../lib/ui';

export default function NewRoom() {
  const { gateway, bots, refresh } = useGateway();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function create() {
    if (!gateway || !name.trim() || selected.length < 2 || selected.length > 6) { setError('Enter a name and select 2–6 agents.'); return; }
    setBusy(true); setError('');
    const roomId = `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    try {
      const result = await gateway.createRoom(name.trim(), bots.filter(bot => selected.includes(bot.name)), roomId);
      if (!result.room?.room_id) throw new Error('Gateway did not confirm room creation.');
      await refresh(); router.replace({ pathname: '/room/[id]', params: { id: result.room.room_id } });
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  return <Page title="New group chat" subtitle="Bring two to six bots from this gateway into a shared room.">
    <Field label="Room name" value={name} onChangeText={setName} placeholder="Project Team"/>
    <Text style={s.label}>MEMBERS · {selected.length} SELECTED</Text>
    {bots.map(bot => <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(bot.name) }} key={bot.name} style={[s.bot, selected.includes(bot.name) && s.selected]} onPress={() => setSelected(current => current.includes(bot.name) ? current.filter(item => item !== bot.name) : current.length < 6 ? [...current, bot.name] : current)}>
      <Text style={s.check}>{selected.includes(bot.name) ? '✓' : '+'}</Text><Text style={s.name}>{bot.display_name || bot.name}</Text>
    </Pressable>)}
    <ErrorText error={error}/><Button label={busy ? 'Creating…' : 'Create group chat'} disabled={busy || selected.length < 2} onPress={create}/>
  </Page>;
}
const s = StyleSheet.create({ label: { color: colors.gold, fontWeight: '800', fontSize: 11, letterSpacing: 1, marginVertical: 10 }, bot: { backgroundColor: colors.panel, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, marginBottom: 8 }, selected: { borderColor: colors.gold }, check: { color: colors.gold, fontWeight: '800', width: 30, fontSize: 18 }, name: { color: colors.text, fontSize: 15, fontWeight: '700' } });
