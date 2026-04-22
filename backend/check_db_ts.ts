import { pool } from './src/db';

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'scheduled_interviews'
    `);
    console.log('--- Table Schema: scheduled_interviews ---');
    console.table(res.rows);
    
    const countRes = await pool.query('SELECT COUNT(*) FROM scheduled_interviews');
    console.log('\nCurrent Row Count:', countRes.rows[0].count);
    
    // Check if there are any users
    const usersRes = await pool.query('SELECT id, email FROM users LIMIT 5');
    console.log('\n--- Existing Users (sample) ---');
    console.table(usersRes.rows);

    process.exit(0);
  } catch (e) {
    console.error('Error checking DB:', e);
    process.exit(1);
  }
}

check();
