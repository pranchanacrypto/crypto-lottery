import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

import betRoutes from './routes/bets.js';
import powerballRoutes from './routes/powerball.js';
import { checkPowerballResults } from './services/powerballService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and common development ports
    const allowedOrigins = [
      'http://localhost:5173',  // Vite default
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      process.env.FRONTEND_URL  // Production URL from .env
    ].filter(Boolean);
    
    // Allow all localhost origins in development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // For now, allow all origins (can be restricted later)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

console.log('✅ Using JSON file storage (no MongoDB required)');

// Routes
app.use('/api/bets', betRoutes);
app.use('/api/powerball', powerballRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'crypto-lottery-backend-v2',
    storage: 'JSON files'
  });
});

// Cron job to check Powerball results
// Runs every day at 11 PM
cron.schedule('0 23 * * *', async () => {
  console.log('🔍 Checking for new Powerball results...');
  try {
    await checkPowerballResults();
  } catch (error) {
    console.error('Error checking Powerball results:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`💾 Storage: JSON files in backend/data/`);
  console.log(`🌐 CORS: Enabled for all localhost origins`);
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

