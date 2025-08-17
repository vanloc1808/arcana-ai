// Structured logging utility for the frontend
// Provides conditional debug logging and different log levels

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  function?: string;
  [key: string]: unknown;
}

class Logger {
    private isDevelopment: boolean;
    private isDebugEnabled: boolean;

    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.isDebugEnabled = this.isDevelopment || process.env.NEXT_PUBLIC_DEBUG_LOGGING === 'true';
    }

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
    }

    private shouldLog(level: LogLevel): boolean {
        if (level === 'debug') {
            return this.isDebugEnabled;
        }
        return true; // Always log info, warn, and error in all environments
    }

    debug(message: string, context?: LogContext): void {
        if (this.shouldLog('debug')) {
            console.log(this.formatMessage('debug', message, context));
        }
    }

    info(message: string, context?: LogContext): void {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, context));
        }
    }

    warn(message: string, context?: LogContext): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, context));
        }
    }

    error(message: string, error?: Error | unknown, context?: LogContext): void {
        if (this.shouldLog('error')) {
            const errorContext = {
                ...context,
                error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                } : error
            };
            console.error(this.formatMessage('error', message, errorContext));
        }
    }

    // Convenience method for API errors
    apiError(operation: string, error: unknown, context?: LogContext): void {
        this.error(`API Error in ${operation}`, error, context);
    }

    // Convenience method for component errors
    componentError(component: string, operation: string, error: unknown, context?: LogContext): void {
        this.error(`Component Error in ${component}.${operation}`, error, { component, ...context });
    }

    // Convenience method for hook errors
    hookError(hook: string, operation: string, error: unknown, context?: LogContext): void {
        this.error(`Hook Error in ${hook}.${operation}`, error, { hook, ...context });
    }
}

// Create a singleton instance
export const logger = new Logger();

// Export convenience functions for common use cases
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (message: string, error?: Error | unknown, context?: LogContext) => logger.error(message, error, context);
export const logApiError = (operation: string, error: unknown, context?: LogContext) => logger.apiError(operation, error, context);
export const logComponentError = (component: string, operation: string, error: unknown, context?: LogContext) => logger.componentError(component, operation, error, context);
export const logHookError = (hook: string, operation: string, error: unknown, context?: LogContext) => logger.hookError(hook, operation, error, context);
