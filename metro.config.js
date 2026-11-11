const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    blockList: [/[\/\\]backend[\/\\].*/, /[\/\\]protocol[\/\\].*/],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);