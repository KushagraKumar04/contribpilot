import type { Logger } from '@contribpilot/analyzers';

export function createLogger(scope: string): Logger {
  function emit(
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>
  ): void {
    const payload = data ? ` ${JSON.stringify(data)}` : '';
    const line = `[${scope}] ${message}${payload}`;
    if (level === 'info') console.log(line);
    else if (level === 'warn') console.warn(line);
    else console.error(line);
  }
  return {
    info: (message, data) => emit('info', message, data),
    warn: (message, data) => emit('warn', message, data),
    error: (message, data) => emit('error', message, data)
  };
}