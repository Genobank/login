/**
 * GenoBank.io Authentication Module
 * Standalone authentication module for Web3 and OAuth login
 */

class GenobankAuth {
    constructor(config = {}) {
        this.config = {
            environment: config.environment || 'test', // 'test' or 'production'
            magicApiKey: config.magicApiKey || 'pk_live_5F9630468805C3A0',
            messageToSign: config.messageToSign || 'I want to proceed',
            onLoginSuccess: config.onLoginSuccess || null,
            onLoginError: config.onLoginError || null,
            autoRedirect: config.autoRedirect !== false,
            redirectUrl: config.redirectUrl || null,
            ...config
        };
        
        this.initializeEnvironment();
        this.setupEventHandlers();
    }

    initializeEnvironment() {
        const isTest = this.config.environment === 'test';
        
        // Set global environment variables
        window.ENV = isTest ? 'test' : 'main';
        window.API_BASE = isTest ? 'https://api-test.genobank.io' : 'https://api.genobank.io';
        window.NEW_API_BASE = isTest ? 'https://staging.genobank.app' : 'https://genobank.app';
        window.GENOBANK_ADDRESS = isTest ? '0x795faFFc58648e435E3bD3196C4F75F8EFc4b306' : '0x633F5500A87C3DbB9c15f4D41eD5A33DacaF4184';
        window.MESSAGE_TO_SIGN = this.config.messageToSign;
        window.MAGIC_API_KEY = this.config.magicApiKey;
        window.RPC_NETWORK = isTest ? "https://api.avax-test.network/ext/bc/C/rpc" : "https://api.avax.network/ext/bc/C/rpc";
        window.CHAIN_ID = isTest ? 43113 : 43114;
        window.NETWORK_NAME = "Avalanche";
    }

    setupEventHandlers() {
        // Auto-handle OAuth callback if detected
        if (window.location.search.includes('oauth_callback') || window.location.hash.includes('oauth_callback')) {
            this.handleOAuthResult();
        }
    }

