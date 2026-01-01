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

    // ============ FORGOT PASSWORD - Send OTP ============
    // In-memory OTP store (use Redis in production)
    const otpStore = new Map();

    router.post('/forgot-password', async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Vui lòng nhập email' });
            }

            // Check if email exists
            const [users] = await pool.execute('SELECT id, name FROM users WHERE email = ?', [email]);
            if (users.length === 0) {
                // For security, don't reveal if email exists or not
                return res.json({
                    success: true,
                    message: 'Nếu email tồn tại, mã OTP sẽ được gửi đến hộp thư của bạn'
                });
            }

            const user = users[0];

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Store OTP with expiry (5 minutes)
            otpStore.set(email, {
                otp,
                userId: user.id,
                expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
            });

            // TODO: In production, send email using nodemailer or SendGrid
            // For now, we'll log it and return success
            console.log(`📧 OTP for ${email}: ${otp}`);

            // For development: return OTP in response (remove in production!)
            res.json({
                success: true,
                message: 'Mã OTP đã được gửi đến email của bạn',
                // DEV ONLY - remove in production
                devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
            });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // ============ VERIFY OTP ============
    router.post('/verify-otp', async (req, res) => {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return res.status(400).json({ error: 'Vui lòng nhập email và mã OTP' });
            }

            const stored = otpStore.get(email);

            if (!stored) {
                return res.status(400).json({ error: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
            }

            if (Date.now() > stored.expiresAt) {
                otpStore.delete(email);
                return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.' });
            }

            if (stored.otp !== otp) {
                return res.status(400).json({ error: 'Mã OTP không chính xác' });
            }

            // Generate a reset token valid for 15 minutes
            const resetToken = jwt.sign(
                { userId: stored.userId, email, purpose: 'reset-password' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            // Clear OTP after successful verification
            otpStore.delete(email);

            res.json({
                success: true,
                resetToken,
                message: 'Xác thực thành công. Vui lòng đặt mật khẩu mới.'
            });
        } catch (error) {
            console.error('Verify OTP error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // ============ RESET PASSWORD (with token from OTP verification) ============
    router.post('/reset-password', async (req, res) => {
        try {
            const { resetToken, newPassword } = req.body;

            if (!resetToken || !newPassword) {
                return res.status(400).json({ error: 'Thiếu thông tin cần thiết' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
            }

            // Verify reset token
            let decoded;
            try {
                decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
                if (decoded.purpose !== 'reset-password') {
                    throw new Error('Invalid token purpose');
                }
            } catch (e) {
                return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password in database
            await pool.execute(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, decoded.userId]
            );

            console.log(`✅ Password reset for user: ${decoded.userId}`);

            res.json({
                success: true,
                message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.'
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // ============ CHANGE PASSWORD (for logged in users) ============
    router.post('/change-password', authenticateToken, async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mới' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
            }

            if (currentPassword === newPassword) {
                return res.status(400).json({ error: 'Mật khẩu mới phải khác mật khẩu cũ' });
            }

            // Get user's current password
            const [users] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
            if (users.length === 0) {
                return res.status(404).json({ error: 'Người dùng không tồn tại' });
            }

            // Verify current password
            const validPassword = await bcrypt.compare(currentPassword, users[0].password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
            }

            // Hash and save new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await pool.execute(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, req.user.id]
            );

            console.log(`✅ Password changed for user: ${req.user.id}`);

            res.json({
                success: true,
                message: 'Đổi mật khẩu thành công!'
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // ============ DELETE ACCOUNT ============
    router.delete('/account', authenticateToken, async (req, res) => {
        try {
            const { password, reason } = req.body;

            if (!password) {
                return res.status(400).json({ error: 'Vui lòng nhập mật khẩu để xác nhận' });
            }

            // Get user's current password
            const [users] = await pool.execute('SELECT password, email FROM users WHERE id = ?', [req.user.id]);
            if (users.length === 0) {
                return res.status(404).json({ error: 'Người dùng không tồn tại' });
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, users[0].password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Mật khẩu không đúng' });
            }

            // Log the deletion for audit
            console.log(`🗑️ Account deletion requested: ${users[0].email}, Reason: ${reason || 'Not specified'}`);

            // Delete related data first (respecting foreign key constraints)
            try {
                await pool.execute('DELETE FROM blocked_users WHERE blocker_id = ? OR blocked_id = ?', [req.user.id, req.user.id]);
            } catch (e) { /* Table might not exist */ }

            try {
                await pool.execute('DELETE FROM reports WHERE reporter_id = ?', [req.user.id]);
            } catch (e) { /* Table might not exist */ }

            // Finally delete the user
            await pool.execute('DELETE FROM users WHERE id = ?', [req.user.id]);

            console.log(`✅ Account deleted: ${req.user.id}`);

            res.json({
                success: true,
                message: 'Tài khoản của bạn đã được xóa thành công.'
            });
        } catch (error) {
            console.error('Delete account error:', error);
            res.status(500).json({ error: 'Lỗi server. Vui lòng thử lại sau.' });
        }
    });

    return router;
};
