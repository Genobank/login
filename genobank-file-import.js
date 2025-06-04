/**
 * GenoBank File Import Module - Enhanced Universal Version
 * Universal file import functionality for all GenoBank applications
 * Abstracts S3 bucket file access via GenoBank API
 * 
 * Repository: https://github.com/Genobank/login
 * Usage: Import this module into any GenoBank application for standardized file import
 * 
 * @version 2.0.0
 * @author GenoBank.io Team
 * @license MIT
 */

class GenobankFileImporter {
    constructor(config = {}) {
        this.config = {
            apiBase: config.apiBase || window.NEW_API_BASE || 'https://genobank.app',
            onProgress: config.onProgress || this.defaultProgressHandler,
            onFileImported: config.onFileImported || this.defaultFileHandler,
            onError: config.onError || this.defaultErrorHandler,
            onComplete: config.onComplete || this.defaultCompleteHandler,
            getUserToken: config.getUserToken || this.defaultGetUserToken,
            timeout: config.timeout || 60000,
            maxRetries: config.maxRetries || 3,
            chunkSize: config.chunkSize || 1024 * 1024, // 1MB chunks for progress
            ...config
        };
        
        this.importedFiles = [];
        this.isImporting = false;
        this.abortController = null;
    }

    /**
     * Import all files from user's personal dashboard
     * @param {Object} options - Import options
     * @returns {Promise<File[]>} Array of imported File objects
     */
    async importUserFiles(options = {}) {
        const userToken = this.config.getUserToken();
        if (!userToken) {
            throw new Error('User authentication token required');
        }

        if (this.isImporting) {
            throw new Error('Import already in progress');
        }

        this.isImporting = true;
        this.abortController = new AbortController();

        try {
            this.config.onProgress('Connecting to GenoBank dashboard...', 0, 0);
            
            // Get file list from user's vault
            const files = await this.getUserFileList(userToken);
            const filesQuantity = files?.length || 0;
            
            if (filesQuantity === 0) {
                this.config.onComplete([], 'No files found in user dashboard');
                return [];
            }

            this.config.onProgress(`Found ${filesQuantity} files`, 0, filesQuantity);
            
            const importedFiles = [];
            
            // Import each file with retry logic
            for (let i = 0; i < files.length; i++) {
                if (this.abortController.signal.aborted) {
                    throw new Error('Import cancelled by user');
                }

                const file = files[i];
                this.config.onProgress(`Importing ${file.original_name}...`, i + 1, filesQuantity);
                
                try {
                    const importedFile = await this.importSingleFileWithRetry(file, userToken, 'user');
                    importedFiles.push(importedFile);
                    this.importedFiles.push(importedFile);
                    this.config.onFileImported(importedFile, i + 1, filesQuantity);
                } catch (error) {
                    console.error(`Failed to import ${file.original_name}:`, error);
                    this.config.onError(error, file);
                    
                    // Continue with other files unless it's a critical error
                    if (!error.message.includes('authentication') && !error.message.includes('network')) {
                        continue;
                    } else {
                        throw error; // Stop on critical errors
                    }
                }
            }
            
            this.config.onComplete(importedFiles, `Successfully imported ${importedFiles.length}/${filesQuantity} files`);
            return importedFiles;
            
        } catch (error) {
            this.config.onError(error);
            throw error;
        } finally {
            this.isImporting = false;
            this.abortController = null;
        }
    }

