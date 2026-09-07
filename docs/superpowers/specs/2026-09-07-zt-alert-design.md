# @ztechjs/zt-alert Design

## Summary

`@ztechjs/zt-alert` is a framework-free feedback and overlay library for the BI Portal and other browser applications. It exposes five imperative ES Module APIs: `ZtMessage`, `ZtNotification`, `ZtMessageBox`, `ZtDialog`, and `ZtDrawer`.

The package mirrors the established behavior of these BI Portal components:

- `bip_frontend/src/components/zt-alert`
- `bip_frontend/src/components/portal-modal`
- `bip_frontend/src/components/portal-drawer`

The implementation uses browser DOM APIs only. The published package has no runtime dependencies and supports Chrome 80+ and Safari 13+.

## Goals

- Provide the five feedback and overlay primitives through an imperative ES Module API.
- Preserve the current BI Portal naming, defaults, visual language, and close semantics where they make sense outside Vue.
- Support plain text, explicitly trusted HTML, DOM nodes, and render callbacks for Dialog and Drawer content.
- Handle nested overlays, asynchronous close guards, focus trapping, focus restoration, body scroll locking, and responsive fullscreen behavior.
- Publish as the public MIT-licensed npm package `@ztechjs/zt-alert` with TypeScript declarations.
- Keep runtime dependencies at zero and require no application framework.

## Non-goals

- Vue, React, or other framework adapters.
- Declarative custom elements or Shadow DOM.
- A global browser variable or UMD build.
- Drawer directions other than right-to-left.
- Dragging, resizing, or persisted Dialog position.
- Sanitizing arbitrary HTML. Applications remain responsible for sanitizing untrusted input before passing it as `html`.

## Package Layout

```text
zt-alert/
├── src/
│   ├── core/
│   │   ├── close-gate.js
│   │   ├── dom.js
│   │   ├── focus-manager.js
│   │   ├── layer-manager.js
│   │   └── scroll-lock.js
│   ├── dialog.js
│   ├── drawer.js
│   ├── index.js
│   ├── message-box.js
│   ├── message.js
│   ├── notification.js
│   └── style.css
├── types/
│   └── index.d.ts
├── demo/
│   ├── demo.js
│   └── index.html
├── tests/
├── scripts/
├── dist/
├── docs/superpowers/specs/
├── LICENSE
├── README.md
└── package.json
```

`src/index.js` is the source entry. The build emits the publishable ESM entry and CSS to `dist/`. `package.json` uses a `files` allowlist so npm receives only `dist`, `types`, `README.md`, and `LICENSE`.

Consumers use the package as follows:

```js
import {
  ZtMessage,
  ZtNotification,
  ZtMessageBox,
  ZtDialog,
  ZtDrawer
} from '@ztechjs/zt-alert'
import '@ztechjs/zt-alert/style.css'
```

The package sets `type: "module"`, defines `exports` for `.` and `./style.css`, and points `types` at `types/index.d.ts`. The initial version is `0.1.0`, `publishConfig.access` is `public`, and the license is MIT.

## Shared Overlay Architecture

Message and Notification each create a lazy singleton host. MessageBox, Dialog, and Drawer create a new DOM tree per open instance but share the following services:

- The layer manager assigns increasing z-index values, tracks open overlays, and identifies the top overlay.
- The focus manager finds usable focus targets, traps Tab and Shift+Tab inside the top overlay, and restores the previously focused element after close.
- The scroll lock stores the body's prior inline styles and uses reference counting so nested overlays do not unlock scrolling too early.
- The close gate serializes close requests and gives each instance an epoch. A stale asynchronous `beforeClose` result cannot close an already destroyed or superseded instance.
- DOM helpers create namespaced elements and icons, normalize CSS lengths, mount content, and wait for transitions.

Global keyboard and focus listeners are installed only while an interactive overlay exists. Each instance removes timers, media-query listeners, event listeners, references, and DOM nodes after its exit transition.

Safari 13 does not provide a dependable `inert` implementation. Lower overlays are therefore disabled through top-layer checks, `aria-hidden`, pointer-event rules, and focus redirection rather than relying on `inert`.

## Message and Notification

Both services implement the same API:

```js
ZtMessage.open(input)
ZtMessage.success(input)
ZtMessage.error(input)
ZtMessage.warning(input)
ZtMessage.info(input)
ZtMessage.close(id)
ZtMessage.clear()
```

`input` may be a string, number, or options object. Options include `id`, `title`, `content`, `status`, `duration`, and `closable`.

