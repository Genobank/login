// TypeScript definitions for @genobank/auth

export interface GenobankAuthConfig {
  environment?: 'test' | 'production';
  magicApiKey?: string;
  messageToSign?: string;
  onLoginSuccess?: (data: LoginSuccessData) => void;
  onLoginError?: (error: Error) => void;
  onLogout?: () => void;
  autoRedirect?: boolean;
  redirectUrl?: string;
}

export interface LoginSuccessData {
  wallet: string;
  signature: string;
  isPermittee: boolean;
  userInfo?: {
    email?: string;
    name?: string;
    picture?: string;
  };
}

export interface GenobankAuthUIOptions {
  containerSelector?: string;
  showLogo?: boolean;
  customCSS?: string;
  buttonText?: {
    metamask?: string;
    google?: string;
  };
}

export declare class GenobankAuth {
  constructor(config?: GenobankAuthConfig);
  
  loginWithMetamask(): Promise<LoginSuccessData>;
  loginWithGoogle(): Promise<void>;
  handleOAuthResult(): Promise<any>;
  
  signPersonalMessage(message: string): Promise<string>;
  connectToContract(contractAddress: string, abi: any[]): Promise<any>;
  
  isLoggedIn(): boolean;
  getLoginMethod(): string | null;
  getUserWallet(): string | null;
  getUserToken(): string | null;
  getUserSignature(): string | null;
  isCurrentUserPermittee(): boolean;
  
  logout(): void;
  removeUserTokens(): void;
  
  shortWallet(wallet: string): string;
  shortText(text: string, firsts: number, lasts: number): string;
}

export declare class GenobankAuthUI {
  constructor(auth: GenobankAuth, options?: GenobankAuthUIOptions);
  
  render(): void;
  renderModal(): void;
  closeModal(): void;
  renderUserProfile(containerSelector: string): void;
  
  showError(message: string): void;
}

export default GenobankAuth;