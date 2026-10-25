import mongoose from 'mongoose';

const idempotencyRecordSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    operation: {
      type: String,
      required: true,
    },
    requestFingerprint: {
      type: String,
      required: true,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

idempotencyRecordSchema.index({ key: 1, userId: 1 }, { unique: true });
// TTL index: auto-delete idempotency records older than 24 hours
idempotencyRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const IdempotencyRecord = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
