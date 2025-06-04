/**
 * Dependency Loader Module
 * Dynamically loads required dependencies for GenoBank Auth
 */

class DependencyLoader {
    constructor() {
        this.dependencies = {
            ethers: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js',
                global: 'ethers',
                required: true
            },
            web3: {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/web3/3.0.0-rc.5/web3.min.js',
                global: 'Web3',
                required: true
            },
            magic: {
                url: 'https://auth.magic.link/sdk',
                global: 'Magic',
                required: true
            },
            magicOAuth: {
                url: 'https://cdn.jsdelivr.net/npm/@magic-ext/oauth/dist/extension.js',
                global: 'OAuthExtension',
                required: true
            }
        };
        
        this.loadedDependencies = new Set();
        this.loadingPromises = new Map();
    }
    
    /**
     * Check if a dependency is loaded
     */
    isLoaded(name) {
        const dep = this.dependencies[name];
        if (!dep) return true; // Unknown dependency, assume loaded
        
        if (typeof window !== 'undefined') {
            return window[dep.global] !== undefined;
        } else if (typeof global !== 'undefined') {
            return global[dep.global] !== undefined;
        }
        return false;
    }
    
    /**
     * Load a single dependency
     */
    async loadDependency(name) {
        // Check if already loaded
        if (this.isLoaded(name)) {
            this.loadedDependencies.add(name);
            return true;
        }
        
        // Check if already loading
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        const dep = this.dependencies[name];
        if (!dep) {
            throw new Error(`Unknown dependency: ${name}`);
        }
        
        // Create loading promise
        const loadPromise = this._loadScript(dep.url, dep.global)
            .then(() => {
                this.loadedDependencies.add(name);
                this.loadingPromises.delete(name);
                return true;
            })
            .catch(error => {
                this.loadingPromises.delete(name);
                throw new DependencyError(
                    `Failed to load dependency: ${name}`,
                    { dependency: name, error: error.message }
                );
            });
        
        this.loadingPromises.set(name, loadPromise);
        return loadPromise;
    }
    
    /**
     * Load all required dependencies
     */
    async loadAllDependencies() {
        const required = Object.entries(this.dependencies)
            .filter(([_, dep]) => dep.required)
            .map(([name, _]) => name);
        
        const promises = required.map(name => this.loadDependency(name));
        const results = await Promise.allSettled(promises);
        
        const failed = results
            .map((result, index) => ({ result, name: required[index] }))
            .filter(({ result }) => result.status === 'rejected')
            .map(({ name }) => name);
        
        if (failed.length > 0) {
            throw new DependencyError(
                'Failed to load required dependencies',
                { failed }
            );
        }
        
        return true;
    }
    
    /**
     * Load specific dependencies
     */
    async loadDependencies(names) {
        const promises = names.map(name => this.loadDependency(name));
        return Promise.all(promises);
    }
    
    /**
     * Private method to load a script
     */
    _loadScript(url, globalName) {
        return new Promise((resolve, reject) => {
            // Check if in Node.js environment
            if (typeof window === 'undefined') {
                reject(new Error('Script loading only supported in browser environment'));
                return;
            }
            
            // Check if already loaded
            if (window[globalName]) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            script.onload = () => {
                // Verify the global was created
                if (window[globalName]) {
                    resolve();
                } else {
                    reject(new Error(`Global '${globalName}' not found after loading script`));
                }
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${url}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Get dependency status
     */
    getStatus() {
        const status = {};
        for (const [name, dep] of Object.entries(this.dependencies)) {
            status[name] = {
                loaded: this.isLoaded(name),
                loading: this.loadingPromises.has(name),
                required: dep.required
            };
        }
        return status;
    }
    
    /**
     * Add custom dependency
     */
    addDependency(name, config) {
        if (this.dependencies[name]) {
            throw new Error(`Dependency '${name}' already exists`);
        }
        
        this.dependencies[name] = {
            url: config.url,
            global: config.global,
            required: config.required || false
        };
    }
}

// Create singleton instance
const dependencyLoader = new DependencyLoader();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DependencyLoader,
        dependencyLoader
    };
} else if (typeof window !== 'undefined') {
    window.DependencyLoader = DependencyLoader;
    window.dependencyLoader = dependencyLoader;
}