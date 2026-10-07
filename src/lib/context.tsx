import { createContext, useContext, useEffect, useState } from 'react';
import { HermesGateway, type Bot, type Room } from './gateway';
import { readConnection, saveConnection, type Connection } from './credentials';

type State = {
  gateway: HermesGateway | null;
  bots: Bot[];
  rooms: Room[];
  status: string;
  loading: boolean;
  connect: (config: Connection) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
};
const Context = createContext<State | null>(null);

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const [gateway, setGateway] = useState<HermesGateway | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Not connected');

  async function connect(config: Connection) {
    const next = new HermesGateway(config.url, config.token, config.mode === 'basic' ? { username: config.username, password: config.password } : undefined);
    setStatus('Connecting…');
    try {
      await next.connect();
      const [roster, groups] = await Promise.all([next.profiles(), next.rooms().catch(() => ({ rooms: [] as Room[] }))]);
      await saveConnection(config);
      gateway?.close();
      setGateway(next);
      setBots(roster.profiles);
      setRooms(groups.rooms);
      setStatus('Connected');
      next.onEvent(event => { if (event.type === 'connection.closed') setStatus('Disconnected — reconnect in Settings'); });
    } catch (error) { next.close(); setStatus('Not connected'); throw error; }
  }
  async function disconnect() {
    await gateway?.logout();
    setGateway(null); setBots([]); setRooms([]); setStatus('Not connected');
    await saveConnection(null);
  }
  async function refresh() {
    if (!gateway) return;
    const [roster, groups] = await Promise.all([gateway.profiles(), gateway.rooms().catch(() => ({ rooms: [] as Room[] }))]);
    setBots(roster.profiles); setRooms(groups.rooms);
  }
  useEffect(() => {
    let active = true;
    readConnection().then(async config => { if (config && active) await connect(config); })
      .catch(() => { if (active) setStatus('Could not reconnect. Check Settings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // Restore once on mount; connect intentionally captures the initial gateway.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const state = { gateway, bots, rooms, status, loading, connect, disconnect, refresh };
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useGateway() {
  const value = useContext(Context);
  if (!value) throw new Error('GatewayProvider is missing');
  return value;
}
