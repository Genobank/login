# GenoBank File Import Module - Enhanced Universal Version

## Overview
This module provides universal file import functionality for all GenoBank applications, abstracting S3 bucket file access via the GenoBank API. It's designed to replace application-specific file import implementations with a standardized, reusable solution.

## Key Features

- ✅ **Universal Compatibility**: Works with any GenoBank application
- ✅ **S3 Integration**: Direct access to GenoBank's S3 bucket via API
- ✅ **Streaming Support**: Efficient handling of large genomic files
- ✅ **Progress Tracking**: Real-time progress updates with cancellation support
- ✅ **Retry Logic**: Automatic retry for transient network errors
- ✅ **Error Handling**: Comprehensive error management and recovery
- ✅ **Metadata Preservation**: Maintains file ownership, biosample info, and checksums
- ✅ **File Validation**: Automatic genomic file type detection and validation
- ✅ **Performance Optimized**: Chunk-based streaming with memory efficiency

## Installation

### CDN (Recommended)
```html
<script src="https://unpkg.com/@genobank/login@latest/genobank-file-import.js"></script>
```

### NPM
```bash
npm install @genobank/login
```

### Direct Download
```javascript
import { GenobankFileImporter, GenobankFileUtils } from '@genobank/login';
```

## Quick Start

### Basic Usage
```javascript
// Initialize the file importer
const importer = new GenobankFileImporter({
    apiBase: 'https://genobank.app',
    getUserToken: () => localStorage.getItem('userToken'),
    
    onProgress: (message, current, total) => {
        console.log(`${message} (${current}/${total})`);
    },
    
    onFileImported: (file, current, total) => {
        console.log(`Imported: ${file.name}`);
        // Add to your application
        myApp.addFile(file);
    },
    
    onComplete: (files, message) => {
        alert(`${message} - ${files.length} files imported`);
    },
    
    onError: (error, fileInfo) => {
        console.error('Import error:', error);
    }
});

// Import user's personal files
try {
    const userFiles = await importer.importUserFiles();
    console.log('User files imported:', userFiles);
} catch (error) {
    console.error('Failed to import user files:', error);
}

// Import lab shared files (if user is a permittee)
try {
    const labFiles = await importer.importLabFiles();
    console.log('Lab files imported:', labFiles);
} catch (error) {
    console.error('Failed to import lab files:', error);
}
```

### UI Integration
```javascript
// Create import interface
const container = document.getElementById('import-section');

// Create buttons
const { userButton, labButton, cancelButton } = GenobankFileUtils.createImportButtons(
    container, 
    importer,
    {
        buttonClass: 'my-import-btn',
        userButtonText: '📁 My Genomic Files',
        labButtonText: '🏢 Lab Shared Files'
    }
);

// Create progress indicator
const progressDiv = GenobankFileUtils.createProgressIndicator(container);

// Create file list
const fileList = GenobankFileUtils.createFileList(container);

// Enhanced progress handler
importer.config.onProgress = (message, current, total) => {
    GenobankFileUtils.updateProgress(progressDiv, message, current, total, {
        filename: 'current-file.vcf',
        fileSize: 1024 * 1024 * 5 // 5MB
    });
};

// File imported handler
importer.config.onFileImported = (file, current, total) => {
    GenobankFileUtils.addFileToList(fileList, file);
    myApp.addFile(file);
};

// Completion handler
importer.config.onComplete = (files, message) => {
    GenobankFileUtils.hideProgress(progressDiv);
    
    // Show statistics
    const stats = importer.getImportStats();
    console.log('Import statistics:', stats);
    
    alert(`Import complete! ${files.length} files imported`);
};
```

## Advanced Configuration

### Retry and Timeout Settings
```javascript
const importer = new GenobankFileImporter({
    timeout: 120000,        // 2 minutes timeout
    maxRetries: 5,          // Retry up to 5 times
    chunkSize: 2097152,     // 2MB chunks for progress
    
    onProgress: (message, current, total) => {
        updateProgressBar(current / total * 100);
    }
});
```

