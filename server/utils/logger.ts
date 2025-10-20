import { isDevelopment, isProduction } from '../config/env';

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Structured logger with environment-aware output
 * - Development: Verbose logging with colors
 * - Production: JSON format for log aggregation
 */
class Logger {
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();

    if (isProduction()) {
      // JSON format for production (easier to parse with log aggregators)
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(args.length > 0 && { data: args }),
      });
    }

    // Human-readable format for development
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';

    return `${colors[level]}[${level}]${reset} ${timestamp} - ${message}${
      args.length > 0 ? '\n' + JSON.stringify(args, null, 2) : ''
    }`;
  }

  /**
   * Debug level logging - only in development
   */
  debug(message: string, ...args: any[]): void {
    if (isDevelopment()) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, ...args));
    }
  }

  /**
   * Info level logging - general information
   */
  info(message: string, ...args: any[]): void {
    console.log(this.formatMessage(LogLevel.INFO, message, ...args));
  }

  /**
   * Warning level logging - non-critical issues
   */
  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, ...args));
  }

  /**
   * Error level logging - critical issues
   */
  error(message: string, error?: Error | any, ...args: any[]): void {
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;

    console.error(
      this.formatMessage(LogLevel.ERROR, message, errorDetails, ...args)
    );
  }

  /**
   * Log HTTP request information
   */
  http(method: string, path: string, statusCode: number, duration: number): void {
    const message = `${method} ${path} ${statusCode} ${duration}ms`;

    if (statusCode >= 500) {
      this.error(message);
    } else if (statusCode >= 400) {
      this.warn(message);
    } else {
      this.debug(message);
    }
  }

  /**
   * Log database query information (for debugging)
   */
  query(query: string, params?: any[], duration?: number): void {
    if (isDevelopment()) {
      this.debug('Database query', { query, params, duration });
    }
  }

  /**
   * Log API call information (external services)
   */
  api(service: string, endpoint: string, success: boolean, duration?: number): void {
    const message = `External API: ${service} ${endpoint} - ${success ? 'SUCCESS' : 'FAILED'}`;
    if (success) {
      this.debug(message, { duration });
    } else {
      this.warn(message, { duration });
    }
  }
}

/**
 * Singleton logger instance
 */
export const logger = new Logger();

/**
 * Express middleware for request logging
 */
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const path = req.path;

    // Skip logging for static assets
    if (path.startsWith('/uploads') || path.startsWith('/assets')) {
      return next();
    }

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.http(req.method, path, res.statusCode, duration);
    });

    next();
  };
}
