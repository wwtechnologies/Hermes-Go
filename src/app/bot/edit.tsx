import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useGateway } from '../../lib/context';
import { Button, colors, ErrorText, Field, Page } from '../../lib/ui';

export default function EditBot() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { gateway, refresh } = useGateway();
  const [description, setDescription] = useState('');
  const [soul, setSoul] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!gateway || !name) return;
    let active = true;
    gateway.describeBot(name).then(detail => { if (active) { setDescription(detail.description); setSoul(detail.soul); setModel([detail.model.provider, detail.model.default].filter(Boolean).join(' · ')); } }).catch(failure => { if (active) setError((failure as Error).message); });
    return () => { active = false; };
  }, [gateway, name]);
  async function save() {
    if (!gateway || !name || busy) return;
    setBusy(true); setError('');
    try { const result = await gateway.configureBot(name, { description, soul }); if (!result.ok) throw new Error('Gateway did not confirm the update.'); await refresh(); router.back(); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  return <Page title={`Edit ${name}`} subtitle="Update the bot’s description and standing instructions.">
    <Text style={{ color: colors.dim, marginBottom: 18 }}>Model: {model || 'Inherited from gateway'}</Text>
    <Field label="Description" value={description} onChangeText={setDescription} multiline/>
    <Field label="SOUL.md · bot instructions" value={soul} onChangeText={setSoul} multiline/>
    <ErrorText error={error}/><Button label={busy ? 'Saving…' : 'Save profile'} disabled={busy} onPress={save}/>
  </Page>;
}