### Custom Error Handling
```javascript
const importer = new GenobankFileImporter({
    onError: (error, fileInfo) => {
        if (error.message.includes('authentication')) {
            // Redirect to login
            window.location.href = '/login';
        } else if (error.message.includes('quota')) {
            // Show quota exceeded dialog
            showQuotaDialog();
        } else if (error.message.includes('network')) {
            // Show network error with retry option
            showNetworkErrorDialog(() => {
                // Retry import
                importer.importUserFiles();
            });
        } else {
            // Generic error handling
            showErrorDialog(error.message);
        }
    }
});
```

## Integration Examples

### OpenCRAVAT Integration
```javascript
// Replace existing websubmit.js functions
const importer = new GenobankFileImporter({
    apiBase: window.NEW_API_BASE,
    getUserToken: getUserToken,
    
    onFileImported: (file) => {
        // Add to OpenCRAVAT input list
        OC.inputFileList.push(file);
        addFileToInputList(file);
    },
    
    onComplete: () => {
        populateMultInputsMessage();
    }
});

// Replace old function calls
// OLD: await importAllFilesFromMyUserDashboard();
// NEW: await importer.importUserFiles();
```

### VCF Web3 Annotator Integration
```javascript
const vcfImporter = new GenobankFileImporter({
    apiBase: window.API_BASE,
    getUserToken: getUserToken,
    
    onFileImported: async (file) => {
        // Send directly to VCF annotator backend
        const response = await fetch(`${API_BASE}/import-direct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Wallet-Address': getUserWallet(),
                'X-Signature': getUserSignature()
            },
            body: JSON.stringify({
                file_info: {
                    original_name: file.name,
                    filename: file.genobankMetadata.file_id,
                    path: file.genobankMetadata.file_id,
                    type: file.genobankMetadata.file_type
                }
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('File imported to VCF annotator:', result);
        }
    }
});
```

### React/Vue Applications
```javascript
// React Hook
import { useState, useEffect } from 'react';
import { GenobankFileImporter } from '@genobank/login';

function useGenobankImport(authToken) {
    const [importer, setImporter] = useState(null);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
    const [files, setFiles] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    
    useEffect(() => {
        const importerInstance = new GenobankFileImporter({
            getUserToken: () => authToken,
            onProgress: (message, current, total) => {
                setProgress({ message, current, total });
            },
            onFileImported: (file) => {
                setFiles(prev => [...prev, file]);
            },
            onComplete: () => {
                setIsImporting(false);
            },
            onError: (error) => {
                setIsImporting(false);
                console.error('Import error:', error);
            }
        });
        
        setImporter(importerInstance);
    }, [authToken]);
    
    const importUserFiles = async () => {
        if (importer && !isImporting) {
            setIsImporting(true);
            try {
                await importer.importUserFiles();
            } catch (error) {
                setIsImporting(false);
                throw error;
            }
        }
    };
    
    const importLabFiles = async () => {
        if (importer && !isImporting) {
            setIsImporting(true);
            try {
                await importer.importLabFiles();
            } catch (error) {
                setIsImporting(false);
                throw error;
            }
        }
    };
    
    const cancelImport = () => {
        if (importer) {
            importer.cancelImport();
        }
    };
    
    return {
        importUserFiles,
        importLabFiles,
        cancelImport,
        progress,
        files,
        isImporting,
        stats: importer?.getImportStats()
    };
}

