import mongoose from 'mongoose';
import { ORDER_EVENTS } from '../config/constants.js';

const orderEventSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: Object.values(ORDER_EVENTS),
      required: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

orderEventSchema.index({ orderId: 1, timestamp: 1 });

export const OrderEvent = mongoose.model('OrderEvent', orderEventSchema);
