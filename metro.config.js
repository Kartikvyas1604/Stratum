const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const nodeLibs = require('node-libs-react-native');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  resolver: {
    extraNodeModules: {
      ...nodeLibs,
      crypto: require.resolve('react-native-quick-crypto'),
      buffer: require.resolve('@craftzdog/react-native-buffer'),
      process: require.resolve('process/browser'),
    },
  },
});
