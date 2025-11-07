type Level = 'info' | 'warn' | 'error' | 'debug';

const levelOrder: Record<Level, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel: Level = (process.env.LOG_LEVEL as Level) ?? 'info';

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  if (levelOrder[level] > levelOrder[currentLevel]) {
    return;
  }
  const payload = meta ? ` ${JSON.stringify(meta)}` : '';
  const timestamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${payload}`);
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta)
};
