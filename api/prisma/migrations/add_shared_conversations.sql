-- 创建分享对话表
CREATE TABLE IF NOT EXISTS shared_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_id VARCHAR(32) UNIQUE NOT NULL,
  title TEXT,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_shared_conversations_share_id ON shared_conversations(share_id);
CREATE INDEX IF NOT EXISTS idx_shared_conversations_user_created ON shared_conversations(user_id, created_at);

-- 添加注释
COMMENT ON TABLE shared_conversations IS '分享的对话记录';
COMMENT ON COLUMN shared_conversations.share_id IS '分享链接的唯一标识';
COMMENT ON COLUMN shared_conversations.is_active IS '分享是否有效';
COMMENT ON COLUMN shared_conversations.view_count IS '访问次数';
