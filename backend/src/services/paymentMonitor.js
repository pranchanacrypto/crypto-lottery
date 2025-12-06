/**
 * Payment Monitor Service
 * Monitors pending bets and validates payments in the background
 */

import Bet from '../models/Bet.js';
import { getRecentTransactions } from './blockchainService.js';

const POLL_INTERVAL = 15000; // 15 seconds
const MAX_CHECK_ATTEMPTS = 240; // ~1 hour (240 * 15s)
const PAYMENT_TOLERANCE = 0.01; // 0.01 MATIC tolerance

let monitorInterval = null;
let isRunning = false;

/**
 * Start the payment monitor
 */
export function startPaymentMonitor() {
  if (isRunning) {
    console.log('⚠️  Payment monitor already running');
    return;
  }

  console.log('🔍 Starting payment monitor...');
  isRunning = true;

  // Run immediately
  checkPendingBets();

  // Then run periodically
  monitorInterval = setInterval(checkPendingBets, POLL_INTERVAL);

  console.log(`✅ Payment monitor started (checking every ${POLL_INTERVAL / 1000}s)`);
}

/**
 * Stop the payment monitor
 */
export function stopPaymentMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  isRunning = false;
  console.log('🛑 Payment monitor stopped');
}

/**
 * Check all pending bets for payments
 */
export async function checkPendingBets() {
  try {
    // Find all bets with pending payment status
    const pendingBets = await Bet.find({ 
      paymentStatus: 'pending',
      paymentCheckAttempts: { $lt: MAX_CHECK_ATTEMPTS }
    }).limit(100); // Process max 100 at a time

    if (pendingBets.length === 0) {
      return;
    }

    console.log(`🔍 Checking ${pendingBets.length} pending bet(s) for payment...`);

    // Get recent transactions from blockchain
    const recentTxs = await getRecentTransactions(50);

    const expectedAmount = parseFloat(process.env.BET_AMOUNT || '0.1');
    const receivingWallet = process.env.RECEIVING_WALLET.toLowerCase();

    for (const bet of pendingBets) {
      try {
        // Increment check attempts
        bet.paymentCheckAttempts += 1;
        bet.lastPaymentCheck = new Date();

        // Look for matching transaction
        const matchingTx = findMatchingTransaction(
          recentTxs,
          receivingWallet,
          expectedAmount,
          bet.betPlacedAt
        );

        if (matchingTx) {
          console.log(`✅ Payment found for bet ${bet._id}: ${matchingTx.hash}`);
          
          // Update bet with payment info
          bet.transactionId = matchingTx.hash;
          bet.fromAddress = matchingTx.from;
          bet.transactionValue = matchingTx.value;
          bet.transactionTimestamp = matchingTx.timestamp;
          bet.paymentStatus = 'paid';
          bet.isValidated = true;
          bet.validationError = null;
          
          await bet.save();
          
          console.log(`✅ Bet ${bet._id} validated successfully!`);
        } else {
          // Check if exceeded max attempts
          if (bet.paymentCheckAttempts >= MAX_CHECK_ATTEMPTS) {
            console.log(`⏰ Bet ${bet._id} exceeded max check attempts, marking as failed`);
            bet.paymentStatus = 'failed';
            bet.validationError = 'Payment not detected within time limit';
          }
          
          await bet.save();
        }
      } catch (error) {
        console.error(`❌ Error checking bet ${bet._id}:`, error.message);
        
        // Save the check attempt even if there was an error
        try {
          await bet.save();
        } catch (saveError) {
          console.error(`❌ Error saving bet ${bet._id}:`, saveError.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error in payment monitor:', error.message);
  }
}

/**
 * Find a matching transaction for a bet
 */
function findMatchingTransaction(transactions, receivingWallet, expectedAmount, betPlacedAt) {
  for (const tx of transactions) {
    // Check if transaction is to the correct wallet
    if (tx.to.toLowerCase() !== receivingWallet) {
      continue;
    }

    // Check if amount matches (within tolerance)
    const txAmount = parseFloat(tx.value);
    if (Math.abs(txAmount - expectedAmount) > PAYMENT_TOLERANCE) {
      continue;
    }

    // Check if transaction was made after the bet was placed
    if (tx.timestamp < betPlacedAt) {
      continue;
    }

    // Check if transaction is already used by another bet
    // (This check happens in the DB through unique index on transactionId)
    
    return tx;
  }

  return null;
}

/**
 * Manually check a specific bet
 */
export async function checkBetPayment(betId) {
  try {
    const bet = await Bet.findById(betId);

    if (!bet) {
      throw new Error('Bet not found');
    }

    if (bet.paymentStatus !== 'pending') {
      return {
        success: false,
        message: `Bet payment status is already: ${bet.paymentStatus}`
      };
    }

    // Get recent transactions
    const recentTxs = await getRecentTransactions(50);
    const expectedAmount = parseFloat(process.env.BET_AMOUNT || '0.1');
    const receivingWallet = process.env.RECEIVING_WALLET.toLowerCase();

    const matchingTx = findMatchingTransaction(
      recentTxs,
      receivingWallet,
      expectedAmount,
      bet.betPlacedAt
    );

    if (matchingTx) {
      // Update bet
      bet.transactionId = matchingTx.hash;
      bet.fromAddress = matchingTx.from;
      bet.transactionValue = matchingTx.value;
      bet.transactionTimestamp = matchingTx.timestamp;
      bet.paymentStatus = 'paid';
      bet.isValidated = true;
      bet.validationError = null;
      bet.lastPaymentCheck = new Date();

      await bet.save();

      return {
        success: true,
        message: 'Payment found and validated',
        bet
      };
    }

    // Update last check time
    bet.lastPaymentCheck = new Date();
    bet.paymentCheckAttempts += 1;
    await bet.save();

    return {
      success: false,
      message: 'Payment not yet detected',
      bet
    };
  } catch (error) {
    console.error('Error checking bet payment:', error.message);
    throw error;
  }
}

/**
 * Get monitor status
 */
export function getMonitorStatus() {
  return {
    isRunning,
    pollInterval: POLL_INTERVAL,
    maxAttempts: MAX_CHECK_ATTEMPTS
  };
}

