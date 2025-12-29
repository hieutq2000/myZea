// ============ DATABASE OPTIMIZATION ============
// Run this once to add indexes and optimize tables
// Usage: node dbOptimize.js

require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function optimizeDatabase() {
    console.log('🚀 Starting Database Optimization...\n');

    const pool = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'vinalive',
        password: process.env.DB_PASSWORD || 'vinalive123',
        database: process.env.DB_NAME || 'vinalive_db',
        waitForConnections: true,
        connectionLimit: 5,
    });

    // === Update Table Columns ===
    // Check and add columns
    try {
        const [columns] = await pool.execute("SHOW COLUMNS FROM messages LIKE 'is_revoked'");
        if (columns.length === 0) {
            await pool.execute("ALTER TABLE messages ADD COLUMN is_revoked BOOLEAN DEFAULT FALSE");
            console.log('✅ Added is_revoked column to messages table');
        }
    } catch (e) { console.log('⚠️ Failed to check/add is_revoked:', e.message); }

    try {
        const [columns] = await pool.execute("SHOW COLUMNS FROM users LIKE 'push_token'");
        if (columns.length === 0) {
            await pool.execute("ALTER TABLE users ADD COLUMN push_token VARCHAR(255) DEFAULT NULL");
            console.log('✅ Added push_token column to users table');
        } else {
            console.log('⏭️  push_token column already exists');
        }
    } catch (e) {
        console.log('⚠️  Failed to check/add push_token:', e.message);
    }

    const indexes = [
        // Messages table - Critical for chat performance
        { table: 'messages', name: 'idx_messages_conv_id', columns: 'conversation_id' },
        { table: 'messages', name: 'idx_messages_group_id', columns: 'group_id' },
        { table: 'messages', name: 'idx_messages_sender_id', columns: 'sender_id' },
        { table: 'messages', name: 'idx_messages_created_at', columns: 'created_at DESC' },
        { table: 'messages', name: 'idx_messages_conv_created', columns: 'conversation_id, created_at DESC' },
        { table: 'messages', name: 'idx_messages_group_created', columns: 'group_id, created_at DESC' },

        // Conversation participants - Critical for conversation list
        { table: 'conversation_participants', name: 'idx_conv_part_user', columns: 'user_id' },
        { table: 'conversation_participants', name: 'idx_conv_part_conv', columns: 'conversation_id' },
        { table: 'conversation_participants', name: 'idx_conv_part_user_hidden', columns: 'user_id, is_hidden' },

        // Conversations table
        { table: 'conversations', name: 'idx_conv_updated', columns: 'updated_at DESC' },
        { table: 'conversations', name: 'idx_conv_last_msg', columns: 'last_message_id' },

        // Group members - Critical for group chat
        { table: 'group_members', name: 'idx_grp_members_user', columns: 'user_id' },
        { table: 'group_members', name: 'idx_grp_members_group', columns: 'group_id' },

        // Chat groups
        { table: 'chat_groups', name: 'idx_chat_groups_updated', columns: 'updated_at DESC' },

        // Users - for search
        { table: 'users', name: 'idx_users_email', columns: 'email' },
        { table: 'users', name: 'idx_users_name', columns: 'name' },

        // Posts - for feed
        { table: 'posts', name: 'idx_posts_user', columns: 'user_id' },
        { table: 'posts', name: 'idx_posts_group', columns: 'group_id' },
        { table: 'posts', name: 'idx_posts_created', columns: 'created_at DESC' },

        // Post likes & comments
        { table: 'post_likes', name: 'idx_likes_post', columns: 'post_id' },
        { table: 'post_likes', name: 'idx_likes_user', columns: 'user_id' },
        { table: 'post_comments', name: 'idx_comments_post', columns: 'post_id' },

        // Notifications
        { table: 'place_notifications', name: 'idx_notif_recipient', columns: 'recipient_id' },
        { table: 'place_notifications', name: 'idx_notif_unread', columns: 'recipient_id, is_read' },
    ];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const idx of indexes) {
        try {
            // Check if index exists
            const [existing] = await pool.execute(`
                SELECT COUNT(*) as cnt FROM information_schema.statistics 
                WHERE table_schema = DATABASE() 
                AND table_name = ? 
                AND index_name = ?
            `, [idx.table, idx.name]);

            if (existing[0].cnt > 0) {
                console.log(`⏭️  Index ${idx.name} already exists on ${idx.table}`);
                skipped++;
                continue;
            }

            // Create index
            await pool.execute(`CREATE INDEX ${idx.name} ON ${idx.table} (${idx.columns})`);
            console.log(`✅ Created index ${idx.name} on ${idx.table}(${idx.columns})`);
            created++;
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log(`⚠️  Table ${idx.table} does not exist, skipping...`);
            } else if (error.code === 'ER_DUP_KEYNAME') {
                console.log(`⏭️  Index ${idx.name} already exists`);
                skipped++;
            } else {
                console.log(`❌ Failed to create ${idx.name}: ${error.message}`);
                failed++;
            }
        }
    }

    // Fix collation issues by ensuring all ID columns use same collation
    console.log('\n🔧 Fixing collation for ID columns...');
    const collationFixes = [
        { table: 'group_members', column: 'user_id' },
        { table: 'group_members', column: 'group_id' },
        { table: 'conversation_participants', column: 'user_id' },
        { table: 'conversation_participants', column: 'conversation_id' },
        { table: 'messages', column: 'sender_id' },
        { table: 'messages', column: 'conversation_id' },
        { table: 'messages', column: 'group_id' },
        // Add message_reads table
        { table: 'message_reads', column: 'message_id' },
        { table: 'message_reads', column: 'user_id' },
        // Add users table
        { table: 'users', column: 'id' },
    ];

    for (const fix of collationFixes) {
        try {
            await pool.execute(`
                ALTER TABLE ${fix.table} 
                MODIFY ${fix.column} VARCHAR(36) 
                CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            `);
            console.log(`✅ Fixed collation for ${fix.table}.${fix.column}`);
        } catch (e) {
            // Column might not exist or already correct
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('\n🎉 Database optimization complete!');

    // Create pinned_messages table if not exists
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS pinned_messages (
                id VARCHAR(36) PRIMARY KEY,
                conversation_id VARCHAR(36) NOT NULL,
                message_id VARCHAR(36) NOT NULL,
                pinner_id VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_conversation (conversation_id),
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Created pinned_messages table');
    } catch (e) {
        console.log('⚠️ Failed to create pinned_messages table or already exists:', e.message);
    }

    await pool.end();
}

// Run if called directly
if (require.main === module) {
    optimizeDatabase().catch(console.error);
}

module.exports = optimizeDatabase;
