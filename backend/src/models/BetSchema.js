import mongoose from 'mongoose';

const BetSchema = new mongoose.Schema({
  numbers: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 5 && v.every(n => n >= 1 && n <= 69);
      },
      message: 'Must have exactly 5 numbers between 1 and 69'
    }
  },
  powerball: {
    type: Number,
    required: true,
    min: 1,
    max: 26
  },
  transactionId: {
    type: String,
    required: true
  },
  fromAddress: {
    type: String,
    required: true
  },
  transactionValue: {
    type: String,
    default: '0'
  },
  transactionTimestamp: {
    type: Date,
    required: true
  },
  nickname: {
    type: String,
    default: null
  },
  roundId: {
    type: Number,
    required: true
  },
  isValidated: {
    type: Boolean,
    default: false
  },
  validationError: {
    type: String,
    default: null
  },
  matches: {
    type: Number,
    default: null
  },
  prizeAmount: {
    type: String,
    default: '0'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentTxId: {
    type: String,
    default: null
  },
  paymentDate: {
    type: Date,
    default: null
  },
  betPlacedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better query performance
BetSchema.index({ roundId: 1, isValidated: 1 });
BetSchema.index({ roundId: 1, isPaid: 1 });
BetSchema.index({ transactionId: 1 }, { unique: true });

export default mongoose.model('Bet', BetSchema);

