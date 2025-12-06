import mongoose from 'mongoose';

const BetSchema = new mongoose.Schema({
  numbers: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 6 && v.every(n => n >= 1 && n <= 60);
      },
      message: 'Must have exactly 6 numbers between 1 and 60'
    }
  },
  transactionId: {
    type: String,
    required: false, // Not required initially, will be added when payment is found
    default: null
  },
  fromAddress: {
    type: String,
    required: false,
    default: null
  },
  transactionValue: {
    type: String,
    default: '0'
  },
  transactionTimestamp: {
    type: Date,
    required: false,
    default: null
  },
  nickname: {
    type: String,
    default: null
  },
  roundId: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  isValidated: {
    type: Boolean,
    default: false
  },
  validationError: {
    type: String,
    default: null
  },
  lastPaymentCheck: {
    type: Date,
    default: null
  },
  paymentCheckAttempts: {
    type: Number,
    default: 0
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
BetSchema.index({ paymentStatus: 1 }); // For finding pending bets
BetSchema.index({ transactionId: 1 }, { unique: true, sparse: true }); // Sparse index allows nulls

export default mongoose.model('Bet', BetSchema);

