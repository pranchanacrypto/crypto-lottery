import { BetStorage } from '../storage/jsonStorage.js';

/**
 * Bet model wrapper for JSON storage
 */
class BetModel {
  static async findOne(query) {
    const bet = await BetStorage.findOne(query);
    return enhanceBet(bet);
  }

  static find(query) {
    // Create a chainable query builder
    let betsPromise = null;
    let sortObj = null;
    let limitCount = null;
    
    const queryBuilder = {
      sort: function(obj) {
        sortObj = obj;
        return this;
      },
      limit: function(n) {
        limitCount = n;
        return this;
      },
      select: function(fields) {
        // Simple select implementation - just return this for chaining
        return this;
      },
      then: async function(resolve, reject) {
        try {
          let bets = await BetStorage.find(query);
          
          // Apply sort
          if (sortObj) {
            if (sortObj.betPlacedAt === -1) {
              bets.sort((a, b) => new Date(b.betPlacedAt) - new Date(a.betPlacedAt));
            } else if (sortObj.betPlacedAt === 1) {
              bets.sort((a, b) => new Date(a.betPlacedAt) - new Date(b.betPlacedAt));
            } else if (sortObj.matches === -1) {
              bets.sort((a, b) => (b.matches || 0) - (a.matches || 0));
            }
          }
          
          // Apply limit
          if (limitCount) {
            bets = bets.slice(0, limitCount);
          }
          
          resolve(bets.map(bet => enhanceBet(bet)));
        } catch (error) {
          reject(error);
        }
      }
    };
    
    return queryBuilder;
  }

  static async create(betData) {
    // Validation
    if (!Array.isArray(betData.numbers) || betData.numbers.length !== 5) {
      throw new Error('Must have exactly 5 numbers between 1 and 69');
    }
    if (!betData.numbers.every(n => n >= 1 && n <= 69)) {
      throw new Error('Numbers must be between 1 and 69');
    }
    if (betData.powerball < 1 || betData.powerball > 26) {
      throw new Error('Powerball must be between 1 and 26');
    }

    const bet = {
      numbers: betData.numbers,
      powerball: betData.powerball,
      transactionId: betData.transactionId,
      fromAddress: betData.fromAddress,
      transactionValue: betData.transactionValue,
      transactionTimestamp: betData.transactionTimestamp,
      nickname: betData.nickname || null,
      roundId: betData.roundId,
      isValidated: betData.isValidated || false,
      validationError: betData.validationError || null,
      matches: betData.matches || null,
      prizeAmount: betData.prizeAmount || '0',
      isPaid: betData.isPaid || false,
      paymentTxId: betData.paymentTxId || null,
      paymentDate: betData.paymentDate || null
    };

    const created = await BetStorage.create(bet);
    return enhanceBet(created);
  }

  static async findById(id) {
    const bet = await BetStorage.findById(id);
    return enhanceBet(bet);
  }
}

// Helper to make bet object have save method
export function enhanceBet(bet) {
  if (!bet) return null;
  
  bet.save = async function() {
    return await BetStorage.update(this._id, this);
  };
  
  return bet;
}

export default BetModel;

