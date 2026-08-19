#!/usr/bin/env node
/**
 * supabase/seed.js
 * Run this script ONCE after running schema.sql to set real bcrypt hashes.
 * Usage: node supabase/seed.js
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Simple .env.local reader (no external dotenv dependency needed)
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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || url.includes('your-supabase-project') || key.includes('your-supabase-service-role-key')) {
  console.error('❌ Error: Placeholder environment variables detected in .env.local!\n');
  console.error('Please open `.env.local` and replace the placeholder values with your real Supabase credentials:');
  console.error('  1. Go to https://supabase.com -> Project Settings -> API');
  console.error('  2. Copy Project URL -> paste as NEXT_PUBLIC_SUPABASE_URL');
  console.error('  3. Copy service_role secret key -> paste as SUPABASE_SERVICE_ROLE_KEY');
  console.error('  4. Copy anon public key -> paste as NEXT_PUBLIC_SUPABASE_ANON_KEY\n');
  process.exit(1);
}

const supabase = createClient(url, key);

async function seed() {
  console.log('🌱 Seeding users with bcrypt hashes...\n');

  const users = [
    { username: 'ADMIN001', password: 'admin123' },
    { username: 'NAND0001', password: '9876543210' },
    { username: 'NAND0002', password: '9876543211' },
    { username: 'NAND0003', password: '9876543212' },
    { username: 'NAND0004', password: '9876543213' },
    { username: 'NAND0005', password: '9876543214' },
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    const { error } = await supabase
      .from('users')
      .update({ password_hash: hash, must_change_pw: false })
      .eq('username', user.username);

    if (error) {
      console.error(`❌ Failed to update ${user.username}:`, error.message);
    } else {
      console.log(` ready: Hash updated for ${user.username}`);
    }
  }

  console.log('\n✅ Seed complete! Demo credentials:');
  console.log('   Admin:    ADMIN001 / admin123');
  console.log('   Employee: NAND0001 / 9876543210');
  console.log('   Employee: NAND0002 / 9876543211');
  console.log('   Employee: NAND0003 / 9876543212');
  console.log('   Employee: NAND0004 / 9876543213');
  console.log('   Employee: NAND0005 / 9876543214');
}

seed().catch(console.error);
