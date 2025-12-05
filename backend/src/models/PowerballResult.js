import { PowerballResultStorage } from '../storage/mongoStorage.js';

/**
 * PowerballResult model wrapper for JSON storage
 */
class PowerballResultModel {
  static async findOne(query) {
    const result = await PowerballResultStorage.findOne(query);
    return enhanceResult(result);
  }

  static async find(query = {}) {
    const results = await PowerballResultStorage.find(query);
    return {
      sort: function(sortObj) {
        // Already sorted by date descending in storage
        return this;
      },
      limit: function(n) {
        return results.slice(0, n).map(r => enhanceResult(r));
      },
      then: function(resolve) {
        resolve(results.map(r => enhanceResult(r)));
      }
    };
  }

  static async create(resultData) {
    const result = {
      drawDate: resultData.drawDate,
      numbers: resultData.numbers,
      multiplier: resultData.multiplier || null,
      jackpot: resultData.jackpot || null,
      processed: resultData.processed || false
    };

    const created = await PowerballResultStorage.create(result);
    return enhanceResult(created);
  }

  static async findOneAndUpdate(query, updates, options = {}) {
    const result = await PowerballResultStorage.findOneAndUpdate(query, updates, options);
    return enhanceResult(result);
  }
}

// Helper to make result object have save method
function enhanceResult(result) {
  if (!result) return null;
  
  result.save = async function() {
    return await PowerballResultStorage.update(this._id, this);
  };
  
  return result;
}

export default PowerballResultModel;

