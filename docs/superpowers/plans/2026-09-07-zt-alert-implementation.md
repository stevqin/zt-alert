# @ztechjs/zt-alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and package five framework-free imperative feedback APIs for npm as `@ztechjs/zt-alert`.

**Architecture:** Focused ES modules implement notices and interactive overlays on native DOM. Dialog, Drawer, and MessageBox share stack, focus, close-gate, and body-lock services while keeping their public behavior independent.

**Tech Stack:** JavaScript ES Modules, CSS custom properties, Node test runner, Playwright, esbuild, npm

**Spec:** `docs/superpowers/specs/2026-09-07-zt-alert-design.md`

## Global Constraints

- Runtime dependencies must remain zero.
- Published API names are `ZtMessage`, `ZtNotification`, `ZtMessageBox`, `ZtDialog`, and `ZtDrawer`.
- Browser syntax targets are Chrome 80+ and Safari 13+.
- All DOM and CSS names are prefixed with `zt-`; public theme variables are prefixed with `--zt-`.
- Plain strings use `textContent`; only the explicit `html` option accepts trusted markup.
- The package is `@ztechjs/zt-alert` version `0.1.0`, public, ES Module-only, and MIT licensed.
- Every behavior change follows a failing-test, minimal-implementation, passing-test cycle.

---

### Task 1: Package Scaffold and Core Services

**Files:**
- Create: `package.json`
- Create: `playwright.config.js`
- Create: `scripts/build.js`
- Create: `scripts/serve.js`
- Create: `src/core/dom.js`
- Create: `src/core/close-gate.js`
- Create: `src/core/layer-manager.js`
- Create: `src/core/scroll-lock.js`
- Create: `src/core/focus-manager.js`
- Test: `tests/unit/core.test.js`

**Interfaces:**
- Produces: `cssLength(value)`, `createElement(tag, className, attrs)`, `mountContent(container, source)`, `waitForTransition(element)`.
- Produces: `createCloseGate({ available, beforeClose, commit, error, pending })` with `request(reason, value)` and `reset()`.
- Produces: `enterLayer(id, minimum)`, `leaveLayer(id)`, `isTopLayer(id)`, `getTopLayer()`.
- Produces: `lockBody(id)`, `unlockBody(id)`.
- Produces: `createFocusManager({ id, panel, enabled, autoFocus })` with `activate()`, `focus()`, and `release()`.

- [ ] **Step 1: Add npm and build configuration**

Create `package.json` with zero `dependencies`, development-only esbuild and Playwright, `exports` for `.` and `./style.css`, and scripts for unit, browser, build, test, and prepublish verification. Create an esbuild script that targets `chrome80,safari13` and emits `dist/index.js` plus `dist/style.css`.

- [ ] **Step 2: Write failing core tests**

```js
test('close gate ignores a second request while the first guard is pending', async () => {
  const first = deferred()
  const commits = []
  const gate = createCloseGate({
    available: () => true,
    beforeClose: () => first.promise,
    commit: (reason) => commits.push(reason),
    error: () => {},
    pending: () => {}
  })
  const request = gate.request('api')
  assert.equal(await gate.request('escape'), false)
  first.resolve(true)
  assert.equal(await request, true)
  assert.deepEqual(commits, ['api'])
})
```

- [ ] **Step 3: Run the core test and verify the missing-module failure**

Run: `npm run test:unit`

Expected: FAIL because `src/core/close-gate.js` and the other core modules do not exist.

- [ ] **Step 4: Implement the core services**

Implement real close serialization, monotonic layer allocation, reference-counted body locking, focus target discovery, and DOM content mounting. Do not access `document` at module evaluation time.

- [ ] **Step 5: Run the core test and build**

Run: `npm run test:unit`

Expected: all core tests PASS.

Run: `npm run build`

Expected: `dist/index.js` and `dist/style.css` are emitted without warnings.

---

### Task 2: Message and Notification

**Files:**
- Create: `src/notice.js`
- Create: `src/message.js`
- Create: `src/notification.js`
- Create: `src/index.js`
- Create: `src/style.css`
- Create: `tests/fixtures/test-page.html`
- Test: `tests/browser/notices.spec.js`

**Interfaces:**
- Produces: `createNoticeService({ variant, defaultDuration })`.
- Produces: `ZtMessage` and `ZtNotification`, each with `open`, `success`, `error`, `warning`, `info`, `close`, and `clear`.

- [ ] **Step 1: Write failing notice browser tests**

