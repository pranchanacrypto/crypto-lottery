import mongoose from 'mongoose';

const powerballResultSchema = new mongoose.Schema({
  drawDate: {
    type: Date,
    required: true,
    unique: true
  },
  
  numbers: {
    type: [Number],
    required: true
  },
  
  powerball: {
    type: Number,
    required: true
  },
  
  multiplier: {
    type: Number
  },
  
  jackpot: {
    type: String
  },
  
  processed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('PowerballResult', powerballResultSchema);


