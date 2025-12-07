require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupChatDB() {
    try {
        console.log('Connecting to database...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'vinalive',
            password: process.env.DB_PASSWORD || 'vinalive123',
            database: process.env.DB_NAME || 'vinalive_db',
            multipleStatements: true // Quan trọng để chạy nhiều câu lệnh SQL cùng lúc
        });

        console.log('Reading migration file...');
        const sqlPath = path.join(__dirname, 'migrations', 'chat_setup.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing migration...');
        await connection.query(sql);

        console.log('✅ Chat Database setup completed successfully!');

        // Thêm cột last_seen và status vào bảng users nếu chưa có
        try {
            await connection.query("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            console.log('Added last_seen column to users');
        } catch (e) {
            // Ignore if exists
        }

        try {
            await connection.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'offline'");
            console.log('Added status column to users');
        } catch (e) {
            // Ignore if exists
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Error setting up database:', error);
    }
}

setupChatDB();
