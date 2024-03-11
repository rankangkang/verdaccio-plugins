const StyleLintPlugin = require('stylelint-webpack-plugin');

const env = require('../env');

module.exports = {
  entry: `${env.SRC_ROOT}/index.tsx`,

  output: {
    path: `${env.APP_ROOT}/static/`,
    filename: '[name].[fullhash].js',
    publicPath: '-/static/',
  },

  resolve: {
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx'],
    modules: ['node_modules'],
    alias: {
      '@/pages': `${env.SRC_ROOT}/pages`,
      '@/components': `${env.SRC_ROOT}/components`,
      '@/utils': `${env.SRC_ROOT}/utils`,
      '@/providers': `${env.SRC_ROOT}/providers`,
      '@/i18n': `${env.SRC_ROOT}/i18n`,
      '@/assets': `${env.SRC_ROOT}/assets`
    },
  },

  plugins: [
    new StyleLintPlugin({
      files: ['src/**/styles.ts'],
      failOnError: false,
      emitErrors: true,
    }),
  ],

  optimization: {
    runtimeChunk: {
      name: 'runtime',
    },
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'initial',
        },
      },
    },
  },

  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/,
        type: 'asset/inline',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.md$/,
        use: 'raw-loader',
      },
      {
        test: /\.tsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },

  stats: {
    children: false,
  },
};
