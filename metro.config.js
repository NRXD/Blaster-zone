const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow .txt files to be bundled as static assets
config.resolver.assetExts.push('txt');

module.exports = config;
