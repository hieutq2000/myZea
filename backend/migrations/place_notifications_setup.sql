-- ============ PLACE NOTIFICATIONS TABLE ============
-- Bảng thông báo cho Place (like, comment, share, mention, follow)

CREATE TABLE IF NOT EXISTS place_notifications (
    id VARCHAR(36) PRIMARY KEY,
    
    -- Người nhận thông báo
    recipient_id VARCHAR(36) NOT NULL,
    
    -- Người gây ra thông báo (người like, comment, share...)
    actor_id VARCHAR(36) NOT NULL,
    
    -- Loại thông báo: like, comment, share, mention, follow
    type ENUM('like', 'comment', 'share', 'mention', 'follow', 'tag') NOT NULL,
    
    -- ID bài viết liên quan (null nếu là follow)
    post_id VARCHAR(36) NULL,
    
    -- ID comment (nếu là notification về comment)
    comment_id VARCHAR(36) NULL,
    
    -- Nội dung message hiển thị (VD: "đã thích bài viết của bạn")
    message TEXT,
    
    -- Preview nội dung bài viết
    post_preview VARCHAR(255) NULL,
    
    -- Trạng thái đã đọc
    is_read BOOLEAN DEFAULT FALSE,
    
    -- Thời gian tạo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Indexes để tối ưu truy vấn
CREATE INDEX idx_notifications_recipient ON place_notifications(recipient_id);
CREATE INDEX idx_notifications_created_at ON place_notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON place_notifications(is_read);
CREATE INDEX idx_notifications_recipient_unread ON place_notifications(recipient_id, is_read);
