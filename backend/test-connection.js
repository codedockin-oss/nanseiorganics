const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Testing MongoDB Connection...\n');
console.log('Connection String:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
console.log('');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('Database:', mongoose.connection.name);
  console.log('Host:', mongoose.connection.host);
  process.exit(0);
})
.catch((err) => {
  console.error('❌ MongoDB Connection Failed!');
  console.error('Error:', err.message);
  console.error('\n📋 Troubleshooting Steps:');
  console.error('1. Check if MongoDB Atlas cluster is running (not paused)');
  console.error('2. Verify your IP is whitelisted in MongoDB Atlas Network Access');
  console.error('3. Check your internet connection');
  console.error('4. Verify username and password are correct');
  console.error('5. Check if cluster name is correct (nansei vs nansai)');
  process.exit(1);
});
