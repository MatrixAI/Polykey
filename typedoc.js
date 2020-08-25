module.exports = {
  out: 'docs',

  includes: [
    './src/lib/**/*',
    './src/cli/**/*',
    './proto/js/**/*.d.ts',
  ],
  exclude: [
    './src/lib/git/**/*',
    './src/lib/agent/internal/**/*',
    './proto/js/**/*.js'
  ],

  mode: 'modules',
  includeDeclarations: true,
  excludeExternals: true,
  excludeNotExported: false,
  excludePrivate: true,
  name: 'PolyKey (library)'
};
