import { io, Socket } from 'socket.io-client';
import { tokenStore } from './axios';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (socket && socket.connected) return socket;

  const baseURL = import.meta.env.VITE_API_URL || window.location.origin;

  socket = io(baseURL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: { token: tokenStore.get() },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
  });

  socket.on('connect_error', (err) => {
    console.error('socket connect_error:', err.message);
  });

  return socket;
};

export const connectSocket = (): Socket => {
  const s = getSocket();
  // Always sync the latest token (e.g. after login)
  s.auth = { token: tokenStore.get() };
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
