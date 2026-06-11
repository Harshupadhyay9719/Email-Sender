/**
 * Logger Utility
 */

import config from '../config/env';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

class Logger {
  private logLevel: number;
  private levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  constructor() {
    this.logLevel = this.levels[config.log_level as LogLevel] || this.levels.info;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] <= this.logLevel;
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(`[${this.formatTimestamp()}] ERROR: ${message}`, error || '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(`[${this.formatTimestamp()}] WARN: ${message}`, data || '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(`[${this.formatTimestamp()}] INFO: ${message}`, data || '');
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(`[${this.formatTimestamp()}] DEBUG: ${message}`, data || '');
    }
  }
}

export default new Logger();
