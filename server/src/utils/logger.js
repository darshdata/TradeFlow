// Structured lightweight logger for TradeFlow
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'ERROR' : 'INFO');
const currentLevelValue = LOG_LEVELS[currentLevel.toUpperCase()] ?? LOG_LEVELS.INFO;

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...meta,
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(message, meta) {
    if (currentLevelValue <= LOG_LEVELS.DEBUG) {
      console.debug(formatLog('DEBUG', message, meta));
    }
  },
  info(message, meta) {
    if (currentLevelValue <= LOG_LEVELS.INFO) {
      console.info(formatLog('INFO', message, meta));
    }
  },
  warn(message, meta) {
    if (currentLevelValue <= LOG_LEVELS.WARN) {
      console.warn(formatLog('WARN', message, meta));
    }
  },
  error(message, meta) {
    if (currentLevelValue <= LOG_LEVELS.ERROR) {
      console.error(formatLog('ERROR', message, meta));
    }
  },
};
