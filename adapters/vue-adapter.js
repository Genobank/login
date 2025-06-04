/**
 * Vue 3 Adapter for GenoBank Auth
 * Provides Vue 3 composition API utilities and components
 */

import { ref, reactive, computed, onMounted, provide, inject } from 'vue';
import GenobankAuthEnhanced from '../genobank-auth-enhanced';

// Auth injection key
const AUTH_KEY = Symbol('genobank-auth');

// Create auth instance and provide it
export function provideAuth(config = {}) {
    const auth = new GenobankAuthEnhanced(config);
    const state = reactive({
        isLoggedIn: false,
        user: null,
        loading: true,
        error: null
    });
    
    // Check initial state
    onMounted(() => {
        state.isLoggedIn = auth.isLoggedIn();
        if (auth.isLoggedIn()) {
            state.user = {
                wallet: auth.getUserWallet(),
                method: auth.getLoginMethod()
            };
        }
        state.loading = false;
    });
    
    // Set up callbacks
    auth.onLoginSuccess = (data) => {
        state.isLoggedIn = true;
        state.user = {
            wallet: data.wallet,
            method: data.method,
            isPermittee: data.isPermittee
        };
        state.error = null;
    };
    
    auth.onLoginError = (error) => {
        state.error = error;
    };
    
    auth.onLogout = () => {
        state.isLoggedIn = false;
        state.user = null;
    };
    
    const authContext = {
        auth,
        state,
        // Methods
        async loginWithMetamask() {
            state.loading = true;
            state.error = null;
            try {
                await auth.loginWithMetamask();
            } catch (err) {
                // Handled by callback
            } finally {
                state.loading = false;
            }
        },
        async loginWithGoogle() {
            state.loading = true;
            state.error = null;
            try {
                await auth.loginWithGoogle();
            } catch (err) {
                // Handled by callback
            } finally {
                state.loading = false;
            }
        },
        async logout() {
            await auth.logout();
        }
    };
    
    provide(AUTH_KEY, authContext);
    
    return authContext;
}

// Use auth composable
export function useAuth() {
    const context = inject(AUTH_KEY);
    if (!context) {
        throw new Error('useAuth must be used after provideAuth');
    }
    
    return {
        // State
        isLoggedIn: computed(() => context.state.isLoggedIn),
        user: computed(() => context.state.user),
        loading: computed(() => context.state.loading),
        error: computed(() => context.state.error),
        
        // Methods
        loginWithMetamask: context.loginWithMetamask,
        loginWithGoogle: context.loginWithGoogle,
        logout: context.logout,
        
        // Raw auth instance
        auth: context.auth
    };
}

// Login composable
export function useLogin() {
    const { loginWithMetamask, loginWithGoogle, error } = useAuth();
    const isLoading = ref(false);
    
    const login = async (provider) => {
        isLoading.value = true;
        try {
            if (provider === 'metamask') {
                await loginWithMetamask();
            } else if (provider === 'google') {
                await loginWithGoogle();
            }
        } finally {
            isLoading.value = false;
        }
    };
    
    return {
        login,
        isLoading,
        error
    };
}

// Vue Components

// Auth Provider Component
export const AuthProvider = {
    name: 'AuthProvider',
    props: {
        config: {
            type: Object,
            default: () => ({})
        }
    },
    setup(props, { slots }) {
        provideAuth(props.config);
        return () => slots.default?.();
    }
};

// Login Button Component
export const LoginButton = {
    name: 'LoginButton',
    props: {
        provider: {
            type: String,
            default: 'metamask',
            validator: (value) => ['metamask', 'google'].includes(value)
        },
        class: String
    },
    setup(props, { slots }) {
        const { login, isLoading } = useLogin();
        const { isLoggedIn } = useAuth();
        
        const handleClick = () => login(props.provider);
        
        return () => {
            if (isLoggedIn.value) return null;
            
            return h('button', {
                onClick: handleClick,
                disabled: isLoading.value,
                class: ['genobank-login-btn', props.class]
            }, isLoading.value 
                ? 'Connecting...' 
                : slots.default?.() || `Login with ${props.provider}`
            );
        };
    }
};

// User Profile Component
export const UserProfile = {
    name: 'UserProfile',
    props: {
        showLogout: {
            type: Boolean,
            default: true
        },
        class: String
    },
    setup(props) {
        const { user, isLoggedIn, logout } = useAuth();
        
        const shortWallet = computed(() => {
            if (!user.value?.wallet) return '';
            return `${user.value.wallet.slice(0, 6)}...${user.value.wallet.slice(-4)}`;
        });
        
        return () => {
            if (!isLoggedIn.value || !user.value) return null;
            
            return h('div', { class: ['genobank-user-profile', props.class] }, [
                h('span', { class: 'wallet-address' }, shortWallet.value),
                user.value.isPermittee && h('span', { class: 'permittee-badge' }, 'Permittee'),
                props.showLogout && h('button', {
                    onClick: logout,
                    class: 'logout-btn'
                }, 'Logout')
            ]);
        };
    }
};

// Protected Component
export const Protected = {
    name: 'Protected',
    props: {
        fallback: {
            type: [String, Object],
            default: 'Please login to continue'
        }
    },
    setup(props, { slots }) {
        const { isLoggedIn, loading } = useAuth();
        
        return () => {
            if (loading.value) {
                return h('div', 'Loading...');
            }
            
            if (!isLoggedIn.value) {
                return typeof props.fallback === 'string' 
                    ? h('div', props.fallback)
                    : props.fallback;
            }
            
            return slots.default?.();
        };
    }
};

// Auth Status Component
export const AuthStatus = {
    name: 'AuthStatus',
    setup() {
        const { isLoggedIn, user, loading, error } = useAuth();
        
        return () => {
            if (loading.value) {
                return h('div', 'Checking authentication...');
            }
            
            if (error.value) {
                return h('div', { class: 'auth-error' }, `Error: ${error.value.message}`);
            }
            
            if (isLoggedIn.value && user.value) {
                return h('div', { class: 'auth-status' }, 
                    `Connected: ${user.value.wallet} via ${user.value.method}`
                );
            }
            
            return h('div', { class: 'auth-status' }, 'Not connected');
        };
    }
};

// Plugin for easy installation
export default {
    install(app, options = {}) {
        // Register components globally
        app.component('AuthProvider', AuthProvider);
        app.component('LoginButton', LoginButton);
        app.component('UserProfile', UserProfile);
        app.component('Protected', Protected);
        app.component('AuthStatus', AuthStatus);
        
        // Provide global auth if config is provided
        if (options.config) {
            app.provide(AUTH_KEY, provideAuth(options.config));
        }
    }
};