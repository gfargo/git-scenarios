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
  external: ['vscode'],
  sourcemap: true,
  minify: false,
  logOverride: {
    'empty-import-meta': 'silent',
  },
}

if (watch) {
  const ctx = await esbuild.context(config)
  await ctx.watch()
  console.log('Watching for changes…')
} else {
  await esbuild.build(config)
}