- Message appears at the top center and closes after 3200 ms by default.
- Notification appears at the top right and closes after 5200 ms by default.
- `duration: 0` creates a persistent notice.
- Reusing an `id` updates the existing notice in place and restarts its timer.
- Each service owns independent `close` and `clear` operations.
- The service returns the notice ID immediately.
- Notice hosts use `aria-live="polite"`; errors use an assertive announcement without repeatedly announcing unchanged updates.

## MessageBox

MessageBox retains the existing explicit and SweetAlert-compatible APIs:

```js
await ZtMessageBox('提示内容')
await ZtMessageBox('操作失败', '请稍后重试', 'error')

await ZtMessageBox.alert(options)
await ZtMessageBox.confirm(options)
await ZtMessageBox.prompt(options)

ZtMessageBox.close()
ZtMessageBox.getState()
ZtMessageBox.setDefaults(options)
ZtMessageBox.setActionValue(options)
ZtMessageBox.stopLoading()
```

Supported options are `title`, `text`, `icon`, `buttons`, `button`, `content`, `className`, `closeOnClickOutside`, `closeOnEsc`, `dangerMode`, `shake`, and `timer`. Built-in icons are `success`, `warning`, `error`, and `info`.

Button normalization follows the current BI Portal behavior. A button with `closeModal: false` resolves the call with its value, keeps the box open, and enters loading state. `stopLoading()` restores interaction and `close()` destroys the retained box. Prompt returns a string or `null`; confirm returns a boolean.

Only one MessageBox is active at a time. Opening a new one closes the prior box with a neutral result before mounting the replacement.

## Dialog and Drawer

Dialog and Drawer share a common options model where appropriate:

- Content: `content`, `html`, or `render(container, controls)`.
- Header: `title`, `subtitle`, `showHeader`, `showClose`, `closeLabel`, `ariaLabel`.
- Footer: `showFooter`, `showCancelButton`, `confirmText`, `cancelText`, `confirmDisabled`.
- State: `loading`, `loadingText`, `confirmLoading`.
- Close behavior: `maskClosable`, `escClosable`, `beforeClose`.
- Layout: `bodyScroll`, `bodyPadding`, `fullscreenBelow`, `zIndex`.
- Accessibility: `lockScroll`, `focusTrap`, `autoFocus`.
- Callbacks: `onOpen`, `onShow`, `onConfirm`, `onCancel`, `onClose`, `onHide`, `onCloseError`, `onError`.

Dialog also supports `width`, `height`, `maxHeight`, `top`, `showZoom`, `fullscreen`, and `toggleFullscreen()`. Drawer supports `width` and opens only from the right.

`content` strings are inserted using `textContent`. Trusted markup requires the explicit `html` option. Before moving a DOM Node into the body, the library records its parent and next sibling. On close it restores the node before that sibling when both are still connected, appends it to the recorded parent when only the parent remains connected, or leaves it detached when the original parent no longer exists. `render(container, controls)` may build arbitrary native DOM and can optionally return a cleanup function, which runs during destruction.

`ZtDialog.open(options)` and `ZtDrawer.open(options)` return an instance immediately:

```js
const instance = ZtDialog.open(options)

instance.update(partialOptions)
instance.setLoading(loading, optionalText)
instance.setConfirmLoading(loading)
instance.focus()
await instance.close(reason, value)
const result = await instance.closed
```

Dialog instances additionally expose `toggleFullscreen(force?)`.

`closed` resolves once, after the exit transition and cleanup, with `{ reason, value }`. Close reasons are `close`, `cancel`, `mask`, `escape`, and `api`. The close button, cancel button, mask, Escape, and `instance.close()` all pass through `beforeClose`. A `false` result or thrown error keeps the overlay open. Loading, confirm loading, and a pending close guard prevent duplicate interaction.

The built-in confirm button does not close automatically. It invokes `onConfirm(controls)`, and the owner closes only after validation or persistence succeeds. If `onConfirm` returns a rejected Promise, `onError` receives the error and the overlay stays open.

`update()` changes supported presentation and state fields without remounting render-callback content. Unknown fields are ignored and generate a development warning. Structural content replacement is allowed only when the update explicitly provides `content`, `html`, or `render`; the prior render cleanup runs first.

## Visual Design

The visual system carries over the BI Portal's restrained glass treatment:

- Ink: `#202020`
- Muted text: `#626262`
- Accent blue: `#245edb`
- Success: `#1f8657`
- Warning: `#a96b13`
- Error: `#bd3f3b`

