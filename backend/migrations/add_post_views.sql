-- Migration: Add views count to posts table
-- Run this SQL to add views tracking

ALTER TABLE posts ADD COLUMN views INT DEFAULT 0;

-- Create post_views table to track unique views
CREATE TABLE IF NOT EXISTS post_views (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_view (post_id, user_id),
    INDEX idx_post_views_post_id (post_id)
);
