import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let memoryReplSet = null;
let isReplicaSet = false;

export async function connectDatabase() {
  let uri = env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri === 'memory') {
    logger.info('No external MONGODB_URI provided. Starting in-memory MongoDB replica set for local transaction support...');
    memoryReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    uri = memoryReplSet.getUri();
    isReplicaSet = true;
    logger.info(`Started in-memory MongoDB replica set at ${uri}`);
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    autoIndex: true,
  });

  // Verify replica set status
  try {
    const admin = mongoose.connection.db.admin();
    const status = await admin.replSetGetStatus();
    if (status && status.ok) {
      isReplicaSet = true;
      logger.info(`MongoDB connected with active replica set "${status.set}" (Transactions enabled)`);
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
  logger.info('Database disconnected');
}

export function hasReplicaSet() {
  return isReplicaSet;
}

/**
 * Runs a callback inside a MongoDB transaction if replica set is available,
 * or runs directly with optimistic concurrency checks if transactions are not supported.
 */
export async function withTransaction(callback) {
  if (!isReplicaSet) {
    // Fallback for standalone dev environments
    return callback(null);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
