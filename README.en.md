# @ztechjs/zt-alert

[简体中文（主文档）](./README.md) · **English**

A lightweight browser feedback library with zero runtime dependencies. It provides messages, notifications, message boxes, dialogs, drawers, and fullscreen loading overlays. Built with native JavaScript and CSS, its imperative APIs work without component registration or predefined containers, in plain JavaScript pages and applications using Vue, React, or other frameworks.

Rounded panels, soft shadows, translucent surfaces, spring motion, and animated status icons give brief feedback and complex overlays a consistent appearance. Includes TypeScript declarations and supports desktop and mobile layouts.

[Changelog](./CHANGELOG.md) · [Demo source](./demo/) · [Type definitions](./types/index.d.ts) · [MIT license](./LICENSE)

## Components and use cases

| Component | Appearance and interaction | Typical use cases |
| --- | --- | --- |
| `ZtMessage` | Messages at the top center, with stacking and automatic dismissal | Save results, validation feedback, operation status, network errors |
| `ZtNotification` | Cards at the top right, with titles, longer content, and independent stacking | Export completion, background task results, inventory alerts, system notices |
| `ZtMessageBox` | Centered message box with status icons, confirmation, input, and multiple actions | Delete confirmation, risk warnings, name input, asynchronous action confirmation |
| `ZtDialog` | Customizable dialog with fullscreen mode, footer actions, and panel loading | Forms, report previews, complex workflows |
| `ZtDrawer` | Panel entering from the right while preserving page context | Filters, record details, editing in a side panel |
| `ZtLoading` | Fullscreen loading overlay with updatable text, icon, and mask color | Page initialization, report generation, batch processing |

## Demo and visual behavior

