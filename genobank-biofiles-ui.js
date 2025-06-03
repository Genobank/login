/**
 * GenoBank.io Biofile Import UI Components
 * Pre-built UI components for importing biofiles from GenoBank dashboard
 */

class GenobankBiofilesUI {
    constructor(biofiles, options = {}) {
        if (!biofiles) {
            throw new Error('GenobankBiofiles instance is required');
        }
        
        this.biofiles = biofiles;
        this.options = {
            containerSelector: options.containerSelector || '#genobank-biofiles-container',
            showFilePreview: options.showFilePreview !== false,
            showStatistics: options.showStatistics !== false,
            onFileImported: options.onFileImported || null,
            onImportComplete: options.onImportComplete || null,
            onError: options.onError || null,
            ...options
        };
    }

    /**
     * Render the biofile import UI
     */
    render() {
        const container = document.querySelector(this.options.containerSelector);
        if (!container) {
            throw new Error(`Container not found: ${this.options.containerSelector}`);
        }

        container.innerHTML = this.getHTML();
        this.attachEventListeners();
        this.applyStyles();
        this.updateUI();
    }

    /**
     * Generate HTML for biofile import UI
     */
    getHTML() {
        return `
            <div class="genobank-biofiles-wrapper">
                <div class="genobank-biofiles-header">
                    <h3>Import Biofiles from GenoBank.io</h3>
                    <p>Import your VCF, SNP, and other genomic files directly from your GenoBank dashboard</p>
                </div>

                <div class="genobank-biofiles-auth-status" id="biofiles-auth-status">
                    <!-- Authentication status will be populated here -->
                </div>

                <div class="genobank-biofiles-actions" id="biofiles-actions" style="display: none;">
                    <div class="import-buttons">
                        <button id="import-user-files-btn" class="genobank-biofiles-btn primary">
                            <i class="icon-user"></i>
                            Import My Files
                            <span class="file-count" id="user-file-count"></span>
                        </button>
                        
                        <button id="import-lab-files-btn" class="genobank-biofiles-btn secondary" style="display: none;">
                            <i class="icon-lab"></i>
                            Import Lab Files
                            <span class="file-count" id="lab-file-count"></span>
                        </button>
                    </div>

                    <div class="import-progress" id="import-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <div class="progress-text" id="progress-text">Importing files...</div>
                    </div>
                </div>

                ${this.options.showStatistics ? this.getStatisticsHTML() : ''}
                ${this.options.showFilePreview ? this.getFilePreviewHTML() : ''}

                <div class="genobank-biofiles-error" id="biofiles-error" style="display: none;"></div>
            </div>
        `;
    }

    /**
     * Generate statistics HTML
     */
    getStatisticsHTML() {
        return `
            <div class="genobank-biofiles-stats" id="biofiles-stats" style="display: none;">
                <h4>Imported Files Statistics</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-number" id="total-files">0</span>
                        <span class="stat-label">Total Files</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="vcf-files">0</span>
                        <span class="stat-label">VCF Files</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="snp-files">0</span>
                        <span class="stat-label">SNP Files</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number" id="other-files">0</span>
                        <span class="stat-label">Other Files</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate file preview HTML
     */
    getFilePreviewHTML() {
        return `
            <div class="genobank-biofiles-preview" id="biofiles-preview" style="display: none;">
                <div class="preview-header">
                    <h4>Imported Files</h4>
                    <div class="preview-actions">
                        <button id="clear-files-btn" class="genobank-biofiles-btn small danger">Clear All</button>
                        <button id="export-list-btn" class="genobank-biofiles-btn small">Export List</button>
                    </div>
                </div>
                <div class="file-list" id="imported-files-list">
                    <!-- Imported files will be listed here -->
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const importUserBtn = document.getElementById('import-user-files-btn');
        const importLabBtn = document.getElementById('import-lab-files-btn');
        const clearFilesBtn = document.getElementById('clear-files-btn');
        const exportListBtn = document.getElementById('export-list-btn');

        if (importUserBtn) {
            importUserBtn.addEventListener('click', () => this.handleUserFilesImport());
        }

        if (importLabBtn) {
            importLabBtn.addEventListener('click', () => this.handleLabFilesImport());
        }

        if (clearFilesBtn) {
            clearFilesBtn.addEventListener('click', () => this.handleClearFiles());
        }

        if (exportListBtn) {
            exportListBtn.addEventListener('click', () => this.handleExportList());
        }
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        this.updateAuthStatus();
        this.updateStatistics();
        this.updateFilePreview();
    }

