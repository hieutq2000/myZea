const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); // Cần cài bcryptjs nếu chưa có
const { v4: uuidv4 } = require('uuid');

async function seed() {
    console.log('🔄 Đang khởi tạo tài khoản Admin...');

    // Config kết nối (Thử các trường hợp phổ biến của XAMPP)
    const dbConfig = {
        host: 'localhost',
        user: 'root',
        password: '', // Mặc định XAMPP không có pass
        database: 'vinalive_db'
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Kết nối Database thành công');

        const email = 'hieu@gmail.com';
        const rawPassword = '1'; // Password mặc định là 1 cho nhanh
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        // 1. Kiểm tra user tồn tại
        const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length > 0) {
            // Update password nếu đã tồn tại
            console.log(`⚠️ User ${email} đã tồn tại. Đang reset mật khẩu...`);
            await connection.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
            console.log('✅ Đã reset mật khẩu thành công: 1');
        } else {
            // Tạo mới user
            console.log(`🆕 Creating ne user ${email}...`);
            const userId = uuidv4();
            await connection.execute(
                'INSERT INTO users (id, email, password, name, badges) VALUES (?, ?, ?, ?, ?)',
                [userId, email, hashedPassword, 'Admin Hieu', '[]']
            );
            console.log('✅ Đã tạo tài khoản admin thành công!');
            console.log('📧 Email: hieu@gmail.com');
            console.log('🔑 Pass: 1');
        }

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        if (error.code === 'MODULE_NOT_FOUND') {
            console.error('⚠️ Thiếu thư viện. Vui lòng chạy: npm install mysql2 bcryptjs uuid');
        }
    } finally {
        if (connection) await connection.end();
    }
}

seed();
