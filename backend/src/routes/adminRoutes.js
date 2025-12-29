/**
 * Admin Routes
 * Các API dành cho quản trị viên
 */

const express = require('express');
const router = express.Router();

module.exports = function (pool, authenticateToken) {

    // ============ ADMIN STATS ============
    router.get('/stats', authenticateToken, async (req, res) => {
        try {
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

    // ============ CHART DATA FOR DASHBOARD ============
    router.get('/stats/charts', authenticateToken, async (req, res) => {
        try {
            if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
                return res.status(403).json({ error: 'Không có quyền truy cập' });
            }

            // Users registered per day (last 7 days)
            const [usersPerDay] = await pool.execute(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM users
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);

            // Posts created per day (last 7 days)
            const [postsPerDay] = await pool.execute(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM posts
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);

            // Messages sent per day (last 7 days)
            const [messagesPerDay] = await pool.execute(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM messages
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);

            // Recent users (last 5)
            const [recentUsers] = await pool.execute(`
                SELECT id, name, email, avatar, created_at
                FROM users
                ORDER BY created_at DESC
                LIMIT 5
            `);

            res.json({
                usersPerDay,
                postsPerDay,
                messagesPerDay,
                recentUsers
            });
        } catch (error) {
            console.error('Get chart stats error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // ============ USER MANAGEMENT ============

    // Get all users
    router.get('/users', authenticateToken, async (req, res) => {
        try {
            if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
                return res.status(403).json({ error: 'Không có quyền truy cập' });
            }
            const [users] = await pool.execute(
                'SELECT id, name, email, avatar, level, xp, created_at, is_banned FROM users ORDER BY created_at DESC'
            );
            res.json(users);
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Create user
    router.post('/users', authenticateToken, async (req, res) => {
        try {
            if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
                return res.status(403).json({ error: 'Không có quyền truy cập' });
            }
            const { name, email, password } = req.body;
            const bcrypt = require('bcryptjs');
            const { v4: uuidv4 } = require('uuid');

            // Check if email exists
            const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Email đã tồn tại' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = uuidv4();

            await pool.execute(
                'INSERT INTO users (id, name, email, password, level, xp) VALUES (?, ?, ?, ?, 1, 0)',
                [userId, name, email, hashedPassword]
            );

            res.json({ success: true, id: userId });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Update user
    router.put('/users/:id', authenticateToken, async (req, res) => {
        try {
            if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
                return res.status(403).json({ error: 'Không có quyền truy cập' });
            }
            const { id } = req.params;
            const { name, email, level, xp, is_banned, resetPassword } = req.body;

            let query = 'UPDATE users SET ';
            const params = [];
            const updates = [];

            if (name !== undefined) { updates.push('name = ?'); params.push(name); }
            if (email !== undefined) { updates.push('email = ?'); params.push(email); }
            if (level !== undefined) { updates.push('level = ?'); params.push(level); }
            if (xp !== undefined) { updates.push('xp = ?'); params.push(xp); }
            if (is_banned !== undefined) { updates.push('is_banned = ?'); params.push(is_banned ? 1 : 0); }

            if (resetPassword) {
                const bcrypt = require('bcryptjs');
                const hashedPassword = await bcrypt.hash(resetPassword, 10);
                updates.push('password = ?');
                params.push(hashedPassword);
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'Không có dữ liệu cập nhật' });
            }

            query += updates.join(', ') + ' WHERE id = ?';
            params.push(id);

            await pool.execute(query, params);
            res.json({ success: true });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Delete user
    router.delete('/users/:id', authenticateToken, async (req, res) => {
        try {
            if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
                return res.status(403).json({ error: 'Không có quyền truy cập' });
            }
            const { id } = req.params;
            await pool.execute('DELETE FROM users WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Reset user avatar
    router.put('/users/:id/reset-avatar', authenticateToken, async (req, res) => {
        try {
            if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
                return res.status(403).json({ error: 'Không có quyền truy cập' });
            }

            const userId = req.params.id;
            const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

            await pool.execute(
                'UPDATE users SET avatar = ? WHERE id = ?',
                [defaultAvatar, userId]
            );

            res.json({ success: true, avatar: defaultAvatar });
        } catch (error) {
            console.error('Reset avatar error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    return router;
};
