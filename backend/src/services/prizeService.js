import Bet from '../models/Bet.js';
import { sendPayment } from './blockchainService.js';
import { ethers } from 'ethers';

// Prize distribution percentages
const HOUSE_FEE = 0.05;          // 5%
const PRIZE_6_MATCHES = 0.50;    // 50%
const PRIZE_5_MATCHES = 0.30;    // 30%
const PRIZE_4_MATCHES = 0.10;    // 10%
const PRIZE_3_MATCHES = 0.05;    // 5%

/**
 * Calculate winners for a finalized round
 */
export async function calculateWinners(round) {
  try {
    const bets = await Bet.find({
      roundId: round.roundId,
      isValidated: true
    });
    
    const winners = {
      sixMatches: [],
      fiveMatches: [],
      fourMatches: [],
      threeMatches: []
    };
    
    for (const bet of bets) {
      const matches = countMatches(
        bet.numbers,
        bet.powerball,
        round.winningNumbers,
        round.winningPowerball
      );
      
      bet.matches = matches;
      await bet.save();
      
      if (matches === 6) winners.sixMatches.push(bet);
      else if (matches === 5) winners.fiveMatches.push(bet);
      else if (matches === 4) winners.fourMatches.push(bet);
      else if (matches === 3) winners.threeMatches.push(bet);
    }
    
    return winners;
  } catch (error) {
    console.error('Error calculating winners:', error);
    throw error;
  }
}

/**
 * Count matching numbers
 */
function countMatches(betNumbers, betPowerball, winningNumbers, winningPowerball) {
  let matches = 0;
  
  // Count regular number matches
  for (const num of betNumbers) {
    if (winningNumbers.includes(num)) {
      matches++;
    }
  }
  
  // Add powerball match
  if (betPowerball === winningPowerball) {
    matches++;
  }
  
  return matches;
}

/**
 * Calculate and distribute prizes
 */
export async function distributePrizes(round, winners) {
  try {
    // Calculate total prize pool from all bets
    const bets = await Bet.find({
      roundId: round.roundId,
      isValidated: true
    });
    
    let totalPool = 0;
    for (const bet of bets) {
      totalPool += parseFloat(bet.transactionValue);
    }
    
    // Deduct house fee
    const houseFee = totalPool * HOUSE_FEE;
    const prizePool = totalPool - houseFee;
    
    console.log(`Total pool: ${totalPool} MATIC`);
    console.log(`House fee: ${houseFee} MATIC`);
    console.log(`Prize pool: ${prizePool} MATIC`);
    
    round.totalPrizePool = totalPool.toString();
    await round.save();
    
    // Calculate prizes for each tier
    await distributeTierPrizes(winners.sixMatches, prizePool * PRIZE_6_MATCHES, 6);
    await distributeTierPrizes(winners.fiveMatches, prizePool * PRIZE_5_MATCHES, 5);
    await distributeTierPrizes(winners.fourMatches, prizePool * PRIZE_4_MATCHES, 4);
    await distributeTierPrizes(winners.threeMatches, prizePool * PRIZE_3_MATCHES, 3);
    
    console.log('✅ Prizes calculated and distributed');
  } catch (error) {
    console.error('Error distributing prizes:', error);
    throw error;
  }
}

/**
 * Distribute prizes for a specific tier
 */
async function distributeTierPrizes(winners, tierPool, matches) {
  try {
    if (winners.length === 0) {
      console.log(`No winners for ${matches} matches`);
      return;
    }
    
    const prizePerWinner = tierPool / winners.length;
    
    console.log(`${matches} matches: ${winners.length} winners, ${prizePerWinner} MATIC each`);
    
    for (const bet of winners) {
      bet.prizeAmount = prizePerWinner.toString();
      await bet.save();
      
      // Attempt to send payment automatically
      try {
        const payment = await sendPayment(bet.fromAddress, prizePerWinner.toFixed(6));
        
        bet.isPaid = true;
        bet.paymentTxId = payment.transactionId;
        bet.paymentDate = new Date();
        await bet.save();
        
        console.log(`✅ Paid ${prizePerWinner} MATIC to ${bet.fromAddress} (${bet.nickname || 'Anonymous'})`);
      } catch (paymentError) {
        console.error(`Failed to pay ${bet.fromAddress}:`, paymentError.message);
        // Prize amount is saved, can be paid manually later
      }
    }
  } catch (error) {
    console.error('Error in distributeTierPrizes:', error);
    throw error;
  }
}

/**
 * Manually pay a specific bet
 */
export async function manualPayout(betId) {
  try {
    const bet = await Bet.findById(betId);
    
    if (!bet) {
      throw new Error('Bet not found');
    }
    
    if (bet.isPaid) {
      throw new Error('Prize already paid');
    }
    
    if (!bet.prizeAmount || bet.prizeAmount === '0') {
      throw new Error('No prize to pay');
    }
    
    const payment = await sendPayment(bet.fromAddress, bet.prizeAmount);
    
    bet.isPaid = true;
    bet.paymentTxId = payment.transactionId;
    bet.paymentDate = new Date();
    await bet.save();
    
    return payment;
  } catch (error) {
    console.error('Error in manual payout:', error);
    throw error;
  }
}

/**
 * Get unpaid winners
 */
export async function getUnpaidWinners() {
  try {
    return await Bet.find({
      matches: { $gte: 3 },
      isPaid: false,
      prizeAmount: { $gt: '0' }
    }).sort({ matches: -1, betPlacedAt: 1 });
  } catch (error) {
    console.error('Error getting unpaid winners:', error);
    throw error;
  }
}


