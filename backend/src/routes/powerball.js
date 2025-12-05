import express from 'express';
import {
  checkPowerballResults,
  getLatestResults,
  manualEntryResults
} from '../services/powerballService.js';

const router = express.Router();

/**
 * GET /api/powerball/latest
 * Get latest Powerball results
 */
router.get('/latest', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const results = await getLatestResults(parseInt(limit));
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/powerball/check
 * Manually trigger check for new results (admin only)
 */
router.post('/check', async (req, res) => {
  try {
    const result = await checkPowerballResults();
    
    if (!result) {
      return res.json({
        success: true,
        message: 'No new results found'
      });
    }
    
    res.json({
      success: true,
      message: 'Results checked and processed',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/powerball/manual
 * Manually enter results (admin only)
 */
router.post('/manual', async (req, res) => {
  try {
    const { drawDate, numbers } = req.body;
    
    // Validation
    if (!drawDate || !numbers) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: drawDate, numbers'
      });
    }
    
    if (!Array.isArray(numbers) || numbers.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Numbers must be an array of 6 numbers'
      });
    }
    
    for (const num of numbers) {
      if (num < 1 || num > 60) {
        return res.status(400).json({
          success: false,
          error: 'Numbers must be between 1 and 60'
        });
      }
    }
    
    const result = await manualEntryResults(drawDate, numbers);
    
    res.json({
      success: true,
      message: 'Results processed successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/powerball/next-draw
 * Get next draw information
 */
router.get('/next-draw', async (req, res) => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const drawDays = [1, 3, 6]; // Mon, Wed, Sat
    
    let daysUntilDraw = 0;
    for (let i = 1; i <= 7; i++) {
      const checkDay = (dayOfWeek + i) % 7;
      if (drawDays.includes(checkDay)) {
        daysUntilDraw = i;
        break;
      }
    }
    
    const nextDraw = new Date(now);
    nextDraw.setDate(now.getDate() + daysUntilDraw);
    nextDraw.setHours(22, 59, 0, 0);
    
    res.json({
      success: true,
      data: {
        nextDrawDate: nextDraw,
        daysUntilDraw,
        hoursUntilDraw: Math.floor((nextDraw - now) / (1000 * 60 * 60)),
        drawSchedule: 'Monday, Wednesday, Saturday at 10:59 PM ET'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

