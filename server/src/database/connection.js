const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    // Connection pool: keep 2–10 connections warm, never reconnect per-request
    minPoolSize: 2,
    maxPoolSize: 10,
    heartbeatFrequencyMS: 10000, // ping MongoDB every 10s to keep connections alive
  };

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    isConnected = true;
    console.log('MongoDB Connected');

    mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('⚠️ MongoDB disconnected. Retrying...');
      setTimeout(connectDB, 5000);
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  }
};

module.exports = { connectDB };
