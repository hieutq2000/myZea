/**
 * Auth Routes
 * Xác thực người dùng: Đăng ký, Đăng nhập, Profile
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Helper function
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

module.exports = function (pool, authenticateToken) {

    // ============ REGISTER ============
    router.post('/register', async (req, res) => {
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

    // ============ LOGIN ============
    router.post('/login', async (req, res) => {
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

            // Check if user is banned
            if (user.is_banned) {
                return res.status(403).json({ error: 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.' });
            }

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

    // ============ GET CURRENT USER ============
    router.get('/me', authenticateToken, async (req, res) => {
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

    // ============ UPDATE PROFILE ============
    router.put('/profile', authenticateToken, async (req, res) => {
        try {
            const { name, avatar, voice, coverImage } = req.body;

            console.log('📝 Updating profile for user:', req.user.id);

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

    // ============ UPDATE PUSH TOKEN ============
    router.post('/push-token', authenticateToken, async (req, res) => {
        try {
            const { token } = req.body;
            if (!token) return res.status(400).json({ error: 'Token is required' });

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

    // ============ LOGOUT ============
    router.post('/logout', authenticateToken, async (req, res) => {
        try {
            // Clear push token on logout
            await pool.execute(
                'UPDATE users SET push_token = NULL, status = "offline" WHERE id = ?',
                [req.user.id]
            );
            res.json({ success: true });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    return router;
};
