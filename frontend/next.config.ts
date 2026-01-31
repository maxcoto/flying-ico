import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack instead of Turbopack for better control
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Ignore optional dependencies that aren't needed
    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      })
    );
    // Exclude test files and other non-production files from node_modules
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Add rule to ignore test files, benchmark files, and other non-production files
    config.module.rules.push({
      test: /node_modules.*\.(test|spec)\.(js|ts|mjs|jsx|tsx)$/,
      use: 'ignore-loader',
    });

    // Ignore LICENSE files and other text files that shouldn't be processed
    config.module.rules.push({
      test: /node_modules.*\.(LICENSE|README|CHANGELOG|md|txt|zip)$/,
      use: 'ignore-loader',
    });

    // Ignore test directories in node_modules
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    
    // Ignore test directories
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Externalize thread-stream and related packages to prevent bundling
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('thread-stream');
      } else if (typeof config.externals === 'object') {
        config.externals['thread-stream'] = 'commonjs thread-stream';
      }
    }

    // Prevent bundling of thread-stream in client bundle
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback['thread-stream'] = false;
    }

    return config;
  },
  // Exclude problematic packages from server-side bundling
  serverExternalPackages: [
    'thread-stream',
    'pino',
    'pino-pretty',
    'pino-elasticsearch',
  ],
};

export default nextConfig;
