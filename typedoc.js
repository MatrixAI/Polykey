module.exports = {
  out: 'docs',

  includes: 'src/lib/**/*',
  exclude: [
    'src/cli/**/*',
    'src/lib/git/**/*'
  ],

  mode: 'file',
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true,
  name: 'PolyKey (library)'
};
