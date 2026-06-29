require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { logGeminiStartup } = require('./config/gemini');
const { corsOptions } = require('./config/cors');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const materialRoutes = require('./routes/material');
const systemRoutes = require('./routes/system');
const { sendMessage } = require('./controllers/chatController');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/system', systemRoutes);
app.post('/api/chat', authMiddleware, sendMessage);  // Send message endpoint

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Chatbot Jaringan Komputer API berjalan',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Alias singkat untuk cek Ngrok / uptime monitor
app.get('/health', (req, res) => {
  res.redirect('/api/health');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Terjadi kesalahan server' });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server berjalan di http://${HOST}:${PORT}`);
  console.log(`🏥 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🌐 CORS: localhost:3000/5173 + *.vercel.app + FRONTEND_URL`);
  logGeminiStartup();
}).on('error', (err) => {
  console.error(`❌ Gagal bind server ke ${HOST}:${PORT}:`, err.message);
  process.exit(1);
});
