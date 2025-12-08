/**
 * Test Chat Feature
 * Tạo cuộc trò chuyện demo và tin nhắn mẫu để test UI
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vinalive_ai'
};

async function testChat() {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Kết nối database thành công!\n');

        // 1. Lấy danh sách users
        const [users] = await connection.execute('SELECT id, name, email FROM users LIMIT 5');
        console.log('📋 Danh sách users:');
        users.forEach((u, i) => console.log(`   ${i + 1}. ${u.name} (${u.email})`));

        if (users.length < 2) {
            console.log('\n⚠️ Cần có ít nhất 2 users để test chat.');
            console.log('   Đăng ký thêm tài khoản trong app trước nhé!');
            return;
        }

        const user1 = users[0];
        const user2 = users[1];
        console.log(`\n🔗 Tạo cuộc trò chuyện giữa: ${user1.name} và ${user2.name}`);

        // 2. Kiểm tra xem đã có conversation chưa
        const [existingConv] = await connection.execute(`
            SELECT c.id FROM conversations c
            JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
            JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
            WHERE c.type = 'private' 
            AND cp1.user_id = ? 
            AND cp2.user_id = ?
            LIMIT 1
        `, [user1.id, user2.id]);

        let conversationId;
        if (existingConv.length > 0) {
            conversationId = existingConv[0].id;
            console.log(`   ➡️ Đã có conversation: ${conversationId}`);
        } else {
            // 3. Tạo conversation mới
            conversationId = uuidv4();
            await connection.execute(
                'INSERT INTO conversations (id, type, created_at) VALUES (?, ?, NOW())',
                [conversationId, 'private']
            );

            // 4. Thêm participants
            await connection.execute(
                'INSERT INTO conversation_participants (conversation_id, user_id, joined_at) VALUES (?, ?, NOW()), (?, ?, NOW())',
                [conversationId, user1.id, conversationId, user2.id]
            );
            console.log(`   ✅ Tạo conversation mới: ${conversationId}`);
        }

        // 5. Thêm một vài tin nhắn demo
        const demoMessages = [
            { sender: user1.id, content: 'Chào bạn! 👋' },
            { sender: user2.id, content: 'Chào! Bạn khoẻ không?' },
            { sender: user1.id, content: 'Mình khoẻ, cảm ơn bạn!' },
            { sender: user2.id, content: 'Ứng dụng Vinalive AI này hay quá! 🎉' },
            { sender: user1.id, content: 'Đúng rồi, tính năng chat mới được thêm vào đó' },
        ];

        console.log('\n💬 Tạo tin nhắn demo...');
        let lastMessageId = null;
        for (const msg of demoMessages) {
            const messageId = uuidv4();
            await connection.execute(
                'INSERT INTO messages (id, conversation_id, sender_id, content, type, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [messageId, conversationId, msg.sender, msg.content, 'text']
            );
            lastMessageId = messageId;
            console.log(`   ✅ Tin nhắn: "${msg.content}"`);
        }

        // 6. Cập nhật last_message_id cho conversation
        if (lastMessageId) {
            await connection.execute(
                'UPDATE conversations SET last_message_id = ? WHERE id = ?',
                [lastMessageId, conversationId]
            );
        }

        console.log('\n🎉 HOÀN THÀNH! Bạn có thể mở app và vào màn hình Chat để xem.');
        console.log('   - Đăng nhập bằng: ' + user1.email + ' hoặc ' + user2.email);
        console.log('   - Vào mục "Tin nhắn" để xem cuộc trò chuyện demo.');

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n⚠️ Chưa có bảng messages. Chạy setup_chat_db.js trước nhé!');
        }
    } finally {
        if (connection) await connection.end();
    }
}

testChat();
