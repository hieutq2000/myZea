require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3307,
            user: 'vinalive',
            password: 'vinalive123',
            database: 'vinalive_db',
        });

        console.log('Connected to database.');

        // Add cover_image column to users table if it doesn't exist
        try {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN cover_image LONGTEXT
            `);
            console.log('✅ Added cover_image column to users table.');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ cover_image column already exists.');
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('❌ Failed to update schema:', error);
    } finally {
        if (connection) await connection.end();
    }
}

updateSchema();
