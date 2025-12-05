import mongoose from 'mongoose';
import BetModel from '../models/BetSchema.js';
import RoundModel from '../models/RoundSchema.js';
import PowerballResultModel from '../models/PowerballResultSchema.js';

let connectionAttempted = false;

/**
 * Check if MongoDB is connected
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Connect to MongoDB with auto-reconnection
 */
export async function connectDB() {
  // If already connected, return immediately
  if (isConnected()) {
    return;
  }

  // If connection is in progress, wait for it
  if (mongoose.connection.readyState === 2) {
    console.log('⏳ MongoDB connection in progress...');
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve);
      setTimeout(resolve, 10000); // Timeout after 10s
    });
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    // Setup connection event handlers only once
    if (!connectionAttempted) {
      connectionAttempted = true;

      mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB connected successfully');
      });

      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('📡 MongoDB disconnected - will auto-reconnect');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected successfully');
      });
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      // Mongoose 6+ uses native MongoDB driver's auto-reconnection
      // No need for deprecated options
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

/**
 * Bet Storage - Same interface as JSON storage
 */
export const BetStorage = {
  async findAll() {
    await connectDB();
    return await BetModel.find().sort({ betPlacedAt: -1 }).lean();
  },

  async findOne(query) {
    await connectDB();
    const mongoQuery = {};
    
    if (query.transactionId) mongoQuery.transactionId = query.transactionId;
    if (query._id) mongoQuery._id = query._id;
    
    return await BetModel.findOne(mongoQuery).lean();
  },

  async find(query = {}) {
    await connectDB();
    const mongoQuery = {};
    
    if (query.roundId !== undefined) mongoQuery.roundId = query.roundId;
    if (query.isValidated !== undefined) mongoQuery.isValidated = query.isValidated;
    if (query.isPaid !== undefined) mongoQuery.isPaid = query.isPaid;
    
    if (query.matches?.$gte !== undefined) {
      mongoQuery.matches = { $gte: query.matches.$gte };
    }
    
    if (query.prizeAmount?.$gt !== undefined) {
      mongoQuery.prizeAmount = { $gt: query.prizeAmount.$gt };
    }
    
    return await BetModel.find(mongoQuery)
      .sort({ betPlacedAt: -1 })
      .lean();
  },

  async create(betData) {
    await connectDB();
    const bet = new BetModel(betData);
    const savedBet = await bet.save();
    return savedBet.toObject();
  },

  async update(id, updates) {
    await connectDB();
    const updated = await BetModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    
    if (!updated) throw new Error('Bet not found');
    return updated;
  },

  async findById(id) {
    await connectDB();
    return await BetModel.findById(id).lean();
  }
};

/**
 * Round Storage - Same interface as JSON storage
 */
export const RoundStorage = {
  async findAll() {
    await connectDB();
    return await RoundModel.find().sort({ roundId: -1 }).lean();
  },

  async findOne(query) {
    await connectDB();
    const mongoQuery = {};
    
    if (query.roundId !== undefined) mongoQuery.roundId = query.roundId;
    if (query.isFinalized !== undefined) mongoQuery.isFinalized = query.isFinalized;
    
    if (query.drawDate?.$lte) {
      mongoQuery.drawDate = { $lte: new Date(query.drawDate.$lte) };
    }
    
    return await RoundModel.findOne(mongoQuery)
      .sort({ roundId: -1 })
      .lean();
  },

  async create(roundData) {
    await connectDB();
    const round = new RoundModel(roundData);
    const savedRound = await round.save();
    return savedRound.toObject();
  },

  async update(id, updates) {
    await connectDB();
    const updated = await RoundModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    
    if (!updated) throw new Error('Round not found');
    return updated;
  }
};

/**
 * PowerballResult Storage - Same interface as JSON storage
 */
export const PowerballResultStorage = {
  async findAll() {
    await connectDB();
    return await PowerballResultModel.find().sort({ drawDate: -1 }).lean();
  },

  async findOne(query) {
    await connectDB();
    
    if (query.drawDate) {
      const queryDate = new Date(query.drawDate);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      
      return await PowerballResultModel.findOne({
        drawDate: { $gte: startOfDay, $lte: endOfDay }
      }).lean();
    }
    
    return null;
  },

  async find(query = {}) {
    await connectDB();
    return await PowerballResultModel.find()
      .sort({ drawDate: -1 })
      .lean();
  },

  async create(resultData) {
    await connectDB();
    const result = new PowerballResultModel(resultData);
    const savedResult = await result.save();
    return savedResult.toObject();
  },

  async findOneAndUpdate(query, updates, options = {}) {
    await connectDB();
    
    const mongoQuery = {};
    if (query.drawDate) {
      const queryDate = new Date(query.drawDate);
      const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
      
      mongoQuery.drawDate = { $gte: startOfDay, $lte: endOfDay };
    }
    
    const updated = await PowerballResultModel.findOneAndUpdate(
      mongoQuery,
      { $set: updates },
      { 
        new: true, 
        upsert: options.upsert || false,
        runValidators: true 
      }
    ).lean();
    
    return updated;
  },

  async update(id, updates) {
    await connectDB();
    const updated = await PowerballResultModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    
    if (!updated) throw new Error('Result not found');
    return updated;
  }
};

console.log('🗄️  MongoDB Storage initialized');

