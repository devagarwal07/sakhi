import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

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
            const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
            if (!token) return;

            // ── Connect to /rides namespace — matches backend socket server ──
            const socket = io(`${API_BASE_URL}/rides`, {
                auth: { token },
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2000,
            });

            socket.on('connect', () => {
                setIsConnected(true);
                console.log('[Socket] Connected to /rides:', socket.id);
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
        const onJoined = ({ ride_id }) => {
            if (ride_id === rideId) {
                socketRef.current?.off('joined', onJoined);
                socketRef.current?.off('error', onError);
                resolve();
            }
        };
        const onError = (err) => {
            socketRef.current?.off('joined', onJoined);
            socketRef.current?.off('error', onError);
            reject(new Error(err?.message ?? 'Room join failed'));
        };
        socketRef.current.once('joined', onJoined);
        socketRef.current.once('error', onError);
        socketRef.current.emit('rider:join_ride', { ride_id: rideId });

        // Timeout safety — resolve anyway after 5s to not block the booking flow
        setTimeout(() => {
            socketRef.current?.off('joined', onJoined);
            socketRef.current?.off('error', onError);
            resolve();
        }, 5000);
    });

    const on = (event, callback) => {
        socketRef.current?.on(event, callback);
    };

    const off = (event, callback) => {
        socketRef.current?.off(event, callback);
    };

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
