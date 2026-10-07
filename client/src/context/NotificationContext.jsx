import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';

export const NotificationContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
const MAX_ITEMS = 20;

export function NotificationProvider({ children }) {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) return undefined;

    const socket = io(SOCKET_URL, { auth: { token: accessToken }, withCredentials: true });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification', (notification) => {
      setItems((prev) =>
        [{ ...notification, id: crypto.randomUUID(), read: false }, ...prev].slice(0, MAX_ITEMS),
      );
      toast(notification.message, { icon: '🔔' });
    });

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [accessToken]);

  const markAllRead = useCallback(
    () => setItems((prev) => prev.map((item) => ({ ...item, read: true }))),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      connected,
      unreadCount: items.filter((item) => !item.read).length,
      markAllRead,
      clear,
    }),
    [items, connected, markAllRead, clear],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