    /**
     * Update authentication status
     */
    updateAuthStatus() {
        const authStatus = document.getElementById('biofiles-auth-status');
        const actions = document.getElementById('biofiles-actions');
        const labBtn = document.getElementById('import-lab-files-btn');

        if (!this.biofiles.auth.isLoggedIn()) {
            authStatus.innerHTML = `
                <div class="auth-required">
                    <i class="icon-warning"></i>
                    <p>Please log in to GenoBank.io to import your biofiles</p>
                </div>
            `;
            actions.style.display = 'none';
        } else {
            const wallet = this.biofiles.auth.shortWallet(this.biofiles.auth.getUserWallet());
            const isPermittee = this.biofiles.auth.isCurrentUserPermittee();
            
            authStatus.innerHTML = `
                <div class="auth-success">
                    <i class="icon-success"></i>
                    <p>Connected as ${wallet} ${isPermittee ? '(Permittee)' : ''}</p>
                </div>
            `;
            
            actions.style.display = 'block';
            
            if (labBtn) {
                labBtn.style.display = isPermittee ? 'inline-block' : 'none';
            }
        }
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        if (!this.options.showStatistics) return;

        const stats = this.biofiles.getFileStatistics();
        const statsContainer = document.getElementById('biofiles-stats');
        
        if (stats.total > 0) {
            statsContainer.style.display = 'block';
            document.getElementById('total-files').textContent = stats.total;
            document.getElementById('vcf-files').textContent = stats.vcfFiles;
            document.getElementById('snp-files').textContent = stats.snpFiles;
            document.getElementById('other-files').textContent = stats.otherFiles;
        } else {
            statsContainer.style.display = 'none';
        }
    }

    /**
     * Update file preview
     */
    updateFilePreview() {
        if (!this.options.showFilePreview) return;

        const files = this.biofiles.getImportedFiles();
        const previewContainer = document.getElementById('biofiles-preview');
        const filesList = document.getElementById('imported-files-list');
        
        if (files.length > 0) {
            previewContainer.style.display = 'block';
            filesList.innerHTML = files.map(file => this.createFileItemHTML(file)).join('');
        } else {
            previewContainer.style.display = 'none';
        }
    }

    /**
     * Create HTML for a file item
     */
    createFileItemHTML(file) {
        const fileType = this.getFileTypeIcon(file.name);
        const fileSize = this.formatFileSize(file.size);
        
        return `
            <div class="file-item" data-filename="${file.name}">
                <div class="file-info">
                    <i class="file-icon ${fileType}"></i>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">
                            ${fileSize} • ${file.source === 'user_dashboard' ? 'My Files' : 'Lab Files'}
                            ${file.owner ? ` • Owner: ${file.owner}` : ''}
                            ${file.biosample_serial ? ` • Sample: ${file.biosample_serial}` : ''}
                        </div>
                    </div>
                </div>
                <button class="remove-file-btn" onclick="genobankBiofilesUI.removeFile('${file.name}')">
                    <i class="icon-remove"></i>
                </button>
            </div>
        `;
    }

