require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'vinalive',
        password: process.env.DB_PASSWORD || 'vinalive123',
        database: process.env.DB_NAME || 'vinalive_db',
    });

    try {
        await pool.execute(`ALTER TABLE posts ADD COLUMN original_post_id VARCHAR(36) DEFAULT NULL`);
        console.log("Migration successful: Added original_post_id");
    } catch (e) {
        console.log("Migration info:", e.message); // Likely column already exists
    }
    process.exit(0);
}

migrate();
