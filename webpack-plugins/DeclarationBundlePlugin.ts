import fs from 'fs'
import os from 'os'
import path from 'path'
import webpack from 'webpack'
import * as dts from 'npm-dts'


class DeclarationBundlePlugin {
  ignoreDeclarations: boolean;
  entryFilePath: string;
  outputFilePath: string;
  singleFile: boolean;

  constructor(options: {
    ignoreDeclarations?: boolean,
    entry?: string,
    output?: string,
    singleFile?: boolean
  }) {
    this.ignoreDeclarations = options.ignoreDeclarations ?? false
    this.entryFilePath = options.entry ?? ''
    this.outputFilePath = options.output ?? ''
    this.singleFile = options.singleFile ?? false
  }

  log(message: string) {
    console.log(`[DeclarationBundlePlugin] ${message}`);
  }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.emit.tap('TypescriptDeclarationPlugin', this.fn.bind(this));
  }

  async fn(compilation: webpack.compilation.Compilation) {
    // Search for declaration files.
    const declarationFiles: string[] = []

    // Create temporary working directory
    const tempDir = fs.mkdtempSync(`${os.tmpdir()}/typescript-temp`)

    for (const name in compilation.assets) {
      if (name.indexOf('.d.ts') != -1) {
        const matches = /(?:..)(.*)/.exec(name)
        const filename = matches![1]
        const filepath = path.join(tempDir, filename)
        fs.mkdirSync(path.dirname(filepath), { recursive: true })
        fs.writeFileSync(filepath, compilation.assets[name].source())
        declarationFiles.push(filepath)
        // Delete from assets
        delete compilation.assets[name];
      }
    }

    if (!this.ignoreDeclarations && !this.singleFile) {
      if (declarationFiles.length == 0) {
        this.log('No .d.ts files were found');
        this.log('Make sure "declaration": true is set in tsconfig.ts');
        return
      }

      const generator = new dts.Generator({ entry: path.join(tempDir, `${this.entryFilePath.split('.')[0]}.d.ts`), output: this.outputFilePath }, true, true)
      await generator.generate()

      // Fix the require at the end of the file to poifnt to the module name
      const requireRegex = /(require\('.*'\))/
      const contents = fs.readFileSync(this.outputFilePath).toString()
      const lines = contents.split('\n')
      const matches = lines.filter((line) => {
        return requireRegex.test(line)
      })
      if (matches.length != 0) {
        const lineToReplace = matches[0]
        const moduleName = Array.from(/'(.+?)\//.exec(lineToReplace) ?? [''])[1]

        const split = this.entryFilePath.split('/')
        const entryFileName = (split[split.length-1]).split('.')[0]
        const newContents = Buffer.from(contents.replace(requireRegex, `require('${moduleName}/${entryFileName}')`))

        fs.writeFileSync(this.outputFilePath, newContents)
      }
    } else if (this.singleFile) {
      const split = this.entryFilePath.split('.')
      const filename = split[split.length-2]

      const entryFile = path.join(tempDir, `${filename}.d.ts`)
      fs.copyFileSync(entryFile, this.outputFilePath)
    }

    // Garbage collection
    fs.rmdirSync(tempDir, { recursive: true })
  }
}

export default DeclarationBundlePlugin;
