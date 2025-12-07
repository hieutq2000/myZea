-- Bảng quản lý các cuộc trò chuyện (Nhóm hoặc 1-1)
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('private', 'group') DEFAULT 'private',
    name VARCHAR(255), -- Tên nhóm (null nếu là private)
    avatar LONGTEXT, -- Avatar nhóm
    last_message_id VARCHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng thành viên trong cuộc trò chuyện
CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id VARCHAR(36),
    user_id VARCHAR(36),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nickname VARCHAR(255), -- Biệt danh trong nhóm
    role ENUM('admin', 'member') DEFAULT 'member',
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng tin nhắn
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36),
    sender_id VARCHAR(36),
    content TEXT, -- Nội dung tin nhắn
    type ENUM('text', 'image', 'video', 'file', 'sticker', 'call', 'system', 'voice') DEFAULT 'text',
    reply_to_id VARCHAR(36) NULL, -- Trả lời tin nhắn nào
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update foreign key cho last_message_id (để tránh circular dependency lúc tạo)
ALTER TABLE conversations ADD CONSTRAINT fk_last_message FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Bảng bạn bè
CREATE TABLE IF NOT EXISTS friends (
    user_id VARCHAR(36),
    friend_id VARCHAR(36),
    status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng cảm xúc tin nhắn (Thả tim, haha...)
CREATE TABLE IF NOT EXISTS message_reactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(36),
    user_id VARCHAR(36),
    type VARCHAR(20) NOT NULL, -- 'like', 'love', 'haha', 'wow', 'sad', 'angry'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_reaction (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng trạng thái đã xem tin nhắn
CREATE TABLE IF NOT EXISTS message_reads (
    message_id VARCHAR(36),
    user_id VARCHAR(36),
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
