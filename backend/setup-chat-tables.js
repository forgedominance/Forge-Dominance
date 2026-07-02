const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function setup() {
  console.log('Setting up chat tables...');
  console.log('');
  console.log('Since Supabase REST API does not support DDL,');
  console.log('please run the following SQL in your Supabase Dashboard SQL Editor:');
  console.log('(https://supabase.com/dashboard/project/riunzxzmaxmleahaheux/sql)');
  console.log('');
  console.log('─'.repeat(60));
  console.log(`
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'admin')),
  message TEXT NOT NULL,
  seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_visitor ON chat_conversations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unseen ON chat_messages(conversation_id, sender, seen) WHERE seen = FALSE;
`);
  console.log('─'.repeat(60));
  console.log('');

  // Verify if tables exist
  const { error: e1 } = await supabase.from('chat_conversations').select('id').limit(1);
  const { error: e2 } = await supabase.from('chat_messages').select('id').limit(1);

  if (!e1 && !e2) {
    console.log('Tables already exist! Chat system is ready.');
  } else {
    console.log('Tables NOT found. Please run the SQL above in Supabase Dashboard.');
  }
}

setup().catch(console.error);


