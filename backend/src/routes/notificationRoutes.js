/**
 * Notification Routes
 * API liên quan đến Push Notifications
 */

const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');

let expo = new Expo();

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

module.exports = function (pool, authenticateToken) {

    // Admin Send Push Notification Endpoint
    router.post('/send', authenticateToken, async (req, res) => {
        try {
            if (req.user.email !== 'hieu@gmail.com' && req.user.email !== 'admin@gmail.com') {
                return res.status(403).json({ error: 'Không có quyền truy cập' });
            }

            const { title, body, target, data } = req.body;

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
                const [rows] = await pool.execute('SELECT push_token FROM users WHERE push_token IS NOT NULL AND last_seen > DATE_SUB(NOW(), INTERVAL 7 DAY)');
                pushTokens = rows.map(r => r.push_token);
            }

            pushTokens = [...new Set(pushTokens)];

            if (pushTokens.length === 0) {
                return res.json({ success: true, message: 'Không tìm thấy user nào để gửi (hoặc user chưa có push token)' });
            }

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

    return router;
};

// Export helper for use in other modules
module.exports.sendPushNotification = sendPushNotification;
