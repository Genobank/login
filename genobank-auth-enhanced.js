/**
 * GenoBank.io Enhanced Authentication Module
 * Standalone Web3 authentication with MetaMask and OAuth support
 * Enhanced with better error handling, dependency management, and network flexibility
 * 
 * @version 3.0.0
 * @license MIT
 */

// Import error classes and utilities (if available)
let GenobankAuthError, NetworkError, WalletError, AuthenticationError, ConfigurationError;
let NetworkManager, NETWORK_CONFIGS;
let dependencyLoader;

// Try to import dependencies if in module environment
if (typeof require !== 'undefined') {
    try {
        const errors = require('./genobank-auth-error.js');
        GenobankAuthError = errors.GenobankAuthError;
        NetworkError = errors.NetworkError;
        WalletError = errors.WalletError;
        AuthenticationError = errors.AuthenticationError;
        ConfigurationError = errors.ConfigurationError;
        
        const network = require('./network-configs.js');
        NetworkManager = network.NetworkManager;
        NETWORK_CONFIGS = network.NETWORK_CONFIGS;
        
        const loader = require('./dependency-loader.js');
        dependencyLoader = loader.dependencyLoader;
    } catch (e) {
        // Fallback to global objects if modules not found
    }
}

class GenobankAuthEnhanced {
    constructor(config = {}) {
        // Validate configuration
        this._validateConfig(config);
        
        // Plugin system
        this.plugins = [];
        
        // Environment detection
        this.environment = this._detectEnvironment();
        
        // Network configuration
        this.network = config.network || 'avalanche';
        this.networkEnvironment = config.environment || 'test';
        
        // Try to get network config
        try {
            this.networkConfig = config.customNetwork || 
                (NetworkManager ? NetworkManager.getConfig(this.network, this.networkEnvironment) : 
                this._getDefaultNetworkConfig());
        } catch (error) {
            throw new ConfigurationError(
                `Invalid network configuration: ${error.message}`,
                { network: this.network, environment: this.networkEnvironment }
            );
        }
        
        // API configuration
        this.apiUrl = config.apiUrl || this.networkConfig.apiUrl;
        
        // OAuth configuration (Magic Link)
        this.magicApiKey = config.magicApiKey || this._getDefaultMagicKey();
        
        // Message for signature
        this.messageToSign = config.messageToSign || 'Welcome to GenoBank.io\n\nSign this message to authenticate your wallet.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.';
        
        // Callbacks
        this.onLoginSuccess = config.onLoginSuccess || (() => {});
        this.onLoginError = config.onLoginError || (() => {});
        this.onLogout = config.onLogout || (() => {});
        
        // State management
        this.currentAccount = null;
        this.provider = null;
        this.signer = null;
        this.magic = null;
        this.loginMethod = null;
        
        // Storage options
        this.storage = config.storage || this._getStorage();
        
        // Auto-initialization
        if (config.autoInit !== false) {
            this._initialize();
        }
    }
    
    /**
     * Validate configuration
     */
    _validateConfig(config) {
        const validNetworks = ['avalanche', 'ethereum', 'polygon', 'bsc', 'custom'];
        const validEnvironments = ['test', 'production'];
        
        if (config.network && !validNetworks.includes(config.network) && !config.customNetwork) {
            throw new ConfigurationError(
                `Invalid network: ${config.network}. Valid options: ${validNetworks.join(', ')}`,
                { network: config.network }
            );
        }
        
        if (config.environment && !validEnvironments.includes(config.environment)) {
            throw new ConfigurationError(
                `Invalid environment: ${config.environment}. Valid options: ${validEnvironments.join(', ')}`,
                { environment: config.environment }
            );
        }
        
        if (config.customNetwork) {
            const required = ['chainId', 'chainName', 'rpcUrl', 'apiUrl'];
            const missing = required.filter(key => !config.customNetwork[key]);
            if (missing.length > 0) {
                throw new ConfigurationError(
                    `Custom network missing required fields: ${missing.join(', ')}`,
                    { missing }
                );
            }
        }
    }
    
    /**
     * Detect environment
     */
    _detectEnvironment() {
        const isBrowser = typeof window !== 'undefined';
        const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
        const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
        
        return {
            isBrowser,
            isNode,
            isReactNative,
            hasMetaMask: isBrowser && typeof window.ethereum !== 'undefined',
            hasLocalStorage: isBrowser && typeof localStorage !== 'undefined',
            hasSessionStorage: isBrowser && typeof sessionStorage !== 'undefined'
        };
    }
    
    /**
     * Get default network configuration
     */
    _getDefaultNetworkConfig() {
        // Fallback configuration if network-configs.js is not available
        const configs = {
            avalanche: {
                test: {
                    chainId: 43113,
                    chainName: 'Avalanche Fuji Testnet',
                    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
                    apiUrl: 'https://api-test.genobank.io'
                },
                production: {
                    chainId: 43114,
                    chainName: 'Avalanche C-Chain',
                    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
                    apiUrl: 'https://api.genobank.io'
                }
            }
        };
        
        return configs[this.network]?.[this.networkEnvironment] || configs.avalanche.test;
    }
    
