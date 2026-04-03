import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Convenience hook: subscribe to a socket event for the lifetime of the component.
 * Automatically cleans up on unmount.
 *
 * Usage:
 *   useSocketEvent('chat:message', (payload) => { ... });
 *   useSocketEvent('ride:status_update', (payload) => { ... });
 */
export default function useSocketEvent(event, handler) {
  const { on, off } = useSocket();
  // Keep a stable ref so we always call the latest version of the handler
  // without needing it in the dependency array.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler = (...args) => handlerRef.current(...args);
    on(event, stableHandler);
    return () => off(event, stableHandler);
  }, [event, on, off]);
}