    /**
     * Handle user files import
     */
    async handleUserFilesImport() {
        if (!this.biofiles.auth.isLoggedIn()) {
            this.showError('Please log in first');
            return;
        }

        try {
            this.showProgress(true);
            this.setButtonsEnabled(false);

            await this.biofiles.importUserDashboardFiles(
                (current, total, filename) => {
                    this.updateProgress(current, total, filename);
                },
                (file, index, total) => {
                    if (this.options.onFileImported) {
                        this.options.onFileImported(file, index, total);
                    }
                }
            );

            this.showProgress(false);
            this.updateUI();
            
            if (this.options.onImportComplete) {
                this.options.onImportComplete(this.biofiles.getImportedFiles());
            }

        } catch (error) {
            this.showError(`Failed to import user files: ${error.message}`);
            if (this.options.onError) {
                this.options.onError(error);
            }
        } finally {
            this.setButtonsEnabled(true);
            this.showProgress(false);
        }
    }

    /**
     * Handle lab files import
     */
    async handleLabFilesImport() {
        if (!this.biofiles.auth.isLoggedIn()) {
            this.showError('Please log in first');
            return;
        }

        if (!this.biofiles.auth.isCurrentUserPermittee()) {
            this.showError('You must be a permittee to access lab files');
            return;
        }

        try {
            this.showProgress(true);
            this.setButtonsEnabled(false);

            await this.biofiles.importLabDashboardFiles(
                (current, total, filename) => {
                    this.updateProgress(current, total, filename);
                },
                (file, index, total) => {
                    if (this.options.onFileImported) {
                        this.options.onFileImported(file, index, total);
                    }
                }
            );

            this.showProgress(false);
            this.updateUI();
            
            if (this.options.onImportComplete) {
                this.options.onImportComplete(this.biofiles.getImportedFiles());
            }

        } catch (error) {
            this.showError(`Failed to import lab files: ${error.message}`);
            if (this.options.onError) {
                this.options.onError(error);
            }
        } finally {
            this.setButtonsEnabled(true);
            this.showProgress(false);
        }
    }

    /**
     * Handle clear files
     */
    handleClearFiles() {
        if (confirm('Are you sure you want to clear all imported files?')) {
            this.biofiles.clearImportedFiles();
            this.updateUI();
        }
    }

