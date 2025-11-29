import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cron from 'node-cron';

import betRoutes from './routes/bets.js';
import powerballRoutes from './routes/powerball.js';
import { checkPowerballResults } from './services/powerballService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-lottery')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/bets', betRoutes);
app.use('/api/powerball', powerballRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'crypto-lottery-backend-v2'
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
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});


