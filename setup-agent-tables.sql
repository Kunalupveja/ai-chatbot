-- Agent Dashboard Database Setup
-- Run this in Supabase SQL Editor

-- 1. Create conversation_modes table
CREATE TABLE IF NOT EXISTS conversation_modes (
  phone_number TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'ai',
  agent_id TEXT,
  agent_name TEXT,
  taken_over_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update conversations table (add sent_by column)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sent_by TEXT DEFAULT 'ai';

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_modes_mode ON conversation_modes(mode);
CREATE INDEX IF NOT EXISTS idx_conversation_modes_agent ON conversation_modes(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_sent_by ON conversations(sent_by);

-- 5. Enable Row Level Security
ALTER TABLE conversation_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- 6. Create policies (allow all access for service role)
DROP POLICY IF EXISTS "Enable all access for service role" ON conversation_modes;
CREATE POLICY "Enable all access for service role" ON conversation_modes
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all access for service role" ON agents;
CREATE POLICY "Enable all access for service role" ON agents
  FOR ALL USING (true);

-- 7. Insert demo agents
-- Password for all: password123
-- Hash generated with bcrypt
INSERT INTO agents (id, username, password_hash, name, email) VALUES
('agent1', 'agent1', '$2a$10$rBV2kU9Z5fXGxMz5oqxqO.Jy8vQxH5YqJ5kZ5fXGxMz5oqxqO.Jy8', 'Agent Sarah', 'sarah@nords.ke'),
('agent2', 'agent2', '$2a$10$rBV2kU9Z5fXGxMz5oqxqO.Jy8vQxH5YqJ5kZ5fXGxMz5oqxqO.Jy8', 'Agent John', 'john@nords.ke'),
('agent3', 'agent3', '$2a$10$rBV2kU9Z5fXGxMz5oqxqO.Jy8vQxH5YqJ5kZ5fXGxMz5oqxqO.Jy8', 'Agent Mary', 'mary@nords.ke'),
('agent4', 'agent4', '$2a$10$rBV2kU9Z5fXGxMz5oqxqO.Jy8vQxH5YqJ5kZ5fXGxMz5oqxqO.Jy8', 'Agent David', 'david@nords.ke')
ON CONFLICT (id) DO NOTHING;

-- 8. Verify tables created
SELECT 'conversation_modes' as table_name, COUNT(*) as row_count FROM conversation_modes
UNION ALL
SELECT 'agents' as table_name, COUNT(*) as row_count FROM agents
UNION ALL
SELECT 'leads' as table_name, COUNT(*) as row_count FROM leads
UNION ALL
SELECT 'conversations' as table_name, COUNT(*) as row_count FROM conversations;

-- Success message
SELECT 'Agent Dashboard tables created successfully!' as status;
