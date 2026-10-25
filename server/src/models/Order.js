import mongoose from 'mongoose';
import { ORDER_TYPES, ORDER_SIDES, ORDER_STATUSES, VALID_ORDER_TRANSITIONS } from '../config/constants.js';

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    side: {
      type: String,
      enum: Object.values(ORDER_SIDES),
      required: true,
    },
    orderType: {
      type: String,
      enum: Object.values(ORDER_TYPES),
      required: true,
    },
    priceInPaise: {
      type: Number,
      required: function () {
        return this.orderType === ORDER_TYPES.LIMIT;
      },
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isSafeInteger,
        message: 'Quantity must be a safe integer',
      },
    },
    filledQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Filled quantity cannot be negative'],
      validate: {
        validator: Number.isSafeInteger,
        message: 'Filled quantity must be a safe integer',
      },
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: [0, 'Remaining quantity cannot be negative'],
      validate: {
        validator: Number.isSafeInteger,
        message: 'Remaining quantity must be a safe integer',
      },
    },
    reservedCashPaise: {
      type: Number,
      default: 0,
      min: [0, 'Reserved cash cannot be negative'],
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved shares cannot be negative'],
    },
    averageExecutionPriceInPaise: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      default: ORDER_STATUSES.NEW,
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ instrument: 1, status: 1 });

// Invariant validation: filledQuantity + remainingQuantity === quantity
orderSchema.pre('validate', function (next) {
  if (this.filledQuantity + this.remainingQuantity !== this.quantity) {
    next(new Error(`Invariant violation: filledQuantity (${this.filledQuantity}) + remainingQuantity (${this.remainingQuantity}) must equal quantity (${this.quantity})`));
  } else {
    next();
  }
});

export const Order = mongoose.model('Order', orderSchema);
