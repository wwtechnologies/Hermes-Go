import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GatewayProvider } from '../lib/context';

export default function RootLayout() {
  return <GatewayProvider>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#111420' }, headerTintColor: '#f6e5ad', contentStyle: { backgroundColor: '#10131d' }, headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="index" options={{ title: 'HERMES  /  BOTS' }} />
      <Stack.Screen name="sessions" options={{ title: 'Sessions' }} />
      <Stack.Screen name="session/[id]" options={{ title: 'Conversation' }} />
      <Stack.Screen name="routines" options={{ title: 'Routines' }} />
      <Stack.Screen name="routine/new" options={{ title: 'New routine' }} />
      <Stack.Screen name="webui" options={{ title: 'Hermes WebUI' }} />
      <Stack.Screen name="more" options={{ title: 'More' }} />
      <Stack.Screen name="settings" options={{ title: 'Connect to Hermes' }} />
      <Stack.Screen name="bot/[name]" options={{ title: 'Bot Chat' }} />
      <Stack.Screen name="bot/new" options={{ title: 'New bot' }} />
      <Stack.Screen name="bot/edit" options={{ title: 'Edit bot' }} />
      <Stack.Screen name="room/[id]" options={{ title: 'Group Chat' }} />
      <Stack.Screen name="room/new" options={{ title: 'New group chat' }} />
    </Stack>
  </GatewayProvider>;
}
