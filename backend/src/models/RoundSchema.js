import mongoose from 'mongoose';

const RoundSchema = new mongoose.Schema({
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
    required: true,
    index: true
  },
  winningNumbers: {
    type: [Number],
    default: [],
    validate: {
      validator: function(v) {
        return v.length === 0 || (v.length === 5 && v.every(n => n >= 1 && n <= 69));
      },
      message: 'Winning numbers must be empty or exactly 5 numbers between 1 and 69'
    }
  },
  winningPowerball: {
    type: Number,
    default: null,
    min: 1,
    max: 26
  },
  isFinalized: {
    type: Boolean,
    default: false
  },
  finalizedAt: {
    type: Date,
    default: null
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
    sixMatches: {
      type: Number,
      default: 0
    },
    fiveMatches: {
      type: Number,
      default: 0
    },
    fourMatches: {
      type: Number,
      default: 0
    },
    threeMatches: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound index for queries
RoundSchema.index({ roundId: -1, isFinalized: 1 });

export default mongoose.model('Round', RoundSchema);

