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
 * Place a new bet (registers immediately, payment validated later)
 */
router.post('/', async (req, res) => {
  try {
    const { numbers, nickname } = req.body;
    
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
    
    // Get current round
    let currentRound = await Round.findOne({ isFinalized: false });
    
    // Create first round if none exists
    if (!currentRound) {
      const { getNextPowerballDrawDate } = await import('../services/powerballService.js');
      currentRound = await Round.create({
        roundId: 1,
        startTime: new Date(),
        drawDate: getNextPowerballDrawDate()
      });
    }
    
    // Create bet with pending payment status
    const bet = await Bet.create({
      numbers: numbers.sort((a, b) => a - b),
      transactionId: null, // Will be filled when payment is detected
      nickname: nickname || null,
      roundId: currentRound.roundId,
      fromAddress: null,
      transactionValue: '0',
      transactionTimestamp: null,
      paymentStatus: 'pending',
      isValidated: false,
      validationError: null,
      paymentCheckAttempts: 0
    });
    
    // Update round bet count
    currentRound.totalBets += 1;
    await currentRound.save();
    
    res.json({
      success: true,
      message: 'Bet registered successfully! Please complete payment to activate.',
      data: {
        betId: bet._id,
        roundId: currentRound.roundId,
        drawDate: currentRound.drawDate,
        paymentStatus: bet.paymentStatus,
        numbers: bet.numbers,
        expectedAmount: process.env.BET_AMOUNT || '0.1'
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
 * NOTE: This endpoint is deprecated. Use POST /api/bets multiple times instead.
 */
router.post('/multiple', async (req, res) => {
  try {
    const { bets, nickname } = req.body;
    
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
    
    // Get current round
    let currentRound = await Round.findOne({ isFinalized: false });
    
    // Create first round if none exists
    if (!currentRound) {
      const { getNextPowerballDrawDate } = await import('../services/powerballService.js');
      currentRound = await Round.create({
        roundId: 1,
        startTime: new Date(),
        drawDate: getNextPowerballDrawDate()
      });
    }
    
    // Create all bets with pending payment status
    const createdBets = [];
    
    for (let i = 0; i < bets.length; i++) {
      const betData = bets[i];
      
      const bet = await Bet.create({
        numbers: betData.numbers.sort((a, b) => a - b),
        transactionId: null, // Will be filled when payment is detected
        nickname: nickname || null,
        roundId: currentRound.roundId,
        fromAddress: null,
        transactionValue: '0',
        transactionTimestamp: null,
        paymentStatus: 'pending',
        isValidated: false,
        validationError: null,
        paymentCheckAttempts: 0
      });
      
      createdBets.push(bet);
    }
    
    // Update round bet count
    currentRound.totalBets += bets.length;
    await currentRound.save();
    
    res.json({
      success: true,
      message: `${bets.length} bets registered successfully! Please complete payment to activate.`,
      data: {
        betIds: createdBets.map(b => b._id),
        betsCount: bets.length,
        roundId: currentRound.roundId,
        drawDate: currentRound.drawDate,
        paymentStatus: 'pending',
        expectedAmount: (parseFloat(process.env.BET_AMOUNT || '0.1') * bets.length).toFixed(6)
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
 * GET /api/bets/:betId
 * Get bet by ID
 */
router.get('/:betId', async (req, res) => {
  try {
    const { betId } = req.params;
    
    const bet = await Bet.findById(betId);
    
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
    console.error('Error fetching bet:', error);
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
 * Get current round info with USD conversion
 * Prize pool is calculated from ACTUAL wallet balance (80%)
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
    
    // 🔥 NOVO: Buscar saldo REAL da carteira blockchain
    const { getBalance } = await import('../services/blockchainService.js');
    const walletAddress = process.env.RECEIVING_WALLET || '0x49Ebd6bf6a1eF004dab7586CE0680eab9e1aFbCb';
    
    let totalBalanceMatic = 0;
    let balanceError = null;
    
    try {
      const balance = await getBalance(walletAddress);
      totalBalanceMatic = parseFloat(balance);
    } catch (error) {
      console.error('Error getting wallet balance:', error.message);
      balanceError = error.message;
      // Continue with 0 balance if blockchain query fails
    }
    
    // Prize pool = 80% do saldo total da carteira
    const prizePoolMatic = totalBalanceMatic * 0.80;
    const houseFee = totalBalanceMatic * 0.05;
    const accumulated = totalBalanceMatic * 0.15;
    
    // Convert to USD
    const totalBalanceUsd = await convertMaticToUsd(totalBalanceMatic);
    const prizePoolUsd = await convertMaticToUsd(prizePoolMatic);
    const accumulatedUsd = await convertMaticToUsd(accumulated);
    const exchangeRate = await getMaticToUsdRate();
    
    // Get bet count for display
    const bets = await Bet.find({
      roundId: currentRound.roundId,
      isValidated: true
    });
    
    // Response data
    const roundData = {
      roundId: currentRound.roundId,
      startTime: currentRound.startTime,
      drawDate: currentRound.drawDate,
      isFinalized: currentRound.isFinalized,
      // Wallet balance (source of truth)
      totalBalanceMatic: totalBalanceMatic.toFixed(6),
      totalBalanceUsd: totalBalanceUsd.toFixed(2),
      totalBalanceUsdFormatted: formatUsd(totalBalanceUsd),
      
      // Prize distribution
      prizePoolMatic: prizePoolMatic.toFixed(6),
      prizePoolUsd: prizePoolUsd.toFixed(2),
      prizePoolUsdFormatted: formatUsd(prizePoolUsd),
      
      accumulatedMatic: accumulated.toFixed(6),
      accumulatedUsd: accumulatedUsd.toFixed(2),
      accumulatedUsdFormatted: formatUsd(accumulatedUsd),
      
      houseFee: houseFee.toFixed(6),
      
      // Exchange rate
      exchangeRate: exchangeRate.toFixed(4),
      
      // Additional info
      totalBets: bets.length,
      walletAddress: walletAddress,
      balanceError: balanceError
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
    const { sessionId, numbers, nickname, manualTransactionId } = req.body;
    
    const session = pendingBetSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }
    
    // Allow manual transaction ID if provided
    let transactionId = session.transactionId || manualTransactionId;
    
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Payment not yet received'
      });
    }
    
    // Store manual transaction ID in session if provided
    if (manualTransactionId && !session.transactionId) {
      session.transactionId = manualTransactionId;
      pendingBetSessions.set(sessionId, session);
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
      txDetails = await validateTransaction(transactionId);
    } catch (error) {
      console.error('Transaction validation error:', error.message);
      return res.status(400).json({
        success: false,
        error: `Transaction validation failed: ${error.message}. Please make sure the transaction is confirmed on the blockchain.`
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

/**
 * GET /api/bets/admin/pending
 * Get all pending bets (admin)
 */
router.get('/admin/pending', async (req, res) => {
  try {
    const pendingBets = await Bet.find({ paymentStatus: 'pending' })
      .sort({ betPlacedAt: -1 })
      .limit(100);
    
    res.json({
      success: true,
      data: {
        count: pendingBets.length,
        bets: pendingBets
      }
    });
  } catch (error) {
    console.error('Error getting pending bets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bets/admin/payment-monitor-status
 * Get payment monitor status (admin)
 */
router.get('/admin/payment-monitor-status', async (req, res) => {
  try {
    const { getMonitorStatus } = await import('../services/paymentMonitor.js');
    const status = getMonitorStatus();
    
    const pendingCount = await Bet.countDocuments({ paymentStatus: 'pending' });
    const paidCount = await Bet.countDocuments({ paymentStatus: 'paid' });
    const failedCount = await Bet.countDocuments({ paymentStatus: 'failed' });
    
    res.json({
      success: true,
      data: {
        monitor: status,
        stats: {
          pending: pendingCount,
          paid: paidCount,
          failed: failedCount,
          total: pendingCount + paidCount + failedCount
        }
      }
    });
  } catch (error) {
    console.error('Error getting monitor status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/bets/admin/check-bet-payment/:betId
 * Manually trigger payment check for a specific bet (admin)
 */
router.post('/admin/check-bet-payment/:betId', async (req, res) => {
  try {
    const { betId } = req.params;
    const { checkBetPayment } = await import('../services/paymentMonitor.js');
    
    const result = await checkBetPayment(betId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error checking bet payment:', error);
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

