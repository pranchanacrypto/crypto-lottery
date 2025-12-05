import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing MongoDB Connection...\n');

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

// Mask password in output
const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log('📍 Connection String:', maskedUri);
console.log('');

async function testConnection() {
  try {
    console.log('⏳ Attempting to connect...');
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ SUCCESS! MongoDB connected successfully');
    console.log('📊 Connection details:');
    console.log('   - Host:', mongoose.connection.host);
    console.log('   - Database:', mongoose.connection.name);
    console.log('   - ReadyState:', mongoose.connection.readyState);
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED');
    console.error('Error:', error.message);
    console.error('\nPossible causes:');
    console.error('  1. Cluster is PAUSED - check MongoDB Atlas and click "Resume"');
    console.error('  2. Wrong username or password');
    console.error('  3. Special characters in password need to be URL encoded');
    console.error('  4. IP not whitelisted (but this is less likely now)');
    console.error('\n📚 To fix:');
    console.error('  - Go to https://cloud.mongodb.com/');
    console.error('  - Check if cluster is active (not paused)');
    console.error('  - Verify Database Access credentials');
    console.error('  - If password has special chars: @ # $ % etc, use URL encoding');
    process.exit(1);
  }
}

testConnection();


