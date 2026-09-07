import assert from 'node:assert/strict'
import test from 'node:test'

import { createCloseGate } from '../../src/core/close-gate.js'
import { cssLength } from '../../src/core/dom.js'
import { enterLayer, getTopLayer, isTopLayer, leaveLayer } from '../../src/core/layer-manager.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

test('cssLength normalizes numbers and numeric strings without changing CSS lengths', () => {
  assert.equal(cssLength(24), '24px')
  assert.equal(cssLength(' 24 '), '24px')
  assert.equal(cssLength('60vw'), '60vw')
  assert.equal(cssLength(0), '0px')
  assert.equal(cssLength(undefined), undefined)
})

test('close gate ignores a second request while the first guard is pending', async () => {
  const guard = deferred()
  const commits = []
  const pending = []
  const gate = createCloseGate({
    available: () => true,
    beforeClose: () => guard.promise,
    commit: (reason, value) => commits.push({ reason, value }),
    error: () => {},
    pending: value => pending.push(value)
  })

  const firstRequest = gate.request('api', 42)
  assert.equal(await gate.request('escape'), false)
  guard.resolve(true)

  assert.equal(await firstRequest, true)
  assert.deepEqual(commits, [{ reason: 'api', value: 42 }])
  assert.deepEqual(pending, [true, false])
})

test('close gate reset makes a pending guard result stale', async () => {
  const guard = deferred()
  const commits = []
  const gate = createCloseGate({
    available: () => true,
    beforeClose: () => guard.promise,
    commit: reason => commits.push(reason),
    error: () => {},
    pending: () => {}
  })

  const request = gate.request('close')
  gate.reset()
  guard.resolve(true)

  assert.equal(await request, false)
  assert.deepEqual(commits, [])
})

test('close gate reports guard errors without committing', async () => {
  const expected = new Error('blocked')
  const errors = []
  const gate = createCloseGate({
    available: () => true,
    beforeClose: async () => { throw expected },
    commit: () => assert.fail('must not commit'),
    error: error => errors.push(error),
    pending: () => {}
  })

  assert.equal(await gate.request('cancel'), false)
  assert.deepEqual(errors, [expected])
})

test('layer manager tracks the most recently entered layer', () => {
  const first = Symbol('first')
  const second = Symbol('second')

  const firstZ = enterLayer(first, 1200)
  const secondZ = enterLayer(second, 1000)

  assert.equal(firstZ, 1200)
  assert.ok(secondZ > firstZ)
  assert.equal(getTopLayer(), second)
  assert.equal(isTopLayer(first), false)
  assert.equal(isTopLayer(second), true)

  leaveLayer(second)
  assert.equal(getTopLayer(), first)
  leaveLayer(first)
  assert.equal(getTopLayer(), undefined)
})
