import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

const production = !process.env.ROLLUP_WATCH;

const baseConfig = {
  external: ['ethers', 'web3'],
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    json(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: [
        ['@babel/preset-env', {
          targets: {
            browsers: ['> 0.5%', 'last 2 versions', 'not dead', 'not ie <= 11']
          }
        }]
      ]
    }),
    production && terser(),
    copy({
      targets: [
        { src: 'adapters', dest: 'dist' },
        { src: 'plugins', dest: 'dist' },
        { src: 'README.md', dest: 'dist' },
        { src: 'LICENSE', dest: 'dist' }
      ]
    })
  ].filter(Boolean)
};

export default [
  // Main auth module - UMD build
  {
    ...baseConfig,
    input: 'genobank-auth-enhanced.js',
    output: {
      file: 'dist/genobank-auth.js',
      format: 'umd',
      name: 'GenobankAuth',
      globals: {
        ethers: 'ethers',
        web3: 'Web3'
      }
    }
  },
  
  // Main auth module - ES module build
  {
    ...baseConfig,
    input: 'genobank-auth-enhanced.js',
    output: {
      file: 'dist/genobank-auth.esm.js',
      format: 'es'
    }
  },
  
  // Error handling module
  {
    ...baseConfig,
    input: 'genobank-auth-error.js',
    output: [
      {
        file: 'dist/genobank-auth-error.js',
        format: 'umd',
        name: 'GenobankAuthError'
      },
      {
        file: 'dist/genobank-auth-error.esm.js',
        format: 'es'
      }
    ]
  },
  
  // Network configs module
  {
    ...baseConfig,
    input: 'network-configs.js',
    output: [
      {
        file: 'dist/network-configs.js',
        format: 'umd',
        name: 'NetworkConfigs'
      },
      {
        file: 'dist/network-configs.esm.js',
        format: 'es'
      }
    ]
  },
  
  // Dependency loader module
  {
    ...baseConfig,
    input: 'dependency-loader.js',
    output: [
      {
        file: 'dist/dependency-loader.js',
        format: 'umd',
        name: 'DependencyLoader'
      },
      {
        file: 'dist/dependency-loader.esm.js',
        format: 'es'
      }
    ]
  },
  
  // Analytics plugin
  {
    ...baseConfig,
    input: 'plugins/analytics-plugin.js',
    output: [
      {
        file: 'dist/plugins/analytics-plugin.js',
        format: 'umd',
        name: 'AnalyticsPlugin'
      },
      {
        file: 'dist/plugins/analytics-plugin.esm.js',
        format: 'es'
      }
    ]
  }
];