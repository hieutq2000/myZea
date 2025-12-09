require('dotenv').config();
const mysql = require('mysql2/promise');
const { Expo } = require('expo-server-sdk');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vinalive_ai'
};

async function debugPush() {
    let connection;
    try {
        console.log('🔍 Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);

        const targetEmail = 'hieu123@gmail.com';
        const [users] = await connection.execute('SELECT id, name, email, push_token FROM users WHERE email = ?', [targetEmail]);

        if (users.length === 0) {
            console.error('❌ User not found:', targetEmail);
            return;
        }

        const user = users[0];
        console.log(`👤 User: ${user.name} (${user.email})`);

        if (!user.push_token) {
            console.error('❌ NO PUSH TOKEN found in database! (Cột push_token bị NULL)');
            console.log('👉 Vui lòng mở lại App trên điện thoại và đảm bảo đã đăng nhập để cập nhật token.');
            return;
        }

        console.log('🔑 Token found:', user.push_token);

        if (!Expo.isExpoPushToken(user.push_token)) {
            console.error('❌ Token is NOT a valid Expo Push Token!');
            return;
        }

        console.log('🚀 Attempting to send test push notification...');
        const expo = new Expo();

        const messages = [{
            to: user.push_token,
            sound: 'default',
            title: 'Test Debug',
            body: 'Đây là tin nhắn kiểm tra từ debug script 🔍',
            data: { test: true },
        }];

        const chunks = expo.chunkPushNotifications(messages);

        for (let chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('✅ Tickets received:', ticketChunk);

                // Check if there are errors in tickets
                for (let ticket of ticketChunk) {
                    if (ticket.status === 'error') {
                        console.error(`❌ Expo Error for ${ticket.details?.error}: ${ticket.message}`);
                        if (ticket.details?.error === 'DeviceNotRegistered') {
                            console.log('👉 Token đã cũ/không hợp lệ. Hãy gỡ app và cài lại/đăng nhập lại.');
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Error sending chunks:', error);
            }
        }

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        if (connection) connection.end();
    }
}

debugPush();
