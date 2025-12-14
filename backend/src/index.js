require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

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

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for images

// Serve static files from public directory (landing page)
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded images with aggressive caching (30 days)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    maxAge: '2592000000', // 30 days in ms
    immutable: true
}));

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
            timezone: 'Z', // Use UTC to avoid timezone conversion issues
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
                coverImage: user.cover_image,
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
            coverImage: user.cover_image,
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
        const { name, avatar, voice, coverImage } = req.body;

        // Dynamic update to avoid overwriting with null if fields are missing in request
        // But for simplicity, we assume the client sends current values for existing fields
        // However, to be safe let's assume client sends all or we need a better query.
        // Let's stick to the current pattern but add cover_image
        // NOTE: Client MUST send all fields or we need to fetch user first.
        // Better: UPDATE users SET name=COALESCE(?, name), avatar=COALESCE(?, avatar) ...

        console.log('📝 Updating profile for user:', req.user.id);
        console.log('   - name:', name);
        console.log('   - avatar:', avatar ? avatar.substring(0, 50) + '...' : 'null');
        console.log('   - voice:', voice);
        console.log('   - coverImage:', coverImage ? coverImage.substring(0, 50) + '...' : 'null');

        await pool.execute(
            'UPDATE users SET name = COALESCE(?, name), avatar = COALESCE(?, avatar), voice = COALESCE(?, voice), cover_image = COALESCE(?, cover_image) WHERE id = ?',
            [name || null, avatar || null, voice || null, coverImage || null, req.user.id]
        );

        console.log('✅ Profile updated successfully');
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

// ============ ADMIN ROUTES ============
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') {
            return res.status(403).json({ error: 'Không có quyền truy cập' });
        }
        const [users] = await pool.execute('SELECT id, name, email, avatar, level, xp, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Update user info
app.put('/api/admin/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') return res.status(403).json({ error: 'Không có quyền truy cập' });

        const { id } = req.params;
        const { name, email, xp, level, resetPassword } = req.body;

        let query = 'UPDATE users SET name = ?, email = ?, xp = ?, level = ?';
        let params = [name, email, xp, level];

        if (resetPassword) {
            const hashedPassword = await bcrypt.hash(resetPassword, 10);
            query += ', password = ?';
            params.push(hashedPassword);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await pool.execute(query, params);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Delete user
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.email !== 'hieu@gmail.com') return res.status(403).json({ error: 'Không có quyền truy cập' });

        const { id } = req.params;
        // Prevent deleting self
        const [currentUser] = await pool.execute('SELECT id FROM users WHERE email = ?', ['hieu@gmail.com']);
        if (currentUser[0] && currentUser[0].id === id) {
            return res.status(400).json({ error: 'Không thể tự xóa chính mình' });
        }

        await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

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
                u.cover_image,
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
// Import image-size
const sizeOf = require('image-size');
const { exec } = require('child_process');
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
            return res.status(400).json({ error: 'Không có file được upload' });
        }

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

        // Auto-fetch Link Preview if no images provided
        if ((!images || images.length === 0) && !imageUrl && content) {
            try {
                // Regex to find URL
                const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                    const url = urlMatch[0];
                    console.log('🔍 Detecting URL:', url);

                    // Fetch HTML
                    const response = await fetch(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
                    });
                    const html = await response.text();

                    // Extract og:image
                    const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
                    const twitterImageMatch = html.match(/<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i);

                    const foundImage = (ogImageMatch && ogImageMatch[1]) || (twitterImageMatch && twitterImageMatch[1]);

                    if (foundImage) {
                        console.log('✅ Found OG Image:', foundImage);
                        // Fix relative URLs if necessary (basic)
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

        let imageToSave = null;
        if (images && Array.isArray(images) && images.length > 0) {
            imageToSave = JSON.stringify(images);
        } else if (imageUrl) {
            imageToSave = imageUrl;
        }

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

            // Create notification for post owner
            try {
                const [posts] = await pool.execute(
                    'SELECT user_id, LEFT(content, 50) as preview FROM posts WHERE id = ?',
                    [postId]
                );
                if (posts.length > 0 && posts[0].user_id !== userId) {
                    await createNotification(
                        posts[0].user_id,  // recipient (post owner)
                        userId,             // actor (who liked)
                        'like',
                        postId,
                        null,
                        'đã thích bài viết của bạn',
                        posts[0].preview || ''
                    );
                }
            } catch (notifError) {
                console.error('Notification error:', notifError);
            }
        }

        res.json({ success: true, isLiked });
    } catch (error) {
        console.error('Toggle like error:', error);
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

// ============ GROUPS API ============

// Function to optimize database indexes
const optimizeDatabase = async () => {
    if (!pool) {
        console.log('⚠️ Pool not initialized, skipping optimization');
        return;
    }
    try {
        // Index for sorting posts by date (Critical for Feed speed)
        try { await pool.execute('CREATE INDEX idx_posts_created_at ON posts(created_at DESC)'); } catch (e) { }

        // Index for filtering posts by group
        try { await pool.execute('CREATE INDEX idx_posts_group_id ON posts(group_id)'); } catch (e) { }

        // Index for counting likes and comments faster
        try { await pool.execute('CREATE INDEX idx_post_likes_post_id ON post_likes(post_id)'); } catch (e) { }
        try { await pool.execute('CREATE INDEX idx_post_comments_post_id ON post_comments(post_id)'); } catch (e) { }

        // Add views column to posts if not exists
        try { await pool.execute('ALTER TABLE posts ADD COLUMN views INT DEFAULT 0'); } catch (e) { }

        // Create post_views table for tracking unique views
        try {
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
            console.log('✅ post_views table created/exists');
        } catch (e) {
            console.error('❌ Failed to create post_views table:', e.message);
        }

        // Create post_tags table for tagging users in posts
        try {
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
            console.log('✅ post_tags table created/exists');
        } catch (e) {
            console.error('❌ Failed to create post_tags table:', e.message);
        }

        // Create place_notifications table for Place notifications
        try {
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
            console.log('✅ place_notifications table created/exists');
        } catch (e) {
            console.error('❌ Failed to create place_notifications table:', e.message);
        }

        console.log('✅ Database indexes optimized for performance');
    } catch (error) {
        console.error('DB Optimization warning:', error.message);
    }
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

            // Map call types to 'text' for database but keep original type for client if needed
            // Or better: Assume DB column is ENUM('text', 'image', 'video', 'call_ended', 'call_missed')
            // Since we got truncation error, it's likely ENUM('text', 'image', 'video').

            let dbType = data.type || 'text';
            if (dbType === 'call_ended' || dbType === 'call_missed') {
                dbType = 'text'; // Fallback to 'text' to avoid truncation error
            }

            await pool.execute(
                'INSERT INTO messages (id, conversation_id, sender_id, content, type, image_url) VALUES (?, ?, ?, ?, ?, ?)',
                [messageId, conversationId, data.senderId, data.message, dbType, data.imageUrl || null]
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

initDatabase().then(async () => {
    // Create additional tables and optimize indexes
    await optimizeDatabase();

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`Socket.IO initialized`);
    });
});
