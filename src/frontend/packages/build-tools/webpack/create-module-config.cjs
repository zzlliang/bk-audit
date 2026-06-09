const path = require('path');
const webpack = require('webpack');
const { ModuleFederationPlugin } = require('webpack').container;
const { VueLoaderPlugin } = require('vue-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const { getPaths, getResolveOptions } = require('./paths.cjs');
const { getSharedDependencies } = require('./shared-deps.cjs');
const { getModuleRules } = require('./loaders.cjs');

/**
 * 为单个业务域模块创建 webpack + Module Federation 配置。
 * 每个模块独立构建、独立缓存，仅变更模块需要重新打包。
 */
function createModuleConfig({ name }) {
  const { frontendRoot, modulesRoot, distRoot } = getPaths();
  const isProd = process.env.NODE_ENV === 'production';
  const entryPath = path.join(modulesRoot, name, 'src/entry.ts');
  const outputPath = path.join(distRoot, 'modules', name);

  return {
    name: `bk-audit-module-${name}`,
    mode: isProd ? 'production' : 'development',
    target: 'web',
    devtool: isProd ? false : 'eval-cheap-module-source-map',
    entry: entryPath,
    output: {
      path: outputPath,
      publicPath: 'auto',
      clean: true,
      filename: '[name].[contenthash:8].js',
      chunkFilename: '[name].[contenthash:8].js',
    },
    cache: {
      type: 'filesystem',
      cacheDirectory: path.join(frontendRoot, 'node_modules/.cache/webpack/modules', name),
      buildDependencies: {
        config: [__filename],
      },
    },
    resolve: getResolveOptions(),
    module: {
      rules: getModuleRules(isProd),
    },
    plugins: [
      new webpack.DefinePlugin({
        'import.meta.env.AUDIT_VITE_BUILD_BASE_DIR': JSON.stringify(process.env.AUDIT_VITE_BUILD_BASE_DIR || '/'),
        'import.meta.env.MODE': JSON.stringify('release'),
      }),
      new VueLoaderPlugin(),
      new MiniCssExtractPlugin({
        filename: '[name].[contenthash:8].css',
        chunkFilename: '[name].[contenthash:8].css',
      }),
      new ModuleFederationPlugin({
        name,
        filename: 'remoteEntry.js',
        exposes: {
          './routes': entryPath,
        },
        shared: getSharedDependencies(),
      }),
    ],
    optimization: {
      minimize: isProd,
      minimizer: isProd ? [new TerserPlugin({
        parallel: 2,
      })] : [],
    },
    performance: {
      hints: false,
    },
    stats: 'errors-warnings',
  };
}

module.exports = {
  createModuleConfig,
};