    /**
     * Handle export list
     */
    handleExportList() {
        const fileList = this.biofiles.exportFileList();
        const blob = new Blob([fileList], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'genobank-imported-files.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Remove a specific file
     */
    removeFile(filename) {
        const files = this.biofiles.getImportedFiles();
        const file = files.find(f => f.name === filename);
        if (file) {
            this.biofiles.removeImportedFile(file);
            this.updateUI();
        }
    }

    /**
     * Show/hide progress
     */
    showProgress(show) {
        const progress = document.getElementById('import-progress');
        if (progress) {
            progress.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Update progress
     */
    updateProgress(current, total, filename) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        const percentage = total > 0 ? (current / total) * 100 : 0;
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${filename} (${current}/${total})`;
        }
    }

    /**
     * Enable/disable buttons
     */
    setButtonsEnabled(enabled) {
        const buttons = document.querySelectorAll('.genobank-biofiles-btn');
        buttons.forEach(btn => {
            btn.disabled = !enabled;
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorElement = document.getElementById('biofiles-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Get file type icon class
     */
    getFileTypeIcon(filename) {
        const ext = filename.toLowerCase().split('.').pop();
        switch (ext) {
            case 'vcf': return 'icon-vcf';
            case 'snp': return 'icon-snp';
            case 'gz': return 'icon-compressed';
            case 'txt': case 'tsv': case 'csv': return 'icon-text';
            default: return 'icon-file';
        }
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Apply default styles
     */
    applyStyles() {
        if (document.getElementById('genobank-biofiles-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'genobank-biofiles-styles';
        styles.textContent = `
            .genobank-biofiles-wrapper {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }

            .genobank-biofiles-header {
                text-align: center;
                margin-bottom: 30px;
            }

            .genobank-biofiles-header h3 {
                color: #333;
                margin-bottom: 10px;
            }

            .genobank-biofiles-header p {
                color: #666;
                margin: 0;
            }

            .genobank-biofiles-auth-status {
                margin-bottom: 20px;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
            }

            .auth-required {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
            }

            .auth-success {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }

            .import-buttons {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .genobank-biofiles-btn {
                padding: 12px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
                position: relative;
                flex: 1;
                min-width: 150px;
            }

            .genobank-biofiles-btn.primary {
                background: #007bff;
                color: white;
            }

            .genobank-biofiles-btn.secondary {
                background: #6c757d;
                color: white;
            }

            .genobank-biofiles-btn.danger {
                background: #dc3545;
                color: white;
            }

            .genobank-biofiles-btn.small {
                padding: 6px 12px;
                font-size: 12px;
                flex: none;
                min-width: auto;
            }

            .genobank-biofiles-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .genobank-biofiles-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .file-count {
                display: inline-block;
                background: rgba(255,255,255,0.2);
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                margin-left: 8px;
            }

            .import-progress {
                margin: 20px 0;
            }

            .progress-bar {
                width: 100%;
                height: 6px;
                background: #e9ecef;
                border-radius: 3px;
                overflow: hidden;
            }

            .progress-fill {
                height: 100%;
                background: #007bff;
                transition: width 0.3s ease;
                width: 0%;
            }

            .progress-text {
                margin-top: 8px;
                font-size: 12px;
                color: #666;
                text-align: center;
            }

            .genobank-biofiles-stats {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 20px;
                margin-top: 15px;
            }

            .stat-item {
                text-align: center;
            }

            .stat-number {
                display: block;
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }

            .stat-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .genobank-biofiles-preview {
                margin-top: 30px;
            }

            .preview-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .preview-actions {
                display: flex;
                gap: 10px;
            }

            .file-list {
                border: 1px solid #e9ecef;
                border-radius: 8px;
                max-height: 400px;
                overflow-y: auto;
            }

            .file-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                border-bottom: 1px solid #f1f3f4;
            }

            .file-item:last-child {
                border-bottom: none;
            }

            .file-info {
                display: flex;
                align-items: center;
                flex: 1;
                min-width: 0;
            }

            .file-icon {
                width: 20px;
                height: 20px;
                margin-right: 12px;
                flex-shrink: 0;
            }

            .file-details {
                min-width: 0;
                flex: 1;
            }

            .file-name {
                font-weight: 500;
                color: #333;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .file-meta {
                font-size: 12px;
                color: #666;
                margin-top: 2px;
            }

            .remove-file-btn {
                background: none;
                border: none;
                color: #dc3545;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                opacity: 0.7;
                transition: opacity 0.2s ease;
            }

            .remove-file-btn:hover {
                opacity: 1;
                background: rgba(220, 53, 69, 0.1);
            }

            .genobank-biofiles-error {
                background: #f8d7da;
                color: #721c24;
                padding: 12px;
                border-radius: 6px;
                border: 1px solid #f5c6cb;
                margin-top: 15px;
            }

            /* Icons (using simple CSS shapes - can be replaced with actual icon fonts) */
            .icon-user:before, .icon-lab:before, .icon-warning:before, 
            .icon-success:before, .icon-remove:before, .icon-vcf:before,
            .icon-snp:before, .icon-compressed:before, .icon-text:before,
            .icon-file:before {
                content: "●";
                margin-right: 5px;
            }

            @media (max-width: 768px) {
                .import-buttons {
                    flex-direction: column;
                }
                
                .genobank-biofiles-btn {
                    min-width: auto;
                }
                
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .preview-header {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 10px;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Export for use in different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenobankBiofilesUI;
} else if (typeof window !== 'undefined') {
    window.GenobankBiofilesUI = GenobankBiofilesUI;
}