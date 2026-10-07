import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

export const colors = { bg: '#10131d', panel: '#1b2030', inset: '#121723', gold: '#e9c871', text: '#f4f0e9', dim: '#929caf', error: '#f49d9d', line: '#353c51' };
export function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <View style={styles.page}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
    <Text style={styles.kicker}>HERMES / MOBILE</Text><Text style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}{children}
  </ScrollView><Nav /></View>;
}
export function Nav() {
  const items = [{ title: 'Bots', path: '/' }, { title: 'Sessions', path: '/sessions' }, { title: 'Routines', path: '/routines' }, { title: 'WebUI', path: '/webui' }, { title: 'More', path: '/more' }];
  return <View style={styles.nav}>{items.map(item => <Pressable key={item.path} accessibilityRole="button" style={styles.navItem} onPress={() => router.replace(item.path as never)}><Text style={styles.navText}>{item.title}</Text></Pressable>)}</View>;
}
export function Button({ label, onPress, disabled, subtle, destructive }: { label: string; onPress: () => void; disabled?: boolean; subtle?: boolean; destructive?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, subtle && styles.subtle, disabled && { opacity: 0.45 }]}><Text style={[styles.buttonText, subtle && { color: destructive ? colors.error : colors.gold }]}>{label}</Text></Pressable>;
}
export function Field({ label, value, onChangeText, placeholder, multiline }: { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string; multiline?: boolean }) {
  return <View style={{ marginBottom: 14 }}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} autoCapitalize="sentences" multiline={multiline} style={[styles.field, multiline && { minHeight: 95, textAlignVertical: 'top' }]} placeholder={placeholder} placeholderTextColor={colors.dim} value={value} onChangeText={onChangeText} /></View>;
}
export function ErrorText({ error }: { error: string }) { return error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null; }
export const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.bg }, scroll: { padding: 20, paddingBottom: 35, flexGrow: 1 }, kicker: { color: colors.gold, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginTop: 10 }, title: { color: colors.text, fontSize: 29, fontWeight: '800', marginTop: 5, marginBottom: 10 }, subtitle: { color: colors.dim, lineHeight: 21, marginBottom: 20 }, nav: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, paddingBottom: 10 }, navItem: { flex: 1, alignItems: 'center', paddingVertical: 14 }, navText: { color: colors.gold, fontWeight: '700', fontSize: 12 }, button: { backgroundColor: colors.gold, borderRadius: 12, padding: 14, alignItems: 'center', marginVertical: 5 }, subtle: { backgroundColor: colors.panel }, buttonText: { color: colors.bg, fontWeight: '800' }, label: { color: colors.text, fontWeight: '700', marginBottom: 7 }, field: { backgroundColor: colors.inset, borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: 13, color: colors.text, fontSize: 16 }, error: { color: colors.error, marginVertical: 10, lineHeight: 20 } });
