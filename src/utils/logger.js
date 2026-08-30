/**
 * Production-safe logger utility
 * Logs only in development mode, suppresses in production
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
    /**
     * Log general information (only in development)
     */
    log: (...args) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    /**
     * Log warnings (only in development)
     */
    warn: (...args) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    /**
     * Log errors (always logged, even in production)
     */
    error: (...args) => {
        console.error(...args);
    },

    /**
     * Log debug information (only in development)
     */
    debug: (...args) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },

    /**
     * Log info (only in development)
     */
    info: (...args) => {
        if (isDevelopment) {
            console.info(...args);
        }
    }
};

export default logger;
