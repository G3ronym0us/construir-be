import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function resetAdminPassword() {
  // Initialize database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'construir_db',
  });

  try {
    await dataSource.initialize();
    console.log('✓ Database connection established');

    const newPassword = 'Admin123*';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update admin password
    const result = await dataSource.query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2`,
      [hashedPassword, 'admin@construir.com'],
    );

    if (result[1] > 0) {
      console.log('✓ Admin password updated successfully!');
      console.log('\nCredentials:');
      console.log('  Email: admin@construir.com');
      console.log('  Password: Admin123*');
    } else {
      console.log('✗ Admin user not found in database');
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await dataSource.destroy();
    console.log('\n✓ Database connection closed');
  }
}

resetAdminPassword();
