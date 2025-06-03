/**
 * GenoBank.io Biofile Import Module
 * Handles importing VCF/SNP files from GenoBank.io dashboard
 */

class GenobankBiofiles {
    constructor(auth) {
        if (!auth) {
            throw new Error('GenobankAuth instance is required');
        }
        this.auth = auth;
        this.importedFiles = [];
        this.isImporting = false;
    }

    /**
     * Import all files from user's personal dashboard
     * @param {function} onProgress - Progress callback (current, total, filename)
     * @param {function} onFileImported - File imported callback (file, index, total)
     * @returns {Promise<File[]>} Array of imported File objects
     */
    async importUserDashboardFiles(onProgress = null, onFileImported = null) {
        if (!this.auth.isLoggedIn()) {
            throw new Error('User must be logged in to import files');
        }

        this.isImporting = true;
        const userToken = this.auth.getUserToken();
        
        try {
            // Fetch user's file list
            const files = await this.getUserDashboardFiles(userToken);
            const filesQuantity = files?.length || 0;
            
            if (onProgress) onProgress(0, filesQuantity, 'Fetching file list...');
            
            const importedFiles = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const filename = file.original_name || file.path;
                
                if (onProgress) {
                    onProgress(i + 1, filesQuantity, `Importing ${filename}...`);
                }
                
                // Download file content
                const importedFile = await this.downloadUserFile(userToken, file);
                importedFiles.push(importedFile);
                this.importedFiles.push(importedFile);
                
                if (onFileImported) {
                    onFileImported(importedFile, i + 1, filesQuantity);
                }
            }
            
            if (onProgress) onProgress(filesQuantity, filesQuantity, 'Import completed');
            return importedFiles;
            
        } catch (error) {
            console.error('Error importing user dashboard files:', error);
            throw error;
        } finally {
            this.isImporting = false;
        }
    }

    /**
     * Import all files shared with user from lab dashboard
     * @param {function} onProgress - Progress callback (current, total, filename)
     * @param {function} onFileImported - File imported callback (file, index, total)
     * @returns {Promise<File[]>} Array of imported File objects
     */
    async importLabDashboardFiles(onProgress = null, onFileImported = null) {
        if (!this.auth.isLoggedIn()) {
            throw new Error('User must be logged in to import files');
        }

        if (!this.auth.isCurrentUserPermittee()) {
            throw new Error('User must be a permittee to access lab dashboard files');
        }

        this.isImporting = true;
        const userToken = this.auth.getUserToken();
        
        try {
            // Fetch lab shared files list
            const files = await this.getLabDashboardFiles(userToken);
            const filesQuantity = files?.length || 0;
            
            if (onProgress) onProgress(0, filesQuantity, 'Fetching shared files list...');
            
            const importedFiles = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const filename = file.original_name || file.path;
                
                if (onProgress) {
                    onProgress(i + 1, filesQuantity, `Importing ${filename}...`);
                }
                
                // Download file content
                const importedFile = await this.downloadLabFile(userToken, file);
                importedFiles.push(importedFile);
                this.importedFiles.push(importedFile);
                
                if (onFileImported) {
                    onFileImported(importedFile, i + 1, filesQuantity);
                }
            }
            
            if (onProgress) onProgress(filesQuantity, filesQuantity, 'Import completed');
            return importedFiles;
            
        } catch (error) {
            console.error('Error importing lab dashboard files:', error);
            throw error;
        } finally {
            this.isImporting = false;
        }
    }

    /**
     * Get list of files from user's dashboard
     * @private
     */
    async getUserDashboardFiles(signature) {
        const url = new URL(`${window.NEW_API_BASE}/get_my_uploaded_files_urls`);
        url.searchParams.append('user_signature', signature);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user dashboard files: ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Get list of files shared with user from lab dashboard
     * @private
     */
    async getLabDashboardFiles(signature) {
        const url = new URL(`${window.NEW_API_BASE}/get_uploaded_files_shared_with_me_urls`);
        url.searchParams.append('permitte_signature', signature);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch lab dashboard files: ${response.statusText}`);
        }
        
        return await response.json();
    }

    /**
     * Download a file from user's dashboard
     * @private
     */
    async downloadUserFile(signature, fileInfo) {
        const url = new URL(`${window.NEW_API_BASE}/get_content_from_my_uploaded_file`);
        url.searchParams.append('signature', signature);
        url.searchParams.append('filename', fileInfo.path);
        url.searchParams.append('file_type', fileInfo.type);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download file ${fileInfo.original_name}: ${response.statusText}`);
        }
        
        // Handle streaming for large files
        const reader = response.body.getReader();
        const chunks = [];
        let done = false;
        
        while (!done) {
            const { value, done: streamDone } = await reader.read();
            if (streamDone) {
                done = true;
                break;
            }
            chunks.push(value);
        }
        
        const fileBlob = new Blob(chunks);
        const file = new File([fileBlob], fileInfo.original_name, { type: fileBlob.type });
        
        // Add metadata
        file.owner = fileInfo.owner;
        file.biosample_serial = fileInfo.biosample_serial;
        file.source = 'user_dashboard';
        file.genobankPath = fileInfo.path;
        
        return file;
    }

    /**
     * Download a file from lab dashboard
     * @private
     */
    async downloadLabFile(signature, fileInfo) {
        const url = new URL(`${window.NEW_API_BASE}/get_content_file_shared_with_lab`);
        url.searchParams.append('signature', signature);
        url.searchParams.append('filename', fileInfo.path);
        url.searchParams.append('file_type', fileInfo.type);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download file ${fileInfo.original_name}: ${response.statusText}`);
        }
        
        const fileBlob = await response.blob();
        const file = new File([fileBlob], fileInfo.original_name, { type: fileBlob.type });
        
        // Add metadata
        file.owner = fileInfo.owner;
        file.biosample_serial = fileInfo.biosample_serial;
        file.source = 'lab_dashboard';
        file.genobankPath = fileInfo.path;
        
        return file;
    }

    /**
     * Get all imported files
     * @returns {File[]} Array of imported files
     */
    getImportedFiles() {
        return [...this.importedFiles];
    }

    /**
     * Get files by type (VCF, SNP, etc.)
     * @param {string} type - File type to filter by
     * @returns {File[]} Filtered array of files
     */
    getFilesByType(type) {
        return this.importedFiles.filter(file => 
            file.name.toLowerCase().includes(type.toLowerCase()) ||
            file.type.toLowerCase().includes(type.toLowerCase())
        );
    }

    /**
     * Get VCF files specifically
     * @returns {File[]} Array of VCF files
     */
    getVCFFiles() {
        return this.importedFiles.filter(file => 
            file.name.toLowerCase().endsWith('.vcf') ||
            file.name.toLowerCase().endsWith('.vcf.gz') ||
            file.type.includes('vcf')
        );
    }

    /**
     * Get SNP files specifically
     * @returns {File[]} Array of SNP files
     */
    getSNPFiles() {
        return this.importedFiles.filter(file => 
            file.name.toLowerCase().includes('snp') ||
            file.name.toLowerCase().endsWith('.snp') ||
            file.type.includes('snp')
        );
    }

    /**
     * Clear all imported files
     */
    clearImportedFiles() {
        this.importedFiles = [];
    }

    /**
     * Remove a specific imported file
     * @param {File} file - File to remove
     */
    removeImportedFile(file) {
        const index = this.importedFiles.indexOf(file);
        if (index > -1) {
            this.importedFiles.splice(index, 1);
        }
    }

    /**
     * Check if currently importing
     * @returns {boolean} True if import is in progress
     */
    isCurrentlyImporting() {
        return this.isImporting;
    }

    /**
     * Get file statistics
     * @returns {object} Statistics about imported files
     */
    getFileStatistics() {
        const total = this.importedFiles.length;
        const vcfFiles = this.getVCFFiles().length;
        const snpFiles = this.getSNPFiles().length;
        const userFiles = this.importedFiles.filter(f => f.source === 'user_dashboard').length;
        const labFiles = this.importedFiles.filter(f => f.source === 'lab_dashboard').length;
        
        return {
            total,
            vcfFiles,
            snpFiles,
            userFiles,
            labFiles,
            otherFiles: total - vcfFiles - snpFiles
        };
    }

    /**
     * Export file list as JSON
     * @returns {string} JSON string of file metadata
     */
    exportFileList() {
        const fileList = this.importedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            owner: file.owner,
            biosample_serial: file.biosample_serial,
            source: file.source,
            genobankPath: file.genobankPath,
            lastModified: file.lastModified
        }));
        
        return JSON.stringify(fileList, null, 2);
    }
}

// Export for use in different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenobankBiofiles;
} else if (typeof window !== 'undefined') {
    window.GenobankBiofiles = GenobankBiofiles;
}