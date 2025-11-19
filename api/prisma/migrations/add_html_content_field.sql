-- Migration: Add html_content field to messages table
-- Date: 2025-11-19
-- Description: Adds htmlContent field to store backend-rendered HTML for consistent textbook-style math rendering

ALTER TABLE messages ADD COLUMN IF NOT EXISTS html_content TEXT;

COMMENT ON COLUMN messages.html_content IS '后端渲染的 HTML 内容（教科书风格，包含 KaTeX 渲染的数学公式）';
