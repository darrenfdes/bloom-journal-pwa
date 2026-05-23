const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: hoisted deps (e.g. zustand at repo root) must use the same React as this app.
function resolveMonorepoPackage(name) {
  return path.dirname(
    require.resolve(`${name}/package.json`, {
      paths: [projectRoot, monorepoRoot],
    })
  );
}

config.resolver.extraNodeModules = {
  react: resolveMonorepoPackage('react'),
  'react-dom': resolveMonorepoPackage('react-dom'),
  'react-native': resolveMonorepoPackage('react-native'),
};

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
