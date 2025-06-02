/**
 * GenoBank.io Authentication UI Components
 * Pre-built UI components for authentication
 */

class GenobankAuthUI {
    constructor(auth, options = {}) {
        this.auth = auth;
        this.options = {
            containerSelector: options.containerSelector || '#genobank-auth-container',
            showLogo: options.showLogo !== false,
            customCSS: options.customCSS || '',
            buttonText: {
                metamask: options.buttonText?.metamask || 'Login with MetaMask',
                google: options.buttonText?.google || 'Login with Google'
            },
            ...options
        };
    }

    // Render the authentication UI
    render() {
        const container = document.querySelector(this.options.containerSelector);
        if (!container) {
            throw new Error(`Container not found: ${this.options.containerSelector}`);
        }

        container.innerHTML = this.getHTML();
        this.attachEventListeners();
        this.applyStyles();
    }

    // Generate HTML for auth UI
    getHTML() {
        return `
            <div class="genobank-auth-wrapper">
                ${this.options.showLogo ? this.getLogoHTML() : ''}
                <div class="genobank-auth-card">
                    <div class="genobank-auth-header">
                        <h2>Login to GenoBank.io</h2>
                    </div>
                    <div class="genobank-auth-buttons">
                        <button id="genobank-metamask-btn" class="genobank-auth-btn genobank-metamask-btn">
                            <img src="https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg" 
                                 alt="MetaMask" class="genobank-btn-icon">
                            ${this.options.buttonText.metamask}
                            <div class="genobank-spinner" id="metamask-spinner" style="display: none;"></div>
                        </button>
                        <button id="genobank-google-btn" class="genobank-auth-btn genobank-google-btn">
                            <img src="https://developers.google.com/identity/images/g-logo.png" 
                                 alt="Google" class="genobank-btn-icon">
                            ${this.options.buttonText.google}
                            <div class="genobank-spinner" id="google-spinner" style="display: none;"></div>
                        </button>
                    </div>
                    <div class="genobank-error-message" id="genobank-error" style="display: none;"></div>
                </div>
            </div>
        `;
    }

    // Generate logo HTML
    getLogoHTML() {
        return `
            <div class="genobank-logo">
                <img src="https://genobank.io/logo.png" alt="GenoBank.io" class="genobank-logo-img">
            </div>
        `;
    }

    // Attach event listeners
    attachEventListeners() {
        const metamaskBtn = document.getElementById('genobank-metamask-btn');
        const googleBtn = document.getElementById('genobank-google-btn');

        metamaskBtn.addEventListener('click', () => this.handleMetamaskLogin());
        googleBtn.addEventListener('click', () => this.handleGoogleLogin());
    }

    // Handle MetaMask login
    async handleMetamaskLogin() {
        const spinner = document.getElementById('metamask-spinner');
        const btn = document.getElementById('genobank-metamask-btn');
        
        try {
            this.showSpinner(spinner);
            btn.disabled = true;
            await this.auth.loginWithMetamask();
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideSpinner(spinner);
            btn.disabled = false;
        }
    }

    // Handle Google login
    async handleGoogleLogin() {
        const spinner = document.getElementById('google-spinner');
        const btn = document.getElementById('genobank-google-btn');
        
        try {
            this.showSpinner(spinner);
            btn.disabled = true;
            await this.auth.loginWithGoogle();
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideSpinner(spinner);
            btn.disabled = false;
        }
    }

    // Show loading spinner
    showSpinner(spinner) {
        spinner.style.display = 'inline-block';
    }

    // Hide loading spinner
    hideSpinner(spinner) {
        spinner.style.display = 'none';
    }

