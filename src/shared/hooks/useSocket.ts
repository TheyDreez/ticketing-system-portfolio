import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Singleton socket connection
const socket = io('/', {
  transports: ['websocket', 'polling'],
  autoConnect: false,
  withCredentials: true
});

export function useSocket() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket, isConnected };
}
