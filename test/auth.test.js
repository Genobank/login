/**
 * Unit tests for GenoBank Auth Enhanced
 * Using Jest testing framework
 */

const GenobankAuthEnhanced = require('../genobank-auth-enhanced');
const { ConfigurationError, WalletError, NetworkError } = require('../genobank-auth-error');

// Mock browser environment
global.window = {
    ethereum: {
        request: jest.fn(),
        on: jest.fn()
    },
    location: {
        origin: 'http://localhost:3000'
    }
};

global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

// Mock dependencies
global.ethers = {
    providers: {
        Web3Provider: jest.fn().mockImplementation(() => ({
            getSigner: jest.fn().mockReturnValue({
                signMessage: jest.fn().mockResolvedValue('0xmocksignature')
            }),
            getNetwork: jest.fn().mockResolvedValue({ chainId: 43113 })
        }))
    }
};

global.Magic = jest.fn().mockImplementation(() => ({
    oauth: {
        loginWithRedirect: jest.fn().mockResolvedValue({})
    },
    user: {
        getInfo: jest.fn().mockResolvedValue({
            publicAddress: '0x1234567890abcdef',
            email: 'test@example.com'
        }),
        logout: jest.fn().mockResolvedValue()
    }
}));

global.OAuthExtension = jest.fn();

