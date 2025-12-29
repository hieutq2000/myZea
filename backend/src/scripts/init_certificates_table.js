const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function initTable() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3307,
            user: process.env.DB_USER || 'vinalive',
            password: process.env.DB_PASSWORD || 'vinalive123',
            database: process.env.DB_NAME || 'vinalive_db',
        });

        console.log('Connected to database.');

        // Create certificates table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS certificates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                p12_filename VARCHAR(255) NOT NULL,
                provision_filename VARCHAR(255) NOT NULL,
                p12_password VARCHAR(255),
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Created certificates table.');

    } catch (error) {
        console.error('❌ Failed to init table:', error);
    } finally {
        if (connection) await connection.end();
    }
}

initTable();
