import Bet from '../models/Bet.js';
import { sendPayment } from './blockchainService.js';

// Prize distribution percentages - ACCUMULATION STRATEGY
const HOUSE_FEE = 0.05;           // 5% always goes to the house
const WINNER_PERCENTAGE = 0.80;   // 80% goes to winners (whoever matched most balls)
const ROLLOVER_PERCENTAGE = 0.15; // 15% accumulates to next round

/**
 * Calculate winners for a finalized round
 * NEW STRATEGY: Group by number of matches and find the highest tier with winners
 */
export async function calculateWinners(round) {
  try {
    const bets = await Bet.find({
      roundId: round.roundId,
      isValidated: true
    });
    
    // Group winners by match count
    const winnersByMatches = {
      6: [],
      5: [],
      4: [],
      3: [],
      2: [],
      1: [],
      0: []
    };
    
    let maxMatches = 0;
    
    for (const bet of bets) {
      const matches = countMatches(
        bet.numbers,
        round.winningNumbers
      );
      
      bet.matches = matches;
      await bet.save();
      
      winnersByMatches[matches].push(bet);
      if (matches > maxMatches) {
        maxMatches = matches;
      }
    }
    
    return {
      winnersByMatches,
      maxMatches,
      // Legacy format for compatibility
      sixMatches: winnersByMatches[6],
      fiveMatches: winnersByMatches[5],
      fourMatches: winnersByMatches[4],
      threeMatches: winnersByMatches[3]
    };
  } catch (error) {
    console.error('Error calculating winners:', error);
    throw error;
  }
}

/**
 * Count matching numbers
 */
function countMatches(betNumbers, winningNumbers) {
  let matches = 0;
  
  // Count number matches (all 6 numbers are equal now)
  for (const num of betNumbers) {
    if (winningNumbers.includes(num)) {
      matches++;
    }
  }
  
  return matches;
}

/**
 * Calculate and distribute prizes
 * ACCUMULATION STRATEGY: 80% goes to whoever matched the most balls (divided among them)
 *                        15% accumulates to next round
 *                        5% goes to the house
 *                        If nobody matched any balls, 100% rolls to next round
 */
export async function distributePrizes(round, winners) {
  try {
    // Calculate total prize pool from all bets
    const bets = await Bet.find({
      roundId: round.roundId,
      isValidated: true
    });
    
    let totalBetsPool = 0;
    for (const bet of bets) {
      totalBetsPool += parseFloat(bet.transactionValue);
    }
    
    // Add accumulated amount from previous round
    const previousAccumulated = parseFloat(round.accumulatedAmount || '0');
    const totalPool = totalBetsPool + previousAccumulated;
    
    // Calculate distributions
    const houseFee = totalBetsPool * HOUSE_FEE; // 5% only from new bets
    const rolloverAmount = totalBetsPool * ROLLOVER_PERCENTAGE; // 15% for next round
    const prizePool = totalBetsPool * WINNER_PERCENTAGE + previousAccumulated; // 80% + accumulated
    
    console.log(`\n💰 PRIZE DISTRIBUTION - Round ${round.roundId}`);
    console.log(`New bets: ${totalBetsPool.toFixed(6)} MATIC`);
    console.log(`Accumulated from previous: ${previousAccumulated.toFixed(6)} MATIC`);
    console.log(`Total pool: ${totalPool.toFixed(6)} MATIC`);
    console.log(`House fee (5% of new bets): ${houseFee.toFixed(6)} MATIC`);
    console.log(`Rollover to next round (15%): ${rolloverAmount.toFixed(6)} MATIC`);
    console.log(`Prize pool (80% + accumulated): ${prizePool.toFixed(6)} MATIC`);
    
    round.totalPrizePool = totalPool.toString();
    round.rolloverAmount = rolloverAmount.toString();
    
    // Find the highest tier with winners
    const { maxMatches, winnersByMatches } = winners;
    
    console.log(`Maximum matches: ${maxMatches}`);
    
    // If nobody matched any balls (maxMatches = 0), everything rolls over
    if (maxMatches === 0) {
      const nextRollover = prizePool + rolloverAmount; // Everything goes to next round
      console.log('🔄 No winners - 100% rolls to next round');
      console.log(`Next round accumulated: ${nextRollover.toFixed(6)} MATIC`);
      
      round.winners = {
        sixMatches: 0,
        fiveMatches: 0,
        fourMatches: 0,
        threeMatches: 0
      };
      round.rolloverAmount = nextRollover.toString();
      await round.save();
      return;
    }
    
    // Get winners from the highest matching tier
    const topWinners = winnersByMatches[maxMatches];
    
    if (topWinners.length === 0) {
      console.log('⚠️ No winners found in top tier');
      return;
    }
    
    // Distribute prize pool among top winners
    const prizePerWinner = prizePool / topWinners.length;
    
    console.log(`\n🏆 ${topWinners.length} winner(s) with ${maxMatches} matches`);
    console.log(`Prize per winner: ${prizePerWinner.toFixed(6)} MATIC (80% + accumulated)`);
    console.log(`Rollover to next: ${rolloverAmount.toFixed(6)} MATIC (15%)`);
    
    // Pay winners
    for (const bet of topWinners) {
      bet.prizeAmount = prizePerWinner.toString();
      await bet.save();
      
      // Attempt to send payment automatically
      try {
        const payment = await sendPayment(bet.fromAddress, prizePerWinner.toFixed(6));
        
        bet.isPaid = true;
        bet.paymentTxId = payment.transactionId;
        bet.paymentDate = new Date();
        await bet.save();
        
        console.log(`✅ Paid ${prizePerWinner.toFixed(6)} MATIC to ${bet.fromAddress} (${bet.nickname || 'Anonymous'})`);
      } catch (paymentError) {
        console.error(`❌ Failed to pay ${bet.fromAddress}:`, paymentError.message);
        // Prize amount is saved, can be paid manually later
      }
    }
    
    // Update round statistics
    round.winners = {
      sixMatches: winnersByMatches[6].length,
      fiveMatches: winnersByMatches[5].length,
      fourMatches: winnersByMatches[4].length,
      threeMatches: winnersByMatches[3].length
    };
    await round.save();
    
    console.log('✅ Prizes calculated and distributed\n');
  } catch (error) {
    console.error('Error distributing prizes:', error);
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

