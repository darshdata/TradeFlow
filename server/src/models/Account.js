import mongoose from 'mongoose';
import { DEFAULT_INITIAL_CASH_PAISE } from '../config/constants.js';

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalCashPaise: {
      type: Number,
      required: true,
      default: DEFAULT_INITIAL_CASH_PAISE,
      min: [0, 'Total cash cannot be negative'],
      validate: {
        validator: Number.isSafeInteger,
        message: 'Total cash must be a safe integer in paise',
      },
    },
    reservedCashPaise: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Reserved cash cannot be negative'],
      validate: {
        validator: Number.isSafeInteger,
        message: 'Reserved cash must be a safe integer in paise',
      },
    },
    currency: {
      type: String,
      default: 'INR',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

accountSchema.virtual('availableCashPaise').get(function () {
  return Math.max(0, this.totalCashPaise - this.reservedCashPaise);
});

// Enforce invariant: totalCashPaise >= reservedCashPaise
accountSchema.pre('validate', function (next) {
  if (this.reservedCashPaise > this.totalCashPaise) {
    next(new Error(`Invariant violation: reserved cash (${this.reservedCashPaise}) cannot exceed total cash (${this.totalCashPaise})`));
  } else {
    next();
  }
});

export const Account = mongoose.model('Account', accountSchema);
