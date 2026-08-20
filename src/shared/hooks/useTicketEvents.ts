import { useEffect } from 'react';

export function useTicketEvents(onEvent: (event: any) => void) {
  useEffect(() => {
    let evtSource: EventSource | null = null;
    let reconnectTimer: any;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000; // max 30 seconds
    const initialReconnectDelay = 1000; // start with 1 second

    const connect = () => {
      if (evtSource) {
        evtSource.close();
      }

      evtSource = new EventSource('/api/events');

      evtSource.onopen = () => {
        // Reset reconnect attempts on successful connection
        reconnectAttempts = 0;
      };

      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onEvent(data);
        } catch (e) {
          console.error('SSE Parse Error:', e);
        }
      };

      evtSource.onerror = (err) => {
        console.error('SSE Error:', err);
        if (evtSource) {
          evtSource.close();
        }
        
        // Exponential backoff for reconnection
        const delay = Math.min(initialReconnectDelay * Math.pow(2, reconnectAttempts), maxReconnectDelay);
        reconnectAttempts++;
        
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      if (evtSource) {
        evtSource.close();
      }
      clearTimeout(reconnectTimer);
    };
  }, [onEvent]);
}
