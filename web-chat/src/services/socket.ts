import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://api.data5g.site';

let socket: Socket | null = null;

export const initSocket = (token: string) => {
    if (socket?.connected) {
        return socket;
    }

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('✅ Socket connected:', socket?.id);

        // IMPORTANT: Join room with userId to receive messages
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.id) {
                    socket?.emit('join', user.id);
                    console.log('📍 Joined room:', user.id);
                }
            } catch (e) {
                console.error('Failed to parse user:', e);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (error) => {
        console.error('🔴 Socket connection error:', error);
    });

    return socket;
};

export const getSocket = () => {
    if (!socket) {
        throw new Error('Socket not initialized. Call initSocket first.');
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
