import express from 'express';
import Bet from '../models/Bet.js';
import Round from '../models/Round.js';
import { validateTransaction, findPendingPayment } from '../services/blockchainService.js';
import { convertMaticToUsd, getMaticToUsdRate, formatUsd } from '../services/currencyService.js';

const router = express.Router();

// Store pending bet sessions in memory (consider using Redis in production)
const pendingBetSessions = new Map();

/**
 * POST /api/bets
 * Place a new bet
 */
router.post('/', async (req, res) => {
  try {
    const { numbers, transactionId, nickname } = req.body;
    
    // Validation
    if (!numbers || !Array.isArray(numbers) || numbers.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Must provide exactly 6 numbers'
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
    
    // Check for duplicates
    if (new Set(numbers).size !== 6) {
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
 * POST /api/bets/multiple
 * Place multiple bets at once (for professional players)
 */
router.post('/multiple', async (req, res) => {
  try {
    const { bets, transactionId, nickname } = req.body;
    
    // Validation
    if (!bets || !Array.isArray(bets) || bets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Must provide at least one bet'
      });
    }
    
    if (bets.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 bets per transaction'
      });
    }
    
    // Validate each bet
    for (let i = 0; i < bets.length; i++) {
      const bet = bets[i];
      
      if (!bet.numbers || !Array.isArray(bet.numbers) || bet.numbers.length !== 6) {
        return res.status(400).json({
          success: false,
          error: `Bet #${i + 1}: Must provide exactly 6 numbers`
        });
      }
      
      for (const num of bet.numbers) {
        if (num < 1 || num > 60) {
          return res.status(400).json({
            success: false,
            error: `Bet #${i + 1}: Numbers must be between 1 and 60`
          });
        }
      }
      
      if (new Set(bet.numbers).size !== 6) {
        return res.status(400).json({
          success: false,
          error: `Bet #${i + 1}: Numbers must be unique`
        });
      }
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
      
      // Check if transaction value matches expected amount
      const expectedAmount = parseFloat(process.env.BET_AMOUNT || '0.1') * bets.length;
      const actualAmount = parseFloat(txDetails.value);
      const tolerance = 0.01; // 0.01 MATIC tolerance
      
      if (Math.abs(actualAmount - expectedAmount) > tolerance) {
        throw new Error(`Transaction amount (${actualAmount} MATIC) doesn't match expected amount (${expectedAmount} MATIC for ${bets.length} bets)`);
      }
    } catch (error) {
      validationError = error.message;
      console.error('Transaction validation failed:', error.message);
    }
    
    // Create all bets
    const createdBets = [];
    
    for (let i = 0; i < bets.length; i++) {
      const betData = bets[i];
      
      // For multiple bets, we append the index to the transaction ID to make it unique
      const uniqueTxId = `${transactionId}-${i}`;
      
      const bet = await Bet.create({
        numbers: betData.numbers.sort((a, b) => a - b),
        transactionId: uniqueTxId,
        nickname: nickname || null,
        roundId: currentRound.roundId,
        fromAddress: txDetails?.fromAddress || 'pending',
        transactionValue: txDetails ? (parseFloat(txDetails.value) / bets.length).toString() : '0',
        transactionTimestamp: txDetails?.timestamp || new Date(),
        isValidated: txDetails ? true : false,
        validationError: i === 0 ? validationError : null // Only store error on first bet
      });
      
      createdBets.push(bet);
    }
    
    // Update round bet count
    currentRound.totalBets += bets.length;
    await currentRound.save();
    
    res.json({
      success: true,
      message: txDetails 
        ? `${bets.length} bets placed successfully` 
        : `${bets.length} bets registered, pending validation`,
      data: {
        betsCount: bets.length,
        roundId: currentRound.roundId,
        drawDate: currentRound.drawDate,
        isValidated: txDetails ? true : false,
        validationError
      }
    });
    
  } catch (error) {
    console.error('Error placing multiple bets:', error);
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
          winningNumbers: round.winningNumbers
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

/**
 * POST /api/bets/init-session
 * Initialize a bet session and return payment details
 */
router.post('/init-session', async (req, res) => {
  try {
    const { betCount = 1 } = req.body;
    
    if (betCount < 1 || betCount > 100) {
      return res.status(400).json({
        success: false,
        error: 'Bet count must be between 1 and 100'
      });
    }
    
    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate total amount
    const betAmount = parseFloat(process.env.BET_AMOUNT || '0.1');
    const totalAmount = (betAmount * betCount).toFixed(6);
    
    // Store session info
    pendingBetSessions.set(sessionId, {
      betCount,
      totalAmount,
      createdAt: new Date(),
      status: 'awaiting_payment'
    });
    
    // Clean up old sessions (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [key, value] of pendingBetSessions.entries()) {
      if (value.createdAt < oneHourAgo) {
        pendingBetSessions.delete(key);
      }
    }
    
    res.json({
      success: true,
      data: {
        sessionId,
        betCount,
        betAmount,
        totalAmount,
        receivingWallet: process.env.RECEIVING_WALLET,
        // EIP-681 format for Ethereum/Polygon payment URI
        paymentUri: `ethereum:${process.env.RECEIVING_WALLET}@137?value=${parseFloat(totalAmount) * 1e18}`
      }
    });
    
  } catch (error) {
    console.error('Error initializing bet session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bets/check-payment/:sessionId
 * Check if payment has been received for a session
 */
router.get('/check-payment/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = pendingBetSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }
    
    // Check if payment already found
    if (session.transactionId) {
      return res.json({
        success: true,
        data: {
          paymentFound: true,
          transactionId: session.transactionId,
          fromAddress: session.fromAddress
        }
      });
    }
    
    // Look for pending payment matching the amount
    const payment = await findPendingPayment(session.totalAmount, session.createdAt);
    
    if (payment) {
      // Store transaction info in session
      session.transactionId = payment.hash;
      session.fromAddress = payment.from;
      session.status = 'payment_received';
      pendingBetSessions.set(sessionId, session);
      
      return res.json({
        success: true,
        data: {
          paymentFound: true,
          transactionId: payment.hash,
          fromAddress: payment.from,
          amount: payment.value,
          timestamp: payment.timestamp
        }
      });
    }
    
    // No payment found yet
    res.json({
      success: true,
      data: {
        paymentFound: false,
        message: 'Awaiting payment...'
      }
    });
    
  } catch (error) {
    console.error('Error checking payment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/bets/complete-session
 * Complete a bet session after payment is confirmed
 */
router.post('/complete-session', async (req, res) => {
  try {
    const { sessionId, numbers, nickname } = req.body;
    
    const session = pendingBetSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }
    
    if (!session.transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Payment not yet received'
      });
    }
    
    // Validate numbers
    if (session.betCount === 1) {
      // Single bet
      if (!numbers || !Array.isArray(numbers) || numbers.length !== 6) {
        return res.status(400).json({
          success: false,
          error: 'Must provide exactly 6 numbers'
        });
      }
    } else {
      // Multiple bets
      if (!numbers || !Array.isArray(numbers) || numbers.length !== session.betCount) {
        return res.status(400).json({
          success: false,
          error: `Must provide ${session.betCount} bets`
        });
      }
    }
    
    // Get current round
    let currentRound = await Round.findOne({ isFinalized: false });
    
    if (!currentRound) {
      currentRound = await Round.create({
        roundId: 1,
        startTime: new Date(),
        drawDate: getNextPowerballDrawDate()
      });
    }
    
    // Validate transaction one more time
    let txDetails;
    try {
      txDetails = await validateTransaction(session.transactionId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: `Transaction validation failed: ${error.message}`
      });
    }
    
    // Create bets
    const createdBets = [];
    
    if (session.betCount === 1) {
      // Single bet
      const bet = await Bet.create({
        numbers: numbers.sort((a, b) => a - b),
        transactionId: session.transactionId,
        nickname: nickname || null,
        roundId: currentRound.roundId,
        fromAddress: txDetails.fromAddress,
        transactionValue: txDetails.value,
        transactionTimestamp: txDetails.timestamp,
        isValidated: true,
        validationError: null
      });
      createdBets.push(bet);
    } else {
      // Multiple bets
      for (let i = 0; i < numbers.length; i++) {
        const betNumbers = numbers[i];
        const uniqueTxId = `${session.transactionId}-${i}`;
        
        const bet = await Bet.create({
          numbers: betNumbers.sort((a, b) => a - b),
          transactionId: uniqueTxId,
          nickname: nickname || null,
          roundId: currentRound.roundId,
          fromAddress: txDetails.fromAddress,
          transactionValue: (parseFloat(txDetails.value) / numbers.length).toString(),
          transactionTimestamp: txDetails.timestamp,
          isValidated: true,
          validationError: null
        });
        createdBets.push(bet);
      }
    }
    
    // Update round
    currentRound.totalBets += createdBets.length;
    await currentRound.save();
    
    // Clean up session
    pendingBetSessions.delete(sessionId);
    
    res.json({
      success: true,
      message: `${createdBets.length} bet(s) placed successfully!`,
      data: {
        betsCount: createdBets.length,
        roundId: currentRound.roundId,
        drawDate: currentRound.drawDate
      }
    });
    
  } catch (error) {
    console.error('Error completing session:', error);
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

