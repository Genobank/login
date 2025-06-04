/**
 * React Adapter for GenoBank Auth
 * Provides React hooks and components for easy integration
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import GenobankAuthEnhanced from '../genobank-auth-enhanced';

// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export function GenobankAuthProvider({ children, config = {} }) {
    const [auth] = useState(() => new GenobankAuthEnhanced(config));
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        // Check initial login state
        setIsLoggedIn(auth.isLoggedIn());
        if (auth.isLoggedIn()) {
            setUser({
                wallet: auth.getUserWallet(),
                method: auth.getLoginMethod()
            });
        }
        setLoading(false);
        
        // Set up auth callbacks
        const originalSuccess = auth.onLoginSuccess;
        auth.onLoginSuccess = (data) => {
            setIsLoggedIn(true);
            setUser({
                wallet: data.wallet,
                method: data.method,
                isPermittee: data.isPermittee
            });
            setError(null);
            originalSuccess(data);
        };
        
        const originalError = auth.onLoginError;
        auth.onLoginError = (error) => {
            setError(error);
            originalError(error);
        };
        
        const originalLogout = auth.onLogout;
        auth.onLogout = () => {
            setIsLoggedIn(false);
            setUser(null);
            originalLogout();
        };
        
        return () => {
            // Cleanup
            auth.onLoginSuccess = originalSuccess;
            auth.onLoginError = originalError;
            auth.onLogout = originalLogout;
        };
    }, [auth]);
    
    const value = {
        auth,
        isLoggedIn,
        user,
        loading,
        error,
        setError
    };
    
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// useAuth Hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within GenobankAuthProvider');
    }
    return context;
}

// useLogin Hook
export function useLogin() {
    const { auth, error, setError } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    
    const loginWithMetamask = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            await auth.loginWithMetamask();
        } catch (err) {
            // Error is handled by auth callbacks
        } finally {
            setIsLoading(false);
        }
    }, [auth, setError]);
    
    const loginWithGoogle = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            await auth.loginWithGoogle();
        } catch (err) {
            // Error is handled by auth callbacks
        } finally {
            setIsLoading(false);
        }
    }, [auth, setError]);
    
    return {
        loginWithMetamask,
        loginWithGoogle,
        isLoading,
        error
    };
}

// useLogout Hook
export function useLogout() {
    const { auth } = useAuth();
    
    const logout = useCallback(async () => {
        await auth.logout();
    }, [auth]);
    
    return logout;
}

// Login Button Component
export function LoginButton({ 
    provider = 'metamask', 
    children, 
    className = '', 
    ...props 
}) {
    const { loginWithMetamask, loginWithGoogle, isLoading, error } = useLogin();
    const { isLoggedIn } = useAuth();
    
    if (isLoggedIn) {
        return null;
    }
    
    const handleClick = () => {
        if (provider === 'metamask') {
            loginWithMetamask();
        } else if (provider === 'google') {
            loginWithGoogle();
        }
    };
    
    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className={`genobank-login-btn ${className}`}
            {...props}
        >
            {isLoading ? 'Connecting...' : children || `Login with ${provider}`}
        </button>
    );
}

// User Profile Component
export function UserProfile({ className = '', showLogout = true }) {
    const { user, isLoggedIn } = useAuth();
    const logout = useLogout();
    
    if (!isLoggedIn || !user) {
        return null;
    }
    
    const shortWallet = user.wallet 
        ? `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}`
        : '';
    
    return (
        <div className={`genobank-user-profile ${className}`}>
            <span className="wallet-address">{shortWallet}</span>
            {user.isPermittee && <span className="permittee-badge">Permittee</span>}
            {showLogout && (
                <button onClick={logout} className="logout-btn">
                    Logout
                </button>
            )}
        </div>
    );
}

// Protected Route Component
export function ProtectedRoute({ children, fallback = null }) {
    const { isLoggedIn, loading } = useAuth();
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    if (!isLoggedIn) {
        return fallback || <div>Please login to continue</div>;
    }
    
    return children;
}

// Auth Status Component
export function AuthStatus() {
    const { isLoggedIn, user, loading, error } = useAuth();
    
    if (loading) {
        return <div>Checking authentication...</div>;
    }
    
    if (error) {
        return <div className="auth-error">Error: {error.message}</div>;
    }
    
    if (isLoggedIn && user) {
        return (
            <div className="auth-status">
                Connected: {user.wallet} via {user.method}
            </div>
        );
    }
    
    return <div className="auth-status">Not connected</div>;
}

// Example usage component
export function ExampleApp() {
    return (
        <GenobankAuthProvider config={{ environment: 'test' }}>
            <div className="app">
                <header>
                    <h1>My DApp</h1>
                    <UserProfile />
                </header>
                
                <main>
                    <ProtectedRoute fallback={
                        <div>
                            <p>Please login to access this content</p>
                            <LoginButton provider="metamask">
                                Connect MetaMask
                            </LoginButton>
                            <LoginButton provider="google">
                                Sign in with Google
                            </LoginButton>
                        </div>
                    }>
                        <h2>Protected Content</h2>
                        <p>This is only visible when logged in</p>
                    </ProtectedRoute>
                </main>
                
                <AuthStatus />
            </div>
        </GenobankAuthProvider>
    );
}