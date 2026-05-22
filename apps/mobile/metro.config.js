const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite on web: bundle wa-sqlite.wasm (see Expo SQLite "Web setup" docs).
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// SharedArrayBuffer requires COOP/COEP headers during web dev.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      middleware(req, res, next);
    };
  },
};

// Reduce inotify watcher usage on Linux (avoids ENOSPC with large node_modules).
config.watcher = {
  ...config.watcher,
  additionalExclusions: [
    /\.git\//,
    /\.expo\//,
    /\.cursor\//,
    /node_modules\/.*\/node_modules\//,
  ],
};

module.exports = config;