The type stack is `-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `PingFang SC`, `Microsoft YaHei`, and `sans-serif`. Letter spacing remains zero.

Dialog and Drawer use translucent white panels, subtle neutral shadows, fixed headers and footers, and 36 px circular icon buttons. Message is top-centered; Notification is independently stacked at the top right. Stable dimensions prevent icons, loading labels, and dynamic content from shifting the surrounding layout.

Motion is concentrated in overlay entry and exit: Dialog rises slightly, Drawer slides from the right, notices move along their stacking direction, and MessageBox status icons draw in. `prefers-reduced-motion: reduce` removes transforms, transition choreography, and decorative icon animation.

All public styling is namespaced under `zt-` classes. Color, typography, radius, shadow, spacing, and motion values are exposed as `--zt-*` custom properties. Mobile layouts make Dialog and Drawer fullscreen below their configured breakpoint; MessageBox becomes a bottom-aligned sheet with full-width actions.

## Accessibility

- Interactive overlays use `role="dialog"`, `aria-modal="true"`, an associated visible title, or a required fallback accessible label.
- Loading surfaces use `aria-busy` and a status announcement.
- Escape affects only the top eligible overlay and ignores composition events.
- Focus enters the first `[autofocus]` element, otherwise the first usable control, otherwise the panel itself.
- Tab and Shift+Tab cycle within the top overlay when focus trapping is enabled.
- Focus returns to the previously active connected element after the top overlay closes.
- All controls have visible `:focus-visible` treatment, accessible names, stable hit areas, and disabled states.
- Pointer dismissal requires both pointer-down and click to originate on the mask, preventing accidental close after text selection or dragging.

## Error Handling and Security

- Plain strings are always text. The `html` option is intentionally unsanitized and documented as trusted-only.
- A render callback error leaves the overlay mounted and invokes `onError(error)`. Without an error callback, the error is reported asynchronously to the console.
- A `beforeClose` rejection leaves the overlay open and invokes `onCloseError(error)`.
- User callbacks run behind a small error boundary so cleanup and shared overlay state remain consistent.
- Public close, update, and state methods are idempotent after destruction.
- The library reads browser globals only when an API is invoked, allowing the module to be imported during SSR without immediately throwing.

## Build and Publication

The source remains ordinary browser JavaScript. Esbuild bundles and minifies the ESM entry for the Chrome 80 and Safari 13 syntax targets, processes the standalone CSS, and writes `dist/index.js` and `dist/style.css`. Node's built-in test runner covers DOM-independent core logic, and Playwright runs browser behavior and screenshot checks in Chromium and WebKit. Esbuild and Playwright are development-only dependencies; the published artifact has zero dependencies.

Required scripts are:

```text
npm run build
npm test
npm run test:browser
npm run prepublishOnly
npm pack --dry-run
```

`prepublishOnly` runs the complete test and build gate. The repository uses npm as its package manager and commits `package-lock.json`.

## Verification

Automated browser tests cover:

- Message and Notification creation, timed removal, persistence, ID updates, close, and clear.
- MessageBox overload normalization, alert/confirm/prompt results, timers, custom button values, and retained loading state.
- Dialog and Drawer render modes, lifecycle callbacks, updates, returned results, and cleanup.
- Synchronous and asynchronous close guards, rejected guards, duplicate requests, and stale promises.
- Nested layer order, Escape ownership, body lock reference counts, focus trapping, and focus restoration.
- Desktop, narrow mobile, and configured fullscreen breakpoints.
- Reduced-motion behavior and essential ARIA relationships.

The demo presents all five APIs as an actual control surface rather than a marketing page. It includes nested Dialog and Drawer examples, async confirm and close cases, prompt input, notice updates, loading states, and theme-variable overrides.

Before release, verification runs the unit/browser suite, production build, package dry run, and browser screenshots at desktop and mobile sizes. The package dry run must contain only the documented publish files, and the built demo must produce no console errors.

## Acceptance Criteria

- All five documented APIs work through native DOM calls with no runtime dependency.
- Chrome 80+ and Safari 13+ are supported by syntax and behavior.
- Dialog, Drawer, and MessageBox coordinate nesting, focus, Escape, and scroll lock correctly.
- Every open instance releases its global resources and DOM after close.
- TypeScript consumers receive declarations for all public inputs, options, callbacks, instances, and results.
- The demo exercises all core states on desktop and mobile.
- `npm test`, `npm run build`, and `npm pack --dry-run` pass.
- The package metadata is ready to publish publicly as `@ztechjs/zt-alert` version `0.1.0` under the MIT License.
