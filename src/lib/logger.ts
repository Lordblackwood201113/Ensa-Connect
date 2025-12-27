/**
 * Logger - Système de logging centralisé pour ENSA Connect
 *
 * Niveaux: debug < info < warn < error
 * En production, seuls warn et error sont affichés par défaut
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  prefix: string;
  enabled: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = import.meta.env.PROD;

const defaultConfig: LoggerConfig = {
  level: isProduction ? 'warn' : 'debug',
  prefix: '[ENSA]',
  enabled: true,
};

let config: LoggerConfig = { ...defaultConfig };

function shouldLog(level: LogLevel): boolean {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString().slice(11, 19);
  return `${config.prefix} ${timestamp} [${level.toUpperCase()}] [${context}] ${message}`;
}

/**
 * Extrait un message d'erreur de manière type-safe
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Une erreur inconnue est survenue';
}

/**
 * Crée un logger avec un contexte spécifique
 */
export function createLogger(context: string) {
  return {
    debug(message: string, ...args: unknown[]) {
      if (shouldLog('debug')) {
        console.debug(formatMessage('debug', context, message), ...args);
      }
    },

    info(message: string, ...args: unknown[]) {
      if (shouldLog('info')) {
        console.info(formatMessage('info', context, message), ...args);
      }
    },

    warn(message: string, ...args: unknown[]) {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', context, message), ...args);
      }
    },

    error(message: string, error?: unknown) {
      if (shouldLog('error')) {
        const errorMsg = error ? `: ${getErrorMessage(error)}` : '';
        console.error(formatMessage('error', context, message + errorMsg));
        if (error instanceof Error && error.stack && !isProduction) {
          console.error(error.stack);
        }
      }
    },
  };
}

/**
 * Logger par défaut pour usage rapide
 */
export const logger = createLogger('App');

/**
 * Configure le logger globalement
 */
export function configureLogger(options: Partial<LoggerConfig>) {
  config = { ...config, ...options };
}

/**
 * Désactive tous les logs (utile pour les tests)
 */
export function disableLogs() {
  config.enabled = false;
}

/**
 * Réactive les logs
 */
export function enableLogs() {
  config.enabled = true;
}
