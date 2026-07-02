const supabase = require('./config/supabase');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-before-production';

async function checkAndCreateAdmin() {
  try {
    console.log('🔍 Checking database for superadmin...\n');

    // First, check all users
    const { data: users, error: listError } = await supabase
      .from('users')
      .select('id, email, role')
      .order('created_at', { ascending: false });

    if (listError) {
      console.log('❌ Error fetching users:', listError.message);
      return;
    }

    console.log('📊 Current users in database:');
    if (users && users.length > 0) {
      users.forEach(u => {
        console.log(`  - ${u.email} (Role: ${u.role})`);
      });
    } else {
      console.log('  (No users found)');
    }
    console.log();

    // Check for the specific user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', ADMIN_EMAIL);

    if (error) {
      console.log('❌ Query error:', error.message);
      return;
    }

    if (user && user.length > 0) {
      console.log('✅ Superadmin user FOUND!\n');
      const adminUser = user[0];
      console.log('User Details:');
      console.log('  Email:', adminUser.email);
      console.log('  Role:', adminUser.role);
      console.log('  Created:', adminUser.created_at);
      console.log();

      // Verify password
      const password = ADMIN_PASSWORD;
      const passwordMatch = await bcrypt.compare(password, adminUser.password);

      console.log('Password Verification:');
      if (passwordMatch) {
        console.log('  ✅ Password is CORRECT');
      } else {
        console.log('  ❌ Password is INCORRECT');
      }
    } else {
      console.log('❌ Superadmin user NOT FOUND');
      console.log('\n⚠️  Creating superadmin user...\n');

      // Create the superadmin
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: 'superadmin'
          }
        ])
        .select();

      if (createError) {
        console.log('❌ Error creating user:', createError.message);
        return;
      }

      console.log('✅ Superadmin created successfully!');
      console.log('\nUser Details:');
      console.log('  Email:', ADMIN_EMAIL);
      console.log('  Password:', ADMIN_PASSWORD);
      console.log('  Role: superadmin');
      if (newUser && newUser[0]) {
        console.log('  Created:', newUser[0].created_at);
      }
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkAndCreateAdmin();


