import * as esbuild from 'esbuild'
import { argv } from 'process'

const watch = argv.includes('--watch')

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: 'dist/extension.js',
  // vscode is provided by the extension host at runtime
  // @gfargo/git-scenarios is kept external to avoid bundling optional
  // native tree-sitter bindings it re-exports; node_modules must be present.
  external: ['vscode', '@gfargo/git-scenarios'],
  sourcemap: true,
  minify: false,
}

if (watch) {
  const ctx = await esbuild.context(config)
  await ctx.watch()
  console.log('Watching for changes…')
} else {
  await esbuild.build(config)
}
