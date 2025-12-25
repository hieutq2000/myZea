// Fix collation for all tables to utf8mb4_unicode_ci
require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function fixCollation() {
    console.log('🔧 Fixing table collation...');

    const pool = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'vinalive',
        password: process.env.DB_PASSWORD || 'vinalive123',
        database: process.env.DB_NAME || 'vinalive_db',
    });

    const tables = ['users', 'chat_groups', 'group_members', 'messages', 'conversations', 'conversation_participants'];

    for (const table of tables) {
        try {
            await pool.execute(`ALTER TABLE ${table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log(`✅ Fixed collation for: ${table}`);
        } catch (e) {
            console.log(`⚠️ ${table}: ${e.message}`);
        }
    }

    console.log('🎉 Done!');
    await pool.end();
}

fixCollation().catch(console.error);
