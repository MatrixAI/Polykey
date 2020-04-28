const process = require('process');
const path = require('path');
const webpack = require('webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ThreadsPlugin = require('threads-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/index.ts',
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'polykey.js',
    library: 'polykey',
    libraryTarget: 'umd',
  },
  externals: {
    virtualfs: "encryptedfs",
    threads: "threads",
  },
  devtool: "source-map",
  devServer: {
    host: process.env.HOST,
    port: process.env.PORT,
    historyApiFallback: true,
    watchContentBase: true,
    contentBase: path.resolve(__dirname, 'dist'),
    publicPath: '/'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [new TsconfigPathsPlugin()]
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
    new webpack.EnvironmentPlugin([
      'HOST',
      'PORT'
    ])
  ],
  watchOptions: {
    ignored: /node_modules/
  }
};
