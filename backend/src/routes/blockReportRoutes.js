/**
 * Block/Report Routes - Quản lý chặn và báo cáo người dùng
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = (pool, authenticateToken) => {
    const router = express.Router();

    // ============ BLOCK USER ============

    /**
     * POST /api/users/:userId/block
     * Block a user - they won't be able to message you
     */
    router.post('/users/:userId/block', authenticateToken, async (req, res) => {
        try {
            const blockerId = req.user.id;
            const blockedId = req.params.userId;

            if (blockerId === blockedId) {
                return res.status(400).json({ error: 'Không thể tự chặn chính mình' });
            }

            // Check if user exists
            const [users] = await pool.execute('SELECT id, name FROM users WHERE id = ?', [blockedId]);
            if (users.length === 0) {
                return res.status(404).json({ error: 'Người dùng không tồn tại' });
            }

            // Check if already blocked
            const [existing] = await pool.execute(
                'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
                [blockerId, blockedId]
            );

            if (existing.length > 0) {
                return res.json({ success: true, message: 'Người dùng đã bị chặn trước đó' });
            }

            // Insert block record
            await pool.execute(
                'INSERT INTO blocked_users (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, NOW())',
                [uuidv4(), blockerId, blockedId]
            );

            console.log(`🚫 User ${blockerId} blocked ${blockedId}`);

            res.json({
                success: true,
                message: `Đã chặn ${users[0].name}. Họ sẽ không thể gửi tin nhắn cho bạn.`
            });
        } catch (error) {
            console.error('Block user error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    /**
     * DELETE /api/users/:userId/block
     * Unblock a user
     */
    router.delete('/users/:userId/block', authenticateToken, async (req, res) => {
        try {
            const blockerId = req.user.id;
            const blockedId = req.params.userId;

            await pool.execute(
                'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
                [blockerId, blockedId]
            );

            console.log(`✅ User ${blockerId} unblocked ${blockedId}`);

            res.json({ success: true, message: 'Đã bỏ chặn người dùng' });
        } catch (error) {
            console.error('Unblock user error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    /**
     * GET /api/users/blocked
     * Get list of blocked users
     */
    router.get('/users/blocked', authenticateToken, async (req, res) => {
        try {
            const [blocked] = await pool.execute(`
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    u.avatar,
                    bu.created_at as blocked_at
                FROM blocked_users bu
                JOIN users u ON u.id = bu.blocked_id
                WHERE bu.blocker_id = ?
                ORDER BY bu.created_at DESC
            `, [req.user.id]);

            res.json(blocked);
        } catch (error) {
            console.error('Get blocked users error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    /**
     * GET /api/users/:userId/is-blocked
     * Check if a user is blocked (both ways)
     */
    router.get('/users/:userId/is-blocked', authenticateToken, async (req, res) => {
        try {
            const myId = req.user.id;
            const userId = req.params.userId;

            // Check if I blocked them
            const [blockedByMe] = await pool.execute(
                'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
                [myId, userId]
            );

            // Check if they blocked me
            const [blockedByThem] = await pool.execute(
                'SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
                [userId, myId]
            );

            res.json({
                blockedByMe: blockedByMe.length > 0,
                blockedByThem: blockedByThem.length > 0,
                canChat: blockedByMe.length === 0 && blockedByThem.length === 0
            });
        } catch (error) {
            console.error('Check blocked status error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // ============ REPORT USER/MESSAGE ============

    /**
     * POST /api/report
     * Report a user or message
     */
    router.post('/report', authenticateToken, async (req, res) => {
        try {
            const { targetId, targetType, reason, details, messageId } = req.body;

            if (!targetId || !targetType || !reason) {
                return res.status(400).json({
                    error: 'Vui lòng cung cấp đầy đủ thông tin báo cáo'
                });
            }

            const validReasons = [
                'spam',
                'harassment',
                'hate_speech',
                'violence',
                'nudity',
                'fake_account',
                'scam',
                'other'
            ];

            if (!validReasons.includes(reason)) {
                return res.status(400).json({ error: 'Lý do báo cáo không hợp lệ' });
            }

            // Check if user exists (if reporting user)
            if (targetType === 'user') {
                const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [targetId]);
                if (users.length === 0) {
                    return res.status(404).json({ error: 'Người dùng không tồn tại' });
                }
            }

            // Insert report
            const reportId = uuidv4();
            await pool.execute(`
                INSERT INTO reports (
                    id, reporter_id, target_id, target_type, 
                    reason, details, message_id, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
            `, [reportId, req.user.id, targetId, targetType, reason, details || null, messageId || null]);

            console.log(`📢 Report created: ${reportId} by ${req.user.id}`);

            res.json({
                success: true,
                reportId,
                message: 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét và xử lý trong thời gian sớm nhất.'
            });
        } catch (error) {
            console.error('Create report error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    /**
     * GET /api/report/reasons
     * Get list of report reasons
     */
    router.get('/report/reasons', authenticateToken, async (req, res) => {
        res.json([
            { id: 'spam', label: 'Spam hoặc quảng cáo', icon: '🚫' },
            { id: 'harassment', label: 'Quấy rối hoặc bắt nạt', icon: '😠' },
            { id: 'hate_speech', label: 'Ngôn từ thù địch', icon: '🔥' },
            { id: 'violence', label: 'Bạo lực hoặc đe dọa', icon: '⚠️' },
            { id: 'nudity', label: 'Nội dung khiêu dâm', icon: '🔞' },
            { id: 'fake_account', label: 'Tài khoản giả mạo', icon: '👤' },
            { id: 'scam', label: 'Lừa đảo', icon: '💰' },
            { id: 'other', label: 'Lý do khác', icon: '📝' }
        ]);
    });

    return router;
};
