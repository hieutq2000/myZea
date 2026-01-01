require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const sizeOf = require('image-size');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const { exec } = require('child_process');
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

const app = express();
const http = require('http');
const { Server } = require("socket.io");
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for mobile app
        methods: ["GET", "POST"]
    }
});

// Make io available in routes (if needed later)
app.set('io', io);

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map();

// Helper function to check if user is online
function isUserOnline(userId) {
    return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

// Helper function to create URL-friendly slug from app name
function createSlug(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
}

app.use(cors());
app.use(express.json({ limit: '500mb' })); // Increase for large IPA
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use((req, res, next) => {
    // Skip fileUpload for routes handled by multer to avoid conflicts
    if (req.path === '/api/upload/image' || req.path === '/api/admin/ipa/upload') {
        return next();
    }
    fileUpload({
        createParentPath: true,
        limits: { fileSize: 500 * 1024 * 1024 }
    })(req, res, next);
});

// Serve static files from public directory (landing page)
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded images with aggressive caching (30 days)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    maxAge: '2592000000', // 30 days in ms
    immutable: true
}));

// Safe JSON parse helper
function safeJsonParse(str, defaultValue = []) {
    if (str === null || str === undefined || str === '') return defaultValue;
    if (typeof str === 'object') return str;
    try {
        if (str === 'null' || str === 'undefined') return defaultValue;
        return JSON.parse(str);
    } catch (e) {
        return defaultValue;
    }
}

// ============ UTILS ============

/**
 * Format MySQL datetime to ISO string preserving Vietnam timezone (GMT+7)
 * MySQL với timezone +07:00 trả về Date object, nhưng khi JSON.stringify 
 * nó sẽ convert về UTC. Hàm này đảm bảo client nhận được thời gian chính xác.
 */
function formatDateForClient(mysqlDate) {
    if (!mysqlDate) return null;

    // Nếu đã là string, return luôn
    if (typeof mysqlDate === 'string') {
        return mysqlDate;
    }

    // Nếu là Date object, format theo ISO với timezone offset
    if (mysqlDate instanceof Date) {
        // Date object từ MySQL connection với timezone +07:00 đã là local time
        // Sử dụng toISOString() để get UTC time (chuẩn cho client xử lý)
        return mysqlDate.toISOString();
    }

    return mysqlDate;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function safeCallApi(apiFunction) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            await sleep(1000);
            return await apiFunction();
        } catch (error) {
            const status = error.response?.status;
            if (status === 429 && attempt < 2) {
                const delay = Math.pow(2, attempt) * 2000;
                console.log(`Rate limit (429). Retrying in ${delay}ms...`);
                await sleep(delay);
                continue;
            }
            // Log chi tiết lỗi từ Google để dễ debug
            if (error.response?.data) {
                console.error("API Error Detail:", JSON.stringify(error.response.data));
            }
            throw error;
        }
    }
    throw new Error("Max retries reached");
}

// Database connection pool
let pool;

async function initDatabase() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'vinalive',
            password: process.env.DB_PASSWORD || 'vinalive123',
            database: process.env.DB_NAME || 'vinalive_db',
            waitForConnections: true,
            connectionLimit: 25, // Increased from 10 for better concurrency
            queueLimit: 0, // Unlimited queue
            timezone: 'Z', // Use UTC to avoid timezone conversion issues
            enableKeepAlive: true, // Keep connections alive
            keepAliveInitialDelay: 10000, // 10 seconds
        });

        // Automatically increase max_allowed_packet for this session/global
        try {
            await pool.execute('SET GLOBAL max_allowed_packet=67108864');
            console.log('🚀 Increased GLOBAL max_allowed_packet to 64MB');
        } catch (e) {
            console.log('⚠️ Could not set GLOBAL packet size, attempting session level...');
            try {
                await pool.execute('SET session max_allowed_packet=67108864');
                console.log('✅ Set session max_allowed_packet to 64MB');
            } catch (e2) {
                console.log('❌ Failed to set packet size:', e2.message);
            }
        }

        // Create tables if not exist
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar LONGTEXT,
        voice VARCHAR(50) DEFAULT 'Kore',
        xp INT DEFAULT 0,
        level INT DEFAULT 1,
        badges JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        await pool.execute(`
      CREATE TABLE IF NOT EXISTS exam_results (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        score VARCHAR(20) NOT NULL,
        duration VARCHAR(50),
        topic VARCHAR(100),
        transcript JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        await pool.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        content TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // Ensure critical columns exist (Compatible with older MySQL versions)
        const ensureColumn = async (table, column, definition) => {
            try {
                const [cols] = await pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()`, [table, column]);
                if (cols.length === 0) {
                    console.log(`🛠 Adding missing column ${column} to ${table}...`);
                    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                }
            } catch (err) {
                console.log(`⚠️ Failed to check/add column ${column}:`, err.message);
            }
        };

        await ensureColumn('posts', 'original_post_id', 'VARCHAR(36) NULL');
        await ensureColumn('posts', 'group_id', 'VARCHAR(36) NULL');
        await ensureColumn('posts', 'views', 'INT DEFAULT 0');
        await ensureColumn('posts', 'shares', 'INT DEFAULT 0');

        await pool.execute(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id VARCHAR(36) PRIMARY KEY,
        post_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        reaction_type VARCHAR(20) DEFAULT 'like',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // Ensure reaction_type column exists for existing databases
        await ensureColumn('post_likes', 'reaction_type', "VARCHAR(20) DEFAULT 'like'");

        // Sticker Packs table
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS sticker_packs (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255),
        description TEXT,
        icon_url TEXT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        // Stickers table
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS stickers (
        id VARCHAR(36) PRIMARY KEY,
        pack_id VARCHAR(36) NOT NULL,
        image_url TEXT NOT NULL,
        file_format VARCHAR(20) DEFAULT 'webp',
        file_size INT DEFAULT 0,
        width INT DEFAULT 512,
        height INT DEFAULT 512,
        is_animated BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pack_id) REFERENCES sticker_packs(id) ON DELETE CASCADE
      )
    `);

        // Feedback table
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS feedback (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        type VARCHAR(20) DEFAULT 'feedback',
        content TEXT,
        context TEXT,
        media_urls JSON,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // App Settings table
        await pool.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        // Create post_views table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS post_views (
                id VARCHAR(36) PRIMARY KEY,
                post_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_view (post_id, user_id),
                INDEX idx_post_views_post_id (post_id)
            )
        `);

        // Create post_tags table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS post_tags (
                id VARCHAR(36) PRIMARY KEY,
                post_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_tag (post_id, user_id),
                INDEX idx_post_tags_post_id (post_id),
                INDEX idx_post_tags_user_id (user_id)
            )
        `);

        // Create place_notifications table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS place_notifications (
                id VARCHAR(36) PRIMARY KEY,
                recipient_id VARCHAR(36) NOT NULL,
                actor_id VARCHAR(36) NOT NULL,
                type ENUM('like', 'comment', 'share', 'mention', 'follow', 'tag') NOT NULL,
                post_id VARCHAR(36) NULL,
                comment_id VARCHAR(36) NULL,
                message TEXT,
                post_preview VARCHAR(255) NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_notifications_recipient (recipient_id),
                INDEX idx_notifications_created_at (created_at DESC),
                INDEX idx_notifications_recipient_unread (recipient_id, is_read)
            )
        `);

        // Create message_reads table for tracking unread messages
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS message_reads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_read (message_id, user_id),
                INDEX idx_message_reads_user (user_id),
                INDEX idx_message_reads_message (message_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Ensure indexes
        try { await pool.execute('CREATE INDEX idx_posts_created_at ON posts(created_at DESC)'); } catch (e) { }
        try { await pool.execute('CREATE INDEX idx_posts_group_id ON posts(group_id)'); } catch (e) { }
        try { await pool.execute('CREATE INDEX idx_post_likes_post_id ON post_likes(post_id)'); } catch (e) { }

        // Initialize default links
        try {
            const [rows] = await pool.execute('SELECT setting_key FROM app_settings WHERE setting_key IN ("google_play_link", "app_store_link")');
            if (rows.length < 2) {
                console.log("🛠 Initializing default app links...");
                const defaultIOS = "https://is.gd/ABp5h2";
                const defaultAndroid = "https://play.google.com/store/apps/details?id=com.zyea.mobile";
                await pool.execute('INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?), (?, ?)',
                    ['google_play_link', defaultAndroid, 'app_store_link', defaultIOS]);
            }
        } catch (err) {
            console.log("🛠 Failed to initialize app settings:", err.message);
        }

        // Check and add is_banned column if not exists
        try {
            await pool.execute("SELECT is_banned FROM users LIMIT 1");
        } catch (e) {
            console.log("Adding is_banned column to users table...");
            await pool.execute("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE");
        }

        // Fix messages table schema for group chat support
        console.log("🛠 Starting schema update for group chat...");
        try {
            await pool.execute("SET FOREIGN_KEY_CHECKS=0");
            console.log("🛠 FK checks disabled");

            try {
                const [fks] = await pool.query(`
                    SELECT CONSTRAINT_NAME 
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE TABLE_NAME = 'messages' 
                    AND COLUMN_NAME = 'conversation_id' 
                    AND TABLE_SCHEMA = DATABASE()
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                `);
                console.log(`🛠 Found ${fks.length} FK constraints on messages.conversation_id`);

                for (const fk of fks) {
                    console.log(`🛠 Dropping FK constraint: ${fk.CONSTRAINT_NAME}`);
                    try {
                        await pool.execute(`ALTER TABLE messages DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
                    } catch (err) {
                        console.log(`🛠 Failed to drop FK ${fk.CONSTRAINT_NAME}:`, err.message);
                    }
                }
            } catch (fkSearchErr) {
                console.log("🛠 FK lookup failed:", fkSearchErr.message);
            }

            console.log("🛠 Modifying conversation_id to be NULLABLE...");
            await pool.execute("ALTER TABLE messages MODIFY conversation_id VARCHAR(36) NULL");

            console.log("🛠 Ensuring group_id column exists...");
            try {
                await pool.execute("ALTER TABLE messages ADD COLUMN group_id VARCHAR(36) NULL");
            } catch (e) {
                console.log("🛠 group_id column exists or add failed:", e.message);
            }

            await pool.execute("SET FOREIGN_KEY_CHECKS=1");
            console.log("✅ Messages table schema successfully updated for group chat");
        } catch (e) {
            console.log("❌ Messages table schema update failed:", e.message);
            try { await pool.execute("SET FOREIGN_KEY_CHECKS=1"); } catch (e2) { }
        }

        // --- NEW PLACE TABLES & COLUMNS (Ensuring they exist) ---
        console.log("🛠 Checking Place related tables/columns...");

        // Ensure posts has sharing/group columns
        const ensurePostsCols = async () => {
            const cols = [
                { name: 'original_post_id', def: 'VARCHAR(36) NULL' },
                { name: 'group_id', def: 'VARCHAR(36) NULL' },
                { name: 'views', def: 'INT DEFAULT 0' },
                { name: 'shares', def: 'INT DEFAULT 0' }
            ];
            for (const col of cols) {
                try {
                    const [res] = await pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'posts' AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()`, [col.name]);
                    if (res.length === 0) {
                        console.log(`🛠 Adding missing column ${col.name} to posts`);
                        await pool.execute(`ALTER TABLE posts ADD COLUMN ${col.name} ${col.def}`);
                    }
                } catch (err) { /* ignore */ }
            }
        };
        await ensurePostsCols();

        // Create secondary Place tables
        await pool.execute(`CREATE TABLE IF NOT EXISTS post_views (id VARCHAR(36) PRIMARY KEY, post_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_view (post_id, user_id))`);
        await pool.execute(`CREATE TABLE IF NOT EXISTS post_tags (id VARCHAR(36) PRIMARY KEY, post_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_tag (post_id, user_id))`);
        await pool.execute(`CREATE TABLE IF NOT EXISTS place_notifications (id VARCHAR(36) PRIMARY KEY, recipient_id VARCHAR(36) NOT NULL, actor_id VARCHAR(36) NOT NULL, type VARCHAR(20) NOT NULL, post_id VARCHAR(36) NULL, comment_id VARCHAR(36) NULL, message TEXT, post_preview VARCHAR(255) NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

        // Check reactions column in messages
        try {
            await pool.execute("SELECT reactions FROM messages LIMIT 1");
        } catch (e) {
            console.log("🛠 Adding reactions column to messages table...");
            // reactions is JSON column
            await pool.execute("ALTER TABLE messages ADD COLUMN reactions JSON DEFAULT NULL");
        }

        // --- STICKER TABLES ---
        await pool.execute(`CREATE TABLE IF NOT EXISTS sticker_packs (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            icon_url TEXT,
            sort_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Ensure all required columns exist for sticker_packs
        const stickerPackCols = [
            { name: 'icon_url', type: 'TEXT' },
            { name: 'sort_order', type: 'INT DEFAULT 0' },
            { name: 'name', type: 'VARCHAR(255)' },
            { name: 'title', type: 'VARCHAR(255)' }
        ];

        for (const col of stickerPackCols) {
            try {
                // Sử dụng backticks để tránh lỗi từ khoá SQL (như 'name', 'title')
                await pool.execute(`SELECT \`${col.name}\` FROM \`sticker_packs\` LIMIT 1`);
            } catch (e) {
                console.log(`🛠 [DB] Adding column ${col.name} to sticker_packs...`);
                try {
                    await pool.execute(`ALTER TABLE \`sticker_packs\` ADD COLUMN \`${col.name}\` ${col.type}`);
                } catch (err) {
                    console.error(`[DB] Failed to add column ${col.name}:`, err.message);
                }
            }
        }

        await pool.execute(`CREATE TABLE IF NOT EXISTS stickers (
            id VARCHAR(36) PRIMARY KEY,
            pack_id VARCHAR(36) NOT NULL,
            image_url TEXT NOT NULL,
            file_format VARCHAR(10),
            width INT,
            height INT,
            is_animated BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pack_id) REFERENCES sticker_packs(id) ON DELETE CASCADE
        )`);

        // === BLOCK/REPORT TABLES ===
        console.log("🛠 Creating blocked_users and reports tables...");

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

        // === OTP TABLE FOR PASSWORD RESET ===
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

        console.log('✅ Database connected and tables created');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        setTimeout(initDatabase, 5000);
    }
}

// JWT Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    // Debug JWT
    if (!process.env.JWT_SECRET) console.error("FATAL: JWT_SECRET is missing!");

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification failed:', err.message);
            return res.status(403).json({ error: 'Token không hợp lệ' });
        }
        req.user = user;
        next();
    });
}

// ============ CHANGELOG API ============

// Import changelog from separate file for easier management
const CHANGELOG = require('./changelog');

app.get('/api/changelog', (req, res) => {
    res.json({
        latest: CHANGELOG[0],
        all: CHANGELOG
    });
});

app.get('/api/changelog/latest', (req, res) => {
    res.json(CHANGELOG[0]);
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        version: '2.7.4-stable',
        node: process.version
    });
});

// ============ AUTH ROUTES ============
// NOTE: Auth routes (register, login, me, profile, push-token) 
// have been moved to ./routes/authRoutes.js for better code organization.
// The modular routes are mounted at the end of this file.

// ============ ADMIN ROUTES ============
// NOTE: Admin user management routes (get users, update, delete, reset-avatar)
// have been moved to ./routes/adminRoutes.js for better code organization.
// The modular routes are mounted at the end of this file.

// --- Other Admin Routes (not yet refactored) ---

// Get all posts (for content moderation)
app.get('/api/admin/posts', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') return res.status(403).json({ error: 'Không có quyền truy cập' });

        const [posts] = await pool.execute(`
            SELECT p.id, p.content, p.image_url, p.created_at, 
                   u.name as author_name, u.avatar as author_avatar 
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC
        `);
        res.json(posts);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete post (moderation)
app.delete('/api/admin/posts/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') return res.status(403).json({ error: 'Không có quyền truy cập' });

        await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Send System Notification
app.post('/api/admin/system/notification', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') return res.status(403).json({ error: 'Không có quyền truy cập' });

        const { title, message } = req.body;

        // Emit socket event to ALL connected clients
        io.emit('systemNotification', {
            title: title || 'Thông báo hệ thống',
            message: message,
            time: new Date().toISOString()
        });

        res.json({ success: true, count: io.engine.clientsCount });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ APP SETTINGS (Public & Admin) ============

// Get current settings (Public)
app.get('/api/app-settings', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT setting_key, setting_value FROM app_settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ status: 'error', error: 'Lỗi server' });
    }
});

// Update settings (Admin only)
app.post('/api/admin/app-settings', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { settings } = req.body; // Expecting { "key": "value" }
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }

        for (const [key, value] of Object.entries(settings)) {
            await pool.execute(
                'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, value, value]
            );
        }

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ APP VERSION CONTROL (Force Update) ============

