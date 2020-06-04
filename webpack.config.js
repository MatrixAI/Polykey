const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ThreadsPlugin = require('threads-plugin');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'polykey.js',
    library: 'polykey',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  devtool: "source-map",
  resolve: {
    extensions: ['.ts', '.js'],
    plugins: [new TsconfigPathsPlugin()],
    alias: {
      '@': path.resolve('src')
    }
  },
  node: {
    fs: 'empty'
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
    })
  ],
  watchOptions: {
    ignored: /node_modules/
  }
};
