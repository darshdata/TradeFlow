import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let memoryReplSet = null;
let isReplicaSet = false;

export async function connectDatabase(customUri) {
  const rawUri = customUri !== undefined ? customUri : (process.env.MONGODB_URI ?? env.MONGODB_URI);
  const isProduction = (process.env.NODE_ENV || env.NODE_ENV) === 'production';
  const uriTrimmed = typeof rawUri === 'string' ? rawUri.trim() : '';
  const isBlank = !uriTrimmed || uriTrimmed === 'memory';

  if (isProduction && isBlank) {
    throw new Error('MONGODB_URI is required in production mode. Ephemeral in-memory database fallback is strictly prohibited.');
  }

  let uri = isBlank ? '' : uriTrimmed;

  if (!uri) {
    logger.info('No external MONGODB_URI provided. Starting in-memory MongoDB replica set for local transaction support...');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    memoryReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    uri = memoryReplSet.getUri();
    isReplicaSet = true;
    logger.info('Started in-memory MongoDB replica set with WiredTiger transactions enabled');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    autoIndex: true,
  });

  // Verify replica set status
  try {
    const admin = mongoose.connection.db?.admin?.();
    if (admin) {
      const status = await admin.replSetGetStatus();
      if (status && status.ok) {
        isReplicaSet = true;
        logger.info(`MongoDB connected with active replica set "${status.set}" (Transactions enabled)`);
      }
    }
  } catch (err) {
    // If not a replica set, log note
    if (!memoryReplSet) {
      logger.warn('MongoDB connection is not a replica set. Multi-document transactions require a replica set or MongoDB Atlas.');
      isReplicaSet = false;
    }
  }

  logger.info(`Database connected successfully to ${mongoose.connection.host || 'embedded instance'}`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryReplSet) {
    await memoryReplSet.stop();
    memoryReplSet = null;
  }
  isReplicaSet = false;
  logger.info('Database disconnected');
}

export function hasReplicaSet() {
  return isReplicaSet;
}

export function getMemoryReplSet() {
  return memoryReplSet;
}

/**
 * Runs a callback inside a MongoDB transaction if replica set is available,
 * with automatic retries for transient transaction errors and commit retries.
 * Falls back to direct execution if transactions are not supported.
 */
export async function withTransaction(callback, maxRetries = 3) {
  if (!isReplicaSet) {
    // Fallback for standalone dev environments
    return callback(null);
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await callback(session);

      // Attempt commit with retry on UnknownTransactionCommitResult
      let commitSuccess = false;
      while (!commitSuccess) {
        try {
          await session.commitTransaction();
          commitSuccess = true;
        } catch (commitErr) {
          if (commitErr.hasErrorLabel && commitErr.hasErrorLabel('UnknownTransactionCommitResult')) {
            logger.warn('UnknownTransactionCommitResult encountered. Retrying commit...');
            continue;
          }
          throw commitErr;
        }
      }

      return result;
    } catch (error) {
      await session.abortTransaction().catch(() => {});
      const isTransient = error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError');
      if (isTransient && attempt < maxRetries) {
        logger.warn(`Transient transaction error encountered (attempt ${attempt}/${maxRetries}), retrying...`, {
          error: error.message,
        });
        await new Promise((resolve) => setTimeout(resolve, attempt * 50));
        continue;
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
