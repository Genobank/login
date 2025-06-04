# GenoBank.io Authentication & File Import Module - Enhanced v3.0

[![npm version](https://badge.fury.io/js/%40genobank%2Flogin-enhanced.svg)](https://badge.fury.io/js/%40genobank%2Flogin-enhanced)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/Genobank/login/workflows/CI/badge.svg)](https://github.com/Genobank/login/actions)

A comprehensive JavaScript module that provides Web3/OAuth authentication and universal genomic file import functionality for any web application using GenoBank.io's blockchain-based authentication system.

## 🚀 What's New in v3.0

- **🛡️ Enhanced Error Handling**: Custom error types with detailed debugging information
- **🌐 Multi-Network Support**: Story, Avalanche, and Ethereum networks
- **🔧 Dependency Management**: Automatic dependency loading and validation
- **🧩 Plugin System**: Extensible architecture with analytics and custom plugins
- **⚛️ Framework Adapters**: Native React and Vue 3 integration
- **🧪 Comprehensive Testing**: Full test suite with 90%+ coverage
- **📦 Modern Build System**: Rollup-based build with ES modules and UMD

## Features

### 🔐 Authentication
- **Dual Authentication**: Support for both MetaMask wallet and Google OAuth login
- **Universal Compatibility**: Works with vanilla JavaScript, React, Vue, Angular, and any web framework  
- **Easy Integration**: Simple API with pre-built UI components
- **Configurable**: Flexible configuration for different environments and networks
- **Mobile-Friendly**: Responsive authentication UI
- **Multi-Blockchain**: Support for Story, Avalanche, and Ethereum networks
- **Customizable**: Easy to style and customize UI components
- **Robust**: Advanced error handling and dependency management
- **Extensible**: Plugin system for custom functionality

### 📁 File Import (NEW)
- **Universal File Import**: Works with any GenoBank application
- **S3 Integration**: Direct access to GenoBank's S3 bucket via API  
- **Streaming Support**: Efficient handling of large genomic files
- **Progress Tracking**: Real-time progress updates with cancellation support
- **Retry Logic**: Automatic retry for transient network errors
- **Metadata Preservation**: Maintains file ownership, biosample info, and checksums
- **File Validation**: Automatic genomic file type detection
- **Performance Optimized**: Chunk-based streaming with memory efficiency

## Installation

### NPM/Yarn
```bash
npm install @genobank/login-enhanced
# or
yarn add @genobank/login-enhanced
```

### CDN
```html
<!-- Required dependencies -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/web3/3.0.0-rc.5/web3.min.js"></script>
<script src="https://auth.magic.link/sdk"></script>
<script src="https://cdn.jsdelivr.net/npm/@magic-ext/oauth/dist/extension.js"></script>

<!-- GenoBank Auth Enhanced -->
<script src="https://unpkg.com/@genobank/login-enhanced@latest/dist/genobank-auth.js"></script>
```

## Quick Start

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App with GenoBank Auth</title>
    <!-- Include dependencies (see installation section) -->
</head>
<body>
    <div id="auth-container"></div>
    
    <script>
        // Initialize authentication
        const auth = new GenobankAuth({
            environment: 'test', // or 'production'
            onLoginSuccess: (data) => {
                console.log('Login successful:', data);
                // Handle successful login
            },
            onLoginError: (error) => {
                console.error('Login failed:', error);
            }
        });

        // Initialize UI
        const authUI = new GenobankAuthUI(auth, {
            containerSelector: '#auth-container'
        });

        // Render the authentication interface
        authUI.render();
    </script>
</body>
</html>
```

### React Integration

```jsx
import { useState, useEffect } from 'react';
import GenobankAuth from '@genobank/auth';

function MyComponent() {
    const [auth] = useState(() => new GenobankAuth({
        environment: 'production',
        onLoginSuccess: (data) => console.log('Logged in:', data)
    }));
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        setIsLoggedIn(auth.isLoggedIn());
    }, [auth]);

    const handleMetamaskLogin = async () => {
        try {
            await auth.loginWithMetamask();
            setIsLoggedIn(true);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    if (isLoggedIn) {
        return (
            <div>
                <p>Welcome! Wallet: {auth.getUserWallet()}</p>
                <button onClick={() => { auth.logout(); setIsLoggedIn(false); }}>
                    Logout
                </button>
            </div>
        );
    }

    return (
        <button onClick={handleMetamaskLogin}>
            Connect MetaMask
        </button>
    );
}
```

## API Reference

### GenobankAuth

#### Constructor Options
```javascript
const auth = new GenobankAuth({
    environment: 'test',           // 'test' or 'production'
    magicApiKey: 'your-key',       // Optional: Custom Magic API key
    messageToSign: 'Custom message', // Optional: Custom signature message
    onLoginSuccess: (data) => {},   // Callback on successful login
    onLoginError: (error) => {},    // Callback on login error
    onLogout: () => {},            // Callback on logout
    autoRedirect: true,            // Auto-redirect after login
    redirectUrl: '/dashboard'       // Custom redirect URL
});
```

#### Methods

##### Authentication
- `loginWithMetamask()` - Initiate MetaMask wallet login
- `loginWithGoogle()` - Initiate Google OAuth login  
- `logout()` - Log out current user
- `isLoggedIn()` - Check if user is authenticated

##### User Information
- `getUserWallet()` - Get user's wallet address
- `getUserSignature()` - Get user's authentication signature
- `getLoginMethod()` - Get login method ('metamask' or 'magic')
- `isCurrentUserPermittee()` - Check if user has permittee status

##### Blockchain Interaction
- `signPersonalMessage(message)` - Sign a custom message
- `connectToContract(address, abi)` - Connect to smart contract

##### Utilities
- `shortWallet(wallet)` - Get shortened wallet address
- `shortText(text, start, end)` - Utility for shortening text

### GenobankAuthUI

#### Constructor Options
```javascript
const authUI = new GenobankAuthUI(auth, {
    containerSelector: '#auth-container', // Container element selector
    showLogo: true,                      // Show GenoBank logo
    customCSS: 'my-custom-styles',       // Additional CSS styles
    buttonText: {
        metamask: 'Connect Wallet',      // Custom MetaMask button text
        google: 'Sign in with Google'    // Custom Google button text
    }
});
```

#### Methods
- `render()` - Render authentication interface
- `renderModal()` - Render as modal popup
- `closeModal()` - Close modal
- `renderUserProfile(selector)` - Render user profile widget
- `showError(message)` - Display error message

## Examples

### Modal Authentication
```javascript
const auth = new GenobankAuth({ environment: 'production' });
const authUI = new GenobankAuthUI(auth);

// Open login modal
document.getElementById('login-btn').onclick = () => {
    authUI.renderModal();
};
```

### Custom Styling
```javascript
const authUI = new GenobankAuthUI(auth, {
    customCSS: `
        .genobank-auth-btn {
            background: linear-gradient(45deg, #667eea, #764ba2);
            border: none;
            color: white;
        }
        .genobank-auth-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
    `
});
```

### User Profile Widget
```javascript
// After successful login, show user profile
if (auth.isLoggedIn()) {
    authUI.renderUserProfile('#user-profile-container');
}
```

### Smart Contract Interaction
```javascript
// Connect to a smart contract after authentication
if (auth.isLoggedIn()) {
    const contract = await auth.connectToContract(
        '0x1234...', // Contract address
        contractABI  // Contract ABI
    );
    
    // Call contract methods
    const result = await contract.someMethod();
}
```

## Environment Configuration

### Test Environment
- API: `https://api-test.genobank.io`
- Network: Avalanche Testnet (Fuji)
- Chain ID: 43113

### Production Environment  
- API: `https://genobank.app`
- Network: Avalanche Mainnet
- Chain ID: 43114

## Events and Callbacks

```javascript
const auth = new GenobankAuth({
    onLoginSuccess: (data) => {
        // data contains: wallet, signature, isPermittee, userInfo (for OAuth)
        console.log('User logged in:', data);
    },
    onLoginError: (error) => {
        console.error('Login failed:', error.message);
    },
    onLogout: () => {
        console.log('User logged out');
    }
});
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Dependencies

### Required
- [Ethers.js](https://docs.ethers.io/) v5+ - Ethereum library
- [Web3.js](https://web3js.readthedocs.io/) v3+ - Web3 interactions
- [Magic SDK](https://magic.link/) - OAuth authentication
- [Magic OAuth Extension](https://magic.link/docs/auth/login-methods/social-logins) - OAuth functionality

### Peer Dependencies
These must be included in your project:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/web3/3.0.0-rc.5/web3.min.js"></script>
<script src="https://auth.magic.link/sdk"></script>
<script src="https://cdn.jsdelivr.net/npm/@magic-ext/oauth/dist/extension.js"></script>
```

## Security Considerations

- Store sensitive data (API keys, private keys) securely
- Use HTTPS in production environments
- Validate user permissions on the server side
- Implement proper session management
- Never expose private keys in client-side code

## Troubleshooting

### Common Issues

1. **MetaMask not detected**
   - Ensure MetaMask is installed and enabled
   - Check for conflicts with other wallet extensions

2. **OAuth redirect issues**
   - Verify redirect URI configuration
   - Ensure proper HTTPS setup in production

3. **Network connection errors**
   - Check if using correct environment (test/production)
   - Verify network connectivity to Avalanche RPC

### Debug Mode
```javascript
// Enable debug logging
window.DEBUG_GENOBANK_AUTH = true;

const auth = new GenobankAuth({
    environment: 'test'
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- Documentation: [https://docs.genobank.io](https://docs.genobank.io)
- Issues: [https://github.com/Genobank/login/issues](https://github.com/Genobank/login/issues)
- Email: support@genobank.io

---

**GenoBank.io** - Decentralized Genomic Data Platform
