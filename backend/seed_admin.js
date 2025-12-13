const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function seed() {
    console.log('🔄 Đang khởi tạo tài khoản Admin...');

    const dbConfig = {
        host: 'localhost',
        port: 3307,
        user: 'vinalive',
        password: 'vinalive123',
        database: 'vinalive_db'
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Kết nối Database thành công');

        const email = 'hieu@gmail.com';
        const rawPassword = '123456';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length > 0) {
            console.log(`⚠️ User ${email} đã tồn tại. Đang reset mật khẩu...`);
            await connection.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
            console.log('✅ Đã reset mật khẩu thành công: 123456');
        } else {
            console.log(`🆕 Creating new user ${email}...`);
            const userId = uuidv4();
            await connection.execute(
                'INSERT INTO users (id, email, password, name, badges) VALUES (?, ?, ?, ?, ?)',
                [userId, email, hashedPassword, 'Admin Hieu', '[]']
            );
            console.log('✅ Đã tạo tài khoản admin thành công!');
            console.log('📧 Email: hieu@gmail.com');
            console.log('🔑 Pass: 123456');
        }

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

seed();
