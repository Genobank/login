// React Hook Example for GenoBank Auth
// This example shows how to integrate GenoBank Auth with React

import React, { useState, useEffect, useCallback } from 'react';
import GenobankAuth from '@genobank/auth';

// Custom hook for GenoBank authentication
export const useGenobankAuth = (config = {}) => {
  const [auth] = useState(() => new GenobankAuth(config));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update user state
  const updateUserState = useCallback(() => {
    if (auth.isLoggedIn()) {
      setUser({
        wallet: auth.getUserWallet(),
        signature: auth.getUserSignature(),
        loginMethod: auth.getLoginMethod(),
        isPermittee: auth.isCurrentUserPermittee()
      });
      setIsLoggedIn(true);
    } else {
      setUser(null);
      setIsLoggedIn(false);
    }
  }, [auth]);

  // Login with MetaMask
  const loginWithMetamask = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await auth.loginWithMetamask();
      updateUserState();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [auth, updateUserState]);

  // Login with Google
  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await auth.loginWithGoogle();
      // Note: Google login redirects, so state update happens after redirect
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [auth]);

  // Sign message
  const signMessage = useCallback(async (message) => {
    setIsLoading(true);
    setError(null);
    try {
      const signature = await auth.signPersonalMessage(message);
      return signature;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

  // Logout
  const logout = useCallback(() => {
    auth.logout();
    updateUserState();
  }, [auth, updateUserState]);

  // Initialize on mount
  useEffect(() => {
    updateUserState();
    
    // Handle OAuth callback
    if (window.location.search.includes('oauth_callback')) {
      auth.handleOAuthResult().then(() => {
        updateUserState();
      });
    }
  }, [auth, updateUserState]);

  return {
    auth,
    isLoggedIn,
    user,
    isLoading,
    error,
    loginWithMetamask,
    loginWithGoogle,
    signMessage,
    logout
  };
};

// React component example
export const GenobankLogin = ({ onLoginSuccess, onLoginError }) => {
  const {
    isLoggedIn,
    user,
    isLoading,
    error,
    loginWithMetamask,
    loginWithGoogle,
    logout
  } = useGenobankAuth({
    environment: 'test',
    onLoginSuccess,
    onLoginError,
    autoRedirect: false
  });

  if (isLoggedIn && user) {
    return (
      <div className="genobank-user-profile">
        <h3>Welcome!</h3>
        <div className="user-details">
          <p><strong>Wallet:</strong> {user.wallet}</p>
          <p><strong>Method:</strong> {user.loginMethod}</p>
          <p><strong>Permittee:</strong> {user.isPermittee ? 'Yes' : 'No'}</p>
        </div>
        <button onClick={logout} disabled={isLoading}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="genobank-login">
      <h3>Login to GenoBank.io</h3>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="login-buttons">
        <button 
          onClick={loginWithMetamask} 
          disabled={isLoading}
          className="metamask-btn"
        >
          {isLoading ? 'Connecting...' : 'Connect MetaMask'}
        </button>
        
        <button 
          onClick={loginWithGoogle} 
          disabled={isLoading}
          className="google-btn"
        >
          {isLoading ? 'Connecting...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
};

// Example App component
export const App = () => {
  const handleLoginSuccess = (data) => {
    console.log('Login successful:', data);
  };

  const handleLoginError = (error) => {
    console.error('Login failed:', error);
  };

  return (
    <div className="app">
      <h1>My App with GenoBank Auth</h1>
      <GenobankLogin 
        onLoginSuccess={handleLoginSuccess}
        onLoginError={handleLoginError}
      />
    </div>
  );
};

export default App;