import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGateway } from '../../lib/context';
import { Button, colors, ErrorText, Field, Page } from '../../lib/ui';

const schedules = [{ label: 'Hourly', value: 'every 1h' }, { label: 'Daily · 9 AM', value: '0 9 * * *' }, { label: 'Weekdays · 9 AM', value: '0 9 * * 1-5' }, { label: 'Weekly · Monday', value: '0 9 * * 1' }];
export default function NewRoutine() {
  const { profile } = useLocalSearchParams<{ profile: string }>();
  const { gateway } = useGateway();
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [schedule, setSchedule] = useState(schedules[1].value);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!gateway || !profile || !name.trim() || !prompt.trim() || !schedule.trim()) { setError('Enter a name, task, and schedule.'); return; }
    setBusy(true); setError('');
    try {
      const result = await gateway.addRoutine(profile, name.trim(), schedule.trim(), prompt.trim());
      if (result.error || result.success === false) throw new Error(result.error || 'Routine was not created.');
      router.replace('/routines');
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  return <Page title="New routine" subtitle={`Schedule work for ${profile || 'an agent'} and deliver its output into Bot Chat.`}>
    <Field label="Routine name" value={name} onChangeText={setName} placeholder="Morning briefing"/>
    <Field label="What should this bot do?" value={prompt} onChangeText={setPrompt} multiline placeholder="Summarize my inbox and flag urgent messages."/>
    <Text style={s.label}>SCHEDULE</Text><View style={s.options}>{schedules.map(option => <Pressable accessibilityRole="button" key={option.value} style={[s.option, schedule === option.value && s.selected]} onPress={() => setSchedule(option.value)}><Text style={s.text}>{option.label}</Text></Pressable>)}</View>
    <Field label="Schedule expression (advanced)" value={schedule} onChangeText={setSchedule} placeholder="0 9 * * *"/>
    <Text style={s.help}>Cron times use the gateway’s local timezone. Check the next-run time after saving.</Text>
    <ErrorText error={error}/><Button label={busy ? 'Creating…' : 'Create routine'} disabled={busy} onPress={save}/>
  </Page>;
}
const s = StyleSheet.create({ label: { color: colors.gold, fontSize: 11, fontWeight: '800', marginBottom: 8 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 }, option: { backgroundColor: colors.panel, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.line }, selected: { borderColor: colors.gold }, text: { color: colors.text }, help: { color: colors.dim, fontSize: 12, lineHeight: 18, marginBottom: 10 } });
