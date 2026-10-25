import mongoose from 'mongoose';

const executionSchema = new mongoose.Schema(
  {
    executionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    instrument: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    buyOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    sellOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    priceInPaise: {
      type: Number,
      required: true,
      min: [1, 'Execution price must be positive'],
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Execution quantity must be positive'],
    },
    notionalPaise: {
      type: Number,
      required: true,
      min: [1, 'Execution notional must be positive'],
    },
    takerSide: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

executionSchema.index({ instrument: 1, timestamp: -1 });
executionSchema.index({ buyerId: 1, timestamp: -1 });
executionSchema.index({ sellerId: 1, timestamp: -1 });

export const Execution = mongoose.model('Execution', executionSchema);