    /**
     * Get default Magic API key
     */
    _getDefaultMagicKey() {
        return this.networkEnvironment === 'test' 
            ? 'pk_test_E426118B1FE96E5C'
            : 'pk_live_88A526594C6DB537';
    }
    
    /**
     * Get storage mechanism
     */
    _getStorage() {
        if (this.environment.hasLocalStorage) {
            return localStorage;
        } else if (this.environment.hasSessionStorage) {
            return sessionStorage;
        } else {
            // In-memory storage fallback
            const memoryStorage = {};
            return {
                getItem: (key) => memoryStorage[key] || null,
                setItem: (key, value) => memoryStorage[key] = value,
                removeItem: (key) => delete memoryStorage[key]
            };
        }
    }
    
    /**
     * Initialize authentication
     */
    async _initialize() {
        try {
            // Load dependencies if needed
            if (dependencyLoader && !this._areDependenciesLoaded()) {
                await dependencyLoader.loadAllDependencies();
            }
            
            // Initialize providers
            await this._initializeProviders();
            
            // Check for existing session
            this._checkExistingSession();
            
            // Run plugin initializations
            for (const plugin of this.plugins) {
                if (plugin.initialize) {
                    await plugin.initialize(this);
                }
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.onLoginError(error);
        }
    }
    
    /**
     * Check if dependencies are loaded
     */
    _areDependenciesLoaded() {
        return typeof ethers !== 'undefined' && 
               typeof Web3 !== 'undefined' && 
               typeof Magic !== 'undefined';
    }
    
    /**
     * Initialize providers
     */
    async _initializeProviders() {
        // Initialize Web3 provider if MetaMask is available
        if (this.environment.hasMetaMask) {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
        }
        
        // Initialize Magic (OAuth)
        if (typeof Magic !== 'undefined') {
            try {
                this.magic = new Magic(this.magicApiKey, {
                    network: {
                        rpcUrl: this.networkConfig.rpcUrl,
                        chainId: this.networkConfig.chainId
                    },
                    extensions: [new OAuthExtension()]
                });
            } catch (error) {
                console.warn('Magic initialization failed:', error);
            }
        }
    }
    
    /**
     * Check for existing session
     */
    _checkExistingSession() {
        const savedWallet = this.storage.getItem('genobank_wallet');
        const savedSignature = this.storage.getItem('genobank_signature');
        const savedMethod = this.storage.getItem('genobank_login_method');
        
        if (savedWallet && savedSignature) {
            this.currentAccount = savedWallet;
            this.loginMethod = savedMethod;
            
            if (savedMethod === 'metamask' && this.provider) {
                this.signer = this.provider.getSigner();
            }
        }
    }
    
    /**
     * Login with MetaMask
     */
    async loginWithMetamask() {
        if (!this.environment.hasMetaMask) {
            throw new WalletError(
                'MetaMask not detected. Please install MetaMask extension.',
                { code: 'WALLET_NOT_FOUND' }
            );
        }
        
        try {
            // Request account access
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (!accounts || accounts.length === 0) {
                throw new WalletError(
                    'No accounts found. Please unlock MetaMask.',
                    { code: 'WALLET_LOCKED' }
                );
            }
            
            this.currentAccount = accounts[0];
            this.signer = this.provider.getSigner();
            
            // Check network
            const network = await this.provider.getNetwork();
            if (network.chainId !== this.networkConfig.chainId) {
                // Try to switch network
                try {
                    if (NetworkManager) {
                        await NetworkManager.switchNetwork(
                            window.ethereum, 
                            this.network, 
                            this.networkEnvironment
                        );
                    } else {
                        throw new NetworkError(
                            `Please switch to ${this.networkConfig.chainName}`,
                            { 
                                code: 'WRONG_NETWORK',
                                expected: this.networkConfig.chainId,
                                actual: network.chainId
                            }
                        );
                    }
                } catch (error) {
                    if (error instanceof NetworkError) throw error;
                    throw new NetworkError(
                        'Failed to switch network',
                        { originalError: error.message }
                    );
                }
            }
            
            // Sign message
            const signature = await this.signPersonalMessage(this.messageToSign);
            
            // Check if user is permittee
            const isPermittee = await this._checkPermitteeStatus(this.currentAccount);
            
            // Store session
            this._storeSession(this.currentAccount, signature, 'metamask');
            
            // Success callback
            this.onLoginSuccess({
                wallet: this.currentAccount,
                signature: signature,
                isPermittee: isPermittee,
                method: 'metamask',
                network: this.network,
                chainId: this.networkConfig.chainId
            });
            
            return {
                success: true,
                wallet: this.currentAccount,
                signature: signature
            };
            
        } catch (error) {
            this._handleError(error);
            throw error;
        }
    }
    
    /**
     * Login with Google OAuth
     */
    async loginWithGoogle() {
        if (!this.magic) {
            throw new ConfigurationError(
                'Magic SDK not initialized. OAuth login unavailable.',
                { code: 'MISSING_DEPENDENCY' }
            );
        }
        
        try {
            // Authenticate with Google
            const result = await this.magic.oauth.loginWithRedirect({
                provider: 'google',
                redirectURI: window.location.origin + '/callback'
            });
            
            // Get user info
            const userInfo = await this.magic.user.getInfo();
            this.currentAccount = userInfo.publicAddress;
            
            // Create signature
            const signature = await this._createOAuthSignature(userInfo);
            
            // Check permittee status
            const isPermittee = await this._checkPermitteeStatus(this.currentAccount);
            
            // Store session
            this._storeSession(this.currentAccount, signature, 'magic');
            
            // Success callback
            this.onLoginSuccess({
                wallet: this.currentAccount,
                signature: signature,
                isPermittee: isPermittee,
                method: 'google',
                userInfo: userInfo,
                network: this.network,
                chainId: this.networkConfig.chainId
            });
            
            return {
                success: true,
                wallet: this.currentAccount,
                signature: signature,
                userInfo: userInfo
            };
            
        } catch (error) {
            this._handleError(error);
            throw error;
        }
    }
    
    /**
     * Logout
     */
    async logout() {
        try {
            // Clear storage
            this.storage.removeItem('genobank_wallet');
            this.storage.removeItem('genobank_signature');
            this.storage.removeItem('genobank_login_method');
            
            // Logout from Magic if applicable
            if (this.loginMethod === 'magic' && this.magic) {
                await this.magic.user.logout();
            }
            
            // Reset state
            this.currentAccount = null;
            this.signer = null;
            this.loginMethod = null;
            
            // Callback
            this.onLogout();
            
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    /**
     * Sign personal message
     */
    async signPersonalMessage(message) {
        if (!this.signer) {
            throw new WalletError(
                'No signer available. Please login first.',
                { code: 'NOT_AUTHENTICATED' }
            );
        }
        
        try {
            return await this.signer.signMessage(message);
        } catch (error) {
            if (error.code === 4001) {
                throw new WalletError(
                    'User rejected signature request',
                    { code: 'USER_REJECTED' }
                );
            }
            throw error;
        }
    }
    
    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.currentAccount !== null;
    }
    
    /**
     * Get user wallet address
     */
    getUserWallet() {
        return this.currentAccount;
    }
    
    /**
     * Get user signature
     */
    getUserSignature() {
        return this.storage.getItem('genobank_signature');
    }
    
    /**
     * Get login method
     */
    getLoginMethod() {
        return this.loginMethod;
    }
    
    /**
     * Check permittee status
     */
    async _checkPermitteeStatus(wallet) {
        try {
            const response = await fetch(`${this.apiUrl}/check-permittee/${wallet}`);
            const data = await response.json();
            return data.isPermittee || false;
        } catch (error) {
            console.warn('Failed to check permittee status:', error);
            return false;
        }
    }
    
    /**
     * Store session
     */
    _storeSession(wallet, signature, method) {
        this.storage.setItem('genobank_wallet', wallet);
        this.storage.setItem('genobank_signature', signature);
        this.storage.setItem('genobank_login_method', method);
        this.loginMethod = method;
    }
    
    /**
     * Create OAuth signature
     */
    async _createOAuthSignature(userInfo) {
        const timestamp = new Date().toISOString();
        const message = `GenoBank OAuth Authentication\nEmail: ${userInfo.email}\nTimestamp: ${timestamp}`;
        return btoa(message);
    }
    
    /**
     * Handle errors
     */
    _handleError(error) {
        console.error('Authentication error:', error);
        
        // Convert to appropriate error type if not already
        let authError = error;
        if (!(error instanceof GenobankAuthError)) {
            if (error.code === 4001) {
                authError = new WalletError('User rejected request', { originalError: error });
            } else if (error.message?.includes('network')) {
                authError = new NetworkError(error.message, { originalError: error });
            } else {
                authError = new AuthenticationError(error.message, { originalError: error });
            }
        }
        
        this.onLoginError(authError);
    }
    
    /**
     * Plugin system - add plugin
     */
    use(plugin) {
        if (typeof plugin.install !== 'function') {
            throw new Error('Plugin must have an install method');
        }
        
        this.plugins.push(plugin);
        plugin.install(this);
        
        return this; // For chaining
    }
    
    /**
     * Utility: Get shortened wallet address
     */
    shortWallet(wallet) {
        if (!wallet) return '';
        return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`;
    }
    
    /**
     * Static method to create from config file
     */
    static async fromConfig(configPath) {
        try {
            const response = await fetch(configPath);
            const config = await response.json();
            return new GenobankAuthEnhanced(config);
        } catch (error) {
            throw new ConfigurationError(
                `Failed to load config from ${configPath}`,
                { path: configPath, error: error.message }
            );
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenobankAuthEnhanced;
} else if (typeof window !== 'undefined') {
    window.GenobankAuthEnhanced = GenobankAuthEnhanced;
    window.GenobankAuth = GenobankAuthEnhanced; // Backward compatibility
}