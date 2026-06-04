import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    // Track all listeners so we can re-register them after a reconnect
    const listenersRef = useRef({}); // { [eventName]: Set<handler> }

    useEffect(() => {
        if (!isAuthenticated) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        const connectSocket = async () => {
            let token = null;
            try {
                token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            } catch (e) {
                if (!e.message?.includes('User interaction is not allowed')) {
                    console.error('[Socket] Error reading token:', e);
                }
            }
            if (!token) return;

            // ── Connect to /rides namespace — matches backend socket server ──
            const socket = io(`${API_BASE_URL}/rides`, {
                auth: { token },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2000,
            });

            // Register any listeners that were added before socket was initialized
            Object.entries(listenersRef.current).forEach(([event, handlers]) => {
                handlers.forEach((handler) => socket.on(event, handler));
            });

            socket.on('connect', () => {
                setIsConnected(true);
            });

            socket.on('disconnect', (reason) => {
                setIsConnected(false);
            });

            socket.on('connect_error', (err) => {
                console.warn('[Socket] Connection error:', err.message);
            });

            socketRef.current = socket;
        };

        connectSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [isAuthenticated]);

    const emit = (event, data) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        } else {
            console.warn('[Socket] Cannot emit — not connected');
        }
    };

    // Join a specific ride room so we receive ride_assigned, driver_location, etc.
    const joinRideRoom = (rideId) => new Promise((resolve, reject) => {
        if (!socketRef.current?.connected) {
            console.warn('[Socket] Cannot join room — not connected');
            return reject(new Error('Socket not connected'));
        }

        let settled = false;
        let timeoutHandle = null;

        const cleanup = () => {
            socketRef.current?.off('joined', onJoined);
            socketRef.current?.off('error', onError);
            if (timeoutHandle) clearTimeout(timeoutHandle);
        };

        const onJoined = ({ ride_id }) => {
            if (ride_id === rideId && !settled) {
                settled = true;
                cleanup();
                resolve();
            }
        };
        const onError = (err) => {
            if (!settled) {
                settled = true;
                cleanup();
                reject(new Error(err?.message ?? 'Room join failed'));
            }
        };

        socketRef.current.on('joined', onJoined);
        socketRef.current.on('error', onError);
        socketRef.current.emit('rider:join_ride', { ride_id: rideId });

        // Fallback: resolve after 5s — events still arrive via rider:<userId> personal room
        timeoutHandle = setTimeout(() => {
            if (!settled) {
                settled = true;
                cleanup();
                console.warn('[Socket] joinRideRoom timed out — relying on rider personal room for events');
                resolve();
            }
        }, 5000);
    });

    const on = useCallback((event, callback) => {
        // Track in listenersRef so they survive reconnects
        if (!listenersRef.current[event]) {
            listenersRef.current[event] = new Set();
        }
        listenersRef.current[event].add(callback);
        socketRef.current?.on(event, callback);
    }, []);

    const off = useCallback((event, callback) => {
        listenersRef.current[event]?.delete(callback);
        socketRef.current?.off(event, callback);
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef, emit, on, off, joinRideRoom, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
    return ctx;
}
