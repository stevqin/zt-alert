import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../../', import.meta.url)
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))

test('package publishes ESM, CSS, and declarations with zero runtime dependencies', async () => {
  assert.equal(pkg.name, '@ztechjs/zt-alert')
  assert.equal(pkg.version, '0.1.2')
  assert.equal(pkg.type, 'module')
  assert.equal(pkg.exports['.'].import, './dist/index.js')
  assert.equal(pkg.exports['.'].types, './types/index.d.ts')
  assert.equal(pkg.exports['./style.css'], './dist/style.css')
  assert.deepEqual(pkg.dependencies || {}, {})
  await access(new URL('types/index.d.ts', root))
  await access(new URL('README.md', root))
  await access(new URL('LICENSE', root))
})

test('source entry can be imported without browser globals', async () => {
  const api = await import(new URL('src/index.js', root))
  assert.deepEqual(Object.keys(api).sort(), [
    'ZtDialog',
    'ZtDrawer',
    'ZtLoading',
    'ZtMessage',
    'ZtMessageBox',
    'ZtNotification'
  ])
})

test('Loading requires a browser only when opened', async () => {
  const { ZtLoading } = await import(new URL('src/index.js', root))
  assert.equal(typeof ZtLoading?.open, 'function')
  assert.throws(() => ZtLoading.open(), /requires a browser document/)
  await ZtLoading.close()
})
