import mongoose from 'mongoose';

const roundSchema = new mongoose.Schema({
  roundId: {
    type: Number,
    required: true,
    unique: true
  },
  
  startTime: {
    type: Date,
    required: true
  },
  
  drawDate: {
    type: Date,
    required: true
  },
  
  winningNumbers: {
    type: [Number],
    default: []
  },
  
  winningPowerball: {
    type: Number
  },
  
  isFinalized: {
    type: Boolean,
    default: false
  },
  
  finalizedAt: {
    type: Date
  },
  
  totalBets: {
    type: Number,
    default: 0
  },
  
  totalPrizePool: {
    type: String,
    default: '0'
  },
  
  winners: {
    sixMatches: { type: Number, default: 0 },
    fiveMatches: { type: Number, default: 0 },
    fourMatches: { type: Number, default: 0 },
    threeMatches: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

export default mongoose.model('Round', roundSchema);


