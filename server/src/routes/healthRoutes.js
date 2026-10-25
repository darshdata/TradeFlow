import { Router } from 'express';
import mongoose from 'mongoose';
import { hasReplicaSet } from '../config/database.js';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'TradeFlow API',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

router.get('/database', (req, res) => {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const isConnected = readyState === 1;

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'healthy' : 'unhealthy',
    database: states[readyState] || 'unknown',
    replicaSet: hasReplicaSet(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
