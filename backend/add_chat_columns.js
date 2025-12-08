/**
 * Add columns to conversation_participants table for Pin, Mute, Hidden features
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
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'conversation_participants'
        `, [DB_CONFIG.database]);

        const existingColumns = columns.map(c => c.COLUMN_NAME);

        // Add is_pinned column if not exists
        if (!existingColumns.includes('is_pinned')) {
            await connection.execute(`ALTER TABLE conversation_participants ADD COLUMN is_pinned TINYINT(1) DEFAULT 0`);
            console.log('✅ Thêm cột is_pinned');
        } else {
            console.log('⚠️ Cột is_pinned đã tồn tại');
        }

        // Add is_muted column if not exists  
        if (!existingColumns.includes('is_muted')) {
            await connection.execute(`ALTER TABLE conversation_participants ADD COLUMN is_muted TINYINT(1) DEFAULT 0`);
            console.log('✅ Thêm cột is_muted');
        } else {
            console.log('⚠️ Cột is_muted đã tồn tại');
        }

        // Add is_hidden column if not exists  
        if (!existingColumns.includes('is_hidden')) {
            await connection.execute(`ALTER TABLE conversation_participants ADD COLUMN is_hidden TINYINT(1) DEFAULT 0`);
            console.log('✅ Thêm cột is_hidden');
        } else {
            console.log('⚠️ Cột is_hidden đã tồn tại');
        }

        console.log('\n🎉 Hoàn thành!');
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

addColumns();
