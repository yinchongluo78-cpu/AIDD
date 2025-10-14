-- 添加 custom_instructions 字段到 conversations 表
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS custom_instructions TEXT;

-- 添加注释
COMMENT ON COLUMN conversations.custom_instructions IS '自定义指令';
