/**
 * Network Configuration Module
 * Supports multiple blockchain networks and custom configurations
 */

const NETWORK_CONFIGS = {
    // Avalanche Networks
    avalanche: {
        test: {
            chainId: 43113,
            chainName: 'Avalanche Fuji Testnet',
            rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
            blockExplorer: 'https://testnet.snowtrace.io',
            nativeCurrency: {
                name: 'AVAX',
                symbol: 'AVAX',
                decimals: 18
            },
            apiUrl: 'https://api-test.genobank.io'
        },
        production: {
            chainId: 43114,
            chainName: 'Avalanche C-Chain',
            rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
            blockExplorer: 'https://snowtrace.io',
            nativeCurrency: {
                name: 'AVAX',
                symbol: 'AVAX',
                decimals: 18
            },
            apiUrl: 'https://api.genobank.io'
        }
    },
    
    // Ethereum Networks
    ethereum: {
        test: {
            chainId: 11155111, // Sepolia
            chainName: 'Ethereum Sepolia',
            rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
            blockExplorer: 'https://sepolia.etherscan.io',
            nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
            },
            apiUrl: 'https://api-test.genobank.io'
        },
        production: {
            chainId: 1,
            chainName: 'Ethereum Mainnet',
            rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
            blockExplorer: 'https://etherscan.io',
            nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
            },
            apiUrl: 'https://api.genobank.io'
        }
    },
    
    // Polygon Networks
    polygon: {
        test: {
            chainId: 80001, // Mumbai
            chainName: 'Polygon Mumbai',
            rpcUrl: 'https://rpc-mumbai.maticvigil.com',
            blockExplorer: 'https://mumbai.polygonscan.com',
            nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
            },
            apiUrl: 'https://api-test.genobank.io'
        },
        production: {
            chainId: 137,
            chainName: 'Polygon Mainnet',
            rpcUrl: 'https://polygon-rpc.com',
            blockExplorer: 'https://polygonscan.com',
            nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18
            },
            apiUrl: 'https://api.genobank.io'
        }
    },
    
    // Binance Smart Chain
    bsc: {
        test: {
            chainId: 97,
            chainName: 'BSC Testnet',
            rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
            blockExplorer: 'https://testnet.bscscan.com',
            nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18
            },
            apiUrl: 'https://api-test.genobank.io'
        },
        production: {
            chainId: 56,
            chainName: 'Binance Smart Chain',
            rpcUrl: 'https://bsc-dataseed.binance.org',
            blockExplorer: 'https://bscscan.com',
            nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18
            },
            apiUrl: 'https://api.genobank.io'
        }
    }
};

// Network utility functions
class NetworkManager {
    static getConfig(network, environment) {
        if (!NETWORK_CONFIGS[network]) {
            throw new Error(`Network '${network}' not supported`);
        }
        if (!NETWORK_CONFIGS[network][environment]) {
            throw new Error(`Environment '${environment}' not found for network '${network}'`);
        }
        return NETWORK_CONFIGS[network][environment];
    }
    
    static getSupportedNetworks() {
        return Object.keys(NETWORK_CONFIGS);
    }
    
    static isNetworkSupported(network) {
        return NETWORK_CONFIGS.hasOwnProperty(network);
    }
    
    static addCustomNetwork(name, config) {
        if (!config.test || !config.production) {
            throw new Error('Custom network must have both test and production configurations');
        }
        NETWORK_CONFIGS[name] = config;
    }
    
    static async switchNetwork(provider, network, environment) {
        const config = this.getConfig(network, environment);
        const chainIdHex = '0x' + config.chainId.toString(16);
        
        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainIdHex }]
            });
        } catch (error) {
            // This error code indicates that the chain has not been added to MetaMask
            if (error.code === 4902) {
                await provider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: chainIdHex,
                        chainName: config.chainName,
                        rpcUrls: [config.rpcUrl],
                        blockExplorerUrls: [config.blockExplorer],
                        nativeCurrency: config.nativeCurrency
                    }]
                });
            } else {
                throw error;
            }
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NETWORK_CONFIGS,
        NetworkManager
    };
} else if (typeof window !== 'undefined') {
    window.NETWORK_CONFIGS = NETWORK_CONFIGS;
    window.NetworkManager = NetworkManager;
}