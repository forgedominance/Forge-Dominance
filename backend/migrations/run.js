const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      if (typeof pool.query === 'function') {
        await pool.query(sql);
        console.log(`✅ Migration completed: ${file}`);
      } else {
        console.warn('⚠️ Database client does not support raw SQL execution from this script. Skipping migrations. Use Supabase dashboard/CLI to apply SQL migrations.');
        process.exit(0);
      }
    }

    console.log('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
