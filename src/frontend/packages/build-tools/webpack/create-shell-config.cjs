const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const { ModuleFederationPlugin } = require('webpack').container;
const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const manifest = require('../module-manifest.cjs');
const { getPaths, getResolveOptions } = require('./paths.cjs');
const { getSharedDependencies } = require('./shared-deps.cjs');
const { getModuleRules } = require('./loaders.cjs');

/**
 * Shell 宿主应用：仅打包壳层（main / layout / router / shared），
 * 业务路由通过 Module Federation 从各子模块按需加载。
 */
function createShellConfig() {
  const { frontendRoot, distRoot, indexHtml, mainEntry } = getPaths();
  const isProd = process.env.NODE_ENV === 'production';

  const remotes = Object.values(manifest).reduce((acc, item) => {
    acc[item.remoteName] = `${item.remoteName}@/modules/${item.remoteName}/remoteEntry.js`;
    return acc;
  }, {});

  const staticCopyPatterns = [
    {
      from: path.join(frontendRoot, 'static'),
      to: 'static',
      noErrorOnMissing: true,
    },
  ];

  return {
    name: 'bk-audit-shell',
    mode: isProd ? 'production' : 'development',
    target: 'web',
    devtool: isProd ? false : 'eval-cheap-module-source-map',
    entry: mainEntry,
    output: {
      path: distRoot,
      publicPath: process.env.AUDIT_VITE_BUILD_BASE_DIR || '/',
      clean: {
        keep: /modules\//,
      },
      filename: 'assets/[name].[contenthash:8].js',
      chunkFilename: 'assets/[name].[contenthash:8].js',
    },
    cache: {
      type: 'filesystem',
      cacheDirectory: path.join(frontendRoot, 'node_modules/.cache/webpack/shell'),
      buildDependencies: {
        config: [__filename],
      },
    },
    resolve: getResolveOptions(),
    module: {
      rules: getModuleRules(isProd),
    },
    plugins: [
      new VueLoaderPlugin(),
      new webpack.DefinePlugin({
        'process.env.FEDERATED_BUILD': JSON.stringify('true'),
        'process.env.AUDIT_VITE_BUILD_BASE_DIR': JSON.stringify(process.env.AUDIT_VITE_BUILD_BASE_DIR || '/'),
        'import.meta.env.AUDIT_VITE_BUILD_BASE_DIR': JSON.stringify(process.env.AUDIT_VITE_BUILD_BASE_DIR || '/'),
        'import.meta.env.MODE': JSON.stringify('release'),
      }),
      new MiniCssExtractPlugin({
        filename: 'assets/[name].[contenthash:8].css',
        chunkFilename: 'assets/[name].[contenthash:8].css',
      }),
      new ModuleFederationPlugin({
        name: 'shell',
        remotes,
        shared: getSharedDependencies(),
      }),
      new HtmlWebpackPlugin({
        templateContent: () => {
          const html = fs.readFileSync(indexHtml, 'utf8');
          return html.replace(/<script[^>]*src="\/src\/main\.ts"[^>]*><\/script>\s*/i, '');
        },
        inject: 'body',
        scriptLoading: 'module',
      }),
      new CopyWebpackPlugin({
        patterns: staticCopyPatterns,
      }),
    ],
    optimization: {
      minimize: isProd,
      minimizer: isProd ? [new TerserPlugin({
        parallel: 2,
      })] : [],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    },
    performance: {
      hints: false,
    },
    stats: 'errors-warnings',
  };
}

module.exports = {
  createShellConfig,
};
