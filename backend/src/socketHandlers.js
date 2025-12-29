/**
 * Socket Handlers
 * Xử lý các sự kiện Socket.IO cho Chat realtime
 */

const { Expo } = require('expo-server-sdk');
const { v4: uuidv4 } = require('uuid');
const expo = new Expo();

module.exports = function (io, pool) {
    // Track online users: Map<userId, Set<socketId>>
    const onlineUsers = new Map();

    // Track typing status: Map<conversationId, Map<userId, timeout>>
    const typingUsers = new Map();

    // Helper function to check if user is online
    function isUserOnline(userId) {
        return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
    }

    // Helper to get all socket IDs for a user
    function getUserSockets(userId) {
        return onlineUsers.get(userId) || new Set();
    }

    // Helper to broadcast user online status to their contacts
    async function broadcastUserStatus(userId, status) {
        try {
            // Get all conversations this user is part of
            const [conversations] = await pool.execute(`
                SELECT DISTINCT cp2.user_id as partner_id
                FROM conversation_participants cp1
                JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
                WHERE cp1.user_id = ? AND cp2.user_id != ?
            `, [userId, userId]);

            // Broadcast to each partner
            for (const conv of conversations) {
                const partnerSockets = getUserSockets(conv.partner_id);
                partnerSockets.forEach(socketId => {
                    io.to(socketId).emit('userStatusChange', {
                        userId,
                        status,
                        lastSeen: status === 'offline' ? new Date().toISOString() : null
                    });
                });
            }
        } catch (e) {
            console.error('Broadcast status error:', e.message);
        }
    }

    io.on('connection', (socket) => {
        console.log('🔌 Socket connected:', socket.id);
        let currentUserId = null;

        // ============ USER ONLINE/OFFLINE ============

        // User joins (registers their userId)
        socket.on('userOnline', async (data) => {
            const { userId } = data;
            if (!userId) return;

            currentUserId = userId;

            // Add socket to user's set
            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
            }
            onlineUsers.get(userId).add(socket.id);

            // Update database status
            try {
                await pool.execute(
                    'UPDATE users SET status = ?, last_seen = NOW() WHERE id = ?',
                    ['online', userId]
                );
            } catch (e) { }

            // Broadcast online status to contacts
            broadcastUserStatus(userId, 'online');

            console.log(`👤 User ${userId} online (${onlineUsers.get(userId).size} connections)`);
        });

        // User explicitly goes offline
        socket.on('userOffline', async (data) => {
            const { userId } = data;
            if (!userId) return;

            // Remove this socket
            if (onlineUsers.has(userId)) {
                onlineUsers.get(userId).delete(socket.id);

                // If no more sockets, user is offline
                if (onlineUsers.get(userId).size === 0) {
                    onlineUsers.delete(userId);

                    try {
                        await pool.execute(
                            'UPDATE users SET status = ?, last_seen = NOW() WHERE id = ?',
                            ['offline', userId]
                        );
                    } catch (e) { }

                    broadcastUserStatus(userId, 'offline');
                }
            }
        });

        // Check specific user online status request (Fix for missing initial status)
        socket.on('checkUserOnline', async (data) => {
            const { userId } = data;
            if (!userId) return;

            const isOnline = isUserOnline(userId);
            let lastSeen = null;

            if (!isOnline) {
                try {
                    const [rows] = await pool.execute('SELECT last_seen FROM users WHERE id = ?', [userId]);
                    if (rows.length > 0) {
                        lastSeen = rows[0].last_seen;
                    }
                } catch (e) { }
            }

            // Respond only to the requester
            socket.emit('userStatusChange', {
                userId,
                status: isOnline ? 'online' : 'offline',
                lastSeen
            });
        });

        // ============ TYPING INDICATOR ============

        socket.on('typing', (data) => {
            const { conversationId, partnerId, userId, isTyping } = data;

            if (!conversationId || !userId) return;

            // Emit to the conversation room or specific partner
            if (partnerId) {
                // 1-1 chat: emit to partner's sockets
                const partnerSockets = getUserSockets(partnerId);
                partnerSockets.forEach(socketId => {
                    io.to(socketId).emit('userTyping', {
                        conversationId,
                        userId,
                        isTyping
                    });
                });
            } else {
                // Group chat: emit to conversation room
                socket.to(conversationId).emit('userTyping', {
                    conversationId,
                    userId,
                    isTyping
                });
            }
        });

        // ============ JOIN/LEAVE CONVERSATION ROOM ============

        socket.on('joinConversation', (data) => {
            const { conversationId, groupId } = data;
            const roomId = conversationId || groupId;
            if (roomId) {
                socket.join(roomId);
                console.log(`📥 Socket ${socket.id} joined room ${roomId}`);
            }
        });

        socket.on('leaveConversation', (data) => {
            const { conversationId, groupId } = data;
            const roomId = conversationId || groupId;
            if (roomId) {
                socket.leave(roomId);
                console.log(`📤 Socket ${socket.id} left room ${roomId}`);
            }
        });

        // ============ MESSAGE SEEN STATUS ============

        socket.on('messageSeen', async (data) => {
            const { messageId, conversationId, userId, partnerId } = data;

            if (!messageId || !userId) return;

            // Record in database
            try {
                await pool.execute(
                    'INSERT IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, NOW())',
                    [messageId, userId]
                );
            } catch (e) { }

            // Notify sender that their message was seen
            if (partnerId) {
                const partnerSockets = getUserSockets(partnerId);
                partnerSockets.forEach(socketId => {
                    io.to(socketId).emit('messageSeenAck', {
                        messageId,
                        conversationId,
                        seenBy: userId,
                        seenAt: new Date().toISOString()
                    });
                });
            } else if (conversationId) {
                // For groups
                socket.to(conversationId).emit('messageSeenAck', {
                    messageId,
                    conversationId,
                    seenBy: userId,
                    seenAt: new Date().toISOString()
                });
            }
        });

        // ============ REVOKE MESSAGE (Thu hồi tin nhắn) ============

        socket.on('revokeMessage', async (data) => {
            const { messageId, conversationId, userId } = data;

            if (!messageId || !userId) return;

            try {
                // Check if user is the sender
                const [msgs] = await pool.execute(
                    'SELECT sender_id, created_at FROM messages WHERE id = ?',
                    [messageId]
                );

                if (msgs.length === 0) return;

                if (msgs[0].sender_id !== userId) return; // Not the sender

                // Mark as revoked
                await pool.execute('UPDATE messages SET is_revoked = 1 WHERE id = ?', [messageId]);

                // Emit to room (everyone including sender)
                if (conversationId) {
                    io.in(conversationId).emit('messageRevoked', {
                        messageId,
                        conversationId
                    });
                    // Also try broadcasting to group ID just in case logic differs
                    socket.broadcast.to(conversationId).emit('messageRevoked', { messageId, conversationId });
                }

            } catch (e) {
                console.error('Revoke message error:', e);
            }
        });

        // ============ MESSAGE REACTIONS ============

        socket.on('addReaction', async (data) => {
            const { messageId, conversationId, groupId, userId, emoji } = data;

            if (!messageId || !userId || !emoji) return;

            const roomId = conversationId || groupId;

            try {
                // Get current reactions from database
                const [msgs] = await pool.execute(
                    'SELECT reactions FROM messages WHERE id = ?',
                    [messageId]
                );

                if (msgs.length === 0) return;

                let reactions = {};
                try {
                    reactions = JSON.parse(msgs[0].reactions || '{}');
                } catch (e) {
                    reactions = {};
                }

                // Add or update reaction
                // reactions format: { "emoji": [{ id, name, avatar }] }
                if (!reactions[emoji]) {
                    reactions[emoji] = [];
                }

                // Remove user from any existing reaction first (one reaction per user)
                Object.keys(reactions).forEach(key => {
                    reactions[key] = reactions[key].filter(r => r.id !== userId);
                    if (reactions[key].length === 0) {
                        delete reactions[key];
                    }
                });

                // Get user info
                const [users] = await pool.execute(
                    'SELECT id, name, avatar FROM users WHERE id = ?',
                    [userId]
                );

                if (users.length > 0) {
                    if (!reactions[emoji]) reactions[emoji] = [];
                    reactions[emoji].push({
                        id: users[0].id,
                        name: users[0].name,
                        avatar: users[0].avatar
                    });
                }

                // Save to database
                await pool.execute(
                    'UPDATE messages SET reactions = ? WHERE id = ?',
                    [JSON.stringify(reactions), messageId]
                );

                // Broadcast to room
                if (roomId) {
                    io.to(roomId).emit('messageReacted', {
                        messageId,
                        conversationId,
                        groupId,
                        reactions,
                        changedBy: userId,
                        action: 'add',
                        emoji
                    });
                }

                console.log(`👍 Reaction ${emoji} added to message ${messageId} by user ${userId}`);
            } catch (e) {
                console.error('Add reaction error:', e.message);
            }
        });

        socket.on('removeReaction', async (data) => {
            const { messageId, conversationId, groupId, userId, emoji } = data;

            if (!messageId || !userId) return;

            const roomId = conversationId || groupId;

            try {
                // Get current reactions from database
                const [msgs] = await pool.execute(
                    'SELECT reactions FROM messages WHERE id = ?',
                    [messageId]
                );

                if (msgs.length === 0) return;

                let reactions = {};
                try {
                    reactions = JSON.parse(msgs[0].reactions || '{}');
                } catch (e) {
                    reactions = {};
                }

                // Remove user's reaction
                if (emoji && reactions[emoji]) {
                    reactions[emoji] = reactions[emoji].filter(r => r.id !== userId);
                    if (reactions[emoji].length === 0) {
                        delete reactions[emoji];
                    }
                } else {
                    // Remove user from all reactions
                    Object.keys(reactions).forEach(key => {
                        reactions[key] = reactions[key].filter(r => r.id !== userId);
                        if (reactions[key].length === 0) {
                            delete reactions[key];
                        }
                    });
                }

                // Save to database
                await pool.execute(
                    'UPDATE messages SET reactions = ? WHERE id = ?',
                    [JSON.stringify(reactions), messageId]
                );

                // Broadcast to room
                if (roomId) {
                    io.to(roomId).emit('messageReacted', {
                        messageId,
                        conversationId,
                        groupId,
                        reactions,
                        changedBy: userId,
                        action: 'remove',
                        emoji
                    });
                }

                console.log(`👎 Reaction removed from message ${messageId} by user ${userId}`);
            } catch (e) {
                console.error('Remove reaction error:', e.message);
            }
        });

        // ============ PIN/UNPIN MESSAGE ============

        socket.on('pinMessage', async ({ conversationId, messageId, userId }) => {
            try {
                const pinId = uuidv4();
                await pool.execute(
                    'INSERT INTO pinned_messages (id, conversation_id, message_id, pinner_id) VALUES (?, ?, ?, ?)',
                    [pinId, conversationId, messageId, userId]
                );

                // Fetch message details
                const [rows] = await pool.execute(
                    'SELECT m.*, u.name as senderName, u.avatar as senderAvatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?',
                    [messageId]
                );

                if (rows.length > 0) {
                    io.to(conversationId).emit('messagePinned', {
                        conversationId,
                        message: rows[0],
                        pinnerId: userId,
                        pinId
                    });
                }
            } catch (error) {
                console.error('Pin message error:', error);
            }
        });

        socket.on('unpinMessage', async ({ conversationId, messageId }) => {
            try {
                await pool.execute(
                    'DELETE FROM pinned_messages WHERE conversation_id = ? AND message_id = ?',
                    [conversationId, messageId]
                );

                io.to(conversationId).emit('messageUnpinned', {
                    conversationId,
                    messageId
                });
            } catch (error) {
                console.error('Unpin message error:', error);
            }
        });

        // Helper: Send Push Notification
        async function sendPushNotification(userIds, title, body, data = {}) {
            if (!userIds || userIds.length === 0) return;
            try {
                const placeholders = userIds.map(() => '?').join(',');
                const [users] = await pool.execute(
                    `SELECT push_token FROM users WHERE id IN (${placeholders}) AND push_token IS NOT NULL`,
                    userIds
                );

                const messages = [];
                for (const user of users) {
                    if (!Expo.isExpoPushToken(user.push_token)) continue;
                    messages.push({
                        to: user.push_token,
                        sound: 'default',
                        title: title,
                        body: body,
                        data: data,
                    });
                }

                if (messages.length > 0) {
                    const chunks = expo.chunkPushNotifications(messages);
                    for (const chunk of chunks) {
                        try {
                            await expo.sendPushNotificationsAsync(chunk);
                        } catch (e) { console.error('Error sending push chunks:', e); }
                    }
                }
            } catch (error) {
                console.error('Error sending push notification:', error);
            }
        }

        // ============ NEW MESSAGE ============

        socket.on('sendMessage', async (data) => {
            const { conversationId, groupId, message, receiverId } = data;
            const roomId = conversationId || groupId;

            if (roomId && message) {
                // Broadcast to room (excluding sender)
                socket.to(roomId).emit('newMessage', {
                    ...message,
                    conversationId,
                    groupId
                });

                // Send Push Notification if receiver is offline (1-1 Chat)
                if (receiverId && !isUserOnline(receiverId)) {
                    const senderName = message.senderName || "Tin nhắn mới";
                    const msgBody = message.type === 'image' ? '📷 Đã gửi một ảnh' :
                        (message.type === 'sticker' ? '😊 Đã gửi một sticker' :
                            (message.type === 'video' ? '🎥 Đã gửi một video' : message.text));

                    const displayBody = msgBody && msgBody.length > 100 ? msgBody.substring(0, 100) + '...' : msgBody;

                    if (displayBody) {
                        sendPushNotification([receiverId], senderName, displayBody, { conversationId, type: 'chat' });
                    }
                }
            }
        });

        // ============ FORWARD MESSAGE ============

        socket.on('forwardMessage', async (data) => {
            const { originalMessage, targetConversationIds, targetGroupIds, senderId } = data;

            if (!originalMessage || !senderId) {
                socket.emit('forwardError', { error: 'Missing data' });
                return;
            }

            try {
                // Get sender info
                const [senders] = await pool.execute(
                    'SELECT id, name, avatar FROM users WHERE id = ?',
                    [senderId]
                );

                if (senders.length === 0) {
                    socket.emit('forwardError', { error: 'Sender not found' });
                    return;
                }

                const sender = senders[0];
                const forwardedResults = [];

                // Forward to individual conversations
                if (targetConversationIds && targetConversationIds.length > 0) {
                    for (const convId of targetConversationIds) {
                        const newMessageId = uuidv4();
                        const forwardedText = originalMessage.type === 'text'
                            ? originalMessage.text
                            : (originalMessage.type === 'image' ? '[Hình ảnh]' :
                                (originalMessage.type === 'sticker' ? '' : originalMessage.text));

                        // Insert forwarded message
                        await pool.execute(
                            `INSERT INTO messages (id, conversation_id, sender_id, content, type, image_url, created_at) 
                             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                            [
                                newMessageId,
                                convId,
                                senderId,
                                forwardedText,
                                originalMessage.type || 'text',
                                originalMessage.imageUrl || null
                            ]
                        );

                        // Update conversation last_message
                        await pool.execute(
                            `UPDATE conversations SET last_message_id = ?, updated_at = NOW() WHERE id = ?`,
                            [newMessageId, convId]
                        );

                        // Emit to the target conversation room
                        const newMessage = {
                            id: newMessageId,
                            conversationId: convId,
                            senderId: senderId,
                            senderName: sender.name,
                            senderAvatar: sender.avatar,
                            text: forwardedText,
                            type: originalMessage.type || 'text',
                            imageUrl: originalMessage.imageUrl,
                            isForwarded: true,
                            createdAt: new Date().toISOString()
                        };

                        io.to(convId).emit('receiveMessage', newMessage);
                        forwardedResults.push({ conversationId: convId, success: true });
                    }
                }

                // Forward to groups
                if (targetGroupIds && targetGroupIds.length > 0) {
                    for (const groupId of targetGroupIds) {
                        const newMessageId = uuidv4();
                        const forwardedText = originalMessage.type === 'text'
                            ? originalMessage.text
                            : (originalMessage.type === 'image' ? '[Hình ảnh]' :
                                (originalMessage.type === 'sticker' ? '' : originalMessage.text));

                        // Insert forwarded group message
                        await pool.execute(
                            `INSERT INTO messages (id, group_id, sender_id, content, type, image_url, created_at) 
                             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                            [
                                newMessageId,
                                groupId,
                                senderId,
                                forwardedText,
                                originalMessage.type || 'text',
                                originalMessage.imageUrl || null
                            ]
                        );

                        // Emit to the group room
                        const newMessage = {
                            id: newMessageId,
                            groupId: groupId,
                            senderId: senderId,
                            senderName: sender.name,
                            senderAvatar: sender.avatar,
                            text: forwardedText,
                            type: originalMessage.type || 'text',
                            imageUrl: originalMessage.imageUrl,
                            isForwarded: true,
                            createdAt: new Date().toISOString()
                        };

                        io.to(groupId).emit('receiveMessage', newMessage);
                        forwardedResults.push({ groupId: groupId, success: true });
                    }
                }

                // Notify sender of success
                socket.emit('forwardSuccess', {
                    results: forwardedResults,
                    count: forwardedResults.length
                });

                console.log(`📤 Message forwarded to ${forwardedResults.length} conversations by ${senderId}`);

            } catch (error) {
                console.error('Forward message error:', error);
                socket.emit('forwardError', { error: error.message });
            }
        });

        // ============ DISCONNECT ============

        socket.on('disconnect', async () => {
            console.log('🔌 Socket disconnected:', socket.id);

            if (currentUserId) {
                // Remove this socket
                if (onlineUsers.has(currentUserId)) {
                    onlineUsers.get(currentUserId).delete(socket.id);

                    // If no more sockets, user is offline
                    if (onlineUsers.get(currentUserId).size === 0) {
                        onlineUsers.delete(currentUserId);

                        try {
                            await pool.execute(
                                'UPDATE users SET status = ?, last_seen = NOW() WHERE id = ?',
                                ['offline', currentUserId]
                            );
                        } catch (e) { }

                        broadcastUserStatus(currentUserId, 'offline');
                        console.log(`👤 User ${currentUserId} went offline`);
                    }
                }
            }
        });
    });

    // Expose helper functions
    return {
        isUserOnline,
        getUserSockets,
        onlineUsers
    };
};
