import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useGateway } from '../lib/context';
import { colors, Page } from '../lib/ui';

export default function More() {
  const { bots, status } = useGateway();
  const destinations = [
    { title: 'Gateway connection', detail: status, route: '/settings' },
    { title: 'Full Hermes WebUI', detail: 'Tasks, kanban, memory, skills, spaces, settings, and logs', route: '/webui' },
    { title: 'New bot', detail: 'Create an independent profile', route: '/bot/new' },
    { title: 'New group chat', detail: 'Coordinate 2–6 agents on this gateway', route: '/room/new' },
  ];
  return <Page title="More" subtitle="Your Hermes workspace and agents.">
    {destinations.map(item => <Pressable accessibilityRole="button" key={item.title} onPress={() => router.push(item.route as never)} style={s.row}><View style={{ flex: 1 }}><Text style={s.title}>{item.title}</Text><Text style={s.detail}>{item.detail}</Text></View><Text style={s.arrow}>›</Text></Pressable>)}
    {!!bots.length && <><Text style={s.section}>AGENT PROFILES</Text>{bots.map(bot => <Pressable accessibilityRole="button" key={bot.name} onPress={() => router.push({ pathname: '/bot/edit', params: { name: bot.name } })} style={s.row}><View style={{ flex: 1 }}><Text style={s.title}>{bot.display_name || bot.name}</Text><Text style={s.detail}>{bot.description || `@${bot.name}`}</Text></View><Text style={s.arrow}>›</Text></Pressable>)}</>}
    <Text style={s.foot}>Native screens cover chats, rooms, sessions, profiles, and routines. Open the full WebUI for the remaining website tools. WebUI sign-in happens in its own page, not through the gateway token.</Text>
  </Page>;
}
const s = StyleSheet.create({ row: { backgroundColor: colors.panel, borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, title: { color: colors.text, fontWeight: '700', fontSize: 16 }, detail: { color: colors.dim, marginTop: 4, lineHeight: 18, fontSize: 12 }, arrow: { color: colors.gold, fontSize: 25, marginLeft: 8 }, section: { color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: '800', marginTop: 24, marginBottom: 10 }, foot: { color: colors.dim, fontSize: 12, lineHeight: 19, marginTop: 25 } });
