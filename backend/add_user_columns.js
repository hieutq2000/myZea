/**
 * Add status and last_seen columns to users table
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vinalive_ai'
};

async function addColumns() {
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Kết nối database thành công!');

        // Check if columns exist
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
        `, [DB_CONFIG.database]);

        const existingColumns = columns.map(c => c.COLUMN_NAME);

        // Add status column if not exists
        if (!existingColumns.includes('status')) {
            await connection.execute(`ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'offline'`);
            console.log('✅ Thêm cột status');
        } else {
            console.log('⚠️ Cột status đã tồn tại');
        }

        // Add last_seen column if not exists  
        if (!existingColumns.includes('last_seen')) {
            await connection.execute(`ALTER TABLE users ADD COLUMN last_seen DATETIME`);
            console.log('✅ Thêm cột last_seen');
        } else {
            console.log('⚠️ Cột last_seen đã tồn tại');
        }

        console.log('\n🎉 Hoàn thành!');
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

addColumns();