    // Metamask login method
    async loginWithMetamask() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error("MetaMask is not detected. Please install MetaMask and try again.");
        }

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            const signature = await provider.getSigner().signMessage(window.MESSAGE_TO_SIGN);
            const wallet = await provider.getSigner().getAddress();
            const isPermittee = await this.validatePermittee(wallet);

            // Store authentication data
            this.storeAuthData({
                signature,
                wallet,
                isPermittee,
                loginMethod: 'metamask',
                realSignature: signature
            });

            if (this.config.onLoginSuccess) {
                this.config.onLoginSuccess({ wallet, signature, isPermittee });
            }

            if (this.config.autoRedirect) {
                this.handleRedirect();
            }

            return { wallet, signature, isPermittee };
        } catch (error) {
            if (this.config.onLoginError) {
                this.config.onLoginError(error);
            }
            throw error;
        }
    }

    // Google OAuth login method
    async loginWithGoogle() {
        const magic = this.createMagicInstance();
        const redirectURI = this.getOAuthRedirectURI();

        await magic.oauth.loginWithRedirect({
            provider: 'google',
            redirectURI
        });
    }

    // Handle OAuth callback result
    async handleOAuthResult() {
        try {
            const magic = this.createMagicInstance();
            const result = await magic.oauth.getRedirectResult();
            
            const wallet = result?.magic?.userMetadata?.publicAddress;
            const isPermittee = await this.validatePermittee(wallet);
            const realSignature = await this.signWithMagic(window.MESSAGE_TO_SIGN);

            // Store authentication data
            this.storeAuthData({
                wallet,
                isPermittee,
                email: result?.oauth?.userInfo?.email,
                name: result?.oauth?.userInfo?.name,
                picture: result?.oauth?.userInfo?.picture,
                loginMethod: 'magic',
                realSignature,
                magicToken: realSignature
            });

            if (this.config.onLoginSuccess) {
                this.config.onLoginSuccess({ 
                    wallet, 
                    signature: realSignature, 
                    isPermittee,
                    userInfo: result?.oauth?.userInfo
                });
            }

            if (this.config.autoRedirect) {
                this.handleRedirect();
            }

            return result;
        } catch (error) {
            if (this.config.onLoginError) {
                this.config.onLoginError(error);
            }
            throw error;
        }
    }

    // Create Magic instance
    createMagicInstance() {
        return new Magic(window.MAGIC_API_KEY, {
            extensions: [new MagicOAuthExtension()],
            network: {
                rpcUrl: window.RPC_NETWORK,
                chainId: window.CHAIN_ID
            }
        });
    }

    // Get OAuth redirect URI
    getOAuthRedirectURI() {
        const location = window.location;
        let domain = location.hostname;
        if (location.port && location.port !== "80" && location.port !== "443") {
            domain += ':' + location.port;
        }
        return `${location.protocol}//${domain}${location.pathname}?oauth_callback=true`;
    }

    // Sign message with Magic
    async signWithMagic(message) {
        const magic = this.createMagicInstance();
        const web3 = new Web3(magic.rpcProvider);
        const account = this.getUserWallet();

        const isLoggedIn = await magic.user.isLoggedIn();
        if (!isLoggedIn) {
            throw new Error("User is not logged in with Magic.");
        }

        return await web3.eth.personal.sign(message, account, "");
    }

    // Store authentication data in localStorage
    storeAuthData(data) {
        if (data.signature) localStorage.setItem('user_sign', data.signature);
        if (data.wallet) localStorage.setItem('user_wallet', data.wallet);
        if (data.isPermittee !== undefined) localStorage.setItem('isPermittee', data.isPermittee.toString());
        if (data.loginMethod) localStorage.setItem('login_method', data.loginMethod);
        if (data.realSignature) localStorage.setItem('user_real_signature', data.realSignature);
        if (data.magicToken) localStorage.setItem('magic_token', data.magicToken);
        if (data.email) localStorage.setItem('email', data.email);
        if (data.name) localStorage.setItem('name', data.name);
        if (data.picture) localStorage.setItem('picture', data.picture);
    }

    // Validate if user is a permittee
    async validatePermittee(address) {
        const url = new URL(`${window.NEW_API_BASE}/validate_permittee`);
        url.searchParams.append('permittee', address);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            });
            return await response.json();
        } catch (error) {
            return false;
        }
    }

    // Handle redirect after login
    handleRedirect() {
        const lastVisited = localStorage.getItem('last_visited');
        const redirectUrl = this.config.redirectUrl;
        
        if (lastVisited) {
            localStorage.removeItem('last_visited');
            window.location.href = lastVisited;
        } else if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    }

    // Utility methods
    isLoggedIn() {
        const userSignature = localStorage.getItem('user_sign');
        const magicToken = localStorage.getItem('magic_token');
        return !!(userSignature || magicToken);
    }

    getLoginMethod() {
        return localStorage.getItem('login_method') || null;
    }

    getUserWallet() {
        return localStorage.getItem('user_wallet');
    }

    getUserToken() {
        return localStorage.getItem('user_sign') || localStorage.getItem('magic_token');
    }

    getUserSignature() {
        return localStorage.getItem('user_real_signature');
    }

    isCurrentUserPermittee() {
        return localStorage.getItem('isPermittee') === "true";
    }

    // Sign personal message
    async signPersonalMessage(message) {
        const loginMethod = this.getLoginMethod();
        
        if (loginMethod === 'metamask') {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            return await provider.getSigner().signMessage(message);
        } else if (loginMethod === 'magic') {
            return await this.signWithMagic(message);
        } else {
            throw new Error('Not logged in or login method is unknown');
        }
    }

    // Connect to contract
    async connectToContract(contractAddress, abi) {
        const loginMethod = this.getLoginMethod();
        
        if (loginMethod === 'metamask') {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            return new ethers.Contract(contractAddress, abi, signer);
        } else if (loginMethod === 'magic') {
            const magic = this.createMagicInstance();
            const provider = new ethers.providers.Web3Provider(magic.rpcProvider);
            await provider.send('eth_requestAccounts', []);
            const signer = await provider.getSigner();
            return new ethers.Contract(contractAddress, abi, signer);
        } else {
            throw new Error('Not logged in or login method is unknown');
        }
    }

    // Logout
    logout() {
        this.removeUserTokens();
        if (this.config.onLogout) {
            this.config.onLogout();
        }
    }

    removeUserTokens() {
        const keys = [
            'magic_token', 'user_sign', 'user_real_signature', 'user_wallet',
            'login_method', 'isPermittee', 'email', 'name', 'picture'
        ];
        keys.forEach(key => localStorage.removeItem(key));
    }

    // Utility functions
    shortWallet(wallet) {
        return this.shortText(wallet, 7, 5);
    }

    shortText(text, firsts, lasts) {
        if (!text) return '';
        return text.length > firsts + lasts ?
            text.substring(0, firsts) + "..." + text.substring(text.length - lasts, text.length) :
            text;
    }
}

// Export for use in different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenobankAuth;
} else if (typeof window !== 'undefined') {
    window.GenobankAuth = GenobankAuth;
}