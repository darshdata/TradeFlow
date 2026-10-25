import mongoose from 'mongoose';

const positionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    instrument: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    ownedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Owned quantity cannot be negative'],
      validate: {
        validator: Number.isSafeInteger,
        message: 'Owned quantity must be a safe integer',
      },
    },
    reservedQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative'],
      validate: {
        validator: Number.isSafeInteger,
        message: 'Reserved quantity must be a safe integer',
      },
    },
    averageCostPricePaise: {
      type: Number,
      default: 0,
    },
    totalCostBasisPaise: {
      type: Number,
      default: 0,
    },
    realizedPnlPaise: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

positionSchema.index({ userId: 1, instrument: 1 }, { unique: true });

positionSchema.virtual('availableQuantity').get(function () {
  return Math.max(0, this.ownedQuantity - this.reservedQuantity);
});

positionSchema.pre('validate', function (next) {
  if (this.reservedQuantity > this.ownedQuantity) {
    next(new Error(`Invariant violation: reserved quantity (${this.reservedQuantity}) cannot exceed owned quantity (${this.ownedQuantity})`));
  } else {
    next();
  }
});

export const Position = mongoose.model('Position', positionSchema);
