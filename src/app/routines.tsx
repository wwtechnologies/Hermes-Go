import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useGateway } from '../lib/context';
import type { CronJob } from '../lib/gateway';
import { Button, colors, ErrorText, Page } from '../lib/ui';

export default function Routines() {
  const { gateway, bots } = useGateway();
  const [selection, setSelection] = useState('default');
  const profile = bots.some(bot => bot.name === selection) ? selection : bots[0]?.name || 'default';
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!gateway) return;
    try { const result = await gateway.routineJobs(profile); if (result.error || result.success === false) throw new Error(result.error || 'Could not load jobs'); setJobs(result.jobs || []); setError(''); }
    catch (failure) { setError((failure as Error).message); }
  }, [gateway, profile]);
  useEffect(() => {
    if (!gateway) return;
    let active = true;
    gateway.routineJobs(profile).then(result => {
      if (!active) return;
      if (result.error || result.success === false) throw new Error(result.error || 'Could not load jobs');
      setJobs(result.jobs || []); setError('');
    }).catch(failure => { if (active) setError((failure as Error).message); });
    return () => { active = false; };
  }, [gateway, profile]);
  async function act(action: 'pause' | 'resume' | 'remove', job: CronJob) {
    if (!gateway || busy) return;
    setBusy(job.job_id); setError('');
    try { const result = await gateway.routineAction(profile, action, job.job_id); if (result.error || result.success === false) throw new Error(result.error || 'Job update failed'); await load(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(''); }
  }
  function remove(job: CronJob) {
    if (Platform.OS === 'web') { act('remove', job); return; }
    Alert.alert('Delete routine?', `${job.name} will stop running and be removed.`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => act('remove', job) }]);
  }
  return <Page title="Routines" subtitle="Scheduled work for each bot, delivered into its Bot Chat.">
    {!gateway ? <Button label="Connect gateway" onPress={() => router.push('/settings')}/> : <>
      <View style={s.pills}>{bots.map(bot => <Pressable accessibilityRole="button" key={bot.name} onPress={() => setSelection(bot.name)} style={[s.pill, profile === bot.name && s.selected]}><Text style={s.pillText}>{bot.display_name || bot.name}</Text></Pressable>)}</View>
      <Button label="+ New routine" onPress={() => router.push({ pathname: '/routine/new', params: { profile } })}/><Button label="Refresh" subtle onPress={() => { load(); }}/><ErrorText error={error}/>
      {jobs.map(job => <View key={job.job_id} style={s.card}>
        <View style={s.row}><Text style={s.name}>{job.name.replace(/^\[bot:[^\]]+\]\s*/, '')}</Text><Text style={{ color: job.enabled ? '#7ed5aa' : colors.dim }}>{job.enabled ? 'Active' : 'Paused'}</Text></View>
        <Text style={s.detail}>{job.schedule}{job.next_run_at ? ` · Next ${job.next_run_at}` : ''}</Text><Text style={s.detail} numberOfLines={2}>{job.prompt_preview || 'Scheduled bot task'}</Text>
        <View style={s.actions}><Pressable accessibilityRole="button" disabled={!!busy} onPress={() => act(job.enabled ? 'pause' : 'resume', job)}><Text style={s.link}>{job.enabled ? 'Pause' : 'Resume'}</Text></Pressable><Pressable accessibilityRole="button" disabled={!!busy} onPress={() => remove(job)}><Text style={[s.link, { color: colors.error }]}>Delete</Text></Pressable></View>
      </View>)}
      {!jobs.length && !error && <Text style={s.empty}>No scheduled jobs for this bot.</Text>}
    </>}
  </Page>;
}
const s = StyleSheet.create({ pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }, pill: { padding: 10, backgroundColor: colors.panel, borderRadius: 18, borderWidth: 1, borderColor: colors.line }, selected: { borderColor: colors.gold }, pillText: { color: colors.text }, card: { backgroundColor: colors.panel, borderRadius: 14, padding: 15, marginTop: 10 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, name: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 }, detail: { color: colors.dim, marginTop: 5, fontSize: 12, lineHeight: 18 }, actions: { flexDirection: 'row', gap: 26, marginTop: 14 }, link: { color: colors.gold, fontWeight: '700' }, empty: { color: colors.dim, textAlign: 'center', marginTop: 24 } });
