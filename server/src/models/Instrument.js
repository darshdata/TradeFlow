import mongoose from 'mongoose';

const instrumentSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    exchange: {
      type: String,
      default: 'NSE (Simulated)',
    },
    tickSizePaise: {
      type: Number,
      default: 5, // ₹0.05
    },
    tradable: {
      type: Boolean,
      default: true,
    },
    simulatedReferencePricePaise: {
      type: Number,
      required: true,
    },
    lastPricePaise: {
      type: Number,
      required: true,
    },
    dayHighPaise: {
      type: Number,
      required: true,
    },
    dayLowPaise: {
      type: Number,
      required: true,
    },
    priceUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Instrument = mongoose.model('Instrument', instrumentSchema);
