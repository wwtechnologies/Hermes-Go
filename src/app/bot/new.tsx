import { useState } from 'react';
import { router } from 'expo-router';
import { useGateway } from '../../lib/context';
import { Button, ErrorText, Field, Page } from '../../lib/ui';

export default function NewBot() {
  const { gateway, refresh } = useGateway();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [soul, setSoul] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function create() {
    const slug = name.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]{1,39}$/.test(slug)) { setError('Use 2–40 lowercase letters, numbers, hyphens, or underscores; start with a letter.'); return; }
    if (!gateway) { setError('Connect a gateway first.'); return; }
    setBusy(true); setError('');
    try {
      const result = await gateway.createBot(slug, description.trim(), soul.trim());
      if (!result.ok) throw new Error('The gateway did not confirm bot creation.');
      await refresh();
      router.replace({ pathname: '/bot/[name]', params: { name: result.name } });
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  return <Page title="New bot" subtitle="A bot is its own Hermes profile, with independent settings, memory, and a permanent chat.">
    <Field label="Profile name" value={name} onChangeText={setName} placeholder="researcher"/>
    <Field label="Description" value={description} onChangeText={setDescription} placeholder="Researches topics and summarizes findings"/>
    <Field label="Instructions (optional)" value={soul} onChangeText={setSoul} placeholder="You are a careful research assistant…" multiline/>
    <ErrorText error={error}/><Button label={busy ? 'Creating…' : 'Create bot'} disabled={busy} onPress={create}/>
  </Page>;
}
