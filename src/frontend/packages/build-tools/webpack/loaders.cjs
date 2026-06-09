const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { getPaths } = require('./paths.cjs');

function getModuleRules(isProd) {
  const { frontendRoot } = getPaths();
  const cssLoader = isProd ? MiniCssExtractPlugin.loader : 'style-loader';
  const postcssOptions = {
    postcssOptions: {
      config: path.join(frontendRoot, 'postcss.config.js'),
    },
  };
  const stylePipeline = [
    cssLoader,
    {
      loader: 'css-loader',
      options: {
        url: {
          filter: url => !url.startsWith('/static/'),
        },
      },
    },
    {
      loader: 'postcss-loader',
      options: postcssOptions,
    },
  ];

  return [
    {
      test: /\.vue$/,
      loader: 'vue-loader',
    },
    {
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    },
    {
      test: /\.tsx$/,
      loader: 'esbuild-loader',
      options: {
        loader: 'tsx',
        target: 'es2019',
      },
      exclude: /node_modules/,
    },
    {
      test: /\.ts$/,
      loader: 'esbuild-loader',
      options: {
        loader: 'ts',
        target: 'es2019',
      },
      exclude: /node_modules/,
    },
    {
      test: /\.jsx?$/,
      loader: 'esbuild-loader',
      options: {
        loader: 'jsx',
        target: 'es2019',
      },
      exclude: /node_modules/,
    },
    {
      resourceQuery: /lang=postcss/,
      use: stylePipeline,
    },
    {
      test: /\.css$/,
      use: stylePipeline,
    },
    {
      test: /\.less$/,
      use: [...stylePipeline, 'less-loader'],
    },
    {
      test: /\.(png|jpe?g|gif|svg|webp|ico)$/i,
      type: 'asset/resource',
    },
    {
      test: /\.(woff2?|eot|ttf|otf)$/i,
      type: 'asset/resource',
    },
  ];
}

module.exports = {
  getModuleRules,
};
