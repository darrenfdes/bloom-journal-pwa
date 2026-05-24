const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // babel-preset-expo only auto-enables expo-router when it can resolve the
    // package from its own node_modules. In this monorepo it is hoisted to the
    // repo root while expo-router lives under apps/mobile — register explicitly.
    plugins: [expoRouterBabelPlugin],
  };
};
