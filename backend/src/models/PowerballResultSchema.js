import mongoose from 'mongoose';

const PowerballResultSchema = new mongoose.Schema({
  drawDate: {
    type: Date,
    required: true,
    unique: true
  },
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
  powerPlay: {
    type: Number,
    default: null
  },
  jackpot: {
    type: String,
    default: null
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Index for sorting by draw date
PowerballResultSchema.index({ drawDate: -1 });

export default mongoose.model('PowerballResult', PowerballResultSchema);

