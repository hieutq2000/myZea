require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vinalive_ai'
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('Connected! Adding push_token column...');

        try {
            await connection.execute('ALTER TABLE users ADD COLUMN push_token VARCHAR(255)');
            console.log('✅ Added push_token column successfully.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️ Column push_token already exists.');
            } else {
                throw e;
            }
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) connection.end();
    }
}

migrate();