    /**
     * Import all files shared with user's lab
     * @param {Object} options - Import options
     * @returns {Promise<File[]>} Array of imported File objects
     */
    async importLabFiles(options = {}) {
        const userToken = this.config.getUserToken();
        if (!userToken) {
            throw new Error('User authentication token required');
        }

        if (this.isImporting) {
            throw new Error('Import already in progress');
        }

        this.isImporting = true;
        this.abortController = new AbortController();

        try {
            this.config.onProgress('Connecting to lab dashboard...', 0, 0);
            
            // Get file list from lab sharing
            const files = await this.getLabFileList(userToken);
            const filesQuantity = files?.length || 0;
            
            if (filesQuantity === 0) {
                this.config.onComplete([], 'No files found in lab dashboard');
                return [];
            }

            this.config.onProgress(`Found ${filesQuantity} shared files`, 0, filesQuantity);
            
            const importedFiles = [];
            
            // Import each file
            for (let i = 0; i < files.length; i++) {
                if (this.abortController.signal.aborted) {
                    throw new Error('Import cancelled by user');
                }

                const file = files[i];
                this.config.onProgress(`Importing ${file.original_name}...`, i + 1, filesQuantity);
                
                try {
                    const importedFile = await this.importSingleFileWithRetry(file, userToken, 'lab');
                    importedFiles.push(importedFile);
                    this.importedFiles.push(importedFile);
                    this.config.onFileImported(importedFile, i + 1, filesQuantity);
                } catch (error) {
                    console.error(`Failed to import ${file.original_name}:`, error);
                    this.config.onError(error, file);
                    
                    // Continue with other files unless it's a critical error
                    if (!error.message.includes('authentication') && !error.message.includes('network')) {
                        continue;
                    } else {
                        throw error;
                    }
                }
            }
            
            this.config.onComplete(importedFiles, `Successfully imported ${importedFiles.length}/${filesQuantity} files`);
            return importedFiles;
            
        } catch (error) {
            this.config.onError(error);
            throw error;
        } finally {
            this.isImporting = false;
            this.abortController = null;
        }
    }

