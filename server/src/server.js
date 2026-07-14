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

    // Keep-alive ping: prevents Render free-tier from spinning down (cold start = 3-5 min delay)
    if (process.env.NODE_ENV === 'production') {
      const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
      setInterval(() => {
        require('http').get(`${APP_URL}/health`, (res) => {
          console.log(`[keep-alive] ping ${res.statusCode}`);
        }).on('error', (err) => console.warn('[keep-alive] ping failed:', err.message));
      }, 14 * 60 * 1000); // every 14 minutes (Render spins down after 15 min)
    }
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
