import express from 'express';
import Bet from '../models/Bet.js';
import Round from '../models/Round.js';
import { validateTransaction } from '../services/blockchainService.js';
import { convertMaticToUsd, getMaticToUsdRate, formatUsd } from '../services/currencyService.js';

const router = express.Router();

/**
 * POST /api/bets
 * Place a new bet
 */
router.post('/', async (req, res) => {
  try {
    const { numbers, powerball, transactionId, nickname } = req.body;
    
    // Validation
    if (!numbers || !Array.isArray(numbers) || numbers.length !== 5) {
      return res.status(400).json({
        success: false,
        error: 'Must provide exactly 5 numbers'
      });
    }
    
    if (!powerball || powerball < 1 || powerball > 69) {
      return res.status(400).json({
        success: false,
        error: 'Powerball must be between 1 and 69'
      });
    }
    
    for (const num of numbers) {
      if (num < 1 || num > 69) {
        return res.status(400).json({
          success: false,
          error: 'Numbers must be between 1 and 69'
        });
      }
    }
    
    // Check for duplicates
    if (new Set(numbers).size !== 5) {
      return res.status(400).json({
        success: false,
        error: 'Numbers must be unique'
      });
    }
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required'
      });
    }
    
    // Check if transaction already used
    const existingBet = await Bet.findOne({ transactionId });
    if (existingBet) {
      return res.status(400).json({
        success: false,
        error: 'This transaction ID has already been used'
      });
    }
    
    // Get current round
    let currentRound = await Round.findOne({ isFinalized: false });
    
    // Create first round if none exists
    if (!currentRound) {
      currentRound = await Round.create({
        roundId: 1,
        startTime: new Date(),
        drawDate: getNextPowerballDrawDate()
      });
    }
    
    // Validate transaction on blockchain
    let txDetails;
    let validationError = null;
    
    try {
      txDetails = await validateTransaction(transactionId);
      
      // Check if transaction was made before draw date
      if (txDetails.timestamp > currentRound.drawDate) {
        throw new Error('Transaction must be made before the draw date');
      }
    } catch (error) {
      validationError = error.message;
      console.error('Transaction validation failed:', error.message);
    }
    
    // Create bet
    const bet = await Bet.create({
      numbers: numbers.sort((a, b) => a - b),
      powerball,
      transactionId,
      nickname: nickname || null,
      roundId: currentRound.roundId,
      fromAddress: txDetails?.fromAddress || 'pending',
      transactionValue: txDetails?.value || '0',
      transactionTimestamp: txDetails?.timestamp || new Date(),
      isValidated: txDetails ? true : false,
      validationError
    });
    
    // Update round bet count
    currentRound.totalBets += 1;
    await currentRound.save();
    
    res.json({
      success: true,
      message: txDetails ? 'Bet placed successfully' : 'Bet registered, pending validation',
      data: {
        betId: bet._id,
        roundId: currentRound.roundId,
        drawDate: currentRound.drawDate,
        isValidated: bet.isValidated,
        validationError: bet.validationError
      }
    });
    
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bets/recent
 * Get recent bets
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const bets = await Bet.find()
      .sort({ betPlacedAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: bets
    });
  } catch (error) {
    console.error('Error getting recent bets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bets/round/:roundId
 * Get all bets for a round
 */
router.get('/round/:roundId', async (req, res) => {
  try {
    const { roundId } = req.params;
    
    const bets = await Bet.find({
      roundId: parseInt(roundId),
      isValidated: true
    }).sort({ betPlacedAt: 1 });
    
    res.json({
      success: true,
      data: bets,
      count: bets.length
    });
  } catch (error) {
    console.error('Error getting round bets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bets/check/:transactionId
 * Check bet status by transaction ID
 */
router.get('/check/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const bet = await Bet.findOne({ transactionId });
    
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      });
    }
    
    // Get round info
    const round = await Round.findOne({ roundId: bet.roundId });
    
    res.json({
      success: true,
      data: {
        bet,
        round: {
          roundId: round.roundId,
          drawDate: round.drawDate,
          isFinalized: round.isFinalized,
          winningNumbers: round.winningNumbers,
          winningPowerball: round.winningPowerball
        }
      }
    });
  } catch (error) {
    console.error('Error checking bet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bets/current-round
 * Get current round info with USD conversion and accumulated amount
 */
router.get('/current-round', async (req, res) => {
  try {
    const currentRound = await Round.findOne({ isFinalized: false });
    
    if (!currentRound) {
      return res.json({
        success: true,
        data: null,
        message: 'No active round'
      });
    }
    
    // Calculate total pool from all validated bets in this round
    const bets = await Bet.find({
      roundId: currentRound.roundId,
      isValidated: true
    });
    
    let newBetsMatic = 0;
    for (const bet of bets) {
      newBetsMatic += parseFloat(bet.transactionValue);
    }
    
    // Add accumulated amount from previous round
    const accumulatedMatic = parseFloat(currentRound.accumulatedAmount || '0');
    const totalPoolMatic = newBetsMatic + accumulatedMatic;
    
    // Calculate prize pool (80% of new bets + all accumulated)
    const prizePoolMatic = (newBetsMatic * 0.80) + accumulatedMatic;
    
    // Convert to USD
    const totalPoolUsd = await convertMaticToUsd(totalPoolMatic);
    const prizePoolUsd = await convertMaticToUsd(prizePoolMatic);
    const accumulatedUsd = await convertMaticToUsd(accumulatedMatic);
    const exchangeRate = await getMaticToUsdRate();
    
    // Add USD info to response
    const roundData = {
      ...currentRound,
      newBetsMatic: newBetsMatic.toFixed(6),
      accumulatedMatic: accumulatedMatic.toFixed(6),
      totalPoolMatic: totalPoolMatic.toFixed(6),
      prizePoolMatic: prizePoolMatic.toFixed(6),
      totalPoolUsd: totalPoolUsd.toFixed(2),
      totalPoolUsdFormatted: formatUsd(totalPoolUsd),
      prizePoolUsd: prizePoolUsd.toFixed(2),
      prizePoolUsdFormatted: formatUsd(prizePoolUsd),
      accumulatedUsd: accumulatedUsd.toFixed(2),
      accumulatedUsdFormatted: formatUsd(accumulatedUsd),
      exchangeRate: exchangeRate.toFixed(4)
    };
    
    res.json({
      success: true,
      data: roundData
    });
  } catch (error) {
    console.error('Error getting current round:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bets/winners/:roundId
 * Get winners for a round
 */
router.get('/winners/:roundId', async (req, res) => {
  try {
    const { roundId } = req.params;
    
    const round = await Round.findOne({ roundId: parseInt(roundId) });
    
    if (!round) {
      return res.status(404).json({
        success: false,
        error: 'Round not found'
      });
    }
    
    if (!round.isFinalized) {
      return res.status(400).json({
        success: false,
        error: 'Round not finalized yet'
      });
    }
    
    const winners = await Bet.find({
      roundId: parseInt(roundId),
      matches: { $gte: 3 }
    }).sort({ matches: -1, betPlacedAt: 1 });
    
    res.json({
      success: true,
      data: {
        round,
        winners
      }
    });
  } catch (error) {
    console.error('Error getting winners:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function
function getNextPowerballDrawDate() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const drawDays = [1, 3, 6]; // Mon, Wed, Sat
  
  let daysToAdd = 1;
  for (let i = 1; i <= 7; i++) {
    const checkDay = (dayOfWeek + i) % 7;
    if (drawDays.includes(checkDay)) {
      daysToAdd = i;
      break;
    }
  }
  
  const nextDraw = new Date(now);
  nextDraw.setDate(now.getDate() + daysToAdd);
  nextDraw.setHours(22, 59, 0, 0);
  
  return nextDraw;
}

export default router;

