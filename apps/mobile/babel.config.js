const path = require('path');

const projectRoot = __dirname;
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');

function resolveFromMobile(name) {
  return require.resolve(name, { paths: [mobileNodeModules] });
}

const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      function bloomJournalBabelPreset(api, options, dirname) {
        const preset = require('babel-preset-expo')(api, options, dirname);
        const plugins = [...(preset.plugins || [])];

        // babel-preset-expo's hasModule() uses require.resolve() from hoisted root
        // node_modules, so it never finds app-local packages in this monorepo.
        const clientProxyIdx = plugins.findIndex(
          (p) => (Array.isArray(p) ? p[0] : p).key === 'client-module-proxy'
        );
        if (clientProxyIdx >= 0) {
          plugins.splice(clientProxyIdx, 0, expoRouterBabelPlugin);
        } else {
          plugins.push(expoRouterBabelPlugin);
        }

        // Same placement as babel-preset-expo when hasModule('react-native-worklets')
        // succeeds — appended after preset plugins, not in user plugins (which run first).
        plugins.push(require(resolveFromMobile('react-native-worklets/plugin')));

        return { ...preset, plugins };
      },
    ],
  };
};
