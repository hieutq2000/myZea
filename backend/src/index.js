require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

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

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for images

// Safe JSON parse helper
function safeJsonParse(str, defaultValue = []) {
    if (!str || str === '' || str === 'null' || str === 'undefined') {
        return defaultValue;
    }
    try {
        return JSON.parse(str);
    } catch (e) {
        // Return default value for invalid JSON
        return defaultValue;
    }
}

// ============ UTILS ============

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function safeCallApi(apiFunction) {
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            await sleep(1000); // giảm tốc độ mỗi request

            const response = await apiFunction();

            if (response.status === 429) {
                throw new Error("429 TooManyRequests");
            }

            return response;

        } catch (error) {
            if (error.message.includes("429") || error.message.includes("TooManyRequests")) {
                if (attempt < 4) {
                    const delaySec = Math.pow(2, attempt) + Math.random();
                    console.log(`Rate limit hit. Retrying in ${delaySec.toFixed(2)}s...`);
                    await sleep(delaySec * 1000);
                    continue;
                }
            }
            throw error;
        }
    }

    throw new Error("Failed after 5 retries due to 429 error");
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
            connectionLimit: 10,
        });

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

        await pool.execute(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id VARCHAR(36) PRIMARY KEY,
        post_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
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

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
        }

        const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email đã được sử dụng' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        await pool.execute(
            'INSERT INTO users (id, email, password, name, badges) VALUES (?, ?, ?, ?, ?)',
            [userId, email, hashedPassword, name, '[]']
        );

        const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: { id: userId, email, name, xp: 0, level: 1, badges: [] }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
        }

        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        const user = users[0];

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                voice: user.voice,
                xp: user.xp,
                level: user.level,
                badges: safeJsonParse(user.badges)
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Người dùng không tồn tại' });
        }

        const user = users[0];

        const [results] = await pool.execute(
            'SELECT * FROM exam_results WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [user.id]
        );

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            voice: user.voice,
            xp: user.xp,
            level: user.level,
            badges: safeJsonParse(user.badges),
            history: results.map(r => ({
                id: r.id,
                timestamp: r.created_at,
                score: r.score,
                duration: r.duration,
                topic: r.topic,
                transcript: safeJsonParse(r.transcript)
            }))
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Update user profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const { name, avatar, voice } = req.body;

        await pool.execute(
            'UPDATE users SET name = ?, avatar = ?, voice = ? WHERE id = ?',
            [name, avatar, voice, req.user.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Update push token
app.post('/api/auth/push-token', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        // Add column if not exists (quick hack for development)
        try {
            await pool.execute('ALTER TABLE users ADD COLUMN push_token VARCHAR(255)');
        } catch (e) {
            // Column likely exists
        }

        await pool.execute(
            'UPDATE users SET push_token = ? WHERE id = ?',
            [token, req.user.id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update push token error:', error);
        res.status(500).json({ error: 'Lỗi server' });
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

// Get list of conversations
app.get('/api/chat/conversations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Ensure deleted_at column exists
        try {
            await pool.execute('SELECT deleted_at FROM conversation_participants LIMIT 1');
        } catch (e) {
            try {
                await pool.execute('ALTER TABLE conversation_participants ADD COLUMN deleted_at DATETIME NULL');
            } catch (alterErr) { }
        }

        // Get private conversations with partner info, pin/mute status
        const [rows] = await pool.execute(`
            SELECT 
                c.id as conversation_id,
                u.name,
                u.avatar,
                u.id as partner_id,
                CASE 
                    WHEN m.created_at > IFNULL(cp_me.deleted_at, '1970-01-01') OR m.created_at IS NULL THEN m.content 
                    ELSE '' 
                END as last_message,
                m.created_at as last_message_time,
                m.sender_id as last_message_sender_id,
                u.last_seen,
                u.status,
                cp_me.is_pinned,
                cp_me.is_muted,
                cp_me.deleted_at,
                (SELECT COUNT(*) FROM messages msg 
                 WHERE msg.conversation_id = c.id 
                 AND msg.sender_id != ? 
                 AND msg.id NOT IN (SELECT message_id FROM message_reads WHERE user_id = ?)
                 AND msg.created_at > IFNULL(cp_me.deleted_at, '1970-01-01')
                ) as unread_count
            FROM conversations c
            JOIN conversation_participants cp_me ON cp_me.conversation_id = c.id
            JOIN conversation_participants cp_other ON cp_other.conversation_id = c.id
            JOIN users u ON cp_other.user_id = u.id
            LEFT JOIN messages m ON c.last_message_id = m.id
            WHERE c.type = 'private' 
            AND cp_me.user_id = ? 
            AND cp_other.user_id != ?
            AND (cp_me.is_hidden IS NULL OR cp_me.is_hidden = 0)
            ORDER BY cp_me.is_pinned DESC, m.created_at DESC
        `, [userId, userId, userId, userId]);

        res.json(rows);
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

        const filteredMessages = messages.filter(m => {
            const deletedBy = safeJsonParse(m.deleted_by);
            return !deletedBy.includes(userId);
        });

        res.json(filteredMessages.reverse().map(m => ({
            _id: m.id,
            text: m.content,
            type: m.type || 'text',
            imageUrl: m.image_url || null,
            createdAt: m.created_at,
            user: { _id: m.sender_id }
        })));
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
            AND id NOT IN (SELECT message_id FROM message_reads WHERE user_id = ?)
        `, [conversationId, userId, userId]);

        // Mark them all as read
        for (const msg of unreadMessages) {
            await pool.execute(
                'INSERT IGNORE INTO message_reads (message_id, user_id, read_at) VALUES (?, ?, NOW())',
                [msg.id, userId]
            );
        }

        res.json({ success: true, markedCount: unreadMessages.length });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// ============ IMAGE UPLOAD ============
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Chỉ chấp nhận file ảnh!'));
    }
});

// Serve static files from uploads folder
app.use('/uploads', express.static(uploadsDir));

// Upload image endpoint
app.post('/api/upload/image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file được upload' });
        }

        // Get the host from request or use default
        const host = req.headers.host || 'localhost:3001';
        const protocol = req.protocol || 'http';
        const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        console.log('📸 Image uploaded:', imageUrl);
        res.json({
            success: true,
            url: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Lỗi khi upload ảnh' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ PLACE API ============

// Get posts
app.get('/api/place/posts', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
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
                (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as isLiked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [userId]);

        const formattedPosts = posts.map(p => ({
            id: p.id,
            author: {
                id: p.author_id,
                name: p.author_name,
                avatar: p.author_avatar
            },
            content: p.content,
            image: p.image,
            createdAt: p.createdAt,
            likes: p.likes,
            isLiked: p.isLiked > 0,
            comments: 0, // Placeholder
            shares: 0 // Placeholder
        }));

        res.json(formattedPosts);
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Create post
app.post('/api/place/posts', authenticateToken, async (req, res) => {
    try {
        const { content, imageUrl } = req.body;

        if (!content && !imageUrl) {
            return res.status(400).json({ error: 'Nội dung không được để trống' });
        }

        const postId = uuidv4();
        const userId = req.user.id;

        await pool.execute(
            'INSERT INTO posts (id, user_id, content, image_url) VALUES (?, ?, ?, ?)',
            [postId, userId, content, imageUrl || null]
        );

        // Fetch user info to return complete post object
        const [users] = await pool.execute('SELECT name, avatar FROM users WHERE id = ?', [userId]);
        const user = users[0];

        const newPost = {
            id: postId,
            author: {
                id: userId,
                name: user.name,
                avatar: user.avatar
            },
            content,
            image: imageUrl,
            createdAt: new Date().toISOString(),
            likes: 0,
            isLiked: false,
            comments: 0,
            shares: 0
        };

        res.json(newPost);
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Toggle like
app.post('/api/place/posts/:id/like', authenticateToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        // Check if liked
        const [likes] = await pool.execute(
            'SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );

        let isLiked = false;

        if (likes.length > 0) {
            // Unlike
            await pool.execute(
                'DELETE FROM post_likes WHERE post_id = ? AND user_id = ?',
                [postId, userId]
            );
            isLiked = false;
        } else {
            // Like
            await pool.execute(
                'INSERT INTO post_likes (id, post_id, user_id) VALUES (?, ?, ?)',
                [uuidv4(), postId, userId]
            );
            isLiked = true;
        }

        res.json({ success: true, isLiked });
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Start server
const PORT = process.env.PORT || 3001;

// ============ SOCKET.IO HANDLERS ============

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User joins their own room for private messages
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room`);

        // Update user status
        pool.execute(
            "UPDATE users SET status = 'online', last_seen = NOW() WHERE id = ?",
            [userId]
        ).catch(err => console.error('Update status error:', err));
    });

    // Handle sending messages
    // Handle sending messages
    socket.on('sendMessage', async (data) => {
        // data: { senderId, receiverId, message, type = 'text' }
        console.log('Message:', data);

        try {
            let conversationId = null;

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

                // IMPORTANT: Unhide conversation for BOTH users when new message is sent
                // This fixes the bug where deleted conversations don't reappear
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

            // Save message (with image_url if present)
            const messageId = uuidv4();

            // Add image_url column if not exists (quick hack for development)
            try {
                await pool.execute('ALTER TABLE messages ADD COLUMN image_url TEXT');
            } catch (e) {
                // Column likely exists
            }

            await pool.execute(
                'INSERT INTO messages (id, conversation_id, sender_id, content, type, image_url) VALUES (?, ?, ?, ?, ?, ?)',
                [messageId, conversationId, data.senderId, data.message, data.type || 'text', data.imageUrl || null]
            );

            // Update conversation last message
            await pool.execute('UPDATE conversations SET last_message_id = ? WHERE id = ?', [messageId, conversationId]);

            // Fetch sender details
            const [senders] = await pool.execute('SELECT name, avatar FROM users WHERE id = ?', [data.senderId]);
            const senderInfo = senders[0] || {};

            const fullMessage = {
                _id: messageId,
                text: data.message,
                type: data.type || 'text',
                imageUrl: data.imageUrl || null,
                createdAt: new Date(),
                user: {
                    _id: data.senderId,
                    name: senderInfo.name,
                    avatar: senderInfo.avatar
                },
                conversationId,
                tempId: data.tempId // Include tempId for optimistic UI update
            };

            // Emit to receiver
            io.to(data.receiverId).emit('receiveMessage', fullMessage);

            // Emit back to sender
            io.to(data.senderId).emit('messageSent', fullMessage);

            // --- SEND PUSH NOTIFICATION ---
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
                            partnerId: data.senderId,
                            url: `vinalive://chat/${conversationId}` // Deep link scheme if supported
                        },
                    }]);
                    console.log('✅ Push notification sent to', data.receiverId);
                }
            } catch (pushError) {
                console.error('⚠️ Push notification failed:', pushError);
            }

        } catch (error) {
            console.error('Save message error:', error);
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
        // We could track offline status here if we mapped socket.id to userId
    });
});

initDatabase().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`Socket.IO initialized`);
    });
});
