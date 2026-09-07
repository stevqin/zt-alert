import { build } from 'esbuild'
import { mkdir, rm } from 'node:fs/promises'

await rm('dist', { recursive: true, force: true })
await mkdir('dist', { recursive: true })

await Promise.all([
  build({
    entryPoints: ['src/index.js'],
    outfile: 'dist/index.js',
    bundle: true,
    format: 'esm',
    minify: true,
    sourcemap: false,
    target: ['chrome80', 'safari13'],
    supported: { destructuring: true },
    legalComments: 'none'
  }),
  build({
    entryPoints: ['src/style.css'],
    outfile: 'dist/style.css',
    bundle: true,
    minify: true,
    sourcemap: false,
    target: ['chrome80', 'safari13'],
    legalComments: 'none'
  })
])
