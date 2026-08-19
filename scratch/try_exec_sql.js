const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function tryExec() {
  console.log('Testing RPC or SQL execution on', url);

  const supabase = createClient(url, serviceKey);

  // 1. Check if rpc('exec_sql') or rpc('exec') exists
  const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
    sql: "ALTER TABLE employees ADD COLUMN IF NOT EXISTS voice_recording_enabled BOOLEAN NOT NULL DEFAULT FALSE;"
  });

  console.log('RPC exec_sql result:', { rpcData, rpcError });
}

tryExec();
