import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useGateway } from '../lib/context';
import { Nav } from '../lib/ui';

const palette = { bg: '#10131d', panel: '#1b2030', gold: '#e9c871', dim: '#929caf', white: '#f4f0e9' };
export default function Home() {
  const { bots, rooms, gateway, status, loading, refresh } = useGateway();
  if (loading) return <View style={s.center}><ActivityIndicator color={palette.gold} /></View>;
  if (!gateway) return <View style={{ flex: 1, backgroundColor: palette.bg }}><View style={s.center}>
    <Text style={s.mark}>✦</Text><Text style={s.heading}>Your agents, anywhere.</Text>
    <Text style={s.subtitle}>Connect to a running Hermes gateway to chat with your bots and group rooms.</Text>
    <Pressable accessibilityRole="button" style={s.button} onPress={() => router.push('/settings')}><Text style={s.buttonLabel}>Connect gateway  →</Text></Pressable>
    <Text style={s.muted}>{status}</Text>
  </View><Nav /></View>;
  const rows: ({ kind: 'bot'; id: string; title: string; detail: string } | { kind: 'room'; id: string; title: string; detail: string })[] = [
    ...rooms.map(room => ({ kind: 'room' as const, id: room.room_id, title: room.name, detail: `${room.members.length} agents · Group chat` })),
    ...bots.map(bot => ({ kind: 'bot' as const, id: bot.name, title: bot.display_name || bot.name, detail: bot.description || bot.last_session?.preview || `@${bot.name}` })),
  ];
  return <View style={{ flex: 1, backgroundColor: palette.bg }}><View style={s.container}>
    <View style={s.top}><View><Text style={s.eyebrow}>YOUR WORKSPACE</Text><Text style={s.heading}>Bots <Text style={s.count}>{bots.length}</Text></Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Connection settings" style={s.settings} onPress={() => router.push('/settings')}><Text style={s.settingsText}>⚙</Text></Pressable></View>
    <View style={s.connection}><View style={s.dot}/><Text style={s.connectionText}>{status}</Text><Pressable accessibilityRole="button" onPress={() => refresh().catch(() => {})}><Text style={s.refresh}>Refresh</Text></Pressable></View>
    <View style={s.quickActions}><Pressable accessibilityRole="button" style={s.quick} onPress={() => router.push('/bot/new')}><Text style={s.quickText}>+ New bot</Text></Pressable><Pressable accessibilityRole="button" style={s.quick} onPress={() => router.push('/room/new')}><Text style={s.quickText}>+ Group chat</Text></Pressable></View>
    <FlatList data={rows} keyExtractor={item => `${item.kind}:${item.id}`} onRefresh={() => refresh().catch(() => {})} refreshing={false}
      ListEmptyComponent={<Text style={s.empty}>No bots yet. Create a profile in Hermes Desktop or the CLI, then refresh.</Text>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
        onPress={() => item.kind === 'bot' ? router.push({ pathname: '/bot/[name]', params: { name: item.id } }) : router.push({ pathname: '/room/[id]', params: { id: item.id } })}>
        <View style={[s.avatar, item.kind === 'room' && s.roomAvatar]}><Text style={s.avatarText}>{item.kind === 'room' ? '◎' : item.title.slice(0, 1).toUpperCase()}</Text></View>
        <View style={s.rowText}><Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text><Text style={s.rowDetail} numberOfLines={2}>{item.detail}</Text></View><Text style={s.chevron}>›</Text>
      </Pressable>}
      contentContainerStyle={{ paddingBottom: 28 }} />
  </View><Nav /></View>;
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: 20 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: palette.bg },
  mark: { color: palette.gold, fontSize: 54, marginBottom: 22 }, heading: { color: palette.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: palette.dim, textAlign: 'center', fontSize: 16, lineHeight: 24, marginTop: 14, marginBottom: 30 },
  button: { backgroundColor: palette.gold, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 14 }, buttonLabel: { color: '#151825', fontSize: 16, fontWeight: '800' }, muted: { color: palette.dim, marginTop: 18 },
  top: { paddingTop: 24, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { fontSize: 11, letterSpacing: 2, color: palette.gold, fontWeight: '700', marginBottom: 6 }, count: { color: palette.gold, fontSize: 18 },
  settings: { backgroundColor: palette.panel, borderRadius: 12, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, settingsText: { color: palette.gold, fontSize: 23 },
  connection: { backgroundColor: palette.panel, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 14 }, dot: { width: 8, height: 8, backgroundColor: '#7ed5aa', borderRadius: 4, marginRight: 9 }, connectionText: { color: palette.dim, flex: 1 }, refresh: { color: palette.gold, fontWeight: '700' },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 13 }, quick: { flex: 1, backgroundColor: palette.panel, borderRadius: 12, padding: 13, alignItems: 'center' }, quickText: { color: palette.gold, fontWeight: '700' },
  row: { padding: 13, backgroundColor: palette.panel, borderRadius: 16, marginBottom: 9, flexDirection: 'row', alignItems: 'center' }, avatar: { width: 49, height: 49, borderRadius: 15, backgroundColor: '#3f3c38', alignItems: 'center', justifyContent: 'center', marginRight: 13 }, roomAvatar: { backgroundColor: '#263b48' }, avatarText: { color: palette.gold, fontSize: 24, fontWeight: '700' }, rowText: { flex: 1 }, rowTitle: { color: palette.white, fontWeight: '700', fontSize: 16 }, rowDetail: { color: palette.dim, fontSize: 12, lineHeight: 17, marginTop: 3 }, chevron: { color: palette.gold, fontSize: 28, marginLeft: 8 }, empty: { color: palette.dim, marginTop: 32, textAlign: 'center', lineHeight: 23 },
});
