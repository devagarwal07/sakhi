import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Convenience hook: subscribe to a socket event for the lifetime of the component.
 *
 * Usage:
 *   useSocketEvent('ride_assigned', (payload) => { ... });
 */
export default function useSocketEvent(event, handler) {
    const { on, off } = useSocket();
    // Keep a stable ref so we can always call the latest version of handler
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        const stableHandler = (...args) => handlerRef.current(...args);
        on(event, stableHandler);
        return () => off(event, stableHandler);
    }, [event, on, off]);
}
