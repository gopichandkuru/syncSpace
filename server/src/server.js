require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./database/connection');
const { initializeSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initializeSocket(server);

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`✅ SyncSpace server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
};

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
