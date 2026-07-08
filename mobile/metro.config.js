const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 添加 wasm 文件支持
config.resolver.assetExts.push('wasm');

// 添加 cjs 文件支持（某些 expo 模块需要）
config.resolver.sourceExts.push('cjs');

// 处理 web worker 文件
config.resolver.mainFields = ['react-native', 'browser', 'main'];

module.exports = config;