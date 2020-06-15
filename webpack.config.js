const path = require('path');
const ThreadsPlugin = require('threads-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const cliConfig = {
  name: 'cli',
  entry: './src/cli/polykey.ts',
  output: {
    path: path.resolve(__dirname, 'dist', 'bin'),
    filename: 'pk.js',
    library: 'pk',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.ts', '.js', '.proto'],
    plugins: [new TsconfigPathsPlugin()]
  },
  target: "node",
  externals: {
    fs: "commonjs fs"
  },
  module: {
    rules: [
      {
        test: /.tsx?$/,
        loader: 'ts-loader'
      }
    ]
  },
  externals: [
    nodeExternals()
  ],
  plugins: [
    new ThreadsPlugin({
      globalObject: false
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/**/*.proto',
          to: '',
          flatten: true
        },
      ]
    }),
  ],
  watchOptions: {
    ignored: /node_modules/
  }
}

const libraryConfig = {
  name: 'library',
  entry: './src/lib/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'polykey.js',
    library: 'polykey',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  devtool: "source-map",
  resolve: {
    extensions: ['.ts', '.js', '.proto'],
    plugins: [new TsconfigPathsPlugin()]
  },
  target:'node',
  externals: {
    fs: "commonjs fs"
  },
  module: {
    rules: [
      {
        test: /.tsx?$/,
        loader: 'ts-loader'
      }
    ]
  },
  externals: [
    nodeExternals()
  ],
  plugins: [
    new ThreadsPlugin({
      globalObject: false
    }),
    new CopyPlugin({
      patterns: [
        {
          from: 'src/**/*.proto',
          to: '',
          flatten: true
        },
      ]
    })
  ],
  watchOptions: {
    ignored: /node_modules/
  }
}

module.exports = [cliConfig, libraryConfig];
