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

// CORS Configuration - Allow all origins for development
const corsOptions = {
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));

// Additional CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

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