describe('GenobankAuthEnhanced', () => {
    let auth;
    
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.getItem.mockReturnValue(null);
    });
    
    describe('Constructor and Configuration', () => {
        test('should create instance with default config', () => {
            auth = new GenobankAuthEnhanced();
            expect(auth.network).toBe('avalanche');
            expect(auth.networkEnvironment).toBe('test');
        });
        
        test('should accept custom network config', () => {
            auth = new GenobankAuthEnhanced({
                network: 'ethereum',
                environment: 'production'
            });
            expect(auth.network).toBe('ethereum');
            expect(auth.networkEnvironment).toBe('production');
        });
        
        test('should throw error for invalid network', () => {
            expect(() => {
                new GenobankAuthEnhanced({
                    network: 'invalid-network'
                });
            }).toThrow(ConfigurationError);
        });
        
        test('should accept custom network configuration', () => {
            const customNetwork = {
                chainId: 1337,
                chainName: 'Custom Network',
                rpcUrl: 'http://localhost:8545',
                apiUrl: 'http://localhost:3001'
            };
            
            auth = new GenobankAuthEnhanced({
                network: 'custom',
                customNetwork
            });
            
            expect(auth.networkConfig.chainId).toBe(1337);
        });
    });
    
    describe('Environment Detection', () => {
        test('should detect browser environment correctly', () => {
            auth = new GenobankAuthEnhanced();
            expect(auth.environment.isBrowser).toBe(true);
            expect(auth.environment.hasMetaMask).toBe(true);
            expect(auth.environment.hasLocalStorage).toBe(true);
        });
    });
    
    describe('MetaMask Login', () => {
        beforeEach(() => {
            auth = new GenobankAuthEnhanced({
                onLoginSuccess: jest.fn(),
                onLoginError: jest.fn()
            });
        });
        
        test('should login with MetaMask successfully', async () => {
            window.ethereum.request.mockResolvedValueOnce(['0xuser123']);
            
            const result = await auth.loginWithMetamask();
            
            expect(result.success).toBe(true);
            expect(result.wallet).toBe('0xuser123');
            expect(result.signature).toBe('0xmocksignature');
            expect(auth.onLoginSuccess).toHaveBeenCalled();
        });
        
        test('should handle MetaMask not installed', async () => {
            delete window.ethereum;
            
            await expect(auth.loginWithMetamask()).rejects.toThrow(WalletError);
            expect(auth.onLoginError).toHaveBeenCalled();
            
            // Restore mock
            window.ethereum = {
                request: jest.fn(),
                on: jest.fn()
            };
        });
        
        test('should handle user rejection', async () => {
            window.ethereum.request.mockRejectedValueOnce({ code: 4001 });
            
            await expect(auth.loginWithMetamask()).rejects.toThrow(WalletError);
        });
        
        test('should handle wrong network', async () => {
            window.ethereum.request.mockResolvedValueOnce(['0xuser123']);
            auth.provider.getNetwork.mockResolvedValueOnce({ chainId: 1 }); // Wrong network
            
            await expect(auth.loginWithMetamask()).rejects.toThrow(NetworkError);
        });
    });
    
    describe('Google OAuth Login', () => {
        beforeEach(() => {
            auth = new GenobankAuthEnhanced({
                onLoginSuccess: jest.fn(),
                onLoginError: jest.fn()
            });
        });
        
        test('should login with Google successfully', async () => {
            const result = await auth.loginWithGoogle();
            
            expect(result.success).toBe(true);
            expect(result.wallet).toBe('0x1234567890abcdef');
            expect(result.userInfo.email).toBe('test@example.com');
            expect(auth.onLoginSuccess).toHaveBeenCalled();
        });
    });
    
    describe('Session Management', () => {
        test('should store session on successful login', async () => {
            auth = new GenobankAuthEnhanced();
            window.ethereum.request.mockResolvedValueOnce(['0xuser123']);
            
            await auth.loginWithMetamask();
            
            expect(localStorage.setItem).toHaveBeenCalledWith('genobank_wallet', '0xuser123');
            expect(localStorage.setItem).toHaveBeenCalledWith('genobank_signature', '0xmocksignature');
            expect(localStorage.setItem).toHaveBeenCalledWith('genobank_login_method', 'metamask');
        });
        
        test('should restore session from storage', () => {
            localStorage.getItem.mockImplementation((key) => {
                const values = {
                    'genobank_wallet': '0xuser123',
                    'genobank_signature': '0xsignature',
                    'genobank_login_method': 'metamask'
                };
                return values[key];
            });
            
            auth = new GenobankAuthEnhanced();
            
            expect(auth.isLoggedIn()).toBe(true);
            expect(auth.getUserWallet()).toBe('0xuser123');
            expect(auth.getLoginMethod()).toBe('metamask');
        });
        
        test('should clear session on logout', async () => {
            auth = new GenobankAuthEnhanced({
                onLogout: jest.fn()
            });
            auth.currentAccount = '0xuser123';
            auth.loginMethod = 'metamask';
            
            await auth.logout();
            
            expect(localStorage.removeItem).toHaveBeenCalledWith('genobank_wallet');
            expect(localStorage.removeItem).toHaveBeenCalledWith('genobank_signature');
            expect(localStorage.removeItem).toHaveBeenCalledWith('genobank_login_method');
            expect(auth.isLoggedIn()).toBe(false);
            expect(auth.onLogout).toHaveBeenCalled();
        });
    });
    
    describe('Utility Methods', () => {
        test('should shorten wallet address correctly', () => {
            auth = new GenobankAuthEnhanced();
            expect(auth.shortWallet('0x1234567890abcdef')).toBe('0x1234...cdef');
            expect(auth.shortWallet('')).toBe('');
            expect(auth.shortWallet(null)).toBe('');
        });
    });
    
    describe('Plugin System', () => {
        test('should add and install plugins', () => {
            auth = new GenobankAuthEnhanced();
            
            const mockPlugin = {
                install: jest.fn()
            };
            
            const result = auth.use(mockPlugin);
            
            expect(mockPlugin.install).toHaveBeenCalledWith(auth);
            expect(result).toBe(auth); // Check chaining
        });
        
        test('should throw error for invalid plugin', () => {
            auth = new GenobankAuthEnhanced();
            
            expect(() => {
                auth.use({}); // No install method
            }).toThrow('Plugin must have an install method');
        });
    });
    
    describe('Static Methods', () => {
        test('should create instance from config file', async () => {
            global.fetch = jest.fn().mockResolvedValue({
                json: jest.fn().mockResolvedValue({
                    network: 'polygon',
                    environment: 'test'
                })
            });
            
            const instance = await GenobankAuthEnhanced.fromConfig('/config.json');
            
            expect(instance.network).toBe('polygon');
            expect(fetch).toHaveBeenCalledWith('/config.json');
        });
    });
});

// Integration tests
describe('GenobankAuthEnhanced Integration', () => {
    test('should handle complete login flow', async () => {
        const callbacks = {
            onLoginSuccess: jest.fn(),
            onLoginError: jest.fn(),
            onLogout: jest.fn()
        };
        
        const auth = new GenobankAuthEnhanced(callbacks);
        
        // Login
        window.ethereum.request.mockResolvedValueOnce(['0xuser123']);
        await auth.loginWithMetamask();
        
        expect(auth.isLoggedIn()).toBe(true);
        expect(callbacks.onLoginSuccess).toHaveBeenCalled();
        
        // Sign message
        const signature = await auth.signPersonalMessage('Test message');
        expect(signature).toBe('0xmocksignature');
        
        // Logout
        await auth.logout();
        expect(auth.isLoggedIn()).toBe(false);
        expect(callbacks.onLogout).toHaveBeenCalled();
    });
});