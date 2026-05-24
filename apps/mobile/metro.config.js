const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: shared packages live outside the app; watch the repo root.
config.watchFolders = [monorepoRoot];

// Hoisted packages (react, etc.) live at the repo root; app-local deps stay under apps/mobile.
config.resolver.nodeModulesPaths = [
  path.resolve(monorepoRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules'),
];

// Avoid resolving react from apps/mobile/node_modules/react (removed after dedupe).
config.resolver.disableHierarchicalLookup = true;

function resolvePackageDir(name) {
  return path.dirname(
    require.resolve(`${name}/package.json`, {
      paths: [monorepoRoot, projectRoot],
    })
  );
}

// Pin singletons so Metro never bundles two copies (e.g. react from app vs root).
const singletonPackages = [
  'react',
  'react-dom',
  'react-native',
  'expo-router',
  'expo-modules-core',
  '@expo/metro-runtime',
];

config.resolver.extraNodeModules = Object.fromEntries(
  singletonPackages.map((name) => [name, resolvePackageDir(name)])
);

// Force every `react` import (including subpaths) to the hoisted singleton.
const reactRoot = resolvePackageDir('react');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const filePath = require.resolve(moduleName, { paths: [reactRoot, monorepoRoot] });
    return { type: 'sourceFile', filePath };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
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
