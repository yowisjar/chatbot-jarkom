require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { logGeminiStartup } = require('./config/gemini');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const materialRoutes = require('./routes/material');
const systemRoutes = require('./routes/system');
const { sendMessage } = require('./controllers/chatController');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/system', systemRoutes);
app.post('/api/chat', authMiddleware, sendMessage);  // Send message endpoint

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chatbot Jaringan Komputer API berjalan' });
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

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  logGeminiStartup();
});
