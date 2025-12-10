-- Bảng Nhóm (Groups)
CREATE TABLE IF NOT EXISTS place_groups (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar TEXT, -- URL ảnh đại diện nhóm
    cover_image TEXT, -- URL ảnh bìa
    privacy ENUM('public', 'private', 'secret') DEFAULT 'public',
    -- public: Ai cũng có thể tìm và xem bài viết
    -- private: Ai cũng có thể tìm, nhưng chỉ thành viên xem được bài
    -- secret: Chỉ thành viên mới tìm thấy và xem được
    created_by VARCHAR(36) NOT NULL,
    member_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng Thành viên nhóm
CREATE TABLE IF NOT EXISTS place_group_members (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('admin', 'moderator', 'member') DEFAULT 'member',
    is_pinned BOOLEAN DEFAULT FALSE, -- Ghim nhóm
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_member (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES place_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Thêm cột group_id vào bảng posts (nếu bài đăng trong nhóm)
ALTER TABLE posts ADD COLUMN group_id VARCHAR(36) NULL;
ALTER TABLE posts ADD FOREIGN KEY (group_id) REFERENCES place_groups(id) ON DELETE SET NULL;

-- Index để tối ưu query
CREATE INDEX idx_group_members_group ON place_group_members(group_id);
CREATE INDEX idx_group_members_user ON place_group_members(user_id);
CREATE INDEX idx_posts_group ON posts(group_id);
