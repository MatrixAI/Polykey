import path from 'path';
import ThreadsPlugin from 'threads-plugin';
import nodeExternals from 'webpack-node-externals';
import DeclarationBundlePlugin from './webpack-plugins/DeclarationBundlePlugin';

function resolveProtoJs(context, request: string, callback) {
  if (/.*\/proto\/js\/.*/.test(request)) {
    // Extract name of js file
    const fileName = request.split('/').pop()
    // Externalize to a commonjs module using the request path
    const filePath = path.join('..', '..', 'proto', 'js', fileName!)
    return callback(null, 'commonjs ' + filePath);
  } else if (/.*\/proto\/compiled\/.*/.test(request)) {
    // Extract name of js file
    const fileName = request.split('/').pop()
    // Externalize to a commonjs module using the request path
    const filePath = path.join('..', '..', 'proto', 'compiled', fileName!)

    return callback(null, 'commonjs ' + filePath);
  }
  callback();
}

const libraryConfig = {
  name: 'polykey',
  entry: './src/lib/Polykey.ts',
  output: {
    path: path.resolve(__dirname, 'dist', 'lib'),
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
    nodeExternals()
  ],
  plugins: [
    new ThreadsPlugin({
      globalObject: false
    }),
    new DeclarationBundlePlugin({
      entry: './src/lib/Polykey.ts',
      output: './dist/lib/polykey.d.ts'
    })
  ],
  watchOptions: {
    ignored: /node_modules/
  },
  optimization: {
    minimize: false
  }
}

const polykeyClientConfig = {
  name: 'client',
  entry: './src/lib/agent/PolykeyClient.ts',
  output: {
    path: path.resolve(__dirname, 'dist', 'lib'),
    filename: 'browser-client.js',
    library: 'browser-client',
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  devtool: "source-map",
  resolve: {
    extensions: ['.ts', '.js'],
  },
  target: 'web',
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
    { '../Polykey': "commonjs ./polykey.js" },
    nodeExternals()
  ],
  plugins: [
    new ThreadsPlugin({
      globalObject: false
    }),
    new DeclarationBundlePlugin({
      entry: './src/lib/agent/PolykeyClient.ts',
      output: './dist/lib/browser-client.d.ts',
      singleFile: true
    })
  ],
  watchOptions: {
    ignored: /node_modules/
  },
  optimization: {
    minimize: false
  }
}

const cliConfig = {
  name: 'cli',
  entry: './src/cli/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist', 'cli'),
    filename: 'cli.js',
    library: 'cli',
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
    { "../lib/Polykey": "commonjs ../lib/polykey.js" },
    { "../../package.json": "commonjs ../../package.json" },
    nodeExternals()
  ],
  plugins: [
    new DeclarationBundlePlugin({
      ignoreDeclarations: true
    })
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
  entry: './src/lib/agent/internal/daemon-script.js',
  output: {
    path: path.resolve(__dirname, 'dist', 'lib', 'internal'),
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
    })
  ],
  externals: [
    { "../../Polykey": "commonjs ../polykey.js" },
    nodeExternals()
  ],
  optimization: {
    minimize: false
  }
}


module.exports = [libraryConfig, polykeyClientConfig, cliConfig, agentDaemonScriptConfig];
