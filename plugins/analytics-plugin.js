/**
 * Analytics Plugin for GenoBank Auth
 * Tracks authentication events and user behavior
 */

class AnalyticsPlugin {
    constructor(config = {}) {
        this.enabled = config.enabled !== false;
        this.trackingId = config.trackingId;
        this.customTracker = config.customTracker;
        this.events = [];
    }
    
    install(auth) {
        if (!this.enabled) return;
        
        // Override login success handler
        const originalSuccess = auth.onLoginSuccess;
        auth.onLoginSuccess = (data) => {
            this.track('login_success', {
                method: data.method,
                network: data.network,
                chainId: data.chainId,
                isPermittee: data.isPermittee
            });
            originalSuccess(data);
        };
        
        // Override login error handler
        const originalError = auth.onLoginError;
        auth.onLoginError = (error) => {
            this.track('login_error', {
                error: error.message,
                code: error.code,
                method: auth.loginMethod
            });
            originalError(error);
        };
        
        // Override logout handler
        const originalLogout = auth.onLogout;
        auth.onLogout = () => {
            this.track('logout', {
                method: auth.loginMethod
            });
            originalLogout();
        };
    }
    
    track(eventName, properties = {}) {
        const event = {
            name: eventName,
            properties: {
                ...properties,
                timestamp: new Date().toISOString(),
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
            }
        };
        
        this.events.push(event);
        
        // Send to custom tracker if provided
        if (this.customTracker) {
            this.customTracker(event);
        }
        
        // Send to Google Analytics if available
        if (typeof gtag !== 'undefined' && this.trackingId) {
            gtag('event', eventName, {
                event_category: 'Authentication',
                ...properties
            });
        }
        
        // Send to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Analytics]', event);
        }
    }
    
    getEvents() {
        return this.events;
    }
    
    clearEvents() {
        this.events = [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalyticsPlugin;
} else if (typeof window !== 'undefined') {
    window.AnalyticsPlugin = AnalyticsPlugin;
}