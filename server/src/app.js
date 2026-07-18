const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const roomRoutes = require('./routes/room.routes');
const chatRoutes = require('./routes/chat.routes');
const replayRoutes = require('./routes/replay.routes');
const documentRoutes = require('./routes/document.routes');
const fileRoutes = require('./routes/file.routes');
const executionRoutes = require('./routes/execution.routes');

const app = express();

app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const corsOptions = {
  origin: function (origin, callback) {
    // If no origin (e.g. server-to-server or Postman), allow it
    if (!origin) return callback(null, true);
    
    // In development, allow any localhost origin
    if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    // Check against configured CLIENT_URL(s)
    const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(u => u.trim()) : [];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Default fallback (though this usually means blocked)
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

app.get('/health', (_req, res) => res.json({ 
  status: 'ok', 
  service: 'SyncSpace API', 
  timestamp: new Date().toISOString(),
  commit: process.env.RENDER_GIT_COMMIT || 'local'
}));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/replay', replayRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/execute', executionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
