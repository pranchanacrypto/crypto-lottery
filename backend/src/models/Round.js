import { RoundStorage } from '../storage/mongoStorage.js';

/**
 * Round model wrapper for JSON storage
 */
class RoundModel {
  static async findOne(query) {
    const round = await RoundStorage.findOne(query);
    return enhanceRound(round);
  }

  static async create(roundData) {
    const round = {
      roundId: roundData.roundId,
      startTime: roundData.startTime,
      drawDate: roundData.drawDate,
      winningNumbers: roundData.winningNumbers || [],
      isFinalized: roundData.isFinalized || false,
      finalizedAt: roundData.finalizedAt || null,
      totalBets: roundData.totalBets || 0,
      totalPrizePool: roundData.totalPrizePool || '0',
      accumulatedAmount: roundData.accumulatedAmount || '0',
      rolloverAmount: roundData.rolloverAmount || '0',
      winners: roundData.winners || {
        sixMatches: 0,
        fiveMatches: 0,
        fourMatches: 0,
        threeMatches: 0
      }
    };

    const created = await RoundStorage.create(round);
    return enhanceRound(created);
  }
}

// Helper to make round object have save method
function enhanceRound(round) {
  if (!round) return null;
  
  round.save = async function() {
    return await RoundStorage.update(this._id, this);
  };
  
  // Add sort method for consistency
  round.sort = function() {
    return this;
  };
  
  return round;
}

export default RoundModel;

