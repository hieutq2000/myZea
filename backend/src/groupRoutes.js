// ============ GROUP CHAT ROUTES ============
// File: groupRoutes.js
// Import this in index.js

module.exports = function (app, pool, authenticateToken, uuidv4, formatDateForClient) {

    let tablesInitialized = false;

    // Initialize tables function
    const initTables = async () => {
        if (tablesInitialized) return;

        try {
            // Create groups table without FK for compatibility
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS chat_groups (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    avatar TEXT,
                    creator_id VARCHAR(36) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // Create group_members table without FK for compatibility
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS group_members (
                    id VARCHAR(36) PRIMARY KEY,
                    group_id VARCHAR(36) NOT NULL,
                    user_id VARCHAR(36) NOT NULL,
                    role VARCHAR(20) DEFAULT 'member',
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_member (group_id, user_id)
                )
            `);

            // Add group_id column to messages table if not exists
            try {
                await pool.execute('ALTER TABLE messages ADD COLUMN group_id VARCHAR(36) NULL');
            } catch (e) {
                // Column already exists
            }

            tablesInitialized = true;
            console.log('✅ Chat groups tables ready');
        } catch (error) {
            console.error('❌ Group tables init error:', error.message);
        }
    };

    // Create Group
    app.post('/api/groups', authenticateToken, async (req, res) => {
        try {
            // Ensure tables exist
            await initTables();

            const { name, memberIds, avatar } = req.body;
            const creatorId = req.user.id;

            console.log('Creating group:', name, 'by:', creatorId, 'members:', memberIds);

            if (!name || !memberIds || memberIds.length < 1) {
                return res.status(400).json({ error: 'Tên nhóm và ít nhất 1 thành viên là bắt buộc' });
            }

            const groupId = uuidv4();

            // Create group
            await pool.execute(
                'INSERT INTO chat_groups (id, name, avatar, creator_id) VALUES (?, ?, ?, ?)',
                [groupId, name, avatar || null, creatorId]
            );

            // Add creator as admin
            await pool.execute(
                'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)',
                [uuidv4(), groupId, creatorId, 'admin']
            );

            // Add other members
            for (const memberId of memberIds) {
                if (memberId !== creatorId) {
                    await pool.execute(
                        'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)',
                        [uuidv4(), groupId, memberId, 'member']
                    );
                }
            }

            // Get group with members
            const [members] = await pool.execute(`
                SELECT u.id, u.name, u.avatar, gm.role
                FROM group_members gm
                JOIN users u ON gm.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
                WHERE gm.group_id = ?
            `, [groupId]);

            res.json({
                id: groupId,
                name,
                avatar: avatar || null,
                creatorId,
                members,
                createdAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Create group error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Get User's Groups
    app.get('/api/groups', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;

            // Check if tables exist
            try {
                await pool.execute('SELECT 1 FROM chat_groups LIMIT 1');
            } catch (e) {
                // Tables don't exist yet
                return res.json([]);
            }

            // Get groups user is member of
            const [groups] = await pool.execute(`
                SELECT g.id, g.name, g.avatar, g.creator_id, g.created_at, g.updated_at
                FROM chat_groups g
                JOIN group_members gm ON g.id COLLATE utf8mb4_unicode_ci = gm.group_id COLLATE utf8mb4_unicode_ci
                WHERE gm.user_id = ?
                ORDER BY g.updated_at DESC
            `, [userId]);

            // Get members for each group
            const groupsWithMembers = await Promise.all(groups.map(async (group) => {
                const [members] = await pool.execute(`
                    SELECT u.id, u.name, u.avatar, gm.role
                    FROM group_members gm
                    JOIN users u ON gm.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
                    WHERE gm.group_id = ?
                `, [group.id]);

                // Get last message (if messages table has group_id column)
                let lastMessage = null;
                try {
                    const [lastMessages] = await pool.execute(`
                        SELECT m.*, u.name as sender_name
                        FROM messages m
                        LEFT JOIN users u ON m.sender_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
                        WHERE m.group_id = ?
                        ORDER BY m.created_at DESC
                        LIMIT 1
                    `, [group.id]);
                    lastMessage = lastMessages[0] || null;
                } catch (e) {
                    // group_id column might not exist yet
                }

                return {
                    ...group,
                    members,
                    memberCount: members.length,
                    lastMessage
                };
            }));

            res.json(groupsWithMembers);

        } catch (error) {
            console.error('Get groups error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Get Group Details
    app.get('/api/groups/:id', authenticateToken, async (req, res) => {
        try {
            const groupId = req.params.id;
            const userId = req.user.id;

            // Check if user is member
            const [membership] = await pool.execute(
                'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, userId]
            );

            if (membership.length === 0) {
                return res.status(403).json({ error: 'Bạn không phải thành viên của nhóm này' });
            }

            // Get group info
            const [groups] = await pool.execute('SELECT * FROM chat_groups WHERE id = ?', [groupId]);
            if (groups.length === 0) {
                return res.status(404).json({ error: 'Nhóm không tồn tại' });
            }

            // Get members
            const [members] = await pool.execute(`
                SELECT u.id, u.name, u.avatar, gm.role, gm.joined_at
                FROM group_members gm
                JOIN users u ON gm.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
                WHERE gm.group_id = ?
            `, [groupId]);

            res.json({
                ...groups[0],
                members,
                memberCount: members.length
            });

        } catch (error) {
            console.error('Get group details error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Add Members to Group
    app.post('/api/groups/:id/members', authenticateToken, async (req, res) => {
        try {
            const groupId = req.params.id;
            const { memberIds } = req.body;
            const userId = req.user.id;

            // Check if user is admin
            const [membership] = await pool.execute(
                'SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = ?',
                [groupId, userId, 'admin']
            );

            if (membership.length === 0) {
                return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể thêm thành viên' });
            }

            // Add members
            const added = [];
            for (const memberId of memberIds) {
                try {
                    await pool.execute(
                        'INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)',
                        [uuidv4(), groupId, memberId, 'member']
                    );
                    added.push(memberId);
                } catch (e) {
                    // Member already exists, skip
                }
            }

            // Update group timestamp
            await pool.execute('UPDATE chat_groups SET updated_at = NOW() WHERE id = ?', [groupId]);

            res.json({ success: true, added });

        } catch (error) {
            console.error('Add members error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Remove Member from Group
    app.delete('/api/groups/:id/members/:memberId', authenticateToken, async (req, res) => {
        try {
            const { id: groupId, memberId } = req.params;
            const userId = req.user.id;

            // Check if user is admin or removing self
            const [membership] = await pool.execute(
                'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, userId]
            );

            if (membership.length === 0) {
                return res.status(403).json({ error: 'Bạn không phải thành viên' });
            }

            const isAdmin = membership[0].role === 'admin';
            const isSelf = memberId === userId;

            if (!isAdmin && !isSelf) {
                return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể xóa thành viên khác' });
            }

            // Check if trying to remove group creator
            const [group] = await pool.execute('SELECT creator_id FROM chat_groups WHERE id = ?', [groupId]);
            if (group[0]?.creator_id === memberId && !isSelf) {
                return res.status(403).json({ error: 'Không thể xóa người tạo nhóm' });
            }

            await pool.execute(
                'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, memberId]
            );

            res.json({ success: true });

        } catch (error) {
            console.error('Remove member error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Update Group Info
    app.put('/api/groups/:id', authenticateToken, async (req, res) => {
        try {
            const groupId = req.params.id;
            const { name, avatar } = req.body;
            const userId = req.user.id;

            // Check if user is admin
            const [membership] = await pool.execute(
                'SELECT * FROM group_members WHERE group_id = ? AND user_id = ? AND role = ?',
                [groupId, userId, 'admin']
            );

            if (membership.length === 0) {
                return res.status(403).json({ error: 'Chỉ quản trị viên mới có thể sửa thông tin nhóm' });
            }

            await pool.execute(
                'UPDATE chat_groups SET name = COALESCE(?, name), avatar = COALESCE(?, avatar), updated_at = NOW() WHERE id = ?',
                [name || null, avatar || null, groupId]
            );

            res.json({ success: true });

        } catch (error) {
            console.error('Update group error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Get Group Messages
    app.get('/api/groups/:id/messages', authenticateToken, async (req, res) => {
        try {
            const groupId = req.params.id;
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            // Check membership
            const [membership] = await pool.execute(
                'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, userId]
            );

            if (membership.length === 0) {
                return res.status(403).json({ error: 'Bạn không phải thành viên của nhóm này' });
            }

            // Get messages
            const [messages] = await pool.execute(`
                SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
                FROM messages m
                LEFT JOIN users u ON m.sender_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
                WHERE m.group_id = ?
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            `, [groupId, limit, offset]);

            // Format messages
            const formatted = messages.reverse().map(m => ({
                id: m.id,
                text: m.content,
                type: m.type || 'text',
                imageUrl: m.image_url,
                senderId: m.sender_id,
                senderName: m.sender_name,
                senderAvatar: m.sender_avatar,
                groupId: m.group_id,
                createdAt: formatDateForClient(m.created_at),
                time: new Date(m.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            }));

            res.json(formatted);

        } catch (error) {
            console.error('Get group messages error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    // Leave Group
    app.post('/api/groups/:id/leave', authenticateToken, async (req, res) => {
        try {
            const groupId = req.params.id;
            const userId = req.user.id;

            // Check if user is the only admin
            const [admins] = await pool.execute(
                'SELECT * FROM group_members WHERE group_id = ? AND role = ?',
                [groupId, 'admin']
            );

            const [myMembership] = await pool.execute(
                'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, userId]
            );

            if (myMembership.length === 0) {
                return res.status(400).json({ error: 'Bạn không phải thành viên' });
            }

            if (admins.length === 1 && admins[0].user_id === userId) {
                // Transfer admin to another member or delete group
                const [otherMembers] = await pool.execute(
                    'SELECT * FROM group_members WHERE group_id = ? AND user_id != ? LIMIT 1',
                    [groupId, userId]
                );

                if (otherMembers.length > 0) {
                    // Transfer admin role
                    await pool.execute(
                        'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?',
                        ['admin', groupId, otherMembers[0].user_id]
                    );
                } else {
                    // Delete group if no other members
                    await pool.execute('DELETE FROM chat_groups WHERE id = ?', [groupId]);
                    return res.json({ success: true, groupDeleted: true });
                }
            }

            // Remove user from group
            await pool.execute(
                'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, userId]
            );

            res.json({ success: true });

        } catch (error) {
            console.error('Leave group error:', error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    });

    console.log('✅ Group Chat routes initialized');
};