```js
test('reusing a message id updates the same DOM item', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.api.ZtMessage.success({ id: 'save', content: '保存中', duration: 0 })
    window.api.ZtMessage.success({ id: 'save', content: '保存成功', duration: 0 })
  })
  await expect(page.locator('.zt-notice')).toHaveCount(1)
  await expect(page.locator('.zt-notice')).toContainText('保存成功')
})
```

- [ ] **Step 2: Run the notice tests and verify the failure**

Run: `npm run test:browser -- tests/browser/notices.spec.js`

Expected: FAIL because the public notice services do not exist.

- [ ] **Step 3: Implement notice services and styles**

Implement lazy hosts, stable IDs, timer restart, keyed in-place updates, independent stacks, close buttons, live-region semantics, enter/leave transitions, and reduced-motion overrides.

- [ ] **Step 4: Run notice tests**

Run: `npm run test:browser -- tests/browser/notices.spec.js`

Expected: creation, shortcut, update, duration, close, and clear cases PASS.

---

### Task 3: MessageBox

**Files:**
- Create: `src/message-box.js`
- Test: `tests/browser/message-box.spec.js`
- Modify: `src/index.js`
- Modify: `src/style.css`

**Interfaces:**
- Produces: callable `ZtMessageBox(...params)`.
- Produces: `alert`, `confirm`, `prompt`, `close`, `getState`, `setDefaults`, `setActionValue`, and `stopLoading` methods.
- Consumes: core layer, focus, scroll-lock, content, and transition services.

- [ ] **Step 1: Write failing MessageBox tests**

```js
test('confirm resolves true only for the confirm action', async ({ page }) => {
  await page.goto('/')
  const result = page.evaluate(() => window.api.ZtMessageBox.confirm('确认发布？'))
  await page.getByRole('button', { name: '确定' }).click()
  expect(await result).toBe(true)
})

test('closeModal false resolves and leaves the box loading', async ({ page }) => {
  await page.goto('/')
  const result = page.evaluate(() => window.api.ZtMessageBox({
    title: '开始查询？',
    buttons: { confirm: { text: '查询', value: 'query', closeModal: false } }
  }))
  await page.getByRole('button', { name: '查询' }).click()
  expect(await result).toBe('query')
  await expect(page.locator('.zt-box')).toHaveAttribute('aria-busy', 'true')
})
```

- [ ] **Step 2: Run MessageBox tests and verify the failure**

Run: `npm run test:browser -- tests/browser/message-box.spec.js`

Expected: FAIL because `ZtMessageBox` is absent.

- [ ] **Step 3: Implement MessageBox**

Normalize SweetAlert-compatible overloads and buttons, render built-in icons and prompt content, enforce one active box, implement timer dismissal, and preserve the box for `closeModal: false`.

- [ ] **Step 4: Run MessageBox tests**

Run: `npm run test:browser -- tests/browser/message-box.spec.js`

Expected: overload, result, timer, input, custom button, state, defaults, and loading cases PASS.

---

### Task 4: Shared Dialog and Drawer Controller

**Files:**
- Create: `src/core/overlay.js`
- Test: `tests/browser/overlay-core.spec.js`

**Interfaces:**
- Produces: `createOverlay(kind, options)` used only by Dialog and Drawer.
- Returns: `{ close, closed, update, setLoading, setConfirmLoading, focus, toggleFullscreen? }`.
- Supplies render controls: `{ close, confirm, update, setLoading, setConfirmLoading, focus, toggleFullscreen? }`.

- [ ] **Step 1: Write failing shared overlay behavior tests**

```js
test('an async beforeClose blocks duplicates and can reject closure', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.guardResolve = null
    window.overlay = window.api.ZtDialog.open({
      title: '保护中的表单',
      beforeClose: () => new Promise(resolve => { window.guardResolve = resolve })
    })
  })
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.guardResolve(false))
  await expect(page.getByRole('dialog')).toBeVisible()
})
```

- [ ] **Step 2: Run overlay core tests and verify the failure**

Run: `npm run test:browser -- tests/browser/overlay-core.spec.js`

Expected: FAIL because `createOverlay` and `ZtDialog` do not exist.

- [ ] **Step 3: Implement the shared overlay lifecycle**

Create the mask, panel, header, body, footer, loading surface, callbacks, render cleanup, dynamic update routing, close result, responsive media query, and cleanup. Connect the shared close gate, layer manager, focus manager, and scroll lock.

- [ ] **Step 4: Run overlay core tests**

Run: `npm run test:browser -- tests/browser/overlay-core.spec.js`

Expected: lifecycle, close guard, cleanup, focus, nesting, Escape, and body lock cases PASS.

---

### Task 5: Dialog and Drawer Public APIs