Start the interactive demo from the project directory:

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4179/demo/](http://127.0.0.1:4179/demo/). The demo uses project source files directly; refresh after editing to see changes. The demo interface is in Chinese.

| Demo area | Features to explore |
| --- | --- |
| Message | Success, warning, error, and info states; persistent message updates; stacking and repositioning after dismissal; short and long content with or without titles |
| Notification | System notices, completed exports, inventory warnings, and sync errors; stacked cards; title and content combinations |
| MessageBox | Four status icons, no icon, and custom images; regular and destructive confirmation; name input; asynchronous loading; timed dismissal; buttonless messages; custom content and multiple action values |
| Dialog / Drawer | Dialogs, drawers, panel loading, nested overlays, Dialog fullscreen switching, and fullscreen layouts on narrow screens |
| Loading | Default spinner, custom icons, text updates, light and dark masks, and dynamic mask changes |

### Motion and layout

- **Messages and notifications**: Message enters from above and Notification from the right, with an approximately 440ms spring entrance and animated icon strokes. On dismissal, cards contract slightly, then fade toward their entry edge. Remaining cards move smoothly into place after the exit completes.
- **Message updates**: Reusing an ID updates content and restarts the timer without replaying the entrance. Text updates preserve the icon animation; changing status draws the new icon. Reusing an ID during exit restores that message from its current visual position.
- **Message boxes and dialogs**: MessageBox and regular Dialog use an approximately 560ms spring entrance with stretching, compression, and settling rebounds. They shrink before dropping and fading out. Masks fade independently.
- **Status icons**: Built-in MessageBox icons begin drawing during the first panel contraction. The circular outline fades after drawing while the inner symbol remains clear. Custom images and layouts without icons are also supported.
- **Drawers and fullscreen dialogs**: Drawer uses a subtler sideways spring, entering in approximately 480ms and exiting in 330ms. Fullscreen Dialog uses a light fade, with animated panel dimensions when switching modes.
- **Content layout**: Short, multiline, and titled notices wrap naturally, with icons aligned toward the top. Dialog and Drawer scroll only their body by default, keeping headers and footer actions visible.
- **Reduced motion**: Components respect `prefers-reduced-motion`. MessageBox also supports lighter transitions through `shake: false`.

## Installation and quick start

```bash
npm install @ztechjs/zt-alert
```

Import the stylesheet at your application entry point and import the APIs you need:

```js
import {
  ZtMessage,
  ZtNotification,
  ZtMessageBox,
  ZtDialog,
  ZtDrawer,
  ZtLoading
} from '@ztechjs/zt-alert'
import '@ztechjs/zt-alert/style.css'

ZtMessage.success('Saved successfully')

ZtNotification.info({
  title: 'Report updated',
  content: 'The latest sales and inventory data are now available.'
})

const confirmed = await ZtMessageBox.confirm({
  title: 'Delete this record?',
  buttons: ['Cancel', 'Delete']
})
if (confirmed) {
  ZtMessage.success('Deletion confirmed')
}
```

The package ships as ESM, with separate JavaScript, CSS, and type declarations. You can also serve the built `dist/index.js` and `dist/style.css` from a static site, importing them through `<script type="module">` and `<link rel="stylesheet">`. No global variable or UMD build is provided.

Build targets are Chrome 80+ and Safari 13+. Modules can be imported during SSR; open components only after the browser DOM is available, such as in Vue's `onMounted`, React's `useEffect`, or browser event handlers.

Built-in button labels and fallback text are Chinese. Set labels and text explicitly for English interfaces, as shown below. There is no global locale option.

## Message and Notification

Both services share the same calling conventions and options, with separate message queues. Message appears at the top center and dismisses after 3200ms by default. Notification appears at the top right and dismisses after 5200ms. Use them for feedback that does not interrupt the current task.

```js
ZtMessage.success('Saved successfully')
ZtMessage.error('Save failed. Please try again later.')
ZtMessage.warning('Select a record first')
ZtMessage.info('Data is syncing in the background')

ZtNotification.success({
  title: 'Export complete',
  content: 'Sales details are ready in the download center.'
})
```

### Persistent messages, updates, and dismissal

```js
const id = ZtMessage.info({
  id: 'report-export',
  content: 'Generating report…',
  duration: 0,
  closable: false
})

ZtMessage.success({
  id,
  content: 'Report generated',
  duration: 3200
})

ZtMessage.close(id)
ZtMessage.clear()
ZtNotification.clear()
```

IDs are reused only within the same service. Include any title, content, duration, and close-button settings you want to retain when updating a message. `clear()` dismisses only that service's messages and preserves exit animations.

| Option | Type | Default and behavior |
| --- | --- | --- |
| `id` | `string \| number` | Generated automatically; reuse an ID to update an existing message |
| `content` | `string \| number` | Message content, rendered as plain text |
| `title` | `string` | Optional title |
| `status` | `'success' \| 'error' \| 'warning' \| 'info'` | `open()` defaults to `info`; shortcut methods select their corresponding status |
| `duration` | `number` | `3200` for Message, `5200` for Notification, in ms; `0` keeps the message open |
| `closable` | `boolean` | `true`; whether to show the close button |

`open(input)`, `success(input)`, `error(input)`, `warning(input)`, and `info(input)` return a message ID. Pass text, a number, or an options object as `input`. Use `close(id)` to dismiss one message or `clear()` to dismiss all messages in that service.

## MessageBox: alerts, confirmation, and input

Use MessageBox for short interactions requiring attention or an explicit choice. Calls return Promises and work with `async / await`. Only one MessageBox is active at a time. Opening another closes the previous box and resolves its Promise with `null` if it has not already settled.

### Alerts and destructive confirmation

```js
await ZtMessageBox('Operation complete')
await ZtMessageBox('Operation failed', 'Check your connection and try again.', 'error')
await ZtMessageBox.alert({
  title: 'Saved successfully',
  text: 'The new display settings are now active.',
  icon: 'success',
  button: 'OK'
})

const confirmed = await ZtMessageBox.confirm({
  title: 'Delete this record?',
  text: 'This action cannot be undone.',
  icon: 'warning',
  dangerMode: true,
  closeOnClickOutside: false,
  buttons: ['Cancel', 'Delete']
})

if (confirmed) {
  await deleteRecord()
}
```

`alert()` shows a confirm button by default. `confirm()` shows cancel and confirm buttons and returns a boolean. Direct calls return the chosen button's value: `true` for the default confirm action and `null` for cancel. Dismissal through the mask, Esc, timer, or `close()` returns `null`.

### Name input

```js
const name = await ZtMessageBox.prompt({
  title: 'New report',
  text: 'Enter a report name',
  buttons: ['Cancel', 'Create'],
  content: {
    element: 'input',
    attributes: { placeholder: 'Report name', maxlength: 30 }
  }
})

if (name !== null && name.trim()) {
  await createReport(name.trim())
}
```

Use `prompt('Enter a name')` for a default input box. Confirmation returns the entered string; cancellation returns `null`. Perform business validation in your application.

### Multiple actions

```js
const action = await ZtMessageBox({
  title: 'Choose export scope',
  text: 'Select the data to export.',
  buttons: {
    cancel: 'Cancel',
    current: { text: 'Current page', value: 'current' },
    confirm: { text: 'All data', value: 'all' }
  }
})

if (action === 'current' || action === 'all') {
  await exportData(action)
}
```

### Asynchronous button loading

Set `closeModal: false` on a button to return its action value while keeping the box open. The button displays a loading indicator and further interaction is disabled to prevent duplicate submissions.

```js
const action = await ZtMessageBox({
  title: 'Start sync?',
  text: 'Please wait until synchronization finishes.',
  buttons: {
    cancel: 'Cancel',
    confirm: { text: 'Sync', value: 'sync', closeModal: false }
  }
})

if (action === 'sync') {
  try {
    await syncData()
    ZtMessageBox.close()
    ZtMessage.success('Sync complete')
  } catch {
    ZtMessageBox.stopLoading()
    ZtMessage.error('Sync failed. Close the message box and try again.')
  }
}
```

Each call's Promise settles only once. `stopLoading()` restores button interaction without creating another result to await. Close and reopen the box to start another asynchronous attempt.

### Options and helper methods

| Option | Description |
| --- | --- |
| `title` / `text` | Title and description, rendered as plain text |
| `icon` | `success`, `error`, `warning`, `info`, or a custom image URL; omit for no icon |
| `buttons` | Defaults to `true`; accepts a boolean, text, button array, or named button object; `false` hides all buttons |
| `button` | Shorthand for a single confirm button; `buttons` takes precedence when both are provided |
| `content` | Text, a DOM Node, or `{ element, attributes }`; the string `'input'` creates an input field |
| `className` | Custom CSS class for the box |
| `dangerMode` | Defaults to `false`; applies a destructive color to the confirm button |
| `closeOnClickOutside` / `closeOnEsc` | Both default to `true` |
| `shake` | Defaults to `true`; enables spring motion for the box |
| `timer` | Defaults to `0`, with no automatic dismissal; positive values dismiss after the specified ms |

Button objects accept `visible`, `text`, `value`, `className`, and `closeModal`. Both `visible` and `closeModal` are enabled by default.

- `ZtMessageBox.close()`: close the current box.
- `ZtMessageBox.stopLoading()`: end button loading.
- `ZtMessageBox.getState()`: read `isOpen`, button values and loading states, and the timer configuration.
- `ZtMessageBox.setDefaults(options)`: configure defaults for future boxes.
- `ZtMessageBox.setActionValue(value)`: pass a string to update the confirm value, or `{ actionName: value }` to update named actions.

## Dialog: custom workflows

Use Dialog for forms, previews, and workflows requiring custom content. It supports a title, subtitle, close and fullscreen tools, footer actions, panel loading, confirm-button loading, and content mounting with cleanup.

```js
const dialog = ZtDialog.open({
  title: 'Edit report',
  subtitle: 'Configure the report name and display settings',
  width: 720,
  bodyPadding: 24,
  showZoom: true,
  showFooter: true,
  confirmText: 'Save',
  cancelText: 'Cancel',
  closeLabel: 'Close report editor',
  render(container) {
    const input = document.createElement('input')
    input.autofocus = true
    input.placeholder = 'Report name'
    container.append(input)

    return () => input.remove()
  },
  async onConfirm(controls) {
    controls.setConfirmLoading(true)
    let saved = false
    try {
      await saveReport()
      saved = true
    } catch {
      ZtMessage.error('Save failed. Please try again later.')
    } finally {
      controls.setConfirmLoading(false)
    }
    if (saved) {
      await controls.close('api', { saved: true })
    }
  }
})

const result = await dialog.closed
if (result.value?.saved) {
  ZtMessage.success('Report saved')
}
```

The confirm button invokes `onConfirm`; close the dialog explicitly after your operation succeeds. While `loading` or `confirmLoading` is active, all close requests, including `close()`, are blocked. End loading before closing the dialog.

```js
dialog.update({ title: 'Edit report (draft)', confirmDisabled: false })
dialog.setLoading(true, 'Reading report…')
dialog.setLoading(false)
dialog.setConfirmLoading(true)
dialog.setConfirmLoading(false)
dialog.toggleFullscreen(true)
dialog.focus()
```

## Drawer: side panel

Drawer always enters from the right. Use it for details, editing, or filters while retaining the current page context. It shares Dialog's content mounting, asynchronous close guards, footer actions, and loading capabilities.

```js
const drawer = ZtDrawer.open({
  title: 'Filters',
  subtitle: 'Apply to refresh the current report',
  width: 480,
  bodyPadding: 24,
  content: 'Select a brand, season, and channel.',
  showFooter: true,
  confirmText: 'Apply filters',
  cancelText: 'Cancel',
  onConfirm(controls) {
    applyFilters()
    void controls.close('api', { applied: true })
  }
})

const result = await drawer.closed
```

### Close guards

Every Dialog and Drawer close entry point passes through `beforeClose(reason)`. Use it to check unsaved changes or confirm discarding edits. It accepts synchronous or asynchronous results. Returning `false` or throwing keeps the panel open; duplicate close requests are blocked while the guard is pending.

```js
ZtDrawer.open({
  title: 'Edit record',
  content: editorElement,
  beforeClose: async reason => {
    if (reason === 'api' || !hasUnsavedChanges()) return true
    return ZtMessageBox.confirm({
      title: 'Discard unsaved changes?',
      icon: 'warning',
      dangerMode: true,
      buttons: ['Keep editing', 'Discard']
    })
  },
  onCloseError(error) {
    ZtMessage.error(error.message || 'Unable to close. Please try again later.')
  }
})
```

Close reasons are `close` (close button), `cancel` (cancel button), `mask` (mask click), `escape` (Esc), and `api` (the default for programmatic closing).

`await instance.close(reason, value)` returns whether the close request was accepted; it does not wait for the exit animation. `await instance.closed` waits for exit, content cleanup, and focus restoration, then returns `{ reason, value }`.

### Content mounting

Dialog and Drawer accept the following content sources. If several are provided together, precedence is `render` → `html` → `content`:

| Source | Behavior and use case |
| --- | --- |
| `content: string \| number` | Plain descriptions, rendered with `textContent` without HTML parsing |
| `content: Node` | Temporarily moves an existing DOM node into the panel and attempts to restore its position when closed or replaced |
| `render(container, controls)` | Builds DOM or mounts a framework view; may return a cleanup function that runs on close or content replacement |
| `html: string` | Renders trusted HTML with `innerHTML`; sanitize external input first |

Passing `content`, `html`, or `render` to `update()` replaces the previous content configuration and cleans up the old content. Mount Vue or React views inside `render` and return their corresponding unmount operation as the cleanup function.

### Dialog and Drawer options

| Option | Default | Description |
| --- | --- | --- |
| `title` / `subtitle` | `''` / `''` | Title and subtitle |
| `width` | `640` | Numbers are pixels; CSS length strings are also supported |
| `fullscreenBelow` | `768` | Fills the viewport below this width; `0` disables automatic fullscreen |
| `showHeader` / `showClose` | `true` / `true` | Show the header and close button |
| `showFooter` / `showCancelButton` | `false` / `true` | Show footer actions and the cancel button |
| `confirmText` / `cancelText` | `'确定'` / `'取消'` | Confirm and cancel labels; set explicitly for English interfaces |
| `confirmDisabled` | `false` | Disable the confirm button |
| `loading` / `loadingText` | `false` / `'正在加载…'` | Panel loading state and text |
| `confirmLoading` | `false` | Confirm-button loading state |
| `maskClosable` / `escClosable` | `false` / `true` | Allow closing by mask click or Esc |
| `bodyPadding` | `0` | Body padding, as a number or CSS length string |
| `bodyScroll` | `true` | Use the component's body scrolling; set to `false` to manage scrolling in custom content |
| `lockScroll` | `true` | Lock page background scrolling |
| `focusTrap` / `autoFocus` | `true` / `true` | Keep focus inside the panel and focus it on opening |
| `zIndex` | `1000` | Minimum layer level; the shared layer manager assigns the actual level |
| `ariaLabel` / `closeLabel` | Generated automatically | Accessible panel name and close-button label |
| `beforeClose` | — | Close guard; may return a Promise |

Dialog additionally supports `height`, `maxHeight` (default `'88%'`), `top`, `showZoom` (default `false`), and `fullscreen` (default `false`). Drawer has no fullscreen toggle tool; it fills the viewport automatically below its breakpoint.

Lifecycle and error callbacks:

| Callback | When it runs |
| --- | --- |
| `onOpen(controls)` | After mounting and initialization |
| `onShow(controls)` | After entrance completes |
| `onConfirm(controls)` | When the confirm button is clicked or `controls.confirm()` is called |
| `onCancel()` | When a cancel close request is accepted |
| `onClose(reason)` | When closing starts |
| `onHide(reason)` | After exit, content cleanup, and removal |
| `onCloseError(error)` | When a close guard throws |
| `onError(error)` | When content mounting, cleanup, or lifecycle callbacks fail |

Instances expose `update()`, `setLoading()`, `setConfirmLoading()`, `focus()`, `close()`, and `closed`. Dialog also exposes `toggleFullscreen(force?)`. The `render`, `onOpen`, `onShow`, and `onConfirm` callbacks receive controls for operating the current overlay.

## Loading: fullscreen progress feedback

Use Loading for tasks that temporarily block page interaction. It shows a rotating spinner and the default text “正在加载…” unless customized. Brand images and DOM icons are also supported.

```js
const loading = ZtLoading.open({
  icon: '/icons/logo.svg',
  text: 'Reading data…',
  maskColor: 'rgba(20, 24, 32, 0.65)'
})

try {
  const data = await loadData()
  loading.update({ text: 'Generating report…' })
  await generateReport(data)
} finally {
  await loading.close()
}
```

You can also use `ZtLoading.open('Loading…')` or close the current instance with `ZtLoading.close()`.

| Option | Default and behavior |
| --- | --- |
| `text` | `'正在加载…'`, rendered as plain text; an empty string hides the text |
| `icon` | Default spinner; accepts an image URL or DOM Element; `null` restores the default icon |
| `maskColor` | `rgba(20, 24, 32, 0.2)`; accepts CSS colors with transparency; `null` restores the CSS theme color |
| `zIndex` | Minimum `6000`; configure when first opening |

- **Live updates**: Use `loading.update({ text, icon, maskColor })` or `loading.update('New text')` without replaying the entrance. DOM icons are cloned, leaving their original nodes in place.
- **Text contrast**: Chooses dark gray or soft white based on the mask composited over solid `html` / `body` backgrounds. It recalculates when page themes, mask colors, or system color schemes change. Background images, gradients, video, and local content are not sampled; use a more opaque mask on these pages.
- **Interaction and closing**: Locks scrolling and keyboard focus. It does not dismiss automatically or close on Esc or mask clicks. Both `close()` and `closed` can wait for the full exit.
- **Instance reuse**: Calling `open()` while an active Loading exists updates and returns that instance. Coordinate concurrent tasks in your application before closing; there is no built-in request counter. Closed instances do not affect subsequently opened ones.

## Nested overlays and keyboard interaction

Dialog, Drawer, MessageBox, and Loading share layer, focus, and scroll-lock management for flows such as editing in a drawer and then confirming whether to discard changes.

- The top interactive overlay handles Esc, preventing one keypress from closing several layers.
- Focus stays within the current overlay by default, with Tab / Shift+Tab cycling. Closing restores the previous focus.
- Background scrolling remains locked until all relevant overlays release their locks. Focus and scroll management stay active during exit animations.
- Panels provide ARIA dialog semantics and accessible names. Messages and loading text expose status information to assistive technology.

## Theme customization

Override CSS variables after the component stylesheet to customize colors, fonts, corners, shadows, and the loading mask:

```css
:root {
  --zt-font: "PingFang SC", "Microsoft YaHei", sans-serif;
  --zt-ink: #202020;
  --zt-muted: #626262;
  --zt-accent: #245edb;
  --zt-accent-ink: #244c9e;
  --zt-accent-soft: #f0f5ff;
  --zt-success: #1f8657;
  --zt-warning: #a96b13;
  --zt-error: #bd3f3b;
  --zt-radius: 16px;
  --zt-shadow: 0 12px 34px rgba(28, 37, 49, 0.15);
  --zt-loading-mask: rgba(20, 24, 32, 0.2);
}
```

Overlays mount under `document.body`. Define theme variables on `:root`, `html`, `body`, or another ancestor from which those overlays can inherit them.

## Development and verification

Local development requires Node.js 18+. From the project directory, run:

```bash
npm install
npx playwright install chromium webkit
npm run dev
```

Run checks or build in a separate terminal:

```bash
npm run test:unit
npm run test:types
npm run test:browser
npm run test:webkit
npm run build
npm pack --dry-run
```

`npm test` runs unit tests, type checks, and Chromium browser tests. `npm run test:all` also runs WebKit tests. `npm run build` generates `dist/index.js` and `dist/style.css`. The npm package includes build output, type declarations, both README files, the changelog, and the license.

## License

[MIT](./LICENSE)
