import fs from 'fs';
import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.node.es.js',
      format: 'es'
    },
    external: (id) => {
      return Object.keys(packageJson.dependencies)
        .concat(Object.keys(packageJson.devDependencies))
        .map((dep) => new RegExp('^' + dep))
        .concat([
            /^babel-runtime/
        ])
        .some((pattern) => pattern.test(id));
    },
    plugins: [
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        runtimeHelpers: true,
        plugins: [
          '@babel/plugin-transform-runtime',
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-proposal-object-rest-spread'
        ],
        presets: [
          '@babel/preset-flow',
          ['@babel/preset-env', {
            modules: false,
            targets: {
              node: '8.7.0'
            }
          }]
        ]
      })
    ]
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.node.cjs.js',
      format: 'cjs'
    },
    external: (id) => {
      return Object.keys(packageJson.dependencies)
        .concat(Object.keys(packageJson.devDependencies))
        .map((dep) => new RegExp('^' + dep))
        .concat([
            /^babel-runtime/
        ])
        .some((pattern) => pattern.test(id));
    },
    plugins: [
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        runtimeHelpers: true,
        plugins: [
          '@babel/plugin-transform-runtime',
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-proposal-object-rest-spread'
        ],
        presets: [
          '@babel/preset-flow',
          ['@babel/preset-env', {
            modules: false,
            targets: {
              node: '8.7.0'
            }
          }]
        ]
      })
    ]
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.browser.umd.js',
      format: 'umd',
      name: 'virtualfs'
    },
    plugins: [
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        runtimeHelpers: true,
        plugins: [
          '@babel/plugin-transform-runtime',
          '@babel/plugin-proposal-class-properties',
          '@babel/plugin-proposal-object-rest-spread'
        ],
        presets: [
          '@babel/preset-flow',
          ['@babel/preset-env', {
            modules: false,
            targets: {
              browsers: ['last 2 versions']
            }
          }]
        ]
      }),
      resolve({
        preferBuiltins: true,
        browser: true
      }),
      commonjs(),
      globals(),
      builtins()
    ]
  }
];
