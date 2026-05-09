const mongoose = require('mongoose');

const MONGO_OPTS = {
  maxPoolSize:        20,   // max concurrent connections in pool
  minPoolSize:        5,    // keep 5 connections warm
  socketTimeoutMS:    45000,
  serverSelectionTimeoutMS: 10000,
  heartbeatFrequencyMS:     10000,
  retryWrites:        true,
  retryReads:         true,
};

// Disable buffering so requests fail fast when DB is down instead of queuing
mongoose.set('bufferCommands', false);

const connectDB = async (retries = 5) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTS);
      console.log(`✅ MongoDB Connected: ${conn.connection.host} (pool: ${MONGO_OPTS.maxPoolSize})`);

      mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected — reconnecting…'));
      mongoose.connection.on('reconnected',  () => console.log('✅ MongoDB reconnected'));
      return;
    } catch (error) {
      console.error(`❌ MongoDB attempt ${i}/${retries}: ${error.message}`);
      if (i === retries) process.exit(1);
      await new Promise(r => setTimeout(r, 2000 * i)); // exponential back-off
    }
  }
};

module.exports = connectDB;