**Files:**
- Create: `src/dialog.js`
- Create: `src/drawer.js`
- Modify: `src/index.js`
- Modify: `src/style.css`
- Test: `tests/browser/dialog-drawer.spec.js`

**Interfaces:**
- Produces: `ZtDialog.open(options)` and `ZtDrawer.open(options)`.
- Dialog instance additionally produces `toggleFullscreen(force)`.

- [ ] **Step 1: Write failing public API and responsive tests**

```js
test('render receives controls and close resolves after cleanup', async ({ page }) => {
  await page.goto('/')
  const result = page.evaluate(async () => {
    const dialog = window.api.ZtDialog.open({
      title: '编辑资料',
      render(container, controls) {
        const button = document.createElement('button')
        button.textContent = '完成'
        button.onclick = () => controls.close('api', 42)
        container.append(button)
      }
    })
    document.querySelector('.zt-dialog__body button').click()
    return dialog.closed
  })
  expect(await result).toEqual({ reason: 'api', value: 42 })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
```

- [ ] **Step 2: Run Dialog and Drawer tests and verify the failure**

Run: `npm run test:browser -- tests/browser/dialog-drawer.spec.js`

Expected: FAIL because the public wrappers and component-specific rendering are absent.

- [ ] **Step 3: Implement Dialog and Drawer wrappers and presentation**

Add Dialog sizing, top positioning, manual/fullscreen breakpoint behavior, zoom button, and entry motion. Add right-side Drawer sizing, narrow fullscreen behavior, safe-area padding, and slide motion.

- [ ] **Step 4: Run all browser tests**

Run: `npm run test:browser`

Expected: all notice, MessageBox, overlay, Dialog, and Drawer browser tests PASS in Chromium and WebKit.

---

### Task 6: Types, Demo, and Consumer Documentation

**Files:**
- Create: `types/index.d.ts`
- Create: `demo/index.html`
- Create: `demo/demo.js`
- Create: `demo/demo.css`
- Create: `README.md`
- Create: `LICENSE`
- Test: `tests/browser/demo.spec.js`
- Test: `tests/unit/package.test.js`

**Interfaces:**
- Produces: public TypeScript types for notices, MessageBox, overlay options, controls, instances, and close results.
- Produces: a keyboard-accessible demo surface for every public API and important state.

- [ ] **Step 1: Write failing package and demo tests**

```js
test('package exports resolve to built JavaScript, CSS, and declarations', () => {
  assert.equal(pkg.exports['.'].import, './dist/index.js')
  assert.equal(pkg.exports['.'].types, './types/index.d.ts')
  assert.equal(pkg.exports['./style.css'], './dist/style.css')
  assert.deepEqual(pkg.dependencies || {}, {})
})
```

- [ ] **Step 2: Run tests and verify missing artifacts fail**

Run: `npm run test:unit`

Expected: FAIL because declarations, docs, and publish artifacts are incomplete.

- [ ] **Step 3: Add declarations, demo, README, and MIT license**

Document every overload, default, return value, trusted HTML rule, CSS import, theme variable, browser target, and npm usage. Build a compact BI feedback workbench with buttons for each notice status, MessageBox form, Dialog, Drawer, nesting, loading, and async close guards.

- [ ] **Step 4: Run unit and demo tests**

Run: `npm test`

Expected: all Node and browser tests PASS with no page or console errors.

---

### Task 7: Release and Visual Verification

**Files:**
- Modify: any implementation or CSS file only in response to a reproduced test or screenshot defect.
- Generate: `package-lock.json`
- Generate: `dist/index.js`
- Generate: `dist/style.css`

**Interfaces:**
- Consumes: the complete package.
- Produces: publish-ready npm artifacts and verification evidence.

- [ ] **Step 1: Run the complete verification gate**

Run: `npm test`

Expected: all unit and browser tests PASS in Chromium and WebKit.

Run: `npm run build`

Expected: esbuild exits 0 without warnings.

- [ ] **Step 2: Inspect desktop and mobile screenshots**

Run Playwright screenshots at 1440x900 and 390x844. Verify no blank content, clipped text, overlap, unstable controls, broken nesting, or unintended single-color appearance. Add a failing browser regression test before correcting any discovered defect.

- [ ] **Step 3: Verify the npm tarball**

Run: `npm pack --dry-run`

Expected: the manifest lists only `dist/index.js`, `dist/style.css`, `types/index.d.ts`, `README.md`, `LICENSE`, and `package.json`.

- [ ] **Step 4: Review acceptance criteria**

Re-read `docs/superpowers/specs/2026-09-07-zt-alert-design.md` and verify every acceptance criterion against fresh command output and browser behavior. Report any unmet criterion explicitly rather than claiming completion.