    // Show error message
    showError(message) {
        const errorElement = document.getElementById('genobank-error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }

    // Apply default styles
    applyStyles() {
        if (document.getElementById('genobank-auth-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'genobank-auth-styles';
        styles.textContent = `
            .genobank-auth-wrapper {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .genobank-logo {
                margin-bottom: 30px;
            }

            .genobank-logo-img {
                max-height: 60px;
                max-width: 200px;
            }

            .genobank-auth-card {
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                padding: 40px;
                min-width: 350px;
                max-width: 400px;
            }

            .genobank-auth-header h2 {
                text-align: center;
                margin-bottom: 30px;
                color: #333;
                font-size: 24px;
                font-weight: 600;
            }

            .genobank-auth-buttons {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .genobank-auth-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 12px 20px;
                border: 2px solid #e1e5e9;
                border-radius: 8px;
                background: white;
                color: #333;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }

            .genobank-auth-btn:hover {
                border-color: #0084ff;
                box-shadow: 0 2px 8px rgba(0, 132, 255, 0.2);
            }

            .genobank-auth-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .genobank-metamask-btn:hover {
                border-color: #f6851b;
                box-shadow: 0 2px 8px rgba(246, 133, 27, 0.2);
            }

            .genobank-google-btn:hover {
                border-color: #4285f4;
                box-shadow: 0 2px 8px rgba(66, 133, 244, 0.2);
            }

            .genobank-btn-icon {
                width: 20px;
                height: 20px;
            }

            .genobank-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #0084ff;
                border-radius: 50%;
                animation: genobank-spin 1s linear infinite;
            }

            .genobank-error-message {
                margin-top: 15px;
                padding: 10px;
                background: #fee;
                border: 1px solid #fcc;
                border-radius: 6px;
                color: #c33;
                font-size: 14px;
                text-align: center;
            }

            @keyframes genobank-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            ${this.options.customCSS}
        `;
        document.head.appendChild(styles);
    }

    // Create a modal version
    renderModal() {
        const modalHTML = `
            <div class="genobank-modal-overlay" id="genobank-modal">
                <div class="genobank-modal-content">
                    <button class="genobank-modal-close" id="genobank-modal-close">&times;</button>
                    <div id="genobank-modal-auth-container"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add modal styles
        const modalStyles = document.createElement('style');
        modalStyles.textContent = `
            .genobank-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }

            .genobank-modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                padding: 20px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: auto;
            }

            .genobank-modal-close {
                position: absolute;
                top: 10px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            }

            .genobank-modal-close:hover {
                color: #333;
            }
        `;
        document.head.appendChild(modalStyles);

        // Update container selector for modal
        this.options.containerSelector = '#genobank-modal-auth-container';
        this.render();

        // Add close event listener
        document.getElementById('genobank-modal-close').addEventListener('click', this.closeModal);
        document.getElementById('genobank-modal').addEventListener('click', (e) => {
            if (e.target.id === 'genobank-modal') {
                this.closeModal();
            }
        });
    }

    closeModal() {
        const modal = document.getElementById('genobank-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Create user profile widget
    renderUserProfile(containerSelector) {
        if (!this.auth.isLoggedIn()) return;

        const container = document.querySelector(containerSelector);
        if (!container) return;

        const wallet = this.auth.getUserWallet();
        const shortWallet = this.auth.shortWallet(wallet);
        const loginMethod = this.auth.getLoginMethod();
        const isPermittee = this.auth.isCurrentUserPermittee();

        container.innerHTML = `
            <div class="genobank-user-profile">
                <div class="genobank-user-info">
                    <div class="genobank-user-wallet">${shortWallet}</div>
                    <div class="genobank-user-method">${loginMethod === 'metamask' ? 'MetaMask' : 'Google'}</div>
                    ${isPermittee ? '<div class="genobank-user-badge">Permittee</div>' : ''}
                </div>
                <button class="genobank-logout-btn" onclick="genobankAuth.logout()">Logout</button>
            </div>
        `;

        // Add profile styles
        if (!document.getElementById('genobank-profile-styles')) {
            const profileStyles = document.createElement('style');
            profileStyles.id = 'genobank-profile-styles';
            profileStyles.textContent = `
                .genobank-user-profile {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 10px 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .genobank-user-info {
                    flex: 1;
                }

                .genobank-user-wallet {
                    font-weight: 600;
                    color: #333;
                }

                .genobank-user-method {
                    font-size: 12px;
                    color: #666;
                }

                .genobank-user-badge {
                    display: inline-block;
                    padding: 2px 6px;
                    background: #e3f2fd;
                    color: #1976d2;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 600;
                    margin-top: 4px;
                }

                .genobank-logout-btn {
                    padding: 6px 12px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .genobank-logout-btn:hover {
                    background: #c82333;
                }
            `;
            document.head.appendChild(profileStyles);
        }
    }
}

// Export for use in different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenobankAuthUI;
} else if (typeof window !== 'undefined') {
    window.GenobankAuthUI = GenobankAuthUI;
}