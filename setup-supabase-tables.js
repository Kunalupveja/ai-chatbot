require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function setupTables() {
  console.log('\n🗄️  Setting up Supabase tables...\n');

  try {
    // Test connection
    console.log('1️⃣  Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('leads')
      .select('count')
      .limit(1);

    if (testError && testError.code === '42P01') {
      console.log('⚠️  Tables do not exist yet. You need to create them in Supabase SQL Editor.');
      console.log('\n📋 Follow these steps:\n');
      console.log('1. Go to your Supabase project: https://supabase.com/dashboard/project/wdjvlaxyclocozqhtjae');
      console.log('2. Click "SQL Editor" in the left sidebar');
      console.log('3. Click "New query"');
      console.log('4. Copy and paste the SQL below:');
      console.log('\n' + '='.repeat(80));
      console.log(`
-- Create leads table
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  industry TEXT,
  lead_source TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE conversations (
  id BIGSERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_received_at ON leads(received_at DESC);
CREATE INDEX idx_conversations_phone ON conversations(phone_number);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role access
CREATE POLICY "Enable all access for service role" ON leads
  FOR ALL USING (true);

CREATE POLICY "Enable all access for service role" ON conversations
  FOR ALL USING (true);
      `);
      console.log('='.repeat(80));
      console.log('\n5. Click "Run" button');
      console.log('6. You should see: "Success. No rows returned"');
      console.log('7. Run this script again to verify\n');
      return;
    }

    if (testError) {
      throw testError;
    }

    console.log('✅ Connection successful!');
    console.log('✅ Tables exist!');

    // Get stats
    console.log('\n2️⃣  Checking database stats...');
    
    const { count: leadsCount, error: leadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    const { count: conversationsCount, error: convsError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    if (leadsError) throw leadsError;
    if (convsError) throw convsError;

    console.log(`   📊 Leads: ${leadsCount || 0}`);
    console.log(`   💬 Conversations: ${conversationsCount || 0}`);

    console.log('\n✅ Supabase setup complete!');
    console.log('\n🚀 You can now run: node chatbot-server-supabase.js\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Make sure you:');
    console.log('   1. Created the tables in Supabase SQL Editor');
    console.log('   2. Have correct SUPABASE_URL and SUPABASE_ANON_KEY in .env');
    console.log('   3. Enabled RLS policies\n');
  }
}

setupTables();
