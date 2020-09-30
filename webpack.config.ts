import path from 'path';
import ThreadsPlugin from 'threads-plugin';
import nodeExternals from 'webpack-node-externals';
import DeclarationBundlePlugin from './webpack-plugins/DeclarationBundlePlugin';

function resolveProtoJs(context, request: string, callback) {
  if (/.*\/proto\/js\/.*/.test(request)) {
    // Extract name of js file
    const fileName = request.split('/').pop()
    // Externalize to a commonjs module using the request path
    const filePath = path.join('..', 'proto', 'js', fileName!)
    return callback(null, 'commonjs ' + filePath);
  } else if (/.*\/proto\/compiled\/.*/.test(request)) {
    // Extract name of js file
    const fileName = request.split('/').pop()
    // Externalize to a commonjs module using the request path
    const filePath = path.join('..', 'proto', 'compiled', fileName!)

    return callback(null, 'commonjs ' + filePath);
  }
  callback();
}

const libraryConfig = {
  name: 'polykey',
  entry: './src/Polykey.ts',
  mode: 'production',
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
  },
  target: 'node',
  node: {
    __dirname: false,
    __filename: false
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
    resolveProtoJs,
    { os: "commonjs os" },
    { fs: "commonjs fs" },
    { net: "commonjs net" },
    { dns: "commonjs dns" },
    { dgram: "commonjs dgram" },
    { process: "commonjs process" },
    { child_process: "commonjs child_process" },
    { '../../../api/generated/api/swagger.json': "commonjs ../../api/generated/api/swagger.json" },
    { '../../../api/generated/utils/writer': "commonjs ../../api/generated/utils/writer" },
    nodeExternals()
  ],
  plugins: [
    new ThreadsPlugin({
      globalObject: false
    }),
    new DeclarationBundlePlugin({
      entry: './src/Polykey.ts',
      output: './dist/polykey.d.ts'
    }),
  ],
  watchOptions: {
    ignored: /node_modules/
  },
  optimization: {
    minimize: false
  }
}

const binConfig = {
  name: 'bin',
  entry: './src/bin/index.ts',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bin.js',
    library: 'bin',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.ts'],
  },
  target: "node",
  node: {
    __dirname: false,
    __filename: false
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
    resolveProtoJs,
    { "../Polykey": "commonjs ./polykey.js" },
    { "../../package.json": "commonjs ../package.json" },
    nodeExternals()
  ],
  plugins: [
    new DeclarationBundlePlugin({
      ignoreDeclarations: true
    }),
  ],
  watchOptions: {
    ignored: /node_modules/
  },
  optimization: {
    minimize: false
  }
}

const agentDaemonScriptConfig = {
  name: 'daemon-script',
  entry: './src/agent/internal/daemon-script.ts',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist', 'internal'),
    filename: 'daemon-script.js',
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.js'],
  },
  target: "node",
  node: {
    __dirname: false,
    __filename: false
  },
  module: {
    rules: [
      {
        test: /.tsx?$/,
        loader: 'ts-loader'
      }
    ]
  },
  plugins: [
    new DeclarationBundlePlugin({
      ignoreDeclarations: true
    }),
  ],
  externals: [
    { "../../Polykey": "commonjs ../polykey.js" },
    nodeExternals()
  ],
  optimization: {
    minimize: false
  }
}


module.exports = [libraryConfig, binConfig, agentDaemonScriptConfig];
