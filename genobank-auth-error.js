/**
 * GenoBank Authentication Error Classes
 * Custom error types for better error handling and debugging
 */

class GenobankAuthError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'GenobankAuthError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

class NetworkError extends GenobankAuthError {
    constructor(message, details) {
        super('NETWORK_ERROR', message, details);
        this.name = 'NetworkError';
    }
}

class WalletError extends GenobankAuthError {
    constructor(message, details) {
        super('WALLET_ERROR', message, details);
        this.name = 'WalletError';
    }
}

class AuthenticationError extends GenobankAuthError {
    constructor(message, details) {
        super('AUTH_ERROR', message, details);
        this.name = 'AuthenticationError';
    }
}

class ConfigurationError extends GenobankAuthError {
    constructor(message, details) {
        super('CONFIG_ERROR', message, details);
        this.name = 'ConfigurationError';
    }
}

class DependencyError extends GenobankAuthError {
    constructor(message, details) {
        super('DEPENDENCY_ERROR', message, details);
        this.name = 'DependencyError';
    }
}

// Error codes enumeration
const ErrorCodes = {
    // Network errors
    NETWORK_NOT_SUPPORTED: 'NETWORK_NOT_SUPPORTED',
    NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
    WRONG_NETWORK: 'WRONG_NETWORK',
    
    // Wallet errors
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
    WALLET_LOCKED: 'WALLET_LOCKED',
    USER_REJECTED: 'USER_REJECTED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    
    // Authentication errors
    INVALID_SIGNATURE: 'INVALID_SIGNATURE',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    
    // Configuration errors
    INVALID_CONFIG: 'INVALID_CONFIG',
    MISSING_REQUIRED_PARAM: 'MISSING_REQUIRED_PARAM',
    
    // Dependency errors
    MISSING_DEPENDENCY: 'MISSING_DEPENDENCY',
    DEPENDENCY_LOAD_FAILED: 'DEPENDENCY_LOAD_FAILED'
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GenobankAuthError,
        NetworkError,
        WalletError,
        AuthenticationError,
        ConfigurationError,
        DependencyError,
        ErrorCodes
    };
} else if (typeof window !== 'undefined') {
    window.GenobankAuthError = GenobankAuthError;
    window.NetworkError = NetworkError;
    window.WalletError = WalletError;
    window.AuthenticationError = AuthenticationError;
    window.ConfigurationError = ConfigurationError;
    window.DependencyError = DependencyError;
    window.ErrorCodes = ErrorCodes;
}