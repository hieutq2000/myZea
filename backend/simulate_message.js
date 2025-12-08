
require('dotenv').config();
const mysql = require('mysql2/promise');
const { io } = require("socket.io-client");

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vinalive_ai'
};

const SOCKET_URL = 'http://localhost:3001';

async function simulateMessage() {
    let connection;
    try {
        // 1. Get Users
        connection = await mysql.createConnection(DB_CONFIG);
        const [users] = await connection.execute('SELECT id, name, email FROM users');

        const targetEmail = 'hieu123@gmail.com';
        const receiver = users.find(u => u.email === targetEmail);
        const sender = users.find(u => u.email !== targetEmail); // Pick any other user

        if (!receiver) {
            console.error(`❌ User ${targetEmail} not found!`);
            return;
        }
        if (!sender) {
            console.error('❌ Need at least one other user to send the message from!');
            return;
        }

        console.log(`🎯 Target (Receiver): ${receiver.name} (${receiver.id})`);
        console.log(`📨 Sender: ${sender.name} (${sender.id})`);

        // 2. Connect Socket
        console.log('🔌 Connecting to socket...');
        const socket = io(SOCKET_URL, {
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);

            // 3. Emit Message
            // We need a conversation ID. If we don't have one, usually api/socket handles it or we pass 'new' or null?
            // Checking ChatDetailScreen logic: it emits conversationId. 
            // The backend socket handler expects: { conversationId, senderId, receiverId, message, type }
            // Let's try to query an existing conversation first to be safe, or just pass a new/random one if allowed.
            // But realistically, the backend usually expects a valid conversationId to save to DB.

            checkConversationAndSend(connection, sender, receiver, socket);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

async function checkConversationAndSend(connection, sender, receiver, socket) {
    const [existingConv] = await connection.execute(`
            SELECT c.id FROM conversations c
            JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
            JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
            WHERE c.type = 'private' 
            AND cp1.user_id = ? 
            AND cp2.user_id = ?
            LIMIT 1
        `, [sender.id, receiver.id]);

    let conversationId;
    if (existingConv.length > 0) {
        conversationId = existingConv[0].id;
        console.log('📂 Found existing conversation:', conversationId);
    } else {
        // Technically we should create one via DB if the socket doesn't handle creation logic. 
        // Assuming backend socket handler *might* rely on existing conversation. 
        // For safety, I will create one in DB if missing, like test_chat.js did, THEN send socket message.
        // But let's see if the socket handler does it.
        // Actually, if I just send via socket, the client listening (receiver) just needs the event.
        // The *receiver client* listens for 'receiveMessage'.
        // Does the backend 'sendMessage' handler emit 'receiveMessage' to the target room? Yes, usually.
        // And usually it also saves to DB. 
        // If I want to be purely testing notifications, I just need the event emitted to the user room.

        // Wait, does the backend require the sender to JOIN the room first?
        // Usually sender joins conversation room? OR emits to user room?
        // In this app, `initSocket` joins `userId`. 
        // ChatDetailScreen emits to server. Server likely broadcasts to `receiverId` room.

        // Let's assume conversationId is required for the payload structure but maybe not strictly for the event routing if routed by receiverId.
        conversationId = 'temp-simulated-id';
    }

    const payload = {
        conversationId: conversationId,
        senderId: sender.id,
        receiverId: receiver.id,
        message: 'Hello! Tin nhắn test thông báo 🔔 ' + new Date().toLocaleTimeString(),
        type: 'text',
        tempId: Date.now().toString()
    };

    console.log('📤 Sending payload:', payload);
    socket.emit('sendMessage', payload);

    // Wait a bit then exit
    setTimeout(() => {
        console.log('👋 Done.');
        socket.disconnect();
        process.exit(0);
    }, 2000);
}

simulateMessage();