    /**
     * Cancel ongoing import operation
     */
    cancelImport() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.isImporting = false;
    }

    /**
     * Get file list from user's personal vault
     * @private
     */
    async getUserFileList(userToken) {
        const url = new URL(`${this.config.apiBase}/get_my_uploaded_files_urls`);
        url.searchParams.append('user_signature', userToken);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            signal: this.abortController?.signal,
            timeout: this.config.timeout
        });
        
        if (!response.ok) {
            throw new Error(`Failed to get user files: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Get file list from lab sharing
     * @private
     */
    async getLabFileList(userToken) {
        const url = new URL(`${this.config.apiBase}/get_uploaded_files_shared_with_me_urls`);
        url.searchParams.append('permitte_signature', userToken);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            signal: this.abortController?.signal,
            timeout: this.config.timeout
        });
        
        if (!response.ok) {
            throw new Error(`Failed to get lab files: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Import a single file with retry logic
     * @private
     */
    async importSingleFileWithRetry(fileInfo, userToken, source = 'user') {
        let lastError;
        
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                return await this.importSingleFile(fileInfo, userToken, source);
            } catch (error) {
                lastError = error;
                
                if (attempt < this.config.maxRetries && this.isRetryableError(error)) {
                    console.warn(`Attempt ${attempt} failed for ${fileInfo.original_name}, retrying...`, error.message);
                    await this.delay(attempt * 1000); // Exponential backoff
                } else {
                    throw error;
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Check if error is retryable
     * @private
     */
    isRetryableError(error) {
        const retryableErrors = [
            'network',
            'timeout',
            'connection',
            'temporary',
            '502',
            '503',
            '504'
        ];
        
        return retryableErrors.some(keyword => 
            error.message.toLowerCase().includes(keyword)
        );
    }

    /**
     * Delay utility for retry logic
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Import a single file from GenoBank S3 bucket
     * @private
     */
    async importSingleFile(fileInfo, userToken, source = 'user') {
        const endpoint = source === 'lab' 
            ? '/get_content_file_shared_with_lab'
            : '/get_content_from_my_uploaded_file';
            
        const paramName = source === 'lab' 
            ? 'permitte_signature' 
            : 'signature';

        const url = new URL(`${this.config.apiBase}${endpoint}`);
        url.searchParams.append(paramName, userToken);
        url.searchParams.append('filename', fileInfo.path);
        url.searchParams.append('file_type', fileInfo.type);

        const response = await fetch(url, {
            signal: this.abortController?.signal,
            timeout: this.config.timeout
        });
        
        if (!response.ok) {
            throw new Error(`Failed to download ${fileInfo.original_name}: ${response.status} ${response.statusText}`);
        }

        // Stream the file content for large files with progress tracking
        const reader = response.body.getReader();
        const contentLength = response.headers.get('content-length');
        const chunks = [];
        let receivedLength = 0;
        let done = false;

        while (!done) {
            if (this.abortController?.signal.aborted) {
                reader.cancel();
                throw new Error('Import cancelled by user');
            }

            const { value, done: streamDone } = await reader.read();
            if (streamDone) {
                done = true;
                break;
            }
            
            chunks.push(value);
            receivedLength += value.length;
            
            // Report progress for large files
            if (contentLength && receivedLength % this.config.chunkSize === 0) {
                const progress = (receivedLength / parseInt(contentLength)) * 100;
                this.config.onProgress(
                    `Downloading ${fileInfo.original_name}: ${Math.round(progress)}%`,
                    receivedLength,
                    parseInt(contentLength)
                );
            }
        }

        // Create File object
        const fileBlob = new Blob(chunks);
        const importedFile = new File([fileBlob], fileInfo.original_name, { 
            type: fileBlob.type || this.getMimeType(fileInfo.original_name)
        });

        // Add comprehensive GenoBank metadata
        importedFile.genobankMetadata = {
            owner: fileInfo.owner,
            biosample_serial: fileInfo.biosample_serial,
            file_id: fileInfo.path,
            file_type: fileInfo.type,
            source: source,
            imported_at: new Date().toISOString(),
            original_size: receivedLength,
            checksum: await this.calculateChecksum(fileBlob),
            extension: this.getFileExtension(fileInfo.original_name),
            is_genomic: this.isGenomicFile(fileInfo.original_name)
        };

        return importedFile;
    }

    /**
     * Calculate SHA-256 checksum for file integrity
     * @private
     */
    async calculateChecksum(blob) {
        try {
            const buffer = await blob.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.warn('Failed to calculate checksum:', error);
            return null;
        }
    }

    /**
     * Get file extension
     * @private
     */
    getFileExtension(filename) {
        return filename.split('.').pop()?.toLowerCase() || '';
    }

    /**
     * Check if file is a genomic data file
     * @private
     */
    isGenomicFile(filename) {
        const genomicExtensions = ['vcf', 'txt', 'tsv', 'csv', 'fasta', 'fa', 'fastq', 'fq', 'bam', 'sam', 'bed', 'gff', 'gtf'];
        const ext = this.getFileExtension(filename);
        return genomicExtensions.includes(ext);
    }

    /**
     * Get MIME type from file extension
     * @private
     */
    getMimeType(filename) {
        const ext = this.getFileExtension(filename);
        const mimeTypes = {
            'vcf': 'text/plain',
            'txt': 'text/plain',
            'tsv': 'text/tab-separated-values',
            'csv': 'text/csv',
            'json': 'application/json',
            'gz': 'application/gzip',
            'fasta': 'text/plain',
            'fa': 'text/plain',
            'fastq': 'text/plain',
            'fq': 'text/plain',
            'bed': 'text/plain',
            'gff': 'text/plain',
            'gtf': 'text/plain'
        };
        return mimeTypes[ext] || 'text/plain';
    }

    /**
     * Check if user is a permittee (has lab access)
     */
    async isPermittee(userWallet) {
        const url = new URL(`${this.config.apiBase}/validate_permittee`);
        url.searchParams.append('permittee', userWallet);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                timeout: 10000
            });
            
            if (response.ok) {
                return await response.json();
            }
            return false;
        } catch (error) {
            console.error('Error checking permittee status:', error);
            return false;
        }
    }

    /**
     * Get imported files
     */
    getImportedFiles() {
        return [...this.importedFiles];
    }

    /**
     * Clear imported files
     */
    clearImportedFiles() {
        this.importedFiles = [];
    }

    /**
     * Get import statistics
     */
    getImportStats() {
        const files = this.importedFiles;
        const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
        const genomicFiles = files.filter(file => file.genobankMetadata?.is_genomic);
        
        return {
            totalFiles: files.length,
            totalSize: totalSize,
            genomicFiles: genomicFiles.length,
            nonGenomicFiles: files.length - genomicFiles.length,
            fileTypes: this.getFileTypeDistribution(files),
            sources: this.getSourceDistribution(files)
        };
    }

    /**
     * Get file type distribution
     * @private
     */
    getFileTypeDistribution(files) {
        const distribution = {};
        files.forEach(file => {
            const ext = file.genobankMetadata?.extension || 'unknown';
            distribution[ext] = (distribution[ext] || 0) + 1;
        });
        return distribution;
    }

    /**
     * Get source distribution
     * @private
     */
    getSourceDistribution(files) {
        const distribution = {};
        files.forEach(file => {
            const source = file.genobankMetadata?.source || 'unknown';
            distribution[source] = (distribution[source] || 0) + 1;
        });
        return distribution;
    }

    // Default event handlers
    defaultProgressHandler(message, current, total) {
        console.log(`Progress: ${message} (${current}/${total})`);
    }

    defaultFileHandler(file, current, total) {
        console.log(`Imported: ${file.name} (${current}/${total})`);
    }

    defaultErrorHandler(error, fileInfo = null) {
        console.error('Import error:', error, fileInfo);
    }

    defaultCompleteHandler(files, message) {
        console.log(`Import complete: ${message}`, files);
    }

    defaultGetUserToken() {
        // Default implementation - should be overridden
        return window.getUserToken?.() || localStorage.getItem('userToken') || null;
    }
}

