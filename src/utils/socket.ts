import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;

export const initSocket = (userId: string) => {
    if (!socket) {
        // Kết nối đến server
        socket = io(API_URL, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket?.id);
            // Join room cá nhân để nhận tin nhắn riêng
            if (userId) {
                socket?.emit('join', userId);
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            console.log('⚠️ Socket connection error:', err);
        });
    }
    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

// Hook để sử dụng socket trong components
export const useSocket = () => socket;
