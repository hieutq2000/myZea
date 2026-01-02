require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTables() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'vinalive',
            password: process.env.DB_PASSWORD || 'vinalive123',
            database: process.env.DB_NAME || 'vinalive_db',
        });

        console.log('🛠 Creating blocked_users table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS blocked_users (
                id VARCHAR(36) PRIMARY KEY,
                blocker_id VARCHAR(36) NOT NULL,
                blocked_id VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_block (blocker_id, blocked_id),
                INDEX idx_blocker (blocker_id),
                INDEX idx_blocked (blocked_id)
            )
        `);

        console.log('🛠 Creating reports table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS reports (
                id VARCHAR(36) PRIMARY KEY,
                reporter_id VARCHAR(36) NOT NULL,
                target_id VARCHAR(36) NOT NULL,
                target_type VARCHAR(20) DEFAULT 'user',
                reason VARCHAR(50) NOT NULL,
                details TEXT,
                message_id VARCHAR(36),
                status VARCHAR(20) DEFAULT 'pending',
                admin_notes TEXT,
                resolved_by VARCHAR(36),
                resolved_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_target (target_id, target_type),
                INDEX idx_reporter (reporter_id),
                INDEX idx_created (created_at)
            )
        `);

        console.log('🛠 Creating password_reset_otps table...');
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS password_reset_otps (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                otp VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_user (user_id),
                INDEX idx_expires (expires_at)
            )
        `);

        console.log('✅ Tables created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        process.exit(1);
    }
}

createTables();