app.get('/api/app-version/latest', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT setting_value FROM app_settings WHERE setting_key = "mobile_version_config"');
        if (rows.length > 0 && rows[0].setting_value) {
            res.json(JSON.parse(rows[0].setting_value));
        } else {
            res.json({
                version: '1.0.0',
                title: 'Cập nhật ứng dụng',
                message: 'Vui lòng cập nhật phiên bản mới nhất.',
                downloadUrl: '',
                forceUpdate: false
            });
        }
    } catch (error) {
        console.error('Get app version error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

app.post('/api/admin/app-version', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const config = req.body;
        const configJson = JSON.stringify(config);

        await pool.execute(
            'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['mobile_version_config', configJson, configJson]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update app version error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// IPA Upload & Auto-generating Manifest (.plist)
app.post('/api/admin/upload-ipa', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        if (!req.files || !req.files.ipa) {
            return res.status(400).json({ error: 'Vui lòng chọn file IPA' });
        }

        const ipaFile = req.files.ipa;
        const uploadDir = path.join(__dirname, '../public/uploads/ipa');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Use timestamp to allow multiple versions and prevent caching
        const timestamp = Date.now();
        const fileName = `zyea_${timestamp}.ipa`;
        const filePath = path.join(uploadDir, fileName);

        await ipaFile.mv(filePath);

        // Get app metadata from request body
        const appName = req.body.appName || 'Zyea';
        const version = req.body.version || '1.0.0';
        const bundleId = req.body.bundleId || 'com.zyea.mobile';
        const description = req.body.description || '';
        const developer = req.body.developer || 'Zyea Software';
        const supportEmail = req.body.supportEmail || 'support@data5g.site';
        const changelog = req.body.changelog || '';

        // Save app icon if uploaded
        let iconFileName = null;
        if (req.files && req.files.icon) {
            const iconFile = req.files.icon;
            iconFileName = `icon_${timestamp}.png`;
            const iconPath = path.join(uploadDir, iconFileName);
            await iconFile.mv(iconPath);
        }

        // Save screenshots if uploaded
        const screenshotFileNames = [];
        if (req.files && req.files.screenshots) {
            const screenshots = Array.isArray(req.files.screenshots) ? req.files.screenshots : [req.files.screenshots];
            for (let i = 0; i < screenshots.length; i++) {
                const screenshotFileName = `screenshot_${timestamp}_${i}.png`;
                const screenshotPath = path.join(uploadDir, screenshotFileName);
                await screenshots[i].mv(screenshotPath);
                screenshotFileNames.push(screenshotFileName);
            }
        }

        // Save metadata to JSON file
        const metadataFileName = `metadata_${timestamp}.json`;
        const metadataPath = path.join(uploadDir, metadataFileName);
        const appSlug = createSlug(appName);
        const metadata = {
            timestamp,
            appName,
            appSlug,
            version,
            bundleId,
            description,
            developer,
            supportEmail,
            changelog,
            iconFileName,
            screenshots: screenshotFileNames,
            ipaFileName: fileName,
            size: ipaFile.size,
            createdAt: new Date().toISOString()
        };
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        // Generate PLIST
        // Use main domain data5g.site which has valid SSL certificate via Cloudflare
        const baseUrl = 'https://data5g.site';
        const ipaUrl = `${baseUrl}/uploads/ipa/${fileName}`;
        const plistName = `manifest_${timestamp}.plist`;
        const plistPath = path.join(uploadDir, plistName);

        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <array>
        <dict>
            <key>assets</key>
            <array>
                <dict>
                    <key>kind</key>
                    <string>software-package</string>
                    <key>url</key>
                    <string>${ipaUrl}</string>
                </dict>
            </array>
            <key>metadata</key>
            <dict>
                <key>bundle-identifier</key>
                <string>${bundleId}</string>
                <key>bundle-version</key>
                <string>${version}</string>
                <key>kind</key>
                <string>software</string>
                <key>title</key>
                <string>${appName}</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>`;

        fs.writeFileSync(plistPath, plistContent);

        // Final itms-services link
        const plistUrl = `${baseUrl}/uploads/ipa/${plistName}`;
        const itmsLink = `itms-services://?action=download-manifest&url=${plistUrl}`;

        // Auto sync to AltStore/SideStore repo (source.json)
        try {
            if (typeof global.syncIpaToRepo === 'function') {
                global.syncIpaToRepo(metadata);
                console.log('✅ Auto-synced IPA to source.json repo');
            }
        } catch (syncErr) {
            console.error('Warning: Failed to auto-sync to repo:', syncErr);
            // Don't fail the upload if sync fails
        }

        res.json({
            success: true,
            ipaUrl,
            plistUrl,
            itmsLink,
            timestamp,
            appName,
            version,
            bundleId,
            repoSynced: true
        });
    } catch (error) {
        console.error('IPA Upload error:', error);
        res.status(500).json({ error: 'Lỗi server khi xử lý file' });
    }
});

// Update IPA metadata
app.put('/api/admin/ipas/:timestamp', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const timestamp = req.params.timestamp;
        const { appName, version, bundleId, description, developer, supportEmail, changelog } = req.body;

        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        const metadataPath = path.join(uploadDir, `metadata_${timestamp}.json`);

        if (!fs.existsSync(metadataPath)) {
            return res.status(404).json({ error: 'File metadata không tồn tại' });
        }

        // Read existing metadata
        let metadata = {};
        try {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (e) {
            console.error('Error reading metadata for update:', e);
            return res.status(500).json({ error: 'Lỗi đọc metadata' });
        }

        const oldIpaFileName = metadata.ipaFileName;

        // Handle File Upload (New IPA)
        if (req.files && req.files.ipa) {
            const ipaFile = req.files.ipa;
            // Generate new filename with new timestamp to avoid caching, but keep record timestamp
            const newTimestamp = Date.now();
            const newIpaFileName = `zyea_${newTimestamp}.ipa`;
            const newIpaPath = path.join(uploadDir, newIpaFileName);

            await ipaFile.mv(newIpaPath);

            // Delete old IPA file if it exists and is different
            if (oldIpaFileName && oldIpaFileName !== newIpaFileName) {
                const oldIpaPath = path.join(uploadDir, oldIpaFileName);
                if (fs.existsSync(oldIpaPath)) {
                    try {
                        fs.unlinkSync(oldIpaPath);
                    } catch (err) {
                        console.error('Failed to delete old IPA:', err);
                    }
                }
            }

            // Update metadata with new file info
            metadata.ipaFileName = newIpaFileName;
            metadata.size = ipaFile.size;
        }

        // Update fields
        metadata.appName = appName || metadata.appName;
        metadata.version = version || metadata.version;
        metadata.bundleId = bundleId || metadata.bundleId;
        metadata.description = description !== undefined ? description : (metadata.description || '');
        metadata.developer = developer || metadata.developer;
        metadata.supportEmail = supportEmail || metadata.supportEmail;
        metadata.changelog = changelog !== undefined ? changelog : (metadata.changelog || '');
        metadata.updatedAt = new Date().toISOString(); // Update timestamp

        // Save metadata
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        // Update plist
        const baseUrl = 'https://data5g.site';
        const ipaUrl = `${baseUrl}/uploads/ipa/${metadata.ipaFileName}`;
        const iconUrl = metadata.iconFileName ? `${baseUrl}/uploads/ipa/${metadata.iconFileName}` : '';

        const plistPath = path.join(uploadDir, `manifest_${timestamp}.plist`);
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <array>
        <dict>
            <key>assets</key>
            <array>
                <dict>
                    <key>kind</key>
                    <string>software-package</string>
                    <key>url</key>
                    <string>${ipaUrl}</string>
                </dict>
                ${iconUrl ? `
                <dict>
                    <key>kind</key>
                    <string>display-image</string>
                    <key>url</key>
                    <string>${iconUrl}</string>
                </dict>
                <dict>
                    <key>kind</key>
                    <string>full-size-image</string>
                    <key>url</key>
                    <string>${iconUrl}</string>
                </dict>` : ''}
            </array>
            <key>metadata</key>
            <dict>
                <key>bundle-identifier</key>
                <string>${metadata.bundleId}</string>
                <key>bundle-version</key>
                <string>${metadata.version}</string>
                <key>kind</key>
                <string>software</string>
                <key>title</key>
                <string>${metadata.appName}</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>`;
        fs.writeFileSync(plistPath, plistContent);

        // Auto sync to AltStore/SideStore repo (source.json) after metadata update
        try {
            if (typeof global.syncIpaToRepo === 'function') {
                global.syncIpaToRepo(metadata);
                console.log('✅ Auto-synced updated IPA to source.json repo');
            }
        } catch (syncErr) {
            console.error('Warning: Failed to auto-sync to repo after update:', syncErr);
            // Don't fail the update if sync fails
        }

        res.json({ success: true, metadata, repoSynced: true });
    } catch (error) {
        console.error('Update IPA error:', error);
        res.status(500).json({ error: 'Lỗi server khi cập nhật' });
    }
});

// List IPA files
app.get('/api/admin/ipas', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        if (!fs.existsSync(uploadDir)) {
            return res.json([]);
        }

        const baseUrl = 'https://data5g.site';

        // Iterate over METADATA files instead of IPA files to ensure source of truth
        const files = fs.readdirSync(uploadDir).map(file => {
            if (!file.startsWith('metadata_') || !file.endsWith('.json')) return null;

            const timestamp = file.replace('metadata_', '').replace('.json', '');
            const metadataPath = path.join(uploadDir, file);
            let metadata = null;

            try {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            } catch (e) {
                console.error('Error reading metadata:', e);
                return null;
            }

            // Check if actual IPA file exists (optional, but good for cleanup status)
            // const ipaPath = path.join(uploadDir, metadata.ipaFileName);
            // const ipaExists = fs.existsSync(ipaPath);
            const stats = { size: metadata.size || 0, birthtime: new Date(metadata.createdAt || parseInt(timestamp)) };
            // Note: We use the Original Timestamp for the 'name' (ID) to match frontend logic
            // The real IPA filename is in metadata.ipaFileName

            return {
                name: `zyea_${timestamp}.ipa`, // Virtual ID for Frontend consistency
                realFileName: metadata.ipaFileName,
                size: stats.size,
                createdAt: stats.birthtime,
                updatedAt: metadata.updatedAt,
                appName: metadata.appName || 'Zyea',
                appSlug: metadata.appSlug || createSlug(metadata.appName || 'app'),
                version: metadata.version || `1.0.${timestamp.slice(-6)}`,
                bundleId: metadata.bundleId || 'com.zyea.mobile',
                developer: metadata.developer,
                supportEmail: metadata.supportEmail,
                description: metadata.description,
                changelog: metadata.changelog,
                iconUrl: metadata.iconFileName ? `${baseUrl}/uploads/ipa/${metadata.iconFileName}` : null
            };
        }).filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(files);
    } catch (error) {
        console.error('List IPA error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});


// Delete IPA file
app.delete('/api/admin/ipas/:filename', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const filename = req.params.filename; // This is the ID (zyea_TIMESTAMP.ipa)
        if (filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({ error: 'Tên file không hợp lệ' });
        }

        const timestamp = filename.replace('zyea_', '').replace('.ipa', '');
        const uploadDir = path.join(__dirname, '../public/uploads/ipa');

        // 1. Read Metadata first to find the REAL IPA filename
        const metadataPath = path.join(uploadDir, `metadata_${timestamp}.json`);
        let realIpaFileName = filename;

        if (fs.existsSync(metadataPath)) {
            try {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                if (metadata && metadata.ipaFileName) {
                    realIpaFileName = metadata.ipaFileName;
                }
            } catch (e) {
                console.error('Error reading metadata for delete:', e);
            }
            // Delete Metadata
            fs.unlinkSync(metadataPath);
        }

        // 2. Delete the Real IPA File
        const realIpaPath = path.join(uploadDir, realIpaFileName);
        if (fs.existsSync(realIpaPath)) {
            fs.unlinkSync(realIpaPath);
        }

        // 3. Delete Plist
        const plistPath = path.join(uploadDir, `manifest_${timestamp}.plist`);
        if (fs.existsSync(plistPath)) {
            fs.unlinkSync(plistPath);
        }

        // 4. Delete Icon
        const iconPath = path.join(uploadDir, `icon_${timestamp}.png`);
        if (fs.existsSync(iconPath)) {
            fs.unlinkSync(iconPath);
        }

        // 5. Delete Screenshots
        const screenshotPattern = `screenshot_${timestamp}_`;
        fs.readdirSync(uploadDir).forEach(file => {
            if (file.startsWith(screenshotPattern)) {
                fs.unlinkSync(path.join(uploadDir, file));
            }
        });

        res.json({ success: true, message: 'Đã xóa file và dữ liệu liên quan' });

    } catch (error) {
        console.error('Delete IPA error:', error);
        res.status(500).json({ error: 'Lỗi khi xóa file' });
    }
});

// ============ CERTIFICATE MANAGEMENT ============

// List certificates
app.get('/api/admin/certificates', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const [rows] = await pool.execute('SELECT * FROM certificates ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('List certificates error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Create certificate (upload p12 and mobileprovision)
app.post('/api/admin/certificates', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        if (!req.files || !req.files.p12 || !req.files.provision) {
            return res.status(400).json({ error: 'Vui lòng upload cả file .p12 và .mobileprovision' });
        }

        const { name, password, description } = req.body;
        const p12File = req.files.p12;
        const provisionFile = req.files.provision;

        const certDir = path.join(__dirname, '../uploads/certs');
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir, { recursive: true });
        }

        const timestamp = Date.now();
        const p12Name = `cert_${timestamp}.p12`;
        const provisionName = `prov_${timestamp}.mobileprovision`;

        await p12File.mv(path.join(certDir, p12Name));
        await provisionFile.mv(path.join(certDir, provisionName));

        const [result] = await pool.execute(
            'INSERT INTO certificates (name, p12_filename, provision_filename, p12_password, description) VALUES (?, ?, ?, ?, ?)',
            [name || 'New Certificate', p12Name, provisionName, password || '', description || '']
        );

        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Upload certificate error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Update certificate
app.put('/api/admin/certificates/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { id } = req.params;
        const { name, password, description, is_active } = req.body;

        await pool.execute(
            'UPDATE certificates SET name = ?, p12_password = ?, description = ?, is_active = ? WHERE id = ?',
            [name, password, description, is_active, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update certificate error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete certificate
app.delete('/api/admin/certificates/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { id } = req.params;

        // Find filenames to delete
        const [rows] = await pool.execute('SELECT p12_filename, provision_filename FROM certificates WHERE id = ?', [id]);
        if (rows.length > 0) {
            const { p12_filename, provision_filename } = rows[0];
            const certDir = path.join(__dirname, '../uploads/certs');

            try {
                if (fs.existsSync(path.join(certDir, p12_filename))) fs.unlinkSync(path.join(certDir, p12_filename));
                if (fs.existsSync(path.join(certDir, provision_filename))) fs.unlinkSync(path.join(certDir, provision_filename));
            } catch (err) {
                console.error('File delete warning:', err);
            }
        }

        await pool.execute('DELETE FROM certificates WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete certificate error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// IPA Signing using zsign
// const { exec } = require('child_process'); // Removed duplicate

app.post('/api/admin/sign-ipa', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { ipaTimestamp, certificateId } = req.body;

        // 1. Get IPA Path
        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        const metadataPath = path.join(uploadDir, `metadata_${ipaTimestamp}.json`);

        if (!fs.existsSync(metadataPath)) {
            return res.status(404).json({ error: 'IPA Metadata không tồn tại' });
        }

        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const originalIpaPath = path.join(uploadDir, metadata.ipaFileName);

        // 2. Get Certificate Info
        const [certs] = await pool.execute('SELECT * FROM certificates WHERE id = ?', [certificateId]);
        if (certs.length === 0) {
            return res.status(404).json({ error: 'Chứng chỉ không tồn tại' });
        }
        const cert = certs[0];
        const certDir = path.join(__dirname, '../uploads/certs');
        const p12Path = path.join(certDir, cert.p12_filename);
        const provPath = path.join(certDir, cert.provision_filename);

        // 3. Prepare output path
        const signTimestamp = Date.now();
        const signedFileName = `signed_${signTimestamp}_${metadata.ipaFileName}`;
        const outputPath = path.join(uploadDir, signedFileName);

        // 4. Run zsign command
        // Format: zsign -k cert.p12 -p password -m prov.mobileprovision -o output.ipa input.ipa
        const zsignCmd = `zsign -k "${p12Path}" -p "${cert.p12_password}" -m "${provPath}" -o "${outputPath}" "${originalIpaPath}"`;

        console.log('🚀 Starting zsign command:', zsignCmd.replace(cert.p12_password, '******'));

        exec(zsignCmd, async (error, stdout, stderr) => {
            if (error) {
                console.error('zsign error:', error);
                console.error('stderr:', stderr);
                return res.status(500).json({ error: `Lỗi khi ký IPA: ${stderr || error.message}` });
            }

            console.log('✅ zsign output:', stdout);

            // 5. Update Metadata with signed file info
            const oldIpaFileName = metadata.ipaFileName;
            metadata.ipaFileName = signedFileName;
            metadata.signedAt = new Date().toISOString();
            metadata.usedCert = cert.name;

            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

            // Clean up old IPA if it was also a signed one (to save space)
            if (oldIpaFileName.startsWith('signed_')) {
                const oldIpaPath = path.join(uploadDir, oldIpaFileName);
                if (fs.existsSync(oldIpaPath)) fs.unlinkSync(oldIpaPath);
            }

            // 6. Update Plist
            const baseUrl = 'https://data5g.site';
            const ipaUrl = `${baseUrl}/uploads/ipa/${signedFileName}`;
            const plistPath = path.join(uploadDir, `manifest_${ipaTimestamp}.plist`);

            const newPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <array>
        <dict>
            <key>assets</key>
            <array>
                <dict>
                    <key>kind</key>
                    <string>software-package</string>
                    <key>url</key>
                    <string>${ipaUrl}</string>
                </dict>
            </array>
            <key>metadata</key>
            <dict>
                <key>bundle-identifier</key>
                <string>${metadata.bundleId}</string>
                <key>bundle-version</key>
                <string>${metadata.version}</string>
                <key>kind</key>
                <string>software</string>
                <key>title</key>
                <string>${metadata.appName}</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>`;
            fs.writeFileSync(plistPath, newPlistContent);

            res.json({
                success: true,
                message: 'Ký IPA thành công!',
                signedFileName,
                itmsLink: `itms-services://?action=download-manifest&url=${baseUrl}/uploads/ipa/manifest_${ipaTimestamp}.plist`
            });
        });

    } catch (error) {
        console.error('Sign IPA error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get app info by timestamp (public - for TestFlight UI page)
app.get('/api/app-info/:timestamp', (req, res) => {
    try {
        const timestamp = req.params.timestamp;
        if (!timestamp || timestamp.includes('..') || timestamp.includes('/')) {
            return res.status(400).json({ error: 'Invalid timestamp' });
        }

        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        const metadataPath = path.join(uploadDir, `metadata_${timestamp}.json`);

        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const baseUrl = 'https://data5g.site';

            res.json({
                success: true,
                appName: metadata.appName,
                version: metadata.version,
                bundleId: metadata.bundleId,
                description: metadata.description,
                developer: metadata.developer,
                supportEmail: metadata.supportEmail,
                changelog: metadata.changelog || '',
                size: metadata.size,
                createdAt: metadata.createdAt,
                updatedAt: metadata.updatedAt,
                iconUrl: metadata.iconFileName ? `${baseUrl}/uploads/ipa/${metadata.iconFileName}` : null,
                screenshots: (metadata.screenshots || []).map(s => `${baseUrl}/uploads/ipa/${s}`),
                installLink: `itms-services://?action=download-manifest&url=${baseUrl}/uploads/ipa/manifest_${timestamp}.plist`
            });
        } else {
            // Return default values for old IPAs without metadata
            const ipaPath = path.join(uploadDir, `zyea_${timestamp}.ipa`);
            if (fs.existsSync(ipaPath)) {
                const stats = fs.statSync(ipaPath);
                res.json({
                    success: true,
                    appName: 'Zyea',
                    version: `1.0.${timestamp.slice(-6)}`,
                    bundleId: 'com.zyea.mobile',
                    description: 'Ứng dụng Zyea - Kết nối cộng đồng',
                    size: stats.size,
                    createdAt: stats.birthtime,
                    iconUrl: null,
                    screenshots: [],
                    installLink: `itms-services://?action=download-manifest&url=https://data5g.site/uploads/ipa/manifest_${timestamp}.plist`
                });
            } else {
                res.status(404).json({ error: 'App not found' });
            }
        }
    } catch (error) {
        console.error('Get app info error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Clean URL route for app install page: /app/:appSlug/:timestamp
app.get('/app/:appSlug/:timestamp', (req, res) => {
    try {
        const { appSlug, timestamp } = req.params;

        // Validate timestamp
        if (!timestamp || timestamp.includes('..') || timestamp.includes('/')) {
            return res.status(400).send('Invalid request');
        }

        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        const metadataPath = path.join(uploadDir, `metadata_${timestamp}.json`);

        // Check if app exists
        if (fs.existsSync(metadataPath)) {
            // Read metadata for SEO/OG injection
            let metadata = {};
            try {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            } catch (e) {
                console.error('Error reading metadata for SEO:', e);
            }

            // Serve the app-install.html with the timestamp
            const htmlPath = path.join(__dirname, '../public/app-install.html');
            let html = fs.readFileSync(htmlPath, 'utf8');

            // 1. Inject timestamp for JS logic
            html = html.replace(
                "const urlParams = new URLSearchParams(window.location.search);",
                `const urlParams = { get: (key) => key === 'id' ? '${timestamp}' : null };`
            );

            // 2. Inject Open Graph Meta Tags (For rich preview on Telegram, Zalo, FB)
            const baseUrl = 'https://data5g.site';
            const iconUrl = metadata.iconFileName ? `${baseUrl}/uploads/ipa/${metadata.iconFileName}` : '';
            // Use screenshot as preview image if available, otherwise use icon
            const previewImage = (metadata.screenshots && metadata.screenshots.length > 0)
                ? `${baseUrl}/uploads/ipa/${metadata.screenshots[0]}`
                : iconUrl;

            const metaTags = `
    <title>${metadata.appName || 'Download App'} - iOS Install</title>
    <meta name="description" content="${metadata.description ? metadata.description.substring(0, 150) : 'Download and install app for iOS'}">
    
    <!-- Open Graph / Facebook / Zalo -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${baseUrl}/app/${appSlug}/${timestamp}">
    <meta property="og:title" content="${metadata.appName || 'Download App'} - Download for iOS">
    <meta property="og:description" content="${metadata.description ? metadata.description.substring(0, 200) + '...' : 'Tap to install this application on your iOS device.'}">
    <meta property="og:image" content="${previewImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="${metadata.appName || 'Download App'}">
    <meta property="twitter:description" content="${metadata.description ? metadata.description.substring(0, 150) : 'Download app for iOS'}">
    <meta property="twitter:image" content="${previewImage}">
            `;

            // Replace existing title or insert into head
            if (html.includes('<title>Download App</title>')) {
                html = html.replace('<title>Download App</title>', metaTags);
            } else if (html.includes('</head>')) {
                html = html.replace('</head>', `${metaTags}</head>`);
            }

            res.send(html);
        } else {
            const notFoundPath = path.join(__dirname, '../public/404.html');
            if (fs.existsSync(notFoundPath)) {
                res.status(404).sendFile(notFoundPath);
            } else {
                res.status(404).send('App not found');
            }
        }
    } catch (error) {
        console.error('App page error:', error);
        res.status(500).send('Server error');
    }
});

// Catch-all for invalid /app/... routes
app.get(['/app', '/app/*'], (req, res) => {
    const notFoundPath = path.join(__dirname, '../public/404.html');
    if (fs.existsSync(notFoundPath)) {
        res.status(404).sendFile(notFoundPath);
    } else {
        res.status(404).send('Không tìm thấy trang yêu cầu');
    }
});

// Shorten link via is.gd
app.post('/api/admin/shorten', authenticateToken, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // is.gd API call
        const response = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);

        if (response.data) {
            res.json({ success: true, shortUrl: response.data });
        } else {
            res.status(500).json({ error: 'Failed to shorten link' });
        }
    } catch (error) {
        console.error('Shorten link error:', error);
        res.status(500).json({ error: 'Failed to connect to is.gd' });
    }
});

// Track page view (public - called from app-install page)
app.post('/api/app-stats/:timestamp/view', (req, res) => {
    try {
        const timestamp = req.params.timestamp;
        if (!timestamp || timestamp.includes('..') || timestamp.includes('/')) {
            return res.status(400).json({ error: 'Invalid timestamp' });
        }

        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        const statsPath = path.join(uploadDir, `stats_${timestamp}.json`);

        let stats = { views: 0, downloads: 0 };
        if (fs.existsSync(statsPath)) {
            stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        }

        stats.views = (stats.views || 0) + 1;
        stats.lastViewAt = new Date().toISOString();

        fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
        res.json({ success: true, views: stats.views });
    } catch (error) {
        console.error('Track view error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Track download/install (public - called when user clicks Install)
app.post('/api/app-stats/:timestamp/download', (req, res) => {
    try {
        const timestamp = req.params.timestamp;
        if (!timestamp || timestamp.includes('..') || timestamp.includes('/')) {
            return res.status(400).json({ error: 'Invalid timestamp' });
        }

        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        const statsPath = path.join(uploadDir, `stats_${timestamp}.json`);

        let stats = { views: 0, downloads: 0 };
        if (fs.existsSync(statsPath)) {
            stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        }

        stats.downloads = (stats.downloads || 0) + 1;
        stats.lastDownloadAt = new Date().toISOString();

        fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
        res.json({ success: true, downloads: stats.downloads });
    } catch (error) {
        console.error('Track download error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get app statistics (admin only)
app.get('/api/admin/app-stats/:timestamp', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const timestamp = req.params.timestamp;
        if (!timestamp || timestamp.includes('..') || timestamp.includes('/')) {
            return res.status(400).json({ error: 'Invalid timestamp' });
        }

        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        const statsPath = path.join(uploadDir, `stats_${timestamp}.json`);
        const metadataPath = path.join(uploadDir, `metadata_${timestamp}.json`);

        let stats = { views: 0, downloads: 0 };
        if (fs.existsSync(statsPath)) {
            stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        }

        let appName = 'Zyea';
        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            appName = metadata.appName || 'Zyea';
        }

        res.json({
            success: true,
            appName,
            timestamp,
            views: stats.views || 0,
            downloads: stats.downloads || 0,
            lastViewAt: stats.lastViewAt || null,
            lastDownloadAt: stats.lastDownloadAt || null
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============ EXAM ROUTES ============

// Save exam result
app.post('/api/exam/result', authenticateToken, async (req, res) => {
    try {
        const { score, duration, topic, transcript } = req.body;
        const resultId = uuidv4();

        await pool.execute(
            'INSERT INTO exam_results (id, user_id, score, duration, topic, transcript) VALUES (?, ?, ?, ?, ?, ?)',
            [resultId, req.user.id, score, duration, topic, JSON.stringify(transcript || [])]
        );

        const xpGain = score === 'ĐẠT' ? 50 : 10;
        await pool.execute('UPDATE users SET xp = xp + ? WHERE id = ?', [xpGain, req.user.id]);

        const [users] = await pool.execute('SELECT xp, level FROM users WHERE id = ?', [req.user.id]);
        const user = users[0];
        const thresholds = [0, 100, 300, 600, 1000, 2000];
        let newLevel = 1;
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (user.xp >= thresholds[i]) {
                newLevel = i + 1;
                break;
            }
        }

        if (newLevel > user.level) {
            await pool.execute('UPDATE users SET level = ? WHERE id = ?', [newLevel, req.user.id]);
        }

        res.json({
            success: true,
            resultId,
            xpGain,
            newXp: user.xp + xpGain,
            newLevel
        });
    } catch (error) {
        console.error('Save result error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get exam history
app.get('/api/exam/history', authenticateToken, async (req, res) => {
    try {
        const [results] = await pool.execute(
            'SELECT * FROM exam_results WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );

        res.json(results.map(r => ({
            id: r.id,
            timestamp: r.created_at,
            score: r.score,
            duration: r.duration,
            topic: r.topic,
            transcript: safeJsonParse(r.transcript)
        })));
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ GEMINI AI PROXY ============
// Mobile app calls these endpoints instead of Gemini directly
// API key is stored securely in backend .env

app.post('/api/ai/generate', authenticateToken, async (req, res) => {
    try {
        const { prompt, images } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'AI service not configured' });
        }

        const contents = [{
            parts: [{ text: prompt }]
        }];

        // Add images if provided
        if (images && images.length > 0) {
            images.forEach(img => {
                contents[0].parts.push({
                    inline_data: {
                        mime_type: 'image/jpeg',
                        data: img.replace(/^data:image\/\w+;base64,/, '')
                    }
                });
            });
        }

        const response = await safeCallApi(() => fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        ));

        const data = await response.json();

        if (data.error) {
            console.error('Gemini API error:', data.error);
            return res.status(500).json({ error: data.error.message || 'AI error' });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ text, raw: data });

    } catch (error) {
        console.error('AI generate error:', error);
        res.status(500).json({ error: 'AI service error' });
    }
});

// Face verification via AI
app.post('/api/ai/verify-face', authenticateToken, async (req, res) => {
    try {
        const { cameraImage, avatarImage } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.json({ isMatch: true, confidence: 50, message: 'AI not configured, auto-pass' });
        }

        if (!cameraImage || !avatarImage) {
            return res.json({ isMatch: true, confidence: 0, message: 'Missing images, skipped' });
        }

        const prompt = `
Bạn là hệ thống xác thực sinh trắc học. So sánh 2 ảnh và xác định có phải CÙNG NGƯỜI không.

PHÂN TÍCH: Cấu trúc khuôn mặt, Đặc điểm mắt, mũi, miệng, Tỷ lệ khuôn mặt

TRẢ LỜI JSON DUY NHẤT:
{"isMatch": true/false, "confidence": 0-100, "message": "mô tả ngắn"}

Lưu ý: confidence >= 60 là match thành công. Nếu ảnh mờ hoặc khó nhận diện, cho confidence = 70 và isMatch = true.
`;

        const contents = [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: 'image/jpeg',
                        data: cameraImage.replace(/^data:image\/\w+;base64,/, '')
                    }
                },
                {
                    inline_data: {
                        mime_type: 'image/jpeg',
                        data: avatarImage.replace(/^data:image\/\w+;base64,/, '')
                    }
                }
            ]
        }];

        const response = await safeCallApi(() => fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        ));

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const confidence = parsed.confidence || 50;
            return res.json({
                isMatch: parsed.isMatch === true || confidence >= 60,
                confidence,
                message: parsed.message || 'Verification complete'
            });
        }

        res.json({ isMatch: true, confidence: 65, message: 'Verification complete (unclear)' });

    } catch (error) {
        console.error('Face verify error:', error);
        res.json({ isMatch: true, confidence: 50, message: 'Verification service unavailable' });
    }
});

// Parse Transaction using Gemini AI
app.post('/api/finance/parse-transaction', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'AI service not configured' });
        }

        if (!text) {
            return res.status(400).json({ error: 'Missing text content' });
        }

        // Expanded category list for better AI context
        const categories = `
        Expense (Chi tiêu):
        - food: Thức ăn (ăn uống, cafe, đi chợ, trà sữa, quán nhậu)
        - transport: Di chuyển (xăng, xe, taxi, gửi xe, vé máy bay)
        - shopping: Mua sắm (quần áo, giày dép, mỹ phẩm, đồ gia dụng)
        - entertainment: Giải trí (xem phim, game, du lịch, karaoke)
        - bills: Hóa đơn (điện, nước, net, thuê nhà, cước điện thoại)
        - health: Sức khỏe (thuốc, khám bệnh, gym)
        - education: Giáo dục (học phí, sách, khóa học)
        - family: Gia đình (biếu bố mẹ, con cái, quà tặng người thân)
        - other_expense: Khác

        Income (Thu nhập):
        - salary: Lương
        - bonus: Thưởng
        - investment: Đầu tư (lãi, chứng khoán, crypto, vàng)
        - freelance: Làm thêm (job ngoài, dự án)
        - gift_income: Được tặng (lì xì, tiền mừng)
        - sell: Bán đồ (thanh lý)
        - other_income: Khác
        `;

        const prompt = `
        Vai trò: Hệ thống phân tích tài chính thông minh (Strict JSON Array Mode).
        Nhiệm vụ: Trích xuất TOÀN BỘ các giao dịch tài chính từ câu nói của người dùng.

        VĂN BẢN CẦN PHÂN TÍCH: "${text}"

        DANH SÁCH CATEGORY ID HỢP LỆ:
        ${categories}

        YÊU CẦU BẮT BUỘC:
        1. Phải nhận diện được NHIỀU giao dịch trong một câu (ví dụ: "Ăn sáng 30 ca và cafe 20 ca" là 2 giao dịch).
        2. Mỗi giao dịch phải được tách thành một Object trong mảng JSON.
        3. Số tiền (amount): 
           - Quy đổi về số nguyên.
           - Nhận diện đơn vị: "k", "nghìn", "ngàn", "ca", "cành" đều nhân với 1000.
           - Ví dụ: "10 ca" -> 10000, "50 cành" -> 50000.
        4. CategoryId PHẢI trùng khớp với danh sách ở trên.
        5. Nếu không chắc chắn về CategoryId, hãy dùng "other_expense" hoặc "other_income".
        6. Chú ý: Nếu người dùng nói "và", "với", "rồi", "tiếp là"... thường là dấu hiệu có nhiều giao dịch.

        ĐỊNH DẠNG ĐẦU RA:
        Chỉ trả về DUY NHẤT một mảng JSON theo mẫu sau, không giải thích thêm:
        [
            {"type": "expense", "amount": 30000, "categoryId": "food", "description": "Ăn sáng"},
            {"type": "expense", "amount": 20000, "categoryId": "food", "description": "Cà phê"}
        ]
        `;

        const contents = [{
            parts: [{ text: prompt }]
        }];

        // Sử dụng Groq AI (Llama 3) làm bộ não duy nhất - Cực nhanh và ổn định
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            console.error("LỖI: Chưa cấu hình GROQ_API_KEY trong file .env");
            return res.status(500).json({ error: "Hệ thống AI chưa được cấu hình Key." });
        }

        try {
            console.log("Attempting AI with Groq (Llama 3)...");
            const groqResponse = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: "You are a financial assistant. Always respond with a raw JSON array of objects. Each object has: type (expense/income), amount (number), categoryId (string), description (string). No explanation. No markdown code blocks." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.1
                },
                {
                    headers: {
                        'Authorization': `Bearer ${groqKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 8000
                }
            );

            const content = groqResponse.data?.choices?.[0]?.message?.content;
            if (content) {
                console.log('Groq Raw Response:', content);
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsedResult = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsedResult) && parsedResult.length > 0) {
                        const cleanedResult = parsedResult.map(item => ({
                            type: item.type === 'income' ? 'income' : 'expense',
                            amount: Math.abs(parseInt(item.amount) || 0),
                            categoryId: item.categoryId || (item.type === 'income' ? 'other_income' : 'other_expense'),
                            description: item.description || 'Giao dịch không tên'
                        }));
                        return res.json(cleanedResult);
                    }
                }
            }
            return res.status(422).json({ error: 'Groq không thể trích xuất dữ liệu.' });
        } catch (err) {
            console.error("Groq AI Error:", err.message);
            return res.status(500).json({ error: 'AI processing failed' });
        }

    } catch (error) {
        console.error('Parse transaction error:', error);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/exam/result', authenticateToken, async (req, res) => {
    try {
        const { score, duration, topic, transcript } = req.body;
        const resultId = uuidv4();

        await pool.execute(
            'INSERT INTO exam_results (id, user_id, score, duration, topic, transcript) VALUES (?, ?, ?, ?, ?, ?)',
            [resultId, req.user.id, score, duration, topic, JSON.stringify(transcript || [])]
        );

        const xpGain = score === 'ĐẠT' ? 50 : 10;
        await pool.execute('UPDATE users SET xp = xp + ? WHERE id = ?', [xpGain, req.user.id]);

        const [users] = await pool.execute('SELECT xp, level FROM users WHERE id = ?', [req.user.id]);
        const user = users[0];
        const thresholds = [0, 100, 300, 600, 1000, 2000];
        let newLevel = 1;
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (user.xp >= thresholds[i]) {
                newLevel = i + 1;
                break;
            }
        }

        if (newLevel > user.level) {
            await pool.execute('UPDATE users SET level = ? WHERE id = ?', [newLevel, req.user.id]);
        }

        res.json({
            success: true,
            resultId,
            xpGain,
            newXp: user.xp + xpGain,
            newLevel
        });
    } catch (error) {
        console.error('Save result error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get exam history
app.get('/api/exam/history', authenticateToken, async (req, res) => {
    try {
        const [results] = await pool.execute(
            'SELECT * FROM exam_results WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );

        res.json(results.map(r => ({
            id: r.id,
            timestamp: r.created_at,
            score: r.score,
            duration: r.duration,
            topic: r.topic,
            transcript: safeJsonParse(r.transcript)
        })));
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ GEMINI AI PROXY ============
// Mobile app calls these endpoints instead of Gemini directly
// API key is stored securely in backend .env

app.post('/api/ai/generate', authenticateToken, async (req, res) => {
    try {
        const { prompt, images } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'AI service not configured' });
        }

        const contents = [{
            parts: [{ text: prompt }]
        }];

        // Add images if provided
        if (images && images.length > 0) {
            images.forEach(img => {
                contents[0].parts.push({
                    inline_data: {
                        mime_type: 'image/jpeg',
                        data: img.replace(/^data:image\/\w+;base64,/, '')
                    }
                });
            });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error('Gemini API error:', data.error);
            return res.status(500).json({ error: data.error.message || 'AI error' });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.json({ text, raw: data });

    } catch (error) {
        console.error('AI generate error:', error);
        res.status(500).json({ error: 'AI service error' });
    }
});

// Face verification via AI
app.post('/api/ai/verify-face', authenticateToken, async (req, res) => {
    try {
        const { cameraImage, avatarImage } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.json({ isMatch: true, confidence: 50, message: 'AI not configured, auto-pass' });
        }

        if (!cameraImage || !avatarImage) {
            return res.json({ isMatch: true, confidence: 0, message: 'Missing images, skipped' });
        }

        const prompt = `
Bạn là hệ thống xác thực sinh trắc học. So sánh 2 ảnh và xác định có phải CÙNG NGƯỜI không.

PHÂN TÍCH: Cấu trúc khuôn mặt, Đặc điểm mắt, mũi, miệng, Tỷ lệ khuôn mặt

TRẢ LỜI JSON DUY NHẤT:
{"isMatch": true/false, "confidence": 0-100, "message": "mô tả ngắn"}

Lưu ý: confidence >= 60 là match thành công. Nếu ảnh mờ hoặc khó nhận diện, cho confidence = 70 và isMatch = true.
`;

        const contents = [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: 'image/jpeg',
                        data: cameraImage.replace(/^data:image\/\w+;base64,/, '')
                    }
                },
                {
                    inline_data: {
                        mime_type: 'image/jpeg',
                        data: avatarImage.replace(/^data:image\/\w+;base64,/, '')
                    }
                }
            ]
        }];

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const confidence = parsed.confidence || 50;
            return res.json({
                isMatch: parsed.isMatch === true || confidence >= 60,
                confidence,
                message: parsed.message || 'Verification complete'
            });
        }

        res.json({ isMatch: true, confidence: 65, message: 'Verification complete (unclear)' });

    } catch (error) {
        console.error('Face verify error:', error);
        res.json({ isMatch: true, confidence: 50, message: 'Verification service unavailable' });
    }
});

// ============ CHAT API ============

// Get list of conversations - OPTIMIZED (with fallback for unread_count)
app.get('/api/chat/conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Main query without unread_count (for safety)
        const [rows] = await pool.execute(`
            SELECT 
                c.id as conversation_id,
                u.name,
                u.avatar,
                u.cover_image,
                u.id as partner_id,
                CASE 
                    WHEN m.deleted_by IS NOT NULL AND JSON_LENGTH(m.deleted_by) > 0 THEN '[Tin nhắn đã bị xóa]'
                    WHEN m.type = 'sticker' THEN '[Sticker]'
                    WHEN m.type = 'image' AND (m.content IS NULL OR m.content = '' OR m.content = '[Hình ảnh]') THEN '[Hình ảnh]'
                    WHEN m.type = 'video' THEN '[Video]'
                    WHEN m.type = 'image' AND m.content IS NOT NULL AND m.content != '' AND m.content != '[Hình ảnh]' THEN m.content
                    ELSE IFNULL(m.content, 'Bắt đầu trò chuyện')
                END as last_message,
                m.type as last_message_type,
                m.deleted_by as last_message_deleted_by,
                COALESCE(m.created_at, c.updated_at) as last_message_time,
                m.sender_id as last_message_sender_id,
                u.last_seen,
                u.status,
                IFNULL(cp_me.is_pinned, 0) as is_pinned,
                IFNULL(cp_me.is_muted, 0) as is_muted
            FROM conversations c
            INNER JOIN conversation_participants cp_me ON cp_me.conversation_id = c.id AND cp_me.user_id = ?
            INNER JOIN conversation_participants cp_other ON cp_other.conversation_id = c.id AND cp_other.user_id != ?
            INNER JOIN users u ON cp_other.user_id = u.id
            LEFT JOIN messages m ON c.last_message_id = m.id
            WHERE c.type = 'private'
            AND (cp_me.is_hidden IS NULL OR cp_me.is_hidden = 0)
            ORDER BY IFNULL(cp_me.is_pinned, 0) DESC, COALESCE(m.created_at, c.updated_at) DESC
            LIMIT 100
        `, [userId, userId]);

        // Try to get unread counts in batch (if message_reads exists)
        let unreadCounts = {};
        try {
            if (rows.length > 0) {
                const convIds = rows.map(r => r.conversation_id);
                const placeholders = convIds.map(() => '?').join(',');
                const [counts] = await pool.execute(`
                    SELECT msg.conversation_id, COUNT(*) as cnt
                    FROM messages msg
                    WHERE msg.conversation_id IN (${placeholders})
                    AND msg.sender_id != ?
                    AND NOT EXISTS (
                        SELECT 1 FROM message_reads mr 
                        WHERE mr.message_id COLLATE utf8mb4_unicode_ci = msg.id COLLATE utf8mb4_unicode_ci 
                        AND mr.user_id COLLATE utf8mb4_unicode_ci = ?
                    )
                    GROUP BY msg.conversation_id
                `, [...convIds, userId, userId]);

                console.log('📊 Unread counts:', counts);
                counts.forEach(c => { unreadCounts[c.conversation_id] = c.cnt; });
            }
        } catch (e) {
            console.error('❌ message_reads query error:', e.message);
            // message_reads table might not exist, ignore
        }

        // Merge unread counts
        const result = rows.map(row => ({
            ...row,
            unread_count: unreadCounts[row.conversation_id] || 0
        }));

        res.json(result);
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get chat history with a user
app.get('/api/chat/history/:partnerId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const partnerId = req.params.partnerId;

        // Find conversation and my deleted_at timestamp
        const [convRows] = await pool.execute(`
            SELECT c.id, cp1.deleted_at
            FROM conversations c
            JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
            JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
            WHERE c.type = 'private' 
            AND cp1.user_id = ? 
            AND cp2.user_id = ?
            LIMIT 1
        `, [userId, partnerId]);

        if (convRows.length === 0) return res.json([]);

        const conversationId = convRows[0].id;
        const myDeletedAt = convRows[0].deleted_at;

        // Check if deleted_by column exists (quick hack)
        try {
            await pool.execute('SELECT deleted_by FROM messages LIMIT 1');
        } catch (e) {
            try {
                await pool.execute('ALTER TABLE messages ADD COLUMN deleted_by JSON');
            } catch (alterErr) {
                // Ignore if already exists or other error
            }
        }

        const [messages] = await pool.execute(`
            SELECT id, sender_id, content, created_at, type, image_url, deleted_by
            FROM messages 
            WHERE conversation_id = ? 
            AND (created_at > ? OR ? IS NULL)
            ORDER BY created_at DESC
            LIMIT 50
        `, [conversationId, myDeletedAt, myDeletedAt]);

        // Don't filter out deleted messages, instead mark them as deleted
        res.json(messages.reverse().map(m => {
            const deletedBy = safeJsonParse(m.deleted_by);
            const isDeleted = deletedBy.length > 0;

            return {
                _id: m.id,
                text: isDeleted ? null : m.content, // Clear content if deleted
                type: m.type || 'text',
                imageUrl: isDeleted ? null : (m.image_url || null), // Clear image if deleted
                createdAt: m.created_at,
                user: { _id: m.sender_id },
                isDeleted: isDeleted,
                deletedBy: deletedBy, // Array of user IDs who deleted this message
                isEdited: m.is_edited === 1,
                editedAt: m.edited_at
            };
        }));
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete message (for me only)
app.delete('/api/chat/messages/:id', authenticateToken, async (req, res) => {
    try {
        const messageId = req.params.id;
        const userId = req.user.id;

        // Get current deleted_by
        const [rows] = await pool.execute('SELECT deleted_by FROM messages WHERE id = ?', [messageId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Message not found' });

        let deletedBy = safeJsonParse(rows[0].deleted_by);
        if (!deletedBy.includes(userId)) {
            deletedBy.push(userId);
            await pool.execute('UPDATE messages SET deleted_by = ? WHERE id = ?', [JSON.stringify(deletedBy), messageId]);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Search users to chat
app.get('/api/users/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const [users] = await pool.execute(
            'SELECT id, name, avatar FROM users WHERE name LIKE ? AND id != ? LIMIT 10',
            [`%${q}%`, req.user.id]
        );
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Pin/Unpin conversation
app.post('/api/chat/conversations/:id/pin', authenticateToken, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;
        const { pin } = req.body; // true = pin, false = unpin

        // Check if there's already a pin record
        const [existing] = await pool.execute(
            'SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
            [conversationId, userId]
        );

        if (existing.length > 0) {
            await pool.execute(
                'UPDATE conversation_participants SET is_pinned = ? WHERE conversation_id = ? AND user_id = ?',
                [pin ? 1 : 0, conversationId, userId]
            );
        }

        res.json({ success: true, pinned: pin });
    } catch (error) {
        console.error('Pin conversation error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Mute/Unmute conversation
app.post('/api/chat/conversations/:id/mute', authenticateToken, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;
        const { mute } = req.body;

        await pool.execute(
            'UPDATE conversation_participants SET is_muted = ? WHERE conversation_id = ? AND user_id = ?',
            [mute ? 1 : 0, conversationId, userId]
        );

        res.json({ success: true, muted: mute });
    } catch (error) {
        console.error('Mute conversation error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete (hide) conversation for current user
app.delete('/api/chat/conversations/:id', authenticateToken, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;

        // Ensure deleted_at column exists
        try {
            await pool.execute('SELECT deleted_at FROM conversation_participants LIMIT 1');
        } catch (e) {
            try {
                await pool.execute('ALTER TABLE conversation_participants ADD COLUMN deleted_at DATETIME NULL');
            } catch (alterErr) { }
        }

        // Soft delete + Clear history
        await pool.execute(
            'UPDATE conversation_participants SET is_hidden = 1, deleted_at = NOW() WHERE conversation_id = ? AND user_id = ?',
            [conversationId, userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Mark conversation as read
app.post('/api/chat/conversations/:id/read', authenticateToken, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const userId = req.user.id;

        // Get all unread messages in this conversation
        const [unreadMessages] = await pool.execute(`
            SELECT id FROM messages 
            WHERE conversation_id = ? 
            AND sender_id != ?
            AND id COLLATE utf8mb4_unicode_ci NOT IN (
                SELECT message_id COLLATE utf8mb4_unicode_ci FROM message_reads WHERE user_id = ?
            )
        `, [conversationId, userId, userId]);

        if (unreadMessages.length > 0) {
            // Mark them all as read
            for (const msg of unreadMessages) {
                await pool.execute(
                    'INSERT IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, NOW())',
                    [msg.id, userId]
                );
            }

            // Emit Socket Update
            if (io) {
                io.to(conversationId).emit('messagesRead', {
                    conversationId,
                    userId,
                    lastMessageId: unreadMessages[unreadMessages.length - 1].id
                });

                // Also emit specialized event for group details
                io.to(conversationId).emit('groupMessageRead', {
                    conversationId,
                    userId,
                    messageIds: unreadMessages.map(m => m.id)
                });
            }
        }

        res.json({ success: true, markedCount: unreadMessages.length });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Compatible route for Frontend calls (/api/messages/read)
app.post('/api/messages/read', authenticateToken, async (req, res) => {
    try {
        const { conversationId } = req.body;
        if (!conversationId) return res.status(400).json({ error: 'Missing conversationId' });

        const userId = req.user.id;

        // Reuse logic: Mark all unread messages as read
        const [unreadMessages] = await pool.execute(`
            SELECT id FROM messages 
            WHERE conversation_id = ? 
            AND sender_id != ?
            AND id COLLATE utf8mb4_unicode_ci NOT IN (
                SELECT message_id COLLATE utf8mb4_unicode_ci FROM message_reads WHERE user_id = ?
            )
        `, [conversationId, userId, userId]);

        if (unreadMessages.length > 0) {
            for (const msg of unreadMessages) {
                await pool.execute(
                    'INSERT IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, NOW())',
                    [msg.id, userId]
                );
            }

            if (io) {
                io.to(conversationId).emit('messagesRead', {
                    conversationId,
                    userId,
                    lastMessageId: unreadMessages[unreadMessages.length - 1].id
                });
                io.to(conversationId).emit('groupMessageRead', {
                    conversationId,
                    userId,
                    messageIds: unreadMessages.map(m => m.id)
                });
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Legacy mark read error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ IMAGE UPLOAD ============
const multer = require('multer');

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, 'img-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|quicktime/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        // Check mimetype strictly for images, but for video sometimes mimetype varies, so rely on extension too
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');

        if (extname && (isImage || isVideo)) {
            return cb(null, true);
        }
        cb(new Error('Chỉ chấp nhận file ảnh hoặc video!'));
    }
});

// Serve static files from uploads folder
app.use('/uploads', express.static(uploadsDir));

// Upload image endpoint

// Duplicate require removed

const util = require('util');
const execPromise = util.promisify(exec);

// Helper to get video dimensions using ffprobe
async function getVideoDimensions(filePath) {
    try {
        // Try ffprobe command
        const { stdout } = await execPromise(
            `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`
        );
        const parts = stdout.trim().split('x');
        if (parts.length === 2) {
            return {
                width: parseInt(parts[0], 10) || 0,
                height: parseInt(parts[1], 10) || 0
            };
        }
    } catch (e) {
        console.log('ffprobe not available or failed, using default video dimensions');
    }
    // Default to 16:9 aspect ratio (common for videos)
    return { width: 1920, height: 1080 };
}

// ... existing code ...

// Upload image endpoint
app.post('/api/upload/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            console.log('❌ Upload failed: No file in request');
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        console.log(`📂 Incoming file: ${req.file.originalname}, Size: ${req.file.size}, Mimetype: ${req.file.mimetype}`);

        // NEW: Return relative path instead of full URL
        // This makes URLs work regardless of IP changes
        const relativePath = `/uploads/${req.file.filename}`;

        // Also provide full URL for backward compatibility
        const host = req.headers.host || 'localhost:3001';
        const protocol = req.protocol || 'http';
        const fullUrl = `${protocol}://${host}${relativePath}`;

        // Calculate dimensions
        let dimensions = { width: 0, height: 0 };
        try {
            if (req.file.mimetype.startsWith('image/')) {
                // Image: use image-size
                try {
                    const dimensionsResult = sizeOf(req.file.path);
                    dimensions = dimensionsResult;
                } catch (e) {
                    console.log('Size calculation failed', e);
                }
            } else if (req.file.mimetype.startsWith('video/')) {
                // Video: use ffprobe or default
                dimensions = await getVideoDimensions(req.file.path);
            }
        } catch (err) {
            console.error('Error calculating dimensions:', err);
        }

        console.log('📸 Media uploaded:', relativePath, '(full:', fullUrl, ')', dimensions);
        res.json({
            success: true,
            url: relativePath,  // Return relative path - frontend will prepend API_URL
            fullUrl: fullUrl,   // Also provide full URL for debugging
            filename: req.file.filename,
            width: dimensions.width,
            height: dimensions.height
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Lỗi khi upload' });
    }
});

// ... existing code ...

// Get posts
// Get user profile by ID (enhanced with follower info)
app.get('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const currentUserId = req.user.id;

        const [users] = await pool.execute(
            'SELECT id, name, email, avatar, cover_image as coverImage, voice FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Người dùng không tồn tại' });
        }

        // Get follower count
        let followerCount = 0;
        let followingCount = 0;
        let isFollowing = false;

        try {
            const [followerRows] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?',
                [userId]
            );
            followerCount = followerRows[0]?.count || 0;

            const [followingRows] = await pool.execute(
                'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?',
                [userId]
            );
            followingCount = followingRows[0]?.count || 0;

            // Check if current user is following this user
            const [isFollowingRows] = await pool.execute(
                'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?',
                [currentUserId, userId]
            );
            isFollowing = isFollowingRows.length > 0;
        } catch (e) {
            // Table might not exist yet
            console.log('Follower info not available:', e.message);
        }

        res.json({
            ...users[0],
            followerCount,
            followingCount,
            isFollowing
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get posts by specific user
app.get('/api/place/users/:userId/posts', authenticateToken, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const [posts] = await pool.execute(`
            SELECT 
                p.id, 
                p.content, 
                p.image_url as image, 
                p.created_at as createdAt,
                u.id as author_id,
                u.name as author_name,
                u.avatar as author_avatar,
                (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes,
                (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comments,
                (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as isLiked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [currentUserId, targetUserId, limit.toString(), offset.toString()]);

        // Helper to fix localhost URLs
        const fixImageUrl = (url) => {
            if (!url) return null;
            const host = req.headers.host || 'localhost:3001';
            if (url.includes('/uploads/')) {
                const path = url.split('/uploads/')[1];
                return `http://${host}/uploads/${path}`;
            }
            return url.replace(/localhost:3001/g, host).replace(/127.0.0.1:3001/g, host);
        };

        const processImages = (dbImageString) => {
            let processedImages = [];
            if (dbImageString) {
                try {
                    const parsed = JSON.parse(dbImageString);
                    if (Array.isArray(parsed)) {
                        processedImages = parsed.map(item => {
                            if (typeof item === 'string') {
                                return fixImageUrl(item);
                            } else if (item && typeof item === 'object') {
                                return {
                                    ...item,
                                    uri: fixImageUrl(item.url || item.uri)
                                };
                            }
                            return item;
                        });
                    } else {
                        processedImages = [fixImageUrl(dbImageString)];
                    }
                } catch {
                    processedImages = [fixImageUrl(dbImageString)];
                }
            }
            return processedImages;
        };

        const formattedPosts = posts.map(p => {
            let images = processImages(p.image);
            return {
                id: p.id,
                author: {
                    id: p.author_id,
                    name: p.author_name,
                    avatar: p.author_avatar
                },
                content: p.content,
                image: images.length > 0 ? images[0] : null,
                images: images,
                createdAt: formatDateForClient(p.createdAt),
                likes: p.likes,
                isLiked: p.isLiked > 0,
                comments: p.comments,
                views: 0,
                shares: 0
            };
        });

        res.json(formattedPosts);
    } catch (error) {
        console.error('Get user posts error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Follow a user
app.post('/api/place/users/:userId/follow', authenticateToken, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;

        if (targetUserId === currentUserId) {
            return res.status(400).json({ error: 'Không thể theo dõi chính mình' });
        }

        // Ensure table exists
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS user_follows (
                    id VARCHAR(36) PRIMARY KEY,
                    follower_id VARCHAR(36) NOT NULL,
                    following_id VARCHAR(36) NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_follow (follower_id, following_id),
                    INDEX idx_follower (follower_id),
                    INDEX idx_following (following_id)
                )
            `);
        } catch (e) {
            // Table might already exist
        }

        // Check if already following
        const [existing] = await pool.execute(
            'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?',
            [currentUserId, targetUserId]
        );

        if (existing.length > 0) {
            return res.json({ success: true, message: 'Đã theo dõi' });
        }

        // Insert follow record
        await pool.execute(
            'INSERT INTO user_follows (id, follower_id, following_id) VALUES (?, ?, ?)',
            [uuidv4(), currentUserId, targetUserId]
        );

        // Create notification for target user
        try {
            await createNotification(
                targetUserId,
                currentUserId,
                'follow',
                null,
                null,
                'đã bắt đầu theo dõi bạn',
                ''
            );
        } catch (notifError) {
            console.error('Follow notification error:', notifError);
        }

        res.json({ success: true, message: 'Đã theo dõi thành công' });
    } catch (error) {
        console.error('Follow user error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Unfollow a user
app.post('/api/place/users/:userId/unfollow', authenticateToken, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const currentUserId = req.user.id;

        await pool.execute(
            'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
            [currentUserId, targetUserId]
        );

        res.json({ success: true, message: 'Đã bỏ theo dõi thành công' });
    } catch (error) {
        console.error('Unfollow user error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

app.get('/api/place/posts', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const userId = req.user.id;

        const [posts] = await pool.execute(`
            SELECT 
                p.id, 
                p.content, 
                p.image_url as image, 
                p.created_at as createdAt,
                p.original_post_id,
                u.id as author_id,
                u.name as author_name,
                u.avatar as author_avatar,
                u.cover_image as author_cover_image,
                -- Stats
                (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes,
                (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comments,
                (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as isLiked,
                0 as views,
                -- Original Post Info (Self Join)
                op.id as op_id,
                op.content as op_content,
                op.image_url as op_image,
                op.created_at as op_createdAt,
                opu.id as op_author_id,
                opu.name as op_author_name,
                opu.avatar as op_author_avatar,
                opu.cover_image as op_author_cover_image,
                -- Group Info
                pg.id as group_id,
                pg.name as group_name,
                pg.avatar as group_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN posts op ON p.original_post_id = op.id
            LEFT JOIN users opu ON op.user_id = opu.id
            LEFT JOIN place_groups pg ON p.group_id = pg.id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit.toString(), offset.toString()]);

        // Helper to fix localhost URLs to actual IP
        const fixImageUrl = (url) => {
            if (!url) return null;
            const host = req.headers.host || 'localhost:3001';
            // Nếu URL chứa /uploads/, ta sẽ ép nó dùng host hiện tại
            if (url.includes('/uploads/')) {
                const path = url.split('/uploads/')[1];
                return `http://${host}/uploads/${path}`;
            }
            return url.replace(/localhost:3001/g, host).replace(/127.0.0.1:3001/g, host);
        };

        const processImages = (dbImageString) => {
            let processedImages = [];
            if (dbImageString) {
                try {
                    const parsed = JSON.parse(dbImageString);
                    if (Array.isArray(parsed)) {
                        processedImages = parsed.map(item => {
                            if (typeof item === 'string') {
                                return fixImageUrl(item);
                            } else if (item && typeof item === 'object') {
                                return {
                                    ...item,
                                    uri: fixImageUrl(item.url || item.uri) // standarize to uri
                                };
                            }
                            return item;
                        });
                    } else {
                        // Single string (legacy)
                        processedImages = [fixImageUrl(dbImageString)];
                    }
                } catch {
                    // Not JSON, just a string URL
                    processedImages = [fixImageUrl(dbImageString)];
                }
            }
            return processedImages;
        };

        const formattedPosts = posts.map(p => {
            // Parse images locally for main post
            let images = processImages(p.image);

            // Parse images locally for original post (if exists)
            let opImages = [];
            let originalPost = null;

            if (p.op_id) {
                opImages = processImages(p.op_image);

                originalPost = {
                    id: p.op_id,
                    author: {
                        id: p.op_author_id,
                        name: p.op_author_name,
                        avatar: p.op_author_avatar,
                        coverImage: p.op_author_cover_image
                    },
                    content: p.op_content,
                    image: opImages.length > 0 ? opImages[0] : null,
                    images: opImages,
                    createdAt: formatDateForClient(p.op_createdAt)
                };
            }

            return {
                id: p.id,
                author: {
                    id: p.author_id,
                    name: p.author_name,
                    avatar: p.author_avatar,
                    coverImage: p.author_cover_image
                },
                content: p.content,
                image: images.length > 0 ? images[0] : null,
                images: images,
                originalPost: originalPost, // Attached Shared Post
                createdAt: formatDateForClient(p.createdAt),
                likes: p.likes,
                isLiked: p.isLiked > 0,
                comments: p.comments,
                views: p.views || 0,
                shares: 0,
                taggedUsers: [], // Will be populated below
                group: p.group_id ? {
                    id: p.group_id,
                    name: p.group_name,
                    avatar: fixImageUrl(p.group_avatar)
                } : null
            };
        });

        // Fetch tagged users for all posts in one query
        const postIds = formattedPosts.map(p => p.id);
        if (postIds.length > 0) {
            try {
                const [taggedRows] = await pool.execute(`
                    SELECT pt.post_id, u.id, u.name, u.avatar, u.cover_image
                    FROM post_tags pt
                    JOIN users u ON pt.user_id = u.id
                    WHERE pt.post_id IN (${postIds.map(() => '?').join(',')})
                `, postIds);

                // Group tagged users by post
                const tagsByPost = {};
                taggedRows.forEach(row => {
                    if (!tagsByPost[row.post_id]) tagsByPost[row.post_id] = [];
                    tagsByPost[row.post_id].push({
                        id: row.id,
                        name: row.name,
                        avatar: row.avatar,
                        coverImage: row.cover_image
                    });
                });

                // Attach to posts
                formattedPosts.forEach(post => {
                    post.taggedUsers = tagsByPost[post.id] || [];
                });
            } catch (e) {
                // Table might not exist yet, ignore
            }
        }

        res.json(formattedPosts);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Create post
app.post('/api/place/posts', authenticateToken, async (req, res) => {
    try {
        let { content, imageUrl, images, originalPostId, taggedUserIds } = req.body;

        // Auto-fetch Link Preview ONLY if NO images are provided
        const hasStaticImages = (images && Array.isArray(images) && images.length > 0) || (imageUrl && imageUrl.trim() !== '');

        if (!hasStaticImages && content) {
            try {
                // Regex to find URL
                const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                    const url = urlMatch[0];
                    console.log('🔍 Detecting URL for preview:', url);

                    // Fetch HTML using axios
                    const response = await axios.get(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
                        timeout: 5000
                    });
                    const html = response.data;

                    const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
                    const twitterImageMatch = html.match(/<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i);
                    const foundImage = (ogImageMatch && ogImageMatch[1]) || (twitterImageMatch && twitterImageMatch[1]);

                    if (foundImage) {
                        console.log('✅ Found OG Image for preview:', foundImage);
                        if (foundImage.startsWith('http')) {
                            imageUrl = foundImage;
                            images = [foundImage];
                        }
                    }
                }
            } catch (err) {
                console.error('⚠️ Auto-fetch image failed:', err.message);
            }
        }

        const hasContent = !!content && content.trim().length > 0;
        const hasImages = (images && images.length > 0) || !!imageUrl;
        const isShare = !!originalPostId;

        // If sharing, content can be empty. If not sharing, requires content or images
        if (!isShare && !hasContent && !hasImages) {
            return res.status(400).json({ error: 'Nội dung không được để trống' });
        }

        const postId = uuidv4();
        const userId = req.user.id;

        // Ensure we handle both single imageUrl and multiple images array
        let imageToSave = null;
        const finalImages = (images && Array.isArray(images) && images.length > 0) ? images : (imageUrl ? [imageUrl] : []);

        if (finalImages.length > 0) {
            // Store as JSON string in the database
            imageToSave = JSON.stringify(finalImages.map(img => typeof img === 'object' ? img.uri : img));
        }

        console.log(`📝 Creating post ${postId} for user ${userId}`);
        console.log(`🖼 Final image data to save:`, imageToSave ? (imageToSave.length > 100 ? imageToSave.substring(0, 100) + '...' : imageToSave) : 'none');

        await pool.execute(
            'INSERT INTO posts (id, user_id, content, image_url, original_post_id) VALUES (?, ?, ?, ?, ?)',
            [postId, userId, content, imageToSave, originalPostId || null]
        );

        // Save tagged users
        let taggedUsers = [];
        if (taggedUserIds && Array.isArray(taggedUserIds) && taggedUserIds.length > 0) {
            for (const tagUserId of taggedUserIds) {
                try {
                    await pool.execute(
                        'INSERT INTO post_tags (id, post_id, user_id) VALUES (?, ?, ?)',
                        [uuidv4(), postId, tagUserId]
                    );
                } catch (e) {
                    // Ignore duplicate or errors
                }
            }

            // Fetch tagged user details
            const [taggedRows] = await pool.execute(`
                SELECT id, name, avatar FROM users WHERE id IN (${taggedUserIds.map(() => '?').join(',')})
            `, taggedUserIds);
            taggedUsers = taggedRows;
        }

        // Fetch user info to return complete post object (Simplified for speed)
        const [users] = await pool.execute('SELECT name, avatar FROM users WHERE id = ?', [userId]);
        const user = users[0];

        const returnedImages = images && images.length > 0 ? images : (imageUrl ? [imageUrl] : []);

        const newPost = {
            id: postId,
            author: {
                id: userId,
                name: user.name,
                avatar: user.avatar
            },
            content,
            image: returnedImages[0] || null,
            images: returnedImages,
            originalPostId: originalPostId,
            createdAt: new Date().toISOString(),
            likes: 0,
            isLiked: false,
            comments: 0,
            views: 0,
            shares: 0,
            taggedUsers: taggedUsers
        };

        res.json(newPost);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Toggle reaction (like, love, haha, wow, sad, angry) - Facebook style
app.post('/api/place/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const { reactionType } = req.body; // 'like', 'love', 'haha', 'wow', 'sad', 'angry'
        const validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
        const reaction = validReactions.includes(reactionType) ? reactionType : 'like';

        // Check if already reacted
        const [existingReaction] = await pool.execute(
            'SELECT id, reaction_type FROM post_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );

        let isLiked = false;
        let currentReaction = null;

        if (existingReaction.length > 0) {
            const existingType = existingReaction[0].reaction_type;

            if (existingType === reaction) {
                // Same reaction - remove it (unlike)
                await pool.execute(
                    'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
                    [postId, userId]
                );
                isLiked = false;
                currentReaction = null;
            } else {
                // Different reaction - update it
                await pool.execute(
                    'UPDATE post_likes SET reaction_type = ? WHERE post_id = ? AND user_id = ?',
                    [reaction, postId, userId]
                );
                isLiked = true;
                currentReaction = reaction;
            }
        } else {
            // New reaction
            await pool.execute(
                'INSERT INTO post_likes (id, post_id, user_id, reaction_type) VALUES (?, ?, ?, ?)',
                [uuidv4(), postId, userId, reaction]
            );
            isLiked = true;
            currentReaction = reaction;

            // Create notification for post owner
            try {
                const reactionLabels = {
                    like: 'đã thích',
                    love: 'đã yêu thích',
                    haha: 'đã cười với',
                    wow: 'đã ngạc nhiên với',
                    sad: 'đã buồn với',
                    angry: 'đã giận dữ với'
                };
                const [posts] = await pool.execute(
                    'SELECT user_id, LEFT(content, 50) as preview FROM posts WHERE id = ?',
                    [postId]
                );
                if (posts.length > 0 && posts[0].user_id !== userId) {
                    await createNotification(
                        posts[0].user_id,
                        userId,
                        'like',
                        postId,
                        null,
                        `${reactionLabels[reaction] || 'đã thích'} bài viết của bạn`,
                        posts[0].preview || ''
                    );
                }
            } catch (notifError) {
                console.error('Notification error:', notifError);
            }
        }

        res.json({ success: true, isLiked, reactionType: currentReaction });
    } catch (error) {
        console.error('Toggle reaction error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Track post view
app.post('/api/place/posts/:id/view', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        // Try to track view - silently fail if table doesn't exist
        try {
            // Check if already viewed by this user
            const [existing] = await pool.execute(
                'SELECT id FROM post_views WHERE post_id = ? AND user_id = ?',
                [postId, userId]
            );

            if (existing.length === 0) {
                // Insert new view record
                await pool.execute(
                    'INSERT INTO post_views (id, post_id, user_id) VALUES (?, ?, ?)',
                    [uuidv4(), postId, userId]
                );
            }
        } catch (tableError) {
            // Table might not exist yet - ignore
            console.log('Track view skipped - table may not exist yet');
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Track view error:', error);
        res.json({ success: true }); // Always return success to not break UX
    }
});

// Get comments
app.get('/api/place/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const [comments] = await pool.execute(`
            SELECT 
                c.id, 
                c.content, 
                c.created_at as createdAt,
                u.id as userId,
                u.name as userName,
                u.avatar as userAvatar,
                u.cover_image as userCoverImage
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);

        const formattedComments = comments.map(c => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            user: {
                id: c.userId,
                name: c.userName,
                avatar: c.userAvatar,
                coverImage: c.userCoverImage
            }
        }));

        res.json(formattedComments);
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Create comment
app.post('/api/place/posts/:id/comments', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Nội dung bình luận không được để trống' });
        }

        const commentId = uuidv4();
        await pool.execute(
            'INSERT INTO post_comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)',
            [commentId, postId, userId, content]
        );

        // Fetch user info
        const [users] = await pool.execute('SELECT name, avatar FROM users WHERE id = ?', [userId]);
        const user = users[0];

        // Create notification for post owner
        try {
            const [posts] = await pool.execute(
                'SELECT user_id, LEFT(content, 50) as preview FROM posts WHERE id = ?',
                [postId]
            );
            if (posts.length > 0 && posts[0].user_id !== userId) {
                const commentPreview = content.length > 30 ? content.substring(0, 30) + '...' : content;
                await createNotification(
                    posts[0].user_id,  // recipient (post owner)
                    userId,             // actor (who commented)
                    'comment',
                    postId,
                    commentId,
                    `đã bình luận: "${commentPreview}"`,
                    posts[0].preview || ''
                );
            }
        } catch (notifError) {
            console.error('Notification error:', notifError);
        }

        const newComment = {
            id: commentId,
            content,
            createdAt: new Date().toISOString(),
            user: {
                id: userId,
                name: user.name,
                avatar: user.avatar
            }
        };

        res.json(newComment);
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ NOTIFICATIONS API ============

// Get notifications for current user
app.get('/api/place/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;

        const [notifications] = await pool.execute(`
            SELECT 
                n.id,
                n.type,
                n.post_id as postId,
                n.comment_id as commentId,
                n.message,
                n.post_preview as postPreview,
                n.is_read as isRead,
                n.created_at as createdAt,
                u.id as actor_id,
                u.name as actor_name,
                u.avatar as actor_avatar,
                u.cover_image as actor_cover_image
            FROM place_notifications n
            JOIN users u ON n.actor_id = u.id
            WHERE n.recipient_id = ?
            ORDER BY n.created_at DESC
            LIMIT ?
        `, [userId, limit.toString()]);

        const formattedNotifications = notifications.map(n => ({
            id: n.id,
            type: n.type,
            user: {
                id: n.actor_id,
                name: n.actor_name,
                avatar: n.actor_avatar,
                coverImage: n.actor_cover_image
            },
            postId: n.postId,
            postPreview: n.postPreview,
            message: n.message,
            createdAt: formatDateForClient(n.createdAt),
            isRead: !!n.isRead
        }));

        res.json(formattedNotifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get unread notification count
app.get('/api/place/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [result] = await pool.execute(
            'SELECT COUNT(*) as count FROM place_notifications WHERE recipient_id = ? AND is_read = FALSE',
            [userId]
        );
        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Mark notification as read
app.patch('/api/place/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;

        await pool.execute(
            'UPDATE place_notifications SET is_read = TRUE WHERE id = ? AND recipient_id = ?',
            [notificationId, userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Mark all notifications as read
app.patch('/api/place/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.execute(
            'UPDATE place_notifications SET is_read = TRUE WHERE recipient_id = ? AND is_read = FALSE',
            [userId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete a notification
app.delete('/api/place/notifications/:id', authenticateToken, async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user.id;

        // Only allow deleting own notifications
        const [result] = await pool.execute(
            'DELETE FROM place_notifications WHERE id = ? AND recipient_id = ?',
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy thông báo' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ GROUPS API ============

// Function to optimize database indexes
const optimizeDatabase = async () => {
    // Moved to initDatabase
    return;
};

// ============ NOTIFICATION HELPER ============
// Helper function to create notification
const createNotification = async (recipientId, actorId, type, postId = null, commentId = null, message = '', postPreview = '') => {
    // Don't notify yourself
    if (recipientId === actorId) return;

    try {
        const notificationId = uuidv4();
        await pool.execute(
            `INSERT INTO place_notifications (id, recipient_id, actor_id, type, post_id, comment_id, message, post_preview) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [notificationId, recipientId, actorId, type, postId, commentId, message, postPreview]
        );
        console.log(`🔔 Notification created: ${type} for user ${recipientId}`);
        return notificationId;
    } catch (error) {
        console.error('Create notification error:', error);
        return null;
    }
};

// Initialize groups tables
const initGroupsTables = async () => {
    try {
        await optimizeDatabase(); // Optimize DB on startup

        // Create place_groups table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS place_groups (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                avatar TEXT,
                cover_image TEXT,
                privacy ENUM('public', 'private', 'secret') DEFAULT 'public',
                created_by VARCHAR(36) NOT NULL,
                member_count INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create place_group_members table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS place_group_members (
                id VARCHAR(36) PRIMARY KEY,
                group_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                role ENUM('admin', 'moderator', 'member') DEFAULT 'member',
                is_pinned BOOLEAN DEFAULT FALSE,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_member (group_id, user_id)
            )
        `);

        // Add avatar column to place_groups if not exists
        try {
            await pool.execute('ALTER TABLE place_groups ADD COLUMN avatar TEXT');
            console.log('✅ Added avatar column to place_groups');
        } catch (e) { /* Column exists */ }

        // Add cover_image column to place_groups if not exists
        try {
            await pool.execute('ALTER TABLE place_groups ADD COLUMN cover_image TEXT');
            console.log('✅ Added cover_image column to place_groups');
        } catch (e) { /* Column exists */ }

        // Add group_id to posts if not exists
        try {
            await pool.execute('ALTER TABLE posts ADD COLUMN group_id VARCHAR(36) NULL');
        } catch (e) { /* Column exists */ }

        // Add original_post_id to posts if not exists (for sharing)
        try {
            await pool.execute('ALTER TABLE posts ADD COLUMN original_post_id VARCHAR(36) NULL');
        } catch (e) { /* Column exists */ }

        // Create post_comments table if not exists
        try {
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS post_comments (
                    id VARCHAR(36) PRIMARY KEY,
                    post_id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
        } catch (e) { console.error('Create post_comments error', e); }

        console.log('✅ Groups tables initialized');
    } catch (error) {
        console.error('Groups tables init error:', error);
    }
};

// Get user's groups
app.get('/api/place/groups', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const [groups] = await pool.execute(`
            SELECT 
                g.id,
                g.name,
                g.description,
                g.avatar,
                g.cover_image as coverImage,
                g.privacy,
                g.member_count as memberCount,
                g.created_at as createdAt,
                gm.role,
                gm.is_pinned as isPinned
            FROM place_groups g
            JOIN place_group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = ?
            ORDER BY gm.is_pinned DESC, g.updated_at DESC
        `, [userId]);

        // Separate pinned and unpinned
        const pinnedGroups = groups.filter(g => g.isPinned);
        const myGroups = groups.filter(g => !g.isPinned);

        // Get suggested groups (public groups user hasn't joined)
        const [suggestedGroups] = await pool.execute(`
            SELECT 
                g.id,
                g.name,
                g.description,
                g.avatar,
                g.cover_image as coverImage,
                g.privacy,
                g.member_count as memberCount,
                g.created_at as createdAt
            FROM place_groups g
            WHERE g.privacy = 'public'
            AND g.id NOT IN (
                SELECT group_id FROM place_group_members WHERE user_id = ?
            )
            ORDER BY g.member_count DESC
            LIMIT 10
        `, [userId]);

        res.json({
            pinned: pinnedGroups,
            myGroups: myGroups,
            suggested: suggestedGroups
        });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get group detail
app.get('/api/place/groups/:id', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;

        const [groups] = await pool.execute(`
            SELECT 
                g.*,
                gm.role as myRole,
                gm.is_pinned as isPinned
            FROM place_groups g
            LEFT JOIN place_group_members gm ON g.id = gm.group_id AND gm.user_id = ?
            WHERE g.id = ?
        `, [userId, groupId]);

        if (groups.length === 0) {
            return res.status(404).json({ error: 'Nhóm không tồn tại' });
        }

        const group = groups[0];

        // Get some members for avatar stack
        const [members] = await pool.execute(`
            SELECT u.id, u.name, u.avatar, u.cover_image
            FROM place_group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ?
            ORDER BY gm.role = 'admin' DESC, gm.joined_at ASC
            LIMIT 5
        `, [groupId]);

        res.json({
            id: group.id,
            name: group.name,
            description: group.description,
            avatar: group.avatar,
            coverImage: group.cover_image,
            privacy: group.privacy,
            memberCount: group.member_count,
            createdAt: group.created_at,
            isMember: !!group.myRole,
            myRole: group.myRole,
            isPinned: !!group.isPinned,
            previewMembers: members
        });
    } catch (error) {
        console.error('Get group detail error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Create group
app.post('/api/place/groups', authenticateToken, async (req, res) => {
    try {
        const { name, description, privacy } = req.body;
        const userId = req.user.id;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Tên nhóm không được để trống' });
        }

        const groupId = uuidv4();
        const memberId = uuidv4();

        // Create group
        await pool.execute(
            'INSERT INTO place_groups (id, name, description, privacy, created_by) VALUES (?, ?, ?, ?, ?)',
            [groupId, name, description || '', privacy || 'public', userId]
        );

        // Add creator as admin
        await pool.execute(
            'INSERT INTO place_group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)',
            [memberId, groupId, userId, 'admin']
        );

        res.json({
            id: groupId,
            name,
            description: description || '',
            privacy: privacy || 'public',
            memberCount: 1,
            isMember: true,
            myRole: 'admin'
        });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Update group info (Admin only)
app.put('/api/place/groups/:id', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;
        const { name, description, privacy, coverImage, avatar } = req.body;

        // Check if current user is admin
        const [adminCheck] = await pool.execute(
            'SELECT role FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
            return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể chỉnh sửa nhóm' });
        }

        // Check if group exists
        const [groupCheck] = await pool.execute(
            'SELECT id, name, description, privacy, cover_image, avatar FROM place_groups WHERE id = ?',
            [groupId]
        );

        if (groupCheck.length === 0) {
            return res.status(404).json({ error: 'Nhóm không tồn tại' });
        }

        const currentGroup = groupCheck[0];

        // Validate name if provided
        if (name !== undefined && name.trim().length === 0) {
            return res.status(400).json({ error: 'Tên nhóm không được để trống' });
        }

        // Validate privacy if provided
        if (privacy !== undefined && !['public', 'private', 'secret'].includes(privacy)) {
            return res.status(400).json({ error: 'Quyền riêng tư không hợp lệ' });
        }

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name.trim());
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (privacy !== undefined) {
            updates.push('privacy = ?');
            params.push(privacy);
        }
        if (coverImage !== undefined) {
            updates.push('cover_image = ?');
            params.push(coverImage);
        }
        if (avatar !== undefined) {
            updates.push('avatar = ?');
            params.push(avatar);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Không có thông tin nào để cập nhật' });
        }

        updates.push('updated_at = NOW()');
        params.push(groupId);

        console.log('📝 Updating group:', groupId);
        console.log('📝 Updates:', updates);
        console.log('📝 Params:', params);

        await pool.execute(
            `UPDATE place_groups SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        console.log('✅ Group updated successfully');

        // Get updated group info
        const [updatedGroup] = await pool.execute(
            'SELECT id, name, description, privacy, cover_image, avatar, member_count FROM place_groups WHERE id = ?',
            [groupId]
        );

        res.json({
            success: true,
            message: 'Đã cập nhật thông tin nhóm',
            group: {
                id: updatedGroup[0].id,
                name: updatedGroup[0].name,
                description: updatedGroup[0].description,
                privacy: updatedGroup[0].privacy,
                coverImage: updatedGroup[0].cover_image,
                avatar: updatedGroup[0].avatar,
                memberCount: updatedGroup[0].member_count
            }
        });
    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete group (Admin only)
app.delete('/api/place/groups/:id', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;

        // Check if current user is admin
        const [adminCheck] = await pool.execute(
            'SELECT role FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
            return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể xóa nhóm' });
        }

        // Delete all members
        await pool.execute('DELETE FROM place_group_members WHERE group_id = ?', [groupId]);

        // Delete all posts (optional - depends on your data model)
        await pool.execute('DELETE FROM place_group_posts WHERE group_id = ?', [groupId]);

        // Delete group
        await pool.execute('DELETE FROM place_groups WHERE id = ?', [groupId]);

        res.json({ success: true, message: 'Đã xóa nhóm' });
    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Join group
app.post('/api/place/groups/:id/join', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;

        // Check if already member
        const [existing] = await pool.execute(
            'SELECT id FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        if (existing.length > 0) {
            return res.json({ success: true, message: 'Đã là thành viên' });
        }

        const memberId = uuidv4();
        await pool.execute(
            'INSERT INTO place_group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)',
            [memberId, groupId, userId, 'member']
        );

        // Update member count
        await pool.execute(
            'UPDATE place_groups SET member_count = member_count + 1 WHERE id = ?',
            [groupId]
        );

        res.json({ success: true, message: 'Đã tham gia nhóm' });
    } catch (error) {
        console.error('Join group error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Leave group
app.post('/api/place/groups/:id/leave', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;

        await pool.execute(
            'DELETE FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        // Update member count
        await pool.execute(
            'UPDATE place_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = ?',
            [groupId]
        );

        res.json({ success: true, message: 'Đã rời khỏi nhóm' });
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Toggle pin group
app.post('/api/place/groups/:id/pin', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;
        const { pin } = req.body;

        await pool.execute(
            'UPDATE place_group_members SET is_pinned = ? WHERE group_id = ? AND user_id = ?',
            [pin ? 1 : 0, groupId, userId]
        );

        res.json({ success: true, isPinned: pin });
    } catch (error) {
        console.error('Pin group error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get group members with roles
app.get('/api/place/groups/:id/members', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;
        const { search } = req.query;

        // First check if user has access (is member or group is public)
        const [groupCheck] = await pool.execute(`
            SELECT g.privacy, gm.role as myRole
            FROM place_groups g
            LEFT JOIN place_group_members gm ON g.id = gm.group_id AND gm.user_id = ?
            WHERE g.id = ?
        `, [userId, groupId]);

        if (groupCheck.length === 0) {
            return res.status(404).json({ error: 'Nhóm không tồn tại' });
        }

        const group = groupCheck[0];
        const isMember = !!group.myRole;
        const isAdmin = group.myRole === 'admin';

        // For private/secret groups, only members can see member list
        if ((group.privacy === 'private' || group.privacy === 'secret') && !isMember) {
            return res.status(403).json({ error: 'Bạn cần tham gia nhóm để xem thành viên' });
        }

        // Build search condition
        let searchCondition = '';
        let searchParams = [groupId];
        if (search && search.trim()) {
            searchCondition = 'AND u.name LIKE ?';
            searchParams.push(`%${search.trim()}%`);
        }

        // Get all members
        const [allMembers] = await pool.execute(`
            SELECT 
                u.id,
                u.name,
                u.avatar,
                gm.role,
                gm.joined_at as joinedAt
            FROM place_group_members gm
            JOIN users u ON gm.user_id = u.id
            WHERE gm.group_id = ? ${searchCondition}
            ORDER BY 
                CASE gm.role 
                    WHEN 'admin' THEN 1 
                    WHEN 'moderator' THEN 2 
                    ELSE 3 
                END,
                gm.joined_at ASC
        `, searchParams);

        // Separate by role
        const admins = allMembers.filter(m => m.role === 'admin');
        const moderators = allMembers.filter(m => m.role === 'moderator');
        const recentMembers = allMembers.filter(m => m.role === 'member').slice(0, 20);

        // Calculate "recent" as joined in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newMembers = allMembers.filter(m =>
            m.role === 'member' && new Date(m.joinedAt) > thirtyDaysAgo
        );

        res.json({
            totalCount: allMembers.length,
            myRole: group.myRole || null,
            isAdmin,
            adminsAndModerators: [...admins, ...moderators],
            newMembers: newMembers.slice(0, 10),
            allMembers: allMembers.slice(0, 50) // Limit for performance
        });
    } catch (error) {
        console.error('Get group members error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Remove member from group (Admin only)
app.delete('/api/place/groups/:id/members/:memberId', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const memberId = req.params.memberId;
        const userId = req.user.id;

        // Check if current user is admin
        const [adminCheck] = await pool.execute(
            'SELECT role FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
            return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể xóa thành viên' });
        }

        // Cannot remove yourself
        if (memberId === userId) {
            return res.status(400).json({ error: 'Bạn không thể xóa chính mình khỏi nhóm' });
        }

        // Check if target is also admin (cannot remove other admins)
        const [targetCheck] = await pool.execute(
            'SELECT role FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, memberId]
        );

        if (targetCheck.length === 0) {
            return res.status(404).json({ error: 'Thành viên không tồn tại trong nhóm' });
        }

        if (targetCheck[0].role === 'admin') {
            return res.status(403).json({ error: 'Không thể xóa quản trị viên khác' });
        }

        // Remove member
        await pool.execute(
            'DELETE FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, memberId]
        );

        // Update member count
        await pool.execute(
            'UPDATE place_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = ?',
            [groupId]
        );

        res.json({ success: true, message: 'Đã xóa thành viên khỏi nhóm' });
    } catch (error) {
        console.error('Remove member error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Change member role (Admin only)
app.put('/api/place/groups/:id/members/:memberId/role', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const memberId = req.params.memberId;
        const userId = req.user.id;
        const { role } = req.body;

        // Validate role
        if (!['member', 'moderator', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Vai trò không hợp lệ' });
        }

        // Check if current user is admin
        const [adminCheck] = await pool.execute(
            'SELECT role FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
            return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể thay đổi vai trò' });
        }

        // Cannot change own role
        if (memberId === userId) {
            return res.status(400).json({ error: 'Bạn không thể thay đổi vai trò của chính mình' });
        }

        // Check if target exists
        const [targetCheck] = await pool.execute(
            'SELECT role FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, memberId]
        );

        if (targetCheck.length === 0) {
            return res.status(404).json({ error: 'Thành viên không tồn tại trong nhóm' });
        }

        // Update role
        await pool.execute(
            'UPDATE place_group_members SET role = ? WHERE group_id = ? AND user_id = ?',
            [role, groupId, memberId]
        );

        res.json({ success: true, message: 'Đã cập nhật vai trò thành viên', newRole: role });
    } catch (error) {
        console.error('Change role error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Invite/Add member to group
app.post('/api/place/groups/:id/members', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;
        const { targetUserId } = req.body;

        if (!targetUserId) {
            return res.status(400).json({ error: 'Thiếu ID người dùng' });
        }

        // Check if current user is member (any member can invite)
        const [memberCheck] = await pool.execute(
            'SELECT role FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        if (memberCheck.length === 0) {
            return res.status(403).json({ error: 'Bạn cần là thành viên để mời người khác' });
        }

        // Check if group exists and get privacy
        const [groupCheck] = await pool.execute(
            'SELECT privacy FROM place_groups WHERE id = ?',
            [groupId]
        );

        if (groupCheck.length === 0) {
            return res.status(404).json({ error: 'Nhóm không tồn tại' });
        }

        // Check if target user exists
        const [userCheck] = await pool.execute(
            'SELECT id, name, avatar FROM users WHERE id = ?',
            [targetUserId]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({ error: 'Người dùng không tồn tại' });
        }

        // Check if already a member
        const [existingMember] = await pool.execute(
            'SELECT id FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, targetUserId]
        );

        if (existingMember.length > 0) {
            return res.status(400).json({ error: 'Người này đã là thành viên của nhóm' });
        }

        // Add member
        const memberId = uuidv4();
        await pool.execute(
            'INSERT INTO place_group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)',
            [memberId, groupId, targetUserId, 'member']
        );

        // Update member count
        await pool.execute(
            'UPDATE place_groups SET member_count = member_count + 1 WHERE id = ?',
            [groupId]
        );

        res.json({
            success: true,
            message: 'Đã thêm thành viên vào nhóm',
            member: {
                id: userCheck[0].id,
                name: userCheck[0].name,
                avatar: userCheck[0].avatar,
                role: 'member'
            }
        });
    } catch (error) {
        console.error('Add member error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Search users to invite (exclude existing members)
app.get('/api/place/groups/:id/invite-search', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json([]);
        }

        // Search users not in group
        const [users] = await pool.execute(`
            SELECT u.id, u.name, u.avatar
            FROM users u
            WHERE u.name LIKE ?
            AND u.id NOT IN (
                SELECT user_id FROM place_group_members WHERE group_id = ?
            )
            LIMIT 20
        `, [`%${q.trim()}%`, groupId]);

        res.json(users);
    } catch (error) {
        console.error('Invite search error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Helper to fix localhost URLs for mobile access
const fixImageUrl = (url, currentHost) => {
    if (!url) return null;
    // Nếu URL chứa /uploads/, ta sẽ ép nó dùng host hiện tại
    if (url.includes('/uploads/')) {
        const path = url.split('/uploads/')[1];
        return `http://${currentHost}/uploads/${path}`;
    }
    // Fallback cho các trường hợp khác (nếu có)
    return url.replace(/localhost:3001/g, currentHost).replace(/127.0.0.1:3001/g, currentHost);
};

// Get group posts
app.get('/api/place/groups/:id/posts', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;
        const host = req.headers.host || 'localhost:3001';

        const [posts] = await pool.execute(`
            SELECT 
                p.id, 
                p.content, 
                p.image_url as image, 
                p.created_at as createdAt,
                u.id as author_id,
                u.name as author_name,
                u.avatar as author_avatar,
                (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as likes,
                (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comments,
                (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as isLiked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.group_id = ?
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [userId, groupId]);

        // Helper to process images - handles both string URLs and {uri, width, height} objects
        const processImages = (dbImageString) => {
            let processedImages = [];
            if (dbImageString) {
                try {
                    const parsed = JSON.parse(dbImageString);
                    if (Array.isArray(parsed)) {
                        processedImages = parsed.map(item => {
                            if (typeof item === 'string') {
                                return fixImageUrl(item, host);
                            } else if (item && typeof item === 'object') {
                                return {
                                    ...item,
                                    uri: fixImageUrl(item.url || item.uri, host) // standardize to uri
                                };
                            }
                            return item;
                        });
                    } else {
                        // Single string (legacy)
                        processedImages = [fixImageUrl(dbImageString, host)];
                    }
                } catch {
                    // Not JSON, just a string URL
                    processedImages = [fixImageUrl(dbImageString, host)];
                }
            }
            return processedImages;
        };

        const formattedPosts = posts.map(p => {
            let images = processImages(p.image);

            return {
                id: p.id,
                author: {
                    id: p.author_id,
                    name: p.author_name,
                    avatar: p.author_avatar
                },
                content: p.content,
                image: images.length > 0 ? images[0] : null,
                images: images,
                groupId: groupId,
                createdAt: p.createdAt,
                likes: p.likes,
                isLiked: p.isLiked > 0,
                comments: p.comments
            };
        });

        res.json(formattedPosts);
    } catch (error) {
        console.error('Get group posts error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Create post in group
app.post('/api/place/groups/:id/posts', authenticateToken, async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user.id;
        const { content, images } = req.body;

        // ✅ IMPORTANT: Check if user is a member of the group
        const [membership] = await pool.execute(
            'SELECT role FROM place_group_members WHERE group_id = ? AND user_id = ?',
            [groupId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Bạn cần tham gia nhóm trước khi đăng bài' });
        }

        if ((!content || content.trim().length === 0) && (!images || !Array.isArray(images) || images.length === 0)) {
            return res.status(400).json({ error: 'Nội dung hoặc hình ảnh không được để trống' });
        }

        const postId = uuidv4();
        let imageToSave = null;
        if (images && Array.isArray(images) && images.length > 0) {
            imageToSave = JSON.stringify(images);
        }

        await pool.execute(
            'INSERT INTO posts (id, user_id, content, image_url, group_id) VALUES (?, ?, ?, ?, ?)',
            [postId, userId, content, imageToSave, groupId]
        );

        const [users] = await pool.execute('SELECT name, avatar FROM users WHERE id = ?', [userId]);
        const user = users[0];

        const [groups] = await pool.execute('SELECT name FROM place_groups WHERE id = ?', [groupId]);
        const groupName = groups[0]?.name || '';

        res.json({
            id: postId,
            author: {
                id: userId,
                name: user.name,
                avatar: user.avatar
            },
            content,
            images: images || [],
            groupId: groupId,
            groupName: groupName,
            createdAt: new Date().toISOString(),
            likes: 0,
            isLiked: false,
            comments: 0
        });
    } catch (error) {
        console.error('Create group post error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Initialize groups tables on startup
initGroupsTables();

// Start server
const PORT = process.env.PORT || 3001;

// ============ SOCKET.IO HANDLERS ============

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins their own room for private messages
    socket.on('join', (userId) => {
        socket.join(userId);
        socket.userId = userId; // Store userId on socket for disconnect handling
        console.log(`User ${userId} joined room`);

        // Track online status
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Broadcast to all that this user is online
        io.emit('userOnline', { userId });

        // Update user status in database
        pool.execute(
            "UPDATE users SET status = 'online', last_seen = NOW() WHERE id = ?",
            [userId]
        ).catch(err => console.error('Update status error:', err));
    });

    // Check if a specific user is online
    socket.on('checkUserOnline', ({ userId }) => {
        const isOnline = isUserOnline(userId);
        socket.emit('userOnlineStatus', { userId, isOnline });

        // If online, also emit userOnline
        if (isOnline) {
            socket.emit('userOnline', { userId });
        }
    });

    // Handle sending messages
    // Handle sending messages
    // User joins a group room
    socket.on('joinGroup', (groupId) => {
        socket.join(groupId);
        console.log(`User ${socket.userId} joined group room ${groupId}`);
    });

    // User leaves a group room
    socket.on('leaveGroup', (groupId) => {
        socket.leave(groupId);
        console.log(`User ${socket.userId} left group room ${groupId}`);
    });

    // Handle sending messages
    socket.on('sendMessage', async (data) => {
        // data: { senderId, receiverId, groupId, message, type = 'text', ... }
        console.log('Message:', data);

        try {
            let conversationId = null;
            const messageId = uuidv4();
            let dbType = data.type || 'text';

            // Handle Call Types Fallback
            if (dbType === 'call_ended' || dbType === 'call_missed') {
                dbType = 'text';
            }

            // Fetch sender details
            const [senders] = await pool.execute('SELECT name, avatar FROM users WHERE id = ?', [data.senderId]);
            const senderInfo = senders[0] || {};

            const fullMessage = {
                _id: messageId,
                id: messageId,
                text: data.message,
                type: data.type || 'text',
                imageUrl: data.imageUrl || null,
                imageWidth: data.imageWidth,
                imageHeight: data.imageHeight,
                createdAt: new Date().toISOString(),
                user: {
                    _id: data.senderId,
                    name: senderInfo.name,
                    avatar: senderInfo.avatar
                },
                senderId: data.senderId,
                senderName: senderInfo.name,
                senderAvatar: senderInfo.avatar,
                replyTo: data.replyTo,
                groupId: data.groupId
            };

            // GROUP CHAT MESSAGE
            if (data.groupId) {
                console.log(`💾 Received group message for group: ${data.groupId}`);
                try {
                    await pool.execute(
                        'INSERT INTO messages (id, conversation_id, group_id, sender_id, content, type, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [messageId, null, data.groupId, data.senderId, data.message, dbType, data.imageUrl || null]
                    );
                    console.log(`✅ Group message ${messageId} saved successfully for group ${data.groupId}`);

                    // --- HANDLE @ALL MENTION ---
                    if (data.message && (data.message.includes('@all') || data.message.includes('@tất cả') || data.message.includes('@everyone'))) {
                        try {
                            console.log('🔔 Detect @all mention, processing notifications...');
                            const { Expo } = require('expo-server-sdk');
                            const expo = new Expo();

                            // Get all members tokens except sender
                            const [members] = await pool.execute(`
                                SELECT u.push_token 
                                FROM group_members gm
                                JOIN users u ON gm.user_id = u.id
                                WHERE gm.group_id = ? AND gm.user_id != ? AND u.push_token IS NOT NULL AND u.push_token != ''
                            `, [data.groupId, data.senderId]);

                            const messages = [];
                            for (const member of members) {
                                if (Expo.isExpoPushToken(member.push_token)) {
                                    messages.push({
                                        to: member.push_token,
                                        sound: 'default',
                                        title: `${senderInfo.name || 'Thành viên'} đã nhắc mọi người`,
                                        body: `${senderInfo.name}: ${data.message}`,
                                        data: { groupId: data.groupId, conversationId: null }
                                    });
                                }
                            }

                            if (messages.length > 0) {
                                let chunks = expo.chunkPushNotifications(messages);
                                for (let chunk of chunks) {
                                    await expo.sendPushNotificationsAsync(chunk);
                                }
                                console.log(`✅ Sent @all notification to ${messages.length} members`);
                            }
                        } catch (e) {
                            console.error('❌ Error sending @all notification:', e);
                        }
                    }
                    // --- END @ALL ---

                } catch (saveErr) {
                    console.error(`❌ ERROR saving group message: ${saveErr.message}`);
                    console.log("Data check:", { messageId, groupId: data.groupId, senderId: data.senderId });
                }

                // Emit to group room
                socket.to(data.groupId).emit('receiveMessage', fullMessage);
                console.log(`📡 Emitted receiveMessage to group: ${data.groupId}`);

                // Also emit back to sender primarily for confirmation
                io.to(data.senderId).emit('messageSent', fullMessage);

            }
            // PRIVATE CHAT MESSAGE
            else {
                // Find or create conversation
                const [convRows] = await pool.execute(`
                    SELECT c.id 
                    FROM conversations c
                    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
                    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
                    WHERE c.type = 'private' 
                    AND cp1.user_id = ? 
                    AND cp2.user_id = ?
                    LIMIT 1
                `, [data.senderId, data.receiverId]);

                if (convRows.length > 0) {
                    conversationId = convRows[0].id;
                    await pool.execute(
                        'UPDATE conversation_participants SET is_hidden = 0 WHERE conversation_id = ? AND (user_id = ? OR user_id = ?)',
                        [conversationId, data.senderId, data.receiverId]
                    );
                } else {
                    conversationId = uuidv4();
                    await pool.execute('INSERT INTO conversations (id, type) VALUES (?, "private")', [conversationId]);
                    await pool.execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', [conversationId, data.senderId]);
                    await pool.execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', [conversationId, data.receiverId]);
                }

                await pool.execute(
                    'INSERT INTO messages (id, conversation_id, sender_id, content, type, image_url) VALUES (?, ?, ?, ?, ?, ?)',
                    [messageId, conversationId, data.senderId, data.message, dbType, data.imageUrl || null]
                );

                await pool.execute('UPDATE conversations SET last_message_id = ? WHERE id = ?', [messageId, conversationId]);

                // Emit to receiver
                io.to(data.receiverId).emit('receiveMessage', fullMessage);

                // Emit back to sender
                io.to(data.senderId).emit('messageSent', fullMessage);
            }

            // --- SEND PUSH NOTIFICATION ---
            // Only send if receiver is not in the room? For now send always if we have token and it's private or group mention (logic omitted for brevity)
            if (data.receiverId) {
                try {
                    const { Expo } = require('expo-server-sdk');
                    const expo = new Expo();

                    const [receivers] = await pool.execute('SELECT push_token FROM users WHERE id = ?', [data.receiverId]);
                    const pushToken = receivers[0]?.push_token;

                    if (pushToken && Expo.isExpoPushToken(pushToken)) {
                        await expo.sendPushNotificationsAsync([{
                            to: pushToken,
                            sound: 'default',
                            title: senderInfo.name || 'Tin nhắn mới',
                            body: data.message || 'Đã gửi một tin nhắn',
                            data: {
                                conversationId,
                                groupId: data.groupId,
                                partnerId: data.senderId,
                            },
                        }]);
                    }
                } catch (pushError) {
                    console.error('⚠️ Push notification failed:', pushError);
                }
            }

        } catch (error) {
            console.error('Save message error:', error);
        }
    });

    // Revoke message (Delete)
    socket.on('revokeMessage', async ({ conversationId, messageId }) => {
        try {
            // Find participants to notify
            const [participants] = await pool.execute(
                'SELECT user_id FROM conversation_participants WHERE conversation_id = ?',
                [conversationId]
            );

            participants.forEach(p => {
                io.to(p.user_id).emit('messageRevoked', { conversationId, messageId });
            });
        } catch (error) {
            console.error('Revoke message error:', error);
        }
    });

    // Edit message
    socket.on('editMessage', async ({ conversationId, messageId, newText, editedAt }) => {
        try {
            await pool.execute(
                'UPDATE messages SET content = ?, is_edited = 1, edited_at = NOW() WHERE id = ?',
                [newText, messageId]
            );

            // Find participants to notify
            const [participants] = await pool.execute(
                'SELECT user_id FROM conversation_participants WHERE conversation_id = ?',
                [conversationId]
            );

            participants.forEach(p => {
                io.to(p.user_id).emit('messageEdited', { conversationId, messageId, newText, editedAt });
            });
        } catch (error) {
            console.error('Edit message error:', error);
        }
    });

    // Typing indicators
    socket.on('typing', ({ senderId, receiverId }) => {
        io.to(receiverId).emit('userTyping', { senderId });
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
        io.to(receiverId).emit('userStopTyping', { senderId });
    });

    // ============ CALL SIGNALING ============

    // Call request - caller requests a call to receiver
    socket.on('callRequest', async (data) => {
        console.log('📞 Call request from', data.callerId, 'to', data.receiverId);

        // Get caller info for display
        let callerName = 'Unknown';
        let callerAvatar = null;
        try {
            const [callers] = await pool.execute('SELECT name, avatar FROM users WHERE id = ?', [data.callerId]);
            if (callers[0]) {
                callerName = callers[0].name;
                callerAvatar = callers[0].avatar;
            }
        } catch (e) {
            console.error('Error fetching caller info:', e);
        }

        io.to(data.receiverId).emit('incomingCall', {
            callerId: data.callerId,
            callerName: callerName,
            callerAvatar: callerAvatar,
            channelName: data.channelName,
            isVideo: data.isVideo,
        });
    });

    // Call accepted - receiver accepts the call
    socket.on('callAccepted', (data) => {
        console.log('✅ Call accepted by', data.receiverId);
        io.to(data.callerId).emit('callAccepted', {
            receiverId: data.receiverId,
            channelName: data.channelName,
        });
    });

    // Call rejected - receiver rejects the call
    socket.on('callRejected', (data) => {
        console.log('❌ Call rejected by', data.receiverId);
        io.to(data.callerId).emit('callRejected', {
            receiverId: data.receiverId,
        });
    });

    // End call - either party ends the call
    socket.on('endCall', (data) => {
        console.log('📵 Call ended');
        io.to(data.callerId).emit('callEnded', {});
        io.to(data.receiverId).emit('callEnded', {});
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Remove from online users tracking
        const userId = socket.userId;
        if (userId && onlineUsers.has(userId)) {
            onlineUsers.get(userId).delete(socket.id);

            // If no more sockets for this user, they're offline
            if (onlineUsers.get(userId).size === 0) {
                onlineUsers.delete(userId);

                // Broadcast to all that this user is offline
                io.emit('userOffline', { userId });

                // Update database
                pool.execute(
                    "UPDATE users SET status = 'offline', last_seen = NOW() WHERE id = ?",
                    [userId]
                ).catch(err => console.error('Update offline status error:', err));
            }
        }
    });
});

// Note: /api/chat/conversations is already defined earlier in the file (line ~2030) with full optimization

// Get Messages with a Partner
app.get('/api/chat/messages/:partnerId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const partnerId = req.params.partnerId;

        // Find conversation between these two
        const [convRows] = await pool.execute(`
            SELECT c.id 
            FROM conversations c
            JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
            JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
            WHERE c.type = 'private' 
            AND cp1.user_id = ? 
            AND cp2.user_id = ?
            LIMIT 1
        `, [userId, partnerId]);

        if (convRows.length === 0) {
            return res.json([]); // No conversation yet
        }

        const conversationId = convRows[0].id;

        // Get messages
        const [messages] = await pool.execute(`
            SELECT * FROM messages 
            WHERE conversation_id = ? 
            ORDER BY created_at ASC 
            LIMIT 50
        `, [conversationId]);

        res.json(messages.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            content: m.content,
            type: m.type,
            createdAt: formatDateForClient(m.created_at),
            isEdited: m.is_edited === 1,
            editedAt: m.edited_at
        })));

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});


// ============ STICKER API ROUTES ============


// Create stickers upload directory if not exists
const stickersUploadDir = path.join(__dirname, '../uploads/stickers');
if (!fs.existsSync(stickersUploadDir)) {
    fs.mkdirSync(stickersUploadDir, { recursive: true });
}

const stickerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, stickersUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.webp';
        cb(null, 'sticker-' + uniqueSuffix + ext);
    }
});

const stickerUpload = multer({
    storage: stickerStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/webp', 'image/gif', 'image/jpeg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PNG, WEBP, GIF, JPEG allowed.'));
        }
    }
});

// ===== PUBLIC STICKER API =====

// Get all active sticker packs with stickers (for users)
app.get('/api/app/sticker-packs', async (req, res) => {
    try {
        const [packs] = await pool.execute(
            'SELECT * FROM sticker_packs WHERE is_active = TRUE ORDER BY sort_order ASC'
        );

        // Get stickers for each pack
        const packsWithStickers = await Promise.all(packs.map(async (pack) => {
            const [stickers] = await pool.execute(
                'SELECT * FROM stickers WHERE pack_id = ? ORDER BY sort_order ASC',
                [pack.id]
            );
            return {
                ...pack,
                stickers: stickers
            };
        }));

        res.json({ packs: packsWithStickers });
    } catch (error) {
        console.error('Get sticker packs error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ===== ADMIN STICKER API =====

// Get all sticker packs (admin)
app.get('/api/admin/sticker-packs', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const [packs] = await pool.execute(
            'SELECT sp.*, COUNT(s.id) as sticker_count FROM sticker_packs sp LEFT JOIN stickers s ON sp.id = s.pack_id GROUP BY sp.id ORDER BY sp.sort_order ASC'
        );

        res.json({ packs });
    } catch (error) {
        console.error('Get packs error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get stickers in a pack (admin)
app.get('/api/admin/sticker-packs/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { id } = req.params;
        const [packs] = await pool.execute('SELECT * FROM sticker_packs WHERE id = ?', [id]);

        if (packs.length === 0) {
            return res.status(404).json({ error: 'Pack not found' });
        }

        const [stickers] = await pool.execute(
            'SELECT * FROM stickers WHERE pack_id = ? ORDER BY sort_order ASC',
            [id]
        );

        res.json({ pack: packs[0], stickers });
    } catch (error) {
        console.error('Get pack error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Create sticker pack (admin)
app.post('/api/admin/sticker-packs', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { name, title, description, icon_url, sort_order } = req.body;
        const packId = uuidv4();

        await pool.execute(
            'INSERT INTO sticker_packs (id, name, title, description, icon_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [packId, name, title || name, description || '', icon_url || '', sort_order || 0]
        );

        res.json({ success: true, packId });
    } catch (error) {
        console.error('Create pack error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Tên pack đã tồn tại' });
        }
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Update sticker pack (admin)
app.put('/api/admin/sticker-packs/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { id } = req.params;
        const { name, title, description, icon_url, sort_order, is_active } = req.body;

        await pool.execute(
            'UPDATE sticker_packs SET name = COALESCE(?, name), title = COALESCE(?, title), description = COALESCE(?, description), icon_url = COALESCE(?, icon_url), sort_order = COALESCE(?, sort_order), is_active = COALESCE(?, is_active) WHERE id = ?',
            [name, title, description, icon_url, sort_order, is_active, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update pack error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete sticker pack (admin)
app.delete('/api/admin/sticker-packs/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { id } = req.params;

        // Delete stickers first (cascade should handle but let's be safe)
        await pool.execute('DELETE FROM stickers WHERE pack_id = ?', [id]);
        await pool.execute('DELETE FROM sticker_packs WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete pack error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Upload sticker file
app.post('/api/upload/sticker', authenticateToken, stickerUpload.single('sticker'), async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/stickers/${req.file.filename}`;
        const fileFormat = path.extname(req.file.filename).slice(1) || 'webp';

        let width = 512;
        let height = 512;
        try {
            const dimensions = sizeOf(req.file.path);
            width = dimensions.width;
            height = dimensions.height;
        } catch (e) {
            console.error('Error getting dimensions:', e);
        }

        res.json({
            success: true,
            url: fileUrl,
            imageUrl: fileUrl,
            fileFormat: fileFormat,
            size: req.file.size,
            width,
            height,
            is_animated: fileFormat === 'gif' || fileFormat === 'webp' // Naive guess
        });
    } catch (error) {
        console.error('Upload sticker error:', error);
        res.status(500).json({ error: 'Lỗi upload' });
    }
});

// Add sticker to pack (admin)
app.post('/api/admin/sticker-packs/:packId/stickers', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { packId } = req.params;
        const { image_url, file_format, file_size, width, height, is_animated, sort_order } = req.body;
        const stickerId = uuidv4();

        await pool.execute(
            'INSERT INTO stickers (id, pack_id, image_url, file_format, file_size, width, height, is_animated, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [stickerId, packId, image_url, file_format || 'webp', file_size || 0, width || 512, height || 512, is_animated || false, sort_order || 0]
        );

        res.json({ success: true, stickerId });
    } catch (error) {
        console.error('Add sticker error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete sticker (admin)
app.delete('/api/admin/stickers/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { id } = req.params;

        // Get sticker info to delete file
        const [stickers] = await pool.execute('SELECT image_url FROM stickers WHERE id = ?', [id]);
        if (stickers.length > 0) {
            const stickerPath = path.join(__dirname, '..', stickers[0].image_url);
            if (fs.existsSync(stickerPath)) {
                fs.unlinkSync(stickerPath);
            }
        }

        await pool.execute('DELETE FROM stickers WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete sticker error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Update sticker (move to another pack)
app.put('/api/admin/stickers/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { id } = req.params;
        const { pack_id } = req.body;

        if (!pack_id) {
            return res.status(400).json({ error: 'Pack ID is required' });
        }

        await pool.execute('UPDATE stickers SET pack_id = ? WHERE id = ?', [pack_id, id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Update sticker error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Reorder stickers in a pack (admin)
app.put('/api/admin/sticker-packs/:packId/stickers/reorder', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { stickerOrders } = req.body; // Array of { id, sort_order }

        if (!Array.isArray(stickerOrders)) {
            return res.status(400).json({ error: 'Invalid data' });
        }

        for (const item of stickerOrders) {
            await pool.execute(
                'UPDATE stickers SET sort_order = ? WHERE id = ?',
                [item.sort_order, item.id]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Reorder stickers error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ END STICKER API ============

// ============ FEEDBACK API ============

// Create Feedback
app.post('/api/feedback', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, content, context, media_urls } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Nội dung không được để trống' });
        }

        const id = uuidv4();
        await pool.execute(
            'INSERT INTO feedback (id, user_id, type, content, context, media_urls, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, userId, type || 'feedback', content, context || '', JSON.stringify(media_urls || []), 'pending']
        );

        res.json({ success: true, id });
    } catch (error) {
        console.error('Create feedback error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get My Feedback History
app.get('/api/feedback/my', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(
            'SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(rows.map(r => ({ ...r, media_urls: safeJsonParse(r.media_urls) })));
    } catch (error) {
        console.error('Get my feedback error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get All Feedback (Admin)
app.get('/api/admin/feedback', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }
        const [rows] = await pool.execute(`
            SELECT f.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar 
            FROM feedback f 
            JOIN users u ON f.user_id = u.id 
            ORDER BY f.created_at DESC
        `);
        res.json(rows.map(r => ({ ...r, media_urls: safeJsonParse(r.media_urls) })));
    } catch (error) {
        console.error('Get all feedback error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Update Feedback Status (Admin)
app.put('/api/admin/feedback/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }
        const { status } = req.body;
        await pool.execute('UPDATE feedback SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Update feedback error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete Feedback (Admin)
app.delete('/api/admin/feedback/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }
        await pool.execute('DELETE FROM feedback WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ DASHBOARD STATS ============

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        // Basic admin check
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const [posts] = await pool.execute('SELECT COUNT(*) as count FROM posts');
        const [groups] = await pool.execute('SELECT COUNT(*) as count FROM place_groups');
        const [feedback] = await pool.execute('SELECT COUNT(*) as count FROM feedback WHERE status = "pending"');

        res.json({
            users: users[0].count,
            posts: posts[0].count,
            groups: groups[0].count,
            pendingFeedback: feedback[0].count,
            uptime: process.uptime()
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ REPO MANAGEMENT (source.json for AltStore/SideStore) ============

// Path to source.json file (will be served as static file)
const REPO_SOURCE_PATH = path.join(__dirname, '../../source.json');
const REPO_PUBLIC_PATH = path.join(__dirname, '../public/source.json');

// Helper function to read source.json
function readRepoSource() {
    try {
        // Try main path first
        if (fs.existsSync(REPO_SOURCE_PATH)) {
            return JSON.parse(fs.readFileSync(REPO_SOURCE_PATH, 'utf8'));
        }
        // Fallback to public path
        if (fs.existsSync(REPO_PUBLIC_PATH)) {
            return JSON.parse(fs.readFileSync(REPO_PUBLIC_PATH, 'utf8'));
        }
        // Return default structure if not exists
        return {
            name: "myZyea Official Store",
            identifier: "com.zyea.source",
            subtitle: "Kho ứng dụng myZyea",
            description: "Kho lưu trữ IPA chính thức của myZyea",
            iconURL: "https://data5g.site/assets/myzyea-icon.png",
            headerURL: "https://data5g.site/assets/myzyea-header.png",
            website: "https://data5g.site",
            tintColor: "#f97316",
            featuredApps: [],
            apps: [],
            news: []
        };
    } catch (error) {
        console.error('Error reading source.json:', error);
        return null;
    }
}

// Helper function to write source.json
function writeRepoSource(data) {
    try {
        const jsonContent = JSON.stringify(data, null, 4);
        // Write to both locations for compatibility
        fs.writeFileSync(REPO_SOURCE_PATH, jsonContent, 'utf8');
        // Also write to public folder for direct access
        if (!fs.existsSync(path.dirname(REPO_PUBLIC_PATH))) {
            fs.mkdirSync(path.dirname(REPO_PUBLIC_PATH), { recursive: true });
        }
        fs.writeFileSync(REPO_PUBLIC_PATH, jsonContent, 'utf8');
        console.log('✅ source.json updated successfully');
        return true;
    } catch (error) {
        console.error('Error writing source.json:', error);
        return false;
    }
}

// Helper function to sync IPA upload to source.json repo
function syncIpaToRepo(metadata) {
    try {
        const repo = readRepoSource();
        if (!repo) return false;

        const baseUrl = 'https://data5g.site';
        const bundleId = metadata.bundleId || 'com.zyea.mobile';

        // Find existing app or create new
        let appIndex = repo.apps.findIndex(app => app.bundleIdentifier === bundleId);

        const newVersion = {
            version: metadata.version || '1.0.0',
            date: new Date().toISOString().split('T')[0],
            size: metadata.size || 0,
            downloadURL: `${baseUrl}/uploads/ipa/${metadata.ipaFileName}`,
            localizedDescription: metadata.changelog || `Phiên bản ${metadata.version || 'mới'}`,
            minOSVersion: "14.0"
        };

        if (appIndex >= 0) {
            // Update existing app
            const app = repo.apps[appIndex];

            // Check if version already exists
            const versionIndex = app.versions.findIndex(v => v.version === (metadata.version || '1.0.0'));
            if (versionIndex >= 0) {
                // Update existing version
                app.versions[versionIndex] = { ...app.versions[versionIndex], ...newVersion };
            } else {
                // Add new version at the beginning
                app.versions.unshift(newVersion);
            }

            // Update app info from metadata
            if (metadata.appName) app.name = metadata.appName;
            if (metadata.description) app.subtitle = metadata.description;
            if (metadata.description) app.localizedDescription = metadata.description;
            if (metadata.developer) app.developerName = metadata.developer;
            if (metadata.iconFileName) {
                app.iconURL = `${baseUrl}/uploads/ipa/${metadata.iconFileName}`;
            }
            if (metadata.screenshots && metadata.screenshots.length > 0) {
                app.screenshotURLs = metadata.screenshots.map(s => `${baseUrl}/uploads/ipa/${s}`);
            }

            repo.apps[appIndex] = app;
        } else {
            // Create new app entry
            const newApp = {
                name: metadata.appName || "myZyea",
                bundleIdentifier: bundleId,
                developerName: metadata.developer || "myZyea Team",
                subtitle: metadata.description || "Ứng dụng từ myZyea",
                localizedDescription: metadata.description || "Ứng dụng được phát triển bởi myZyea Team",
                iconURL: metadata.iconFileName ? `${baseUrl}/uploads/ipa/${metadata.iconFileName}` : `${baseUrl}/assets/myzyea-icon.png`,
                tintColor: "#f97316",
                screenshotURLs: metadata.screenshots ? metadata.screenshots.map(s => `${baseUrl}/uploads/ipa/${s}`) : [],
                versions: [newVersion],
                appPermissions: {
                    entitlements: [],
                    privacy: {}
                }
            };
            repo.apps.push(newApp);

            // Add to featured if first app
            if (!repo.featuredApps.includes(bundleId)) {
                repo.featuredApps.push(bundleId);
            }
        }

        // Add news entry for new version
        const newsId = `release-${metadata.version}-${Date.now()}`;
        const newsEntry = {
            identifier: newsId,
            title: `🎉 ${metadata.appName || 'App'} v${metadata.version || 'mới'} đã ra mắt!`,
            caption: metadata.changelog || "Phiên bản mới với nhiều cải tiến",
            date: new Date().toISOString().split('T')[0],
            tintColor: "#f97316",
            imageURL: `${baseUrl}/assets/news/release-banner.png`,
            notify: true,
            appID: bundleId
        };

        // Keep only last 10 news items
        repo.news.unshift(newsEntry);
        if (repo.news.length > 10) {
            repo.news = repo.news.slice(0, 10);
        }

        return writeRepoSource(repo);
    } catch (error) {
        console.error('Error syncing IPA to repo:', error);
        return false;
    }
}

// Manual Sync Endpoint (for Admin Dashboard)
app.post('/api/admin/repo/sync-ipa/:timestamp', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const timestamp = req.params.timestamp;
        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        const metadataPath = path.join(uploadDir, `metadata_${timestamp}.json`);

        if (!fs.existsSync(metadataPath)) {
            return res.status(404).json({ error: 'Metadata not found' });
        }

        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const success = syncIpaToRepo(metadata);

        if (success) {
            res.json({ success: true, message: 'Synced to repo successfully' });
        } else {
            res.status(500).json({ error: 'Failed to sync to repo' });
        }
    } catch (error) {
        console.error('Manual sync error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET Repo source.json (Public - for AltStore/SideStore)
app.get('/api/repo', (req, res) => {
    try {
        const repo = readRepoSource();
        if (repo) {
            res.json(repo);
        } else {
            res.status(500).json({ error: 'Could not read repository' });
        }
    } catch (error) {
        console.error('Get repo error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// ============ APP VERSION CONTROL API ============

const VERSION_CONFIG_PATH = path.join(__dirname, 'version_config.json');

// Get latest version info (Public)
app.get('/api/app-version/latest', (req, res) => {
    try {
        if (fs.existsSync(VERSION_CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(VERSION_CONFIG_PATH, 'utf8'));
            res.json(config);
        } else {
            // Default config
            res.json({
                version: '1.0.0',
                downloadUrl: 'https://data5g.site',
                forceUpdate: false,
                title: 'Cập nhật ứng dụng',
                message: 'Phiên bản mới đã sẵn sàng.'
            });
        }
    } catch (error) {
        console.error('Get app version error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update version info (Admin)
app.post('/api/admin/app-version', authenticateToken, (req, res) => {
    try {
        const { version, downloadUrl, forceUpdate, title, message } = req.body;
        const config = {
            version: version || '1.0.0',
            downloadUrl: downloadUrl || '',
            forceUpdate: !!forceUpdate,
            title: title || 'Cập nhật',
            message: message || '',
            updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(VERSION_CONFIG_PATH, JSON.stringify(config, null, 4));
        res.json({ success: true, config });
    } catch (error) {
        console.error('Update app version error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve source.json directly (for AltStore compatibility)
app.get('/source.json', (req, res) => {
    try {
        const repo = readRepoSource();
        if (repo) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.json(repo);
        } else {
            res.status(500).json({ error: 'Could not read repository' });
        }
    } catch (error) {
        console.error('Get source.json error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET Repo for Admin (with edit capability info)
app.get('/api/admin/repo', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const repo = readRepoSource();
        if (repo) {
            res.json({
                success: true,
                data: repo,
                paths: {
                    main: REPO_SOURCE_PATH,
                    public: REPO_PUBLIC_PATH
                }
            });
        } else {
            res.status(500).json({ error: 'Could not read repository' });
        }
    } catch (error) {
        console.error('Get admin repo error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT Update entire Repo (Admin)
app.put('/api/admin/repo', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { data } = req.body;
        if (!data) {
            return res.status(400).json({ error: 'Missing repo data' });
        }

        if (writeRepoSource(data)) {
            res.json({ success: true, message: 'Repository updated successfully' });
        } else {
            res.status(500).json({ error: 'Failed to update repository' });
        }
    } catch (error) {
        console.error('Update repo error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH Update store info only (Admin)
app.patch('/api/admin/repo/store', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { name, subtitle, description, iconURL, headerURL, website, tintColor } = req.body;
        const repo = readRepoSource();

        if (!repo) {
            return res.status(500).json({ error: 'Could not read repository' });
        }

        // Update only provided fields
        if (name) repo.name = name;
        if (subtitle) repo.subtitle = subtitle;
        if (description) repo.description = description;
        if (iconURL) repo.iconURL = iconURL;
        if (headerURL) repo.headerURL = headerURL;
        if (website) repo.website = website;
        if (tintColor) repo.tintColor = tintColor;

        if (writeRepoSource(repo)) {
            res.json({ success: true, message: 'Store info updated', data: repo });
        } else {
            res.status(500).json({ error: 'Failed to update repository' });
        }
    } catch (error) {
        console.error('Update store info error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST Add/Update app in repo (Admin)
app.post('/api/admin/repo/apps', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const appData = req.body;
        if (!appData || !appData.bundleIdentifier) {
            return res.status(400).json({ error: 'Bundle identifier is required' });
        }

        const repo = readRepoSource();
        if (!repo) {
            return res.status(500).json({ error: 'Could not read repository' });
        }

        const appIndex = repo.apps.findIndex(app => app.bundleIdentifier === appData.bundleIdentifier);

        if (appIndex >= 0) {
            // Update existing app (merge)
            repo.apps[appIndex] = { ...repo.apps[appIndex], ...appData };
        } else {
            // Add new app
            repo.apps.push(appData);
        }

        if (writeRepoSource(repo)) {
            res.json({ success: true, message: 'App updated in repository', data: repo });
        } else {
            res.status(500).json({ error: 'Failed to update repository' });
        }
    } catch (error) {
        console.error('Update app error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE Remove app from repo (Admin)
app.delete('/api/admin/repo/apps/:bundleId', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const bundleId = req.params.bundleId;
        const repo = readRepoSource();

        if (!repo) {
            return res.status(500).json({ error: 'Could not read repository' });
        }

        repo.apps = repo.apps.filter(app => app.bundleIdentifier !== bundleId);
        repo.featuredApps = repo.featuredApps.filter(id => id !== bundleId);

        if (writeRepoSource(repo)) {
            res.json({ success: true, message: 'App removed from repository' });
        } else {
            res.status(500).json({ error: 'Failed to update repository' });
        }
    } catch (error) {
        console.error('Delete app error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST Add news to repo (Admin)
app.post('/api/admin/repo/news', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const newsData = req.body;
        if (!newsData || !newsData.title) {
            return res.status(400).json({ error: 'News title is required' });
        }

        const repo = readRepoSource();
        if (!repo) {
            return res.status(500).json({ error: 'Could not read repository' });
        }

        // Generate identifier if not provided
        if (!newsData.identifier) {
            newsData.identifier = `news-${Date.now()}`;
        }
        if (!newsData.date) {
            newsData.date = new Date().toISOString().split('T')[0];
        }

        repo.news.unshift(newsData);

        // Keep only last 20 news
        if (repo.news.length > 20) {
            repo.news = repo.news.slice(0, 20);
        }

        if (writeRepoSource(repo)) {
            res.json({ success: true, message: 'News added to repository', data: repo });
        } else {
            res.status(500).json({ error: 'Failed to update repository' });
        }
    } catch (error) {
        console.error('Add news error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE Remove news from repo (Admin)
app.delete('/api/admin/repo/news/:newsId', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const newsId = req.params.newsId;
        const repo = readRepoSource();

        if (!repo) {
            return res.status(500).json({ error: 'Could not read repository' });
        }

        repo.news = repo.news.filter(news => news.identifier !== newsId);

        if (writeRepoSource(repo)) {
            res.json({ success: true, message: 'News removed from repository' });
        } else {
            res.status(500).json({ error: 'Failed to update repository' });
        }
    } catch (error) {
        console.error('Delete news error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST Sync current IPA to repo manually (Admin)
app.post('/api/admin/repo/sync-ipa/:timestamp', authenticateToken, (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const timestamp = req.params.timestamp;
        const uploadDir = path.join(__dirname, '../public/uploads/ipa');
        const metadataPath = path.join(uploadDir, `metadata_${timestamp}.json`);

        if (!fs.existsSync(metadataPath)) {
            return res.status(404).json({ error: 'IPA metadata not found' });
        }

        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

        if (syncIpaToRepo(metadata)) {
            res.json({ success: true, message: 'IPA synced to repository' });
        } else {
            res.status(500).json({ error: 'Failed to sync IPA to repository' });
        }
    } catch (error) {
        console.error('Sync IPA to repo error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export sync function for use in upload-ipa endpoint
global.syncIpaToRepo = syncIpaToRepo;

// ============ STICKER MANAGEMENT (ADMIN) ============

// GET Sticker Packs
app.get('/api/admin/sticker-packs', authenticateToken, async (req, res) => {
    try {
        const [packs] = await pool.execute('SELECT * FROM sticker_packs ORDER BY sort_order ASC');
        for (let p of packs) {
            const [c] = await pool.execute('SELECT COUNT(*) as cnt FROM stickers WHERE pack_id = ?', [p.id]);
            p.sticker_count = c[0].cnt;
        }
        res.json({ packs });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET Stickers in Pack
app.get('/api/admin/sticker-packs/:id', authenticateToken, async (req, res) => {
    try {
        const [stickers] = await pool.execute('SELECT * FROM stickers WHERE pack_id = ? ORDER BY created_at DESC', [req.params.id]);
        res.json({ stickers });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST Create Pack
app.post('/api/admin/sticker-packs', authenticateToken, async (req, res) => {
    try {
        const { name, title, sort_order, icon_url } = req.body;
        const id = uuidv4();
        await pool.execute('INSERT INTO sticker_packs (id, name, title, sort_order, icon_url) VALUES (?, ?, ?, ?, ?)',
            [id, name, title, parseInt(sort_order || 0), icon_url]);
        res.json({ success: true, id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT Update Pack
app.put('/api/admin/sticker-packs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, title, sort_order, icon_url } = req.body;

        console.log(`[STK] Update Pack ID: ${id}`);

        const vals = [
            name || '',
            title || name || '',
            parseInt(sort_order || 0),
            icon_url || '',
            id
        ];

        // SỬ DỤNG EXECUTE VÀ BACKTICKS CHO ĐỘ TIN CẬY CAO NHẤT
        const sql = 'UPDATE `sticker_packs` SET `name` = ?, `title` = ?, `sort_order` = ?, `icon_url` = ? WHERE `id` = ?';
        const [result] = await pool.execute(sql, vals);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy ID gói sticker' });
        }

        res.json({ success: true });
    } catch (e) {
        console.error('[STK] Update error:', e);
        res.status(500).json({
            error: 'Lỗi Database',
            details: e.message,
            sqlMessage: e.sqlMessage,
            code: e.code
        });
    }
});

// DELETE Pack
app.delete('/api/admin/sticker-packs/:id', authenticateToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM sticker_packs WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST Add Sticker to Pack
app.post('/api/admin/sticker-packs/:id/stickers', authenticateToken, async (req, res) => {
    try {
        const packId = req.params.id;
        const { image_url, file_format, width, height, is_animated } = req.body;
        const id = uuidv4();
        await pool.execute('INSERT INTO stickers (id, pack_id, image_url, file_format, width, height, is_animated) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, packId, image_url, file_format || 'png', width || 0, height || 0, is_animated ? 1 : 0]);
        res.json({ success: true, id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE Sticker
app.delete('/api/admin/stickers/:id', authenticateToken, async (req, res) => {
    try {
        await pool.execute('DELETE FROM stickers WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT Move Sticker
app.put('/api/admin/stickers/:id', authenticateToken, async (req, res) => {
    try {
        const { pack_id } = req.body;
        await pool.execute('UPDATE stickers SET pack_id=? WHERE id=?', [pack_id, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUBLIC: GET All Sticker Packs (For Mobile App)
app.get('/api/app/sticker-packs', async (req, res) => {
    try {
        const [packs] = await pool.execute('SELECT * FROM sticker_packs ORDER BY sort_order ASC');
        for (let pack of packs) {
            const [stickers] = await pool.execute('SELECT * FROM stickers WHERE pack_id = ?', [pack.id]);
            pack.stickers = stickers;
        }
        res.json(packs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ REACTION ROUTES ============
// Message Reactions API
app.post('/api/messages/:id/react', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // 'LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'
        const userId = req.user.id;
        const userName = req.user.name;

        // Get current reactions
        const [rows] = await pool.execute('SELECT reactions, group_id, sender_id FROM messages WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Message not found' });

        const message = rows[0];
        let reactions = [];
        if (message.reactions) {
            try {
                reactions = typeof message.reactions === 'string' ? JSON.parse(message.reactions) : message.reactions;
            } catch (e) { reactions = []; }
        }
        if (!Array.isArray(reactions)) reactions = [];

        // Check if user already reacted
        const existingIndex = reactions.findIndex(r => r.userId === userId);

        // If type is empty/null, remove reaction
        if (!type) {
            if (existingIndex > -1) reactions.splice(existingIndex, 1);
        } else {
            if (existingIndex > -1) {
                if (reactions[existingIndex].type === type) {
                    // Same reaction -> toggle off (remove)
                    reactions.splice(existingIndex, 1);
                } else {
                    // Different reaction -> update
                    reactions[existingIndex].type = type;
                }
            } else {
                // Add new reaction w/ userName for display
                reactions.push({ userId, userName, type });
            }
        }

        // Save back to DB
        await pool.execute('UPDATE messages SET reactions = ? WHERE id = ?', [JSON.stringify(reactions), id]);

        // Emit socket event
        const io = getIO();
        const eventData = { messageId: id, reactions, conversationId: null, groupId: null };

        if (message.group_id) {
            eventData.groupId = message.group_id;
            io.to(message.group_id).emit('messageReaction', eventData);
        } else {
            // 1-1 Chat: emit to both sender and current user
            io.to(userId).emit('messageReaction', eventData);
            if (message.sender_id && message.sender_id !== userId) {
                io.to(message.sender_id).emit('messageReaction', eventData);
            }
        }

        res.json({ success: true, reactions });
    } catch (error) {
        console.error('Reaction error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ PUSH NOTIFICATIONS ============

// Helper to send push notifications
async function sendPushNotification(pushTokens, title, body, data = {}) {
    let notifications = [];
    for (let pushToken of pushTokens) {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} is not a valid Expo push token`);
            continue;
        }
        notifications.push({
            to: pushToken,
            sound: 'default',
            title: title,
            body: body,
            data: data,
        });
    }

    let chunks = expo.chunkPushNotifications(notifications);
    let tickets = [];

    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error(error);
        }
    }

    return tickets;
}

// Admin Send Push Notification Endpoint
app.post('/api/admin/notifications/send', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }

        const { title, body, target, data, priority } = req.body;

        let parsedData = {};
        if (data) {
            try {
                parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            } catch (e) { }
        }

        let pushTokens = [];

        if (target === 'all') {
            const [rows] = await pool.execute('SELECT push_token FROM users WHERE push_token IS NOT NULL AND status IN ("active", "away")');
            pushTokens = rows.map(r => r.push_token);
        } else if (target === 'active_7days') {
            // Logic to find users active in last 7 days
            const [rows] = await pool.execute('SELECT push_token FROM users WHERE push_token IS NOT NULL AND last_seen > DATE_SUB(NOW(), INTERVAL 7 DAY)');
            pushTokens = rows.map(r => r.push_token);
        }

        // Limit to valid expo tokens is handled in helper, but good to filter unique
        pushTokens = [...new Set(pushTokens)];

        if (pushTokens.length === 0) {
            return res.json({ success: true, message: 'Không tìm thấy user nào để gửi (hoặc user chưa có push token)' });
        }

        // Send async (fire and forget relevant to response, but we wait for tickets)
        const tickets = await sendPushNotification(pushTokens, title, body, parsedData);

        res.json({
            success: true,
            message: `Đã gửi đến ${pushTokens.length} thiết bị`,
            ticketCount: tickets.length
        });

    } catch (error) {
        console.error('Send push error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Upload Audio
app.post('/api/upload/audio', authenticateToken, async (req, res) => {
    try {
        if (!req.files || !req.files.audio) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const audioFile = req.files.audio;
        // Generate valid filename
        const ext = path.extname(audioFile.name) || '.m4a';
        const fileName = `${uuidv4()}${ext}`;
        const uploadPath = path.join(__dirname, '../uploads/audio', fileName);

        // Ensure dir exists
        const dir = path.dirname(uploadPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        await audioFile.mv(uploadPath);

        res.json({
            success: true,
            url: `/uploads/audio/${fileName}`,
            duration: req.body.duration || 0
        });
    } catch (e) {
        console.error('Audio upload error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get Pinned Message for Conversation
app.get('/api/chat/conversations/:id/pinned', authenticateToken, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const [rows] = await pool.execute(`
            SELECT pm.id as pinId, pm.created_at as pinTime, m.*, u.name as senderName, u.avatar as senderAvatar
            FROM pinned_messages pm
            JOIN messages m ON pm.message_id = m.id
            JOIN users u ON m.sender_id = u.id
            WHERE pm.conversation_id = ?
            ORDER BY pm.created_at DESC
            LIMIT 1
        `, [conversationId]);

        res.json({ pinned: rows[0] || null });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get Message Readers (Read Receipts)
app.post('/api/messages/readers', authenticateToken, async (req, res) => {
    try {
        const { messageIds } = req.body;
        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return res.json({});
        }

        // Using IN (?)
        const placeholders = messageIds.map(() => '?').join(',');
        const [rows] = await pool.execute(`
            SELECT mr.message_id, u.id, u.name, u.avatar, mr.read_at
            FROM message_reads mr
            JOIN users u ON mr.user_id = u.id
            WHERE mr.message_id IN (${placeholders})
        `, messageIds);

        const result = {};
        rows.forEach(row => {
            if (!result[row.message_id]) result[row.message_id] = [];
            result[row.message_id].push({
                id: row.id,
                name: row.name,
                avatar: row.avatar,
                readAt: row.read_at
            });
        });

        res.json(result);
    } catch (e) {
        console.error('Get readers error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ============ FILE UPLOAD ROUTE ============

// Generic File Upload configuration
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/files');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const cleanName = createSlug(path.parse(file.originalname).name);
        const ext = path.extname(file.originalname);
        cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
    }
});

const uploadGeneralFile = multer({
    storage: fileStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});

app.post('/api/upload/file', authenticateToken, uploadGeneralFile.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Construct URL correctly
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/files/${req.file.filename}`;

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    } catch (error) {
        console.error('Upload file error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// ============ GROUP CHAT ROUTES ============
// Import group routes (will be initialized after database is ready) 
const initGroupRoutes = require('./groupRoutes');

// ============ MODULAR ROUTES ============
// Import modular routes for better code organization
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const authRoutes = require('./routes/authRoutes');
const blockReportRoutes = require('./routes/blockReportRoutes');

initDatabase().then(async () => {
    // Initialize Socket.IO handlers for realtime features
    const initSocketHandlers = require('./socketHandlers');
    const socketHelpers = initSocketHandlers(io, pool);

    // Make socket helpers available to routes
    app.set('socketHelpers', socketHelpers);

    // Initialize group routes AFTER database is ready
    initGroupRoutes(app, pool, authenticateToken, uuidv4, formatDateForClient, io);

    // Mount modular routes
    app.use('/api/admin', adminRoutes(pool, authenticateToken));
    app.use('/api/admin/notifications', notificationRoutes(pool, authenticateToken));
    app.use('/api/auth', authRoutes(pool, authenticateToken));
    app.use('/api', blockReportRoutes(pool, authenticateToken));

    console.log('✅ Modular routes loaded (Admin, Notifications, Auth, Block/Report)');
    console.log('✅ Socket.IO handlers initialized (Typing, Online Status, Seen)');

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`Socket.IO initialized`);
        console.log(`✅ Group Chat routes initialized`);
    });
});
