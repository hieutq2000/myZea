import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;
let currentUserId: string | null = null;

// ============ SOCKET INITIALIZATION ============

export const initSocket = (userId: string) => {
    if (!socket) {
        currentUserId = userId;

        // Kết nối đến server
        socket = io(API_URL, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket?.id);
            // Đăng ký user online
            if (userId) {
                socket?.emit('userOnline', { userId });
            }
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            console.log('⚠️ Socket connection error:', err.message);
        });

        // Reconnect handler
        socket.on('reconnect', () => {
            console.log('🔄 Socket reconnected');
            if (currentUserId) {
                socket?.emit('userOnline', { userId: currentUserId });
            }
        });
    }
    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket && currentUserId) {
        socket.emit('userOffline', { userId: currentUserId });
        socket.disconnect();
        socket = null;
        currentUserId = null;
    }
};

// ============ TYPING INDICATOR ============

let typingTimeout: NodeJS.Timeout | null = null;

/**
 * Emit typing status to partner
 * @param conversationId - ID của conversation
 * @param partnerId - ID của người nhận (for 1-1 chat)
 * @param isTyping - true when user starts typing, false when stops
 */
export const emitTyping = (conversationId: string, partnerId: string, isTyping: boolean) => {
    if (!socket || !currentUserId) return;

    socket.emit('typing', {
        conversationId,
        partnerId,
        userId: currentUserId,
        isTyping
    });
};

/**
 * Smart typing handler - auto stops typing after 2 seconds of inactivity
 */
export const handleTypingInput = (conversationId: string, partnerId: string) => {
    if (!socket || !currentUserId) return;

    // Clear previous timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }

    // Emit typing start
    emitTyping(conversationId, partnerId, true);

    // Auto stop typing after 2 seconds
    typingTimeout = setTimeout(() => {
        emitTyping(conversationId, partnerId, false);
    }, 2000);
};

/**
 * Stop typing indicator (call when message is sent)
 */
export const stopTyping = (conversationId: string, partnerId: string) => {
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
    emitTyping(conversationId, partnerId, false);
};

// ============ CONVERSATION ROOM ============

/**
 * Join a conversation room to receive messages
 */
export const joinConversation = (conversationId?: string, groupId?: string) => {
    if (!socket) return;
    socket.emit('joinConversation', { conversationId, groupId });
};

/**
 * Leave a conversation room
 */
export const leaveConversation = (conversationId?: string, groupId?: string) => {
    if (!socket) return;
    socket.emit('leaveConversation', { conversationId, groupId });
};

// ============ MESSAGE SEEN STATUS ============

/**
 * Mark a message as seen and notify sender
 */
export const markMessageAsSeen = (messageId: string, conversationId: string, partnerId: string) => {
    if (!socket || !currentUserId) return;

    socket.emit('messageSeen', {
        messageId,
        conversationId,
        userId: currentUserId,
        partnerId
    });
};

/**
 * Mark all messages in a conversation as seen
 */
export const markConversationAsSeen = (messageIds: string[], conversationId: string, partnerId: string) => {
    if (!socket || !currentUserId) return;

    // Mark last message as seen (server will handle the rest)
    if (messageIds.length > 0) {
        markMessageAsSeen(messageIds[messageIds.length - 1], conversationId, partnerId);
    }
};

// ============ EVENT LISTENERS ============

/**
 * Listen for typing events
 */
export const onUserTyping = (callback: (data: { conversationId: string; userId: string; isTyping: boolean }) => void) => {
    if (!socket) return () => { };
    socket.on('userTyping', callback);
    return () => socket?.off('userTyping', callback);
};

/**
 * Listen for user status changes (online/offline)
 */
export const onUserStatusChange = (callback: (data: { userId: string; status: 'online' | 'offline'; lastSeen: string | null }) => void) => {
    if (!socket) return () => { };
    socket.on('userStatusChange', callback);
    return () => socket?.off('userStatusChange', callback);
};

/**
 * Listen for message seen acknowledgements
 */
export const onMessageSeen = (callback: (data: { messageId: string; conversationId: string; seenBy: string; seenAt: string }) => void) => {
    if (!socket) return () => { };
    socket.on('messageSeenAck', callback);
    return () => socket?.off('messageSeenAck', callback);
};

/**
 * Listen for new messages
 */
export const onNewMessage = (callback: (data: any) => void) => {
    if (!socket) return () => { };
    socket.on('newMessage', callback);
    return () => socket?.off('newMessage', callback);
};

// ============ HOOK ============

// Hook để sử dụng socket trong components
export const useSocket = () => socket;

// Get current user ID
export const getCurrentSocketUserId = () => currentUserId;