/**
 * Utility functions for integration with existing applications
 */
const GenobankFileUtils = {
    /**
     * Create file import buttons with GenoBank styling
     */
    createImportButtons(container, importer, options = {}) {
        const userButton = document.createElement('button');
        userButton.id = 'import-from-my-user-dashboard';
        userButton.textContent = options.userButtonText || 'My Own Files';
        userButton.className = options.buttonClass || 'genobank-import-btn';
        
        const labButton = document.createElement('button');
        labButton.id = 'import-from-my-lab-dashboard';
        labButton.textContent = options.labButtonText || 'From Lab Dashboard';
        labButton.className = options.buttonClass || 'genobank-import-btn';
        
        // Add cancel button
        const cancelButton = document.createElement('button');
        cancelButton.id = 'cancel-import';
        cancelButton.textContent = 'Cancel Import';
        cancelButton.className = options.cancelButtonClass || 'genobank-cancel-btn';
        cancelButton.style.display = 'none';
        
        userButton.addEventListener('click', async () => {
            this.setButtonsState([userButton, labButton], true);
            cancelButton.style.display = 'inline-block';
            try {
                await importer.importUserFiles();
            } finally {
                this.setButtonsState([userButton, labButton], false);
                cancelButton.style.display = 'none';
            }
        });
        
        labButton.addEventListener('click', async () => {
            this.setButtonsState([userButton, labButton], true);
            cancelButton.style.display = 'inline-block';
            try {
                await importer.importLabFiles();
            } finally {
                this.setButtonsState([userButton, labButton], false);
                cancelButton.style.display = 'none';
            }
        });
        
        cancelButton.addEventListener('click', () => {
            importer.cancelImport();
            this.setButtonsState([userButton, labButton], false);
            cancelButton.style.display = 'none';
        });
        
        if (container) {
            container.appendChild(userButton);
            container.appendChild(labButton);
            container.appendChild(cancelButton);
        }
        
        return { userButton, labButton, cancelButton };
    },

    /**
     * Set buttons enabled/disabled state
     * @private
     */
    setButtonsState(buttons, disabled) {
        buttons.forEach(button => {
            button.disabled = disabled;
            if (disabled) {
                button.classList.add('disabled');
            } else {
                button.classList.remove('disabled');
            }
        });
    },

    /**
     * Create enhanced progress indicator
     */
    createProgressIndicator(container, options = {}) {
        const progressDiv = document.createElement('div');
        progressDiv.id = options.id || 'genobank-import-progress';
        progressDiv.className = options.className || 'genobank-progress';
        progressDiv.style.display = 'none';
        progressDiv.innerHTML = `
            <div class="progress-header">
                <div class="progress-message"></div>
                <div class="progress-stats"></div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
                <div class="progress-text">0%</div>
            </div>
            <div class="progress-details">
                <div class="current-file"></div>
                <div class="file-size"></div>
            </div>
        `;
        
        if (container) {
            container.appendChild(progressDiv);
        }
        
        return progressDiv;
    },

    /**
     * Update enhanced progress indicator
     */
    updateProgress(progressDiv, message, current, total, details = {}) {
        if (!progressDiv) return;
        
        progressDiv.style.display = 'block';
        
        const messageEl = progressDiv.querySelector('.progress-message');
        const statsEl = progressDiv.querySelector('.progress-stats');
        const fillEl = progressDiv.querySelector('.progress-fill');
        const textEl = progressDiv.querySelector('.progress-text');
        const fileEl = progressDiv.querySelector('.current-file');
        const sizeEl = progressDiv.querySelector('.file-size');
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        if (statsEl) {
            statsEl.textContent = `${current}/${total} files`;
        }
        
        if (fillEl && textEl && total > 0) {
            const percentage = Math.round((current / total) * 100);
            fillEl.style.width = `${percentage}%`;
            textEl.textContent = `${percentage}%`;
        }
        
        if (fileEl && details.filename) {
            fileEl.textContent = `Current: ${details.filename}`;
        }
        
        if (sizeEl && details.fileSize) {
            sizeEl.textContent = this.formatFileSize(details.fileSize);
        }
    },

    /**
     * Hide progress indicator
     */
    hideProgress(progressDiv) {
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    },

    /**
     * Format file size in human readable format
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Create file list display
     */
    createFileList(container, options = {}) {
        const listDiv = document.createElement('div');
        listDiv.id = options.id || 'imported-files-list';
        listDiv.className = options.className || 'genobank-file-list';
        listDiv.innerHTML = `
            <div class="file-list-header">
                <h3>Imported Files</h3>
                <div class="file-list-stats"></div>
            </div>
            <div class="file-list-content"></div>
        `;
        
        if (container) {
            container.appendChild(listDiv);
        }
        
        return listDiv;
    },

    /**
     * Add file to list display
     */
    addFileToList(listDiv, file) {
        if (!listDiv) return;
        
        const contentEl = listDiv.querySelector('.file-list-content');
        const statsEl = listDiv.querySelector('.file-list-stats');
        
        if (contentEl) {
            const fileEl = document.createElement('div');
            fileEl.className = 'file-list-item';
            fileEl.innerHTML = `
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${this.formatFileSize(file.size)}</span>
                </div>
                <div class="file-meta">
                    <span class="file-source">${file.genobankMetadata?.source || 'unknown'}</span>
                    <span class="file-type">${file.genobankMetadata?.extension || 'unknown'}</span>
                </div>
                <button class="remove-file" data-file-name="${file.name}">×</button>
            `;
            
            // Add remove functionality
            const removeBtn = fileEl.querySelector('.remove-file');
            removeBtn.addEventListener('click', () => {
                fileEl.remove();
                this.updateFileListStats(listDiv);
            });
            
            contentEl.appendChild(fileEl);
        }
        
        this.updateFileListStats(listDiv);
    },

    /**
     * Update file list statistics
     * @private
     */
    updateFileListStats(listDiv) {
        const statsEl = listDiv.querySelector('.file-list-stats');
        const items = listDiv.querySelectorAll('.file-list-item');
        
        if (statsEl) {
            statsEl.textContent = `${items.length} files imported`;
        }
    }
};

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GenobankFileImporter, GenobankFileUtils };
} else if (typeof window !== 'undefined') {
    window.GenobankFileImporter = GenobankFileImporter;
    window.GenobankFileUtils = GenobankFileUtils;
}