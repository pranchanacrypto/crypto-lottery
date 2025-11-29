import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Initialize data directory on module load
ensureDataDir();

/**
 * Read data from JSON file
 */
async function readData(filename) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Write data to JSON file
 */
async function writeData(filename, data) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing data:', error);
    throw error;
  }
}

/**
 * Bet Storage
 */
export const BetStorage = {
  async findAll() {
    return await readData('bets.json');
  },

  async findOne(query) {
    const bets = await this.findAll();
    return bets.find(bet => {
      if (query.transactionId) return bet.transactionId === query.transactionId;
      if (query._id) return bet._id === query._id;
      return false;
    });
  },

  async find(query) {
    const bets = await this.findAll();
    return bets.filter(bet => {
      if (query.roundId !== undefined && bet.roundId !== query.roundId) return false;
      if (query.isValidated !== undefined && bet.isValidated !== query.isValidated) return false;
      if (query.isPaid !== undefined && bet.isPaid !== query.isPaid) return false;
      if (query.matches !== undefined) {
        if (query.matches.$gte !== undefined && bet.matches < query.matches.$gte) return false;
      }
      if (query.prizeAmount !== undefined) {
        if (query.prizeAmount.$gt !== undefined && parseFloat(bet.prizeAmount) <= parseFloat(query.prizeAmount.$gt)) return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort by betPlacedAt descending by default
      return new Date(b.betPlacedAt) - new Date(a.betPlacedAt);
    });
  },

  async create(betData) {
    const bets = await this.findAll();
    const newBet = {
      _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...betData,
      betPlacedAt: betData.betPlacedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    bets.push(newBet);
    await writeData('bets.json', bets);
    return newBet;
  },

  async update(id, updates) {
    const bets = await this.findAll();
    const index = bets.findIndex(b => b._id === id);
    if (index === -1) throw new Error('Bet not found');
    
    bets[index] = {
      ...bets[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await writeData('bets.json', bets);
    return bets[index];
  },

  async findById(id) {
    const bets = await this.findAll();
    return bets.find(b => b._id === id);
  }
};

/**
 * Round Storage
 */
export const RoundStorage = {
  async findAll() {
    return await readData('rounds.json');
  },

  async findOne(query) {
    const rounds = await this.findAll();
    let filtered = rounds;

    if (query.roundId !== undefined) {
      filtered = filtered.filter(r => r.roundId === query.roundId);
    }
    if (query.isFinalized !== undefined) {
      filtered = filtered.filter(r => r.isFinalized === query.isFinalized);
    }
    if (query.drawDate !== undefined) {
      if (query.drawDate.$lte) {
        filtered = filtered.filter(r => new Date(r.drawDate) <= new Date(query.drawDate.$lte));
      }
    }

    // Sort by roundId descending
    filtered.sort((a, b) => b.roundId - a.roundId);
    
    return filtered[0] || null;
  },

  async create(roundData) {
    const rounds = await this.findAll();
    const newRound = {
      _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...roundData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalBets: roundData.totalBets || 0,
      totalPrizePool: roundData.totalPrizePool || '0',
      winners: roundData.winners || {
        sixMatches: 0,
        fiveMatches: 0,
        fourMatches: 0,
        threeMatches: 0
      },
      winningNumbers: roundData.winningNumbers || [],
      isFinalized: roundData.isFinalized || false
    };
    rounds.push(newRound);
    await writeData('rounds.json', rounds);
    return newRound;
  },

  async update(id, updates) {
    const rounds = await this.findAll();
    const index = rounds.findIndex(r => r._id === id);
    if (index === -1) throw new Error('Round not found');
    
    rounds[index] = {
      ...rounds[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await writeData('rounds.json', rounds);
    return rounds[index];
  }
};

/**
 * PowerballResult Storage
 */
export const PowerballResultStorage = {
  async findAll() {
    return await readData('powerball_results.json');
  },

  async findOne(query) {
    const results = await this.findAll();
    return results.find(result => {
      if (query.drawDate) {
        const queryDate = new Date(query.drawDate).toISOString().split('T')[0];
        const resultDate = new Date(result.drawDate).toISOString().split('T')[0];
        return queryDate === resultDate;
      }
      return false;
    });
  },

  async find(query = {}) {
    const results = await this.findAll();
    return results.sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate));
  },

  async create(resultData) {
    const results = await this.findAll();
    const newResult = {
      _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...resultData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    results.push(newResult);
    await writeData('powerball_results.json', results);
    return newResult;
  },

  async findOneAndUpdate(query, updates, options = {}) {
    const results = await this.findAll();
    let index = results.findIndex(result => {
      if (query.drawDate) {
        const queryDate = new Date(query.drawDate).toISOString().split('T')[0];
        const resultDate = new Date(result.drawDate).toISOString().split('T')[0];
        return queryDate === resultDate;
      }
      return false;
    });

    if (index === -1 && options.upsert) {
      // Create new
      return await this.create(updates);
    }

    if (index === -1) return null;

    results[index] = {
      ...results[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await writeData('powerball_results.json', results);
    return results[index];
  },

  async update(id, updates) {
    const results = await this.findAll();
    const index = results.findIndex(r => r._id === id);
    if (index === -1) throw new Error('Result not found');
    
    results[index] = {
      ...results[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await writeData('powerball_results.json', results);
    return results[index];
  }
};

console.log('📁 JSON Storage initialized at:', DATA_DIR);

