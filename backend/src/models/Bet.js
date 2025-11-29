import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  // User's selected numbers
  numbers: {
    type: [Number],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 5 && arr.every(n => n >= 1 && n <= 69);
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
  
  // Transaction details
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  fromAddress: {
    type: String,
    required: true
  },
  
  transactionValue: {
    type: String,
    required: true
  },
  
  transactionTimestamp: {
    type: Date,
    required: true
  },
  
  // Optional nickname
  nickname: {
    type: String,
    maxlength: 50,
    trim: true
  },
  
  // Bet metadata
  roundId: {
    type: Number,
    required: true
  },
  
  betPlacedAt: {
    type: Date,
    default: Date.now
  },
  
  // Validation status
  isValidated: {
    type: Boolean,
    default: false
  },
  
  validationError: {
    type: String
  },
  
  // Winner status
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
    type: String
  },
  
  paymentDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
betSchema.index({ roundId: 1, matches: 1 });
betSchema.index({ isPaid: 1, matches: 1 });
betSchema.index({ betPlacedAt: -1 });

export default mongoose.model('Bet', betSchema);


