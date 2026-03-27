import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS, DEV_BYPASS_AUTH } from '../utils/constants';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Skip real socket connection in dev bypass mode
        if (DEV_BYPASS_AUTH) {
            console.log('[DEV] SocketProvider — skipping connection in bypass mode');
            return;
        }

        if (!isAuthenticated) {
            // Disconnect if the user logs out
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        const connectSocket = async () => {
            const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            if (!token) return;

            const socket = io(API_BASE_URL, {
                auth: { token },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2000,
            });

            socket.on('connect', () => {
                setIsConnected(true);
                console.log('[Socket] Connected:', socket.id);
            });

            socket.on('disconnect', (reason) => {
                setIsConnected(false);
                console.log('[Socket] Disconnected:', reason);
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

    // In dev mode, emit/on/off are no-ops (just log)
    const emit = (event, data) => {
        if (DEV_BYPASS_AUTH) {
            console.log('[DEV Socket] emit:', event, data);
            return;
        }
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        } else {
            console.warn('[Socket] Cannot emit — not connected');
        }
    };

    const on = (event, callback) => {
        if (!DEV_BYPASS_AUTH) socketRef.current?.on(event, callback);
    };

    const off = (event, callback) => {
        if (!DEV_BYPASS_AUTH) socketRef.current?.off(event, callback);
    };

    return (
        <SocketContext.Provider value={{ socket: socketRef, emit, on, off, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
    return ctx;
}
