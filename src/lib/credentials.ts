import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Connection = { url: string; token: string; mode?: 'token' | 'basic'; username?: string; password?: string };
const KEY = 'hermes-mobile-connection';
const WEBUI_KEY = 'hermes-mobile-webui-url';
let webConnection: Connection | null = null;
let webUiUrl = '';

export async function readWebUiUrl(): Promise<string> {
  return Platform.OS === 'web' ? webUiUrl : (await SecureStore.getItemAsync(WEBUI_KEY)) || '';
}
export async function saveWebUiUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') { webUiUrl = url; return; }
  if (url) await SecureStore.setItemAsync(WEBUI_KEY, url);
  else await SecureStore.deleteItemAsync(WEBUI_KEY);
}

// Web preview deliberately keeps the token only in memory, never localStorage.
export async function readConnection(): Promise<Connection | null> {
  if (Platform.OS === 'web') return webConnection;
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Connection; } catch { return null; }
}
export async function saveConnection(value: Connection | null) {
  const safe = value ? { url: value.url, token: value.mode === 'basic' ? '' : value.token, mode: value.mode, username: value.username } : null;
  if (Platform.OS === 'web') { webConnection = safe; return; }
  if (safe) await SecureStore.setItemAsync(KEY, JSON.stringify(safe));
  else await SecureStore.deleteItemAsync(KEY);
}
