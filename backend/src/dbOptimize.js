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

    await pool.end();
}

// Run if called directly
if (require.main === module) {
    optimizeDatabase().catch(console.error);
}

module.exports = optimizeDatabase;
