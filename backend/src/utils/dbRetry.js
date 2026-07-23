const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1002', 'P1017']);
const TRANSIENT_DATABASE_CODES = new Set(['08000', '08003', '08006', '53300', '57P01', '57P02', '57P03']);

const TRANSIENT_MESSAGE_PATTERNS = [
  /connection terminated/i,
  /connection timeout/i,
  /query read timeout/i,
  /timeout exceeded/i,
  /econnreset/i,
  /etimedout/i,
  /remaining connection slots/i,
  /too many connections/i,
  /server closed the connection/i,
  /terminating connection/i,
];

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const isTransientDatabaseError = (error) => {
  const code = error?.code || error?.cause?.code;
  const message = `${error?.message || ''} ${error?.cause?.message || ''}`;

  if (TRANSIENT_PRISMA_CODES.has(code) || TRANSIENT_DATABASE_CODES.has(code)) {
    return true;
  }

  return TRANSIENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
};

const classifyDatabaseError = (error) => {
  const code = error?.code || error?.cause?.code;
  const message = `${error?.message || ''} ${error?.cause?.message || ''}`;
  const lowerMessage = message.toLowerCase();

  if (code === 'DATABASE_ENV_INVALID' || error?.name === 'DatabaseConfigError') {
    return 'DATABASE_ENV_INVALID';
  }

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'DATABASE_DNS_FAILURE';
  }

  if (code === 'ECONNREFUSED' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
    return 'DATABASE_HOST_UNREACHABLE';
  }

  if (code === 'ETIMEDOUT' || /query read timeout/i.test(message) || /connection (terminated due to connection timeout|timeout|timed out)/i.test(message)) {
    return 'DATABASE_CONNECTION_TIMEOUT';
  }

  if (TRANSIENT_DATABASE_CODES.has(code)) {
    return 'DATABASE_CONNECTION_TIMEOUT';
  }

  if (code === '28P01' || lowerMessage.includes('password authentication failed')) {
    return 'DATABASE_AUTHENTICATION_FAILED';
  }

  if (lowerMessage.includes('certificate') || lowerMessage.includes('ssl') || lowerMessage.includes('tls')) {
    return 'DATABASE_SSL_FAILED';
  }

  if (code === '3D000' || lowerMessage.includes('database') && lowerMessage.includes('does not exist')) {
    return 'DATABASE_NOT_FOUND';
  }

  if (code === 'P2022' || code === '42703' || lowerMessage.includes('column') && lowerMessage.includes('does not exist')) {
    return 'DATABASE_SCHEMA_MISMATCH';
  }

  if (code === 'P2010' && lowerMessage.includes("can't reach database server")) {
    return 'DATABASE_HOST_UNREACHABLE';
  }

  if (code === 'P1001' || code === 'P1002' || code === 'P1017') {
    return 'DATABASE_CONNECTION_TIMEOUT';
  }

  return 'DATABASE_QUERY_FAILED';
};

const toSafeErrorLog = (error) => ({
  name: error?.name,
  code: error?.code || error?.cause?.code,
  message: error?.message,
  category: classifyDatabaseError(error),
});

const withDatabaseRetry = async (operationName, operation, options = {}) => {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 2000;

  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < attempts && isTransientDatabaseError(error);

      if (!shouldRetry) {
        throw error;
      }

      const delayMs = Math.min(baseDelayMs * (2 ** (attempt - 1)), maxDelayMs);
      console.warn(`[database] transient failure during ${operationName}; retrying`, {
        attempt,
        nextAttempt: attempt + 1,
        delayMs,
        error: toSafeErrorLog(error),
      });
      await sleep(delayMs);
    }
  }

  throw lastError;
};

export {
  classifyDatabaseError,
  isTransientDatabaseError,
  toSafeErrorLog,
  withDatabaseRetry,
};
