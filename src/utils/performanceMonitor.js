/**
 * Performance Monitoring Utilities
 * Tracks and logs page load performance metrics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {};
    }

    /**
     * Mark the start of a performance measurement
     */
    markStart(name) {
        if (window.performance && window.performance.mark) {
            window.performance.mark(`${name}-start`);
        }
    }

    /**
     * Mark the end of a performance measurement and log the duration
     */
    markEnd(name) {
        if (window.performance && window.performance.mark && window.performance.measure) {
            try {
                window.performance.mark(`${name}-end`);
                window.performance.measure(name, `${name}-start`, `${name}-end`);

                const measure = window.performance.getEntriesByName(name)[0];
                if (measure) {
                    this.metrics[name] = measure.duration;
                    console.log(`⚡ ${name}: ${measure.duration.toFixed(2)}ms`);
                }
            } catch {
                // Ignore errors (marks might not exist)
            }
        }
    }

    /**
     * Get all recorded metrics
     */
    getMetrics() {
        return this.metrics;
    }

    /**
     * Log Core Web Vitals
     */
    logWebVitals() {
        if (window.performance && window.performance.getEntriesByType) {
            // First Contentful Paint (FCP)
            const paintEntries = window.performance.getEntriesByType('paint');
            paintEntries.forEach(entry => {
                console.log(`⚡ ${entry.name}: ${entry.startTime.toFixed(2)}ms`);
            });

            // Navigation Timing
            const navigationEntries = window.performance.getEntriesByType('navigation');
            if (navigationEntries.length > 0) {
                const nav = navigationEntries[0];
                console.log(`⚡ DOM Content Loaded: ${nav.domContentLoadedEventEnd.toFixed(2)}ms`);
                console.log(`⚡ Page Load Complete: ${nav.loadEventEnd.toFixed(2)}ms`);
            }
        }
    }

    /**
     * Clear all performance marks and measures
     */
    clear() {
        if (window.performance) {
            window.performance.clearMarks();
            window.performance.clearMeasures();
        }
        this.metrics = {};
    }
}

// Export a singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-log web vitals after page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            performanceMonitor.logWebVitals();
        }, 0);
    });
}

export default PerformanceMonitor;
