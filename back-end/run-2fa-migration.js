// Script to run 2FA migration
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('Connecting to database...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    // Check if 2FA columns already exist
    const [columns] = await connection.query('SHOW COLUMNS FROM users LIKE "two_factor_enabled"');
    
    if (columns.length > 0) {
      console.log('✅ 2FA columns already exist in users table');
    } else {
      console.log('Adding 2FA columns to users table...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN two_factor_enabled TINYINT(1) DEFAULT 0 COMMENT 'Whether 2FA is enabled for this user',
        ADD COLUMN two_factor_method VARCHAR(20) DEFAULT NULL COMMENT 'The 2FA method: totp or email',
        ADD COLUMN two_factor_secret TEXT DEFAULT NULL COMMENT 'Encrypted TOTP secret or null for email method',
        ADD COLUMN two_factor_backup_codes JSON DEFAULT NULL COMMENT 'JSON array of hashed backup codes',
        ADD COLUMN two_factor_confirmed_at TIMESTAMP NULL DEFAULT NULL COMMENT 'When 2FA was successfully enabled'
      `);
      console.log('✅ Added 2FA columns to users table');
    }

    // Check if two_factor_pending table exists
    const [tables] = await connection.query('SHOW TABLES LIKE "two_factor_pending"');
    
    if (tables.length > 0) {
      console.log('✅ two_factor_pending table already exists');
    } else {
      console.log('Creating two_factor_pending table...');
      await connection.query(`
        CREATE TABLE two_factor_pending (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT NOT NULL,
          method VARCHAR(20) NOT NULL,
          secret TEXT NOT NULL,
          email_code VARCHAR(6) DEFAULT NULL,
          email_code_expires_at TIMESTAMP NULL DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NULL DEFAULT NULL,
          UNIQUE KEY unique_user_method (user_id, method),
          CONSTRAINT fk_two_factor_pending_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Created two_factor_pending table');

      // Create index
      await connection.query('CREATE INDEX idx_two_factor_pending_expires ON two_factor_pending(expires_at)');
      console.log('✅ Created index on two_factor_pending');
    }

    // Create index on users.two_factor_enabled if not exists
    try {
      await connection.query('CREATE INDEX idx_users_two_factor_enabled ON users(two_factor_enabled)');
      console.log('✅ Created index on users.two_factor_enabled');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('✅ Index on users.two_factor_enabled already exists');
      } else {
        throw err;
      }
    }

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration();