// Usage in component
function MyGenomicsApp() {
    const { importUserFiles, progress, files, isImporting } = useGenobankImport(authToken);
    
    return (
        <div>
            <button onClick={importUserFiles} disabled={isImporting}>
                {isImporting ? 'Importing...' : 'Import My Files'}
            </button>
            
            {isImporting && (
                <div className="progress">
                    <div>{progress.message}</div>
                    <div>{progress.current}/{progress.total}</div>
                </div>
            )}
            
            <div className="file-list">
                {files.map(file => (
                    <div key={file.name} className="file-item">
                        <span>{file.name}</span>
                        <span>{file.genobankMetadata?.file_type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

## API Reference

### GenobankFileImporter

#### Constructor Options
```typescript
interface ImporterConfig {
    apiBase?: string;              // GenoBank API base URL
    getUserToken?: () => string;   // Function to get auth token
    onProgress?: (message: string, current: number, total: number) => void;
    onFileImported?: (file: File, current: number, total: number) => void;
    onError?: (error: Error, fileInfo?: any) => void;
    onComplete?: (files: File[], message: string) => void;
    timeout?: number;              // Request timeout in ms
    maxRetries?: number;           // Max retry attempts
    chunkSize?: number;            // Progress chunk size
}
```

#### Methods

##### `importUserFiles(options?: ImportOptions): Promise<File[]>`
Import all files from user's personal vault.

##### `importLabFiles(options?: ImportOptions): Promise<File[]>`
Import all files shared with user's lab.

##### `cancelImport(): void`
Cancel ongoing import operation.

##### `isPermittee(userWallet: string): Promise<boolean>`
Check if user has lab access permissions.

##### `getImportedFiles(): File[]`
Get array of all imported files.

##### `clearImportedFiles(): void`
Clear the imported files array.

##### `getImportStats(): ImportStats`
Get comprehensive import statistics.

### File Metadata

Each imported file includes comprehensive GenoBank metadata:

```typescript
interface GenobankMetadata {
    owner: string;              // File owner wallet address
    biosample_serial: string;   // Biosample identifier
    file_id: string;           // GenoBank file ID
    file_type: string;         // File type (UPLOADED, 23ANDME, etc.)
    source: 'user' | 'lab';    // Import source
    imported_at: string;       // ISO timestamp
    original_size: number;     // File size in bytes
    checksum: string;          // SHA-256 checksum
    extension: string;         // File extension
    is_genomic: boolean;       // Whether file is genomic data
}
```

### GenobankFileUtils

#### Utility Methods

##### `createImportButtons(container, importer, options)`
Create styled import buttons with progress handling.

##### `createProgressIndicator(container, options)`
Create enhanced progress indicator with statistics.

##### `updateProgress(progressDiv, message, current, total, details)`
Update progress indicator with detailed information.

##### `createFileList(container, options)`
Create file list display with metadata.

##### `addFileToList(listDiv, file)`
Add imported file to list display.

##### `formatFileSize(bytes): string`
Format file size in human readable format.

## Migration Guide

### From websubmit.js
```javascript
// OLD CODE
async function importAllFilesFromMyUserDashboard() {
    const userToken = getUserToken();
    const files = await getMyUserDashboardFiles(userToken);
    
    for (const file of files) {
        const url = new URL(`${window.NEW_API_BASE}/get_content_from_my_uploaded_file`);
        url.searchParams.append('signature', userToken);
        url.searchParams.append('filename', file.path);
        url.searchParams.append('file_type', file.type);
        
        const fileResponse = await fetch(url);
        const fileBlob = await fileResponse.blob();
        const importedFile = new File([fileBlob], file.original_name);
        
        OC.inputFileList.push(importedFile);
    }
}

// NEW CODE
const importer = new GenobankFileImporter({
    apiBase: window.NEW_API_BASE,
    getUserToken: getUserToken,
    onFileImported: (file) => OC.inputFileList.push(file)
});

await importer.importUserFiles();
```

### From existing GenoBank biofiles
```javascript
// OLD CODE
const biofiles = new GenobankBiofiles(auth);
await biofiles.importUserDashboardFiles(onProgress, onFileImported);

// NEW CODE  
const importer = new GenobankFileImporter({
    getUserToken: () => auth.getUserToken(),
    onProgress: onProgress,
    onFileImported: onFileImported
});
await importer.importUserFiles();
```

## Performance Optimizations

- **Chunked Streaming**: Large files are streamed in configurable chunks
- **Memory Efficient**: Uses streams to avoid loading entire files in memory
- **Retry Logic**: Automatic retry with exponential backoff for network issues
- **Progress Tracking**: Real-time progress updates without blocking UI
- **Cancellation Support**: Ability to cancel long-running imports
- **Checksum Validation**: File integrity verification via SHA-256

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT - See LICENSE file for details

## Support

For support, please open an issue on the [GitHub repository](https://github.com/Genobank/login) or contact support@genobank.io.