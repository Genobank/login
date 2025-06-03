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

// Biofiles types
export interface FileStatistics {
  total: number;
  vcfFiles: number;
  snpFiles: number;
  userFiles: number;
  labFiles: number;
  otherFiles: number;
}

export interface ImportedFile extends File {
  owner?: string;
  biosample_serial?: string;
  source: 'user_dashboard' | 'lab_dashboard';
  genobankPath: string;
}

export interface GenobankBiofilesUIOptions {
  containerSelector?: string;
  showFilePreview?: boolean;
  showStatistics?: boolean;
  onFileImported?: (file: ImportedFile, index: number, total: number) => void;
  onImportComplete?: (files: ImportedFile[]) => void;
  onError?: (error: Error) => void;
}

export declare class GenobankBiofiles {
  constructor(auth: GenobankAuth);
  
  importUserDashboardFiles(
    onProgress?: (current: number, total: number, filename: string) => void,
    onFileImported?: (file: ImportedFile, index: number, total: number) => void
  ): Promise<ImportedFile[]>;
  
  importLabDashboardFiles(
    onProgress?: (current: number, total: number, filename: string) => void,
    onFileImported?: (file: ImportedFile, index: number, total: number) => void
  ): Promise<ImportedFile[]>;
  
  getImportedFiles(): ImportedFile[];
  getFilesByType(type: string): ImportedFile[];
  getVCFFiles(): ImportedFile[];
  getSNPFiles(): ImportedFile[];
  
  clearImportedFiles(): void;
  removeImportedFile(file: ImportedFile): void;
  
  isCurrentlyImporting(): boolean;
  getFileStatistics(): FileStatistics;
  exportFileList(): string;
}

export declare class GenobankBiofilesUI {
  constructor(biofiles: GenobankBiofiles, options?: GenobankBiofilesUIOptions);
  
  render(): void;
  updateUI(): void;
  removeFile(filename: string): void;
  showError(message: string): void;
}

export default GenobankAuth;