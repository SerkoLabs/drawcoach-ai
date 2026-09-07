type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(token|password|secret|authorization|api[_-]?key|signed[_-]?url)/i;

function redact(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        redact(childValue, childKey),
      ]),
    );
  }

  return value;
}

function write(level: LogLevel, message: string, context?: LogContext) {
  if (!__DEV__) return;

  const payload = context ? redact(context) : undefined;
  const method = level === 'debug' ? console.log : console[level];
  method(`[${level}] ${message}`, payload ?? '');
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};

export { redact as redactLogValue };
