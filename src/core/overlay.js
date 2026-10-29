import { createCloseGate } from './close-gate.js'
import { createDialogMotion } from './dialog-motion.js'
import { cssLength } from './dom.js'
import { createFocusManager } from './focus-manager.js'
import { enterLayer, isTopLayer, leaveLayer, subscribeLayerChanges } from './layer-manager.js'
import { lockBody, unlockBody } from './scroll-lock.js'
import { afterPanelExit, motionDuration, rememberExitPose } from './panel-motion.js'

const controllers = []
let overlaySequence = 0

const BASE_DEFAULTS = {
  title: '',
  subtitle: '',
  width: 640,
  fullscreenBelow: 768,
  showHeader: true,
  showClose: true,
  showFooter: false,
  showCancelButton: true,
  confirmText: '确定',
  cancelText: '取消',
  confirmDisabled: false,
  loading: false,
  loadingText: '正在加载…',
  confirmLoading: false,
  maskClosable: false,
  escClosable: true,
  lockScroll: true,
  focusTrap: true,
  autoFocus: true,
  bodyScroll: true,
  bodyPadding: 0,
  zIndex: 1000
}

const DIALOG_DEFAULTS = {
  ...BASE_DEFAULTS,
  maxHeight: '88%',
  showZoom: false,
  fullscreen: false
}

function iconMarkup(name) {
  const paths = {
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
    maximize: '<path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/>',
    minimize: '<path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5"/>'
  }
  return `<svg class="zt-icon zt-icon--${name}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`
}

function reportError(options, error) {
  if (typeof options.onError === 'function') options.onError(error)
  else console.error('[zt-alert]', error)
}

function syncLayerStates() {
  for (const controller of controllers) {
    const top = isTopLayer(controller.id)
    controller.elements.layer.classList.toggle('zt-overlay--underneath', !top)
    controller.elements.layer.setAttribute('aria-hidden', top ? 'false' : 'true')
    if (top) controller.elements.panel.setAttribute('aria-modal', 'true')
    else controller.elements.panel.removeAttribute('aria-modal')
  }
}

subscribeLayerChanges(syncLayerStates)

function restoreNode(record) {
  const { node, parent, nextSibling } = record
  if (!parent?.isConnected) {
    node.remove()
    return
  }
  if (nextSibling?.isConnected && nextSibling.parentNode === parent) parent.insertBefore(node, nextSibling)
  else parent.append(node)
}

function makeButton(className, label, icon) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.setAttribute('aria-label', label)
  if (icon) button.innerHTML = iconMarkup(icon)
  return button
}

function createElements(kind, titleId) {
  const layer = document.createElement('div')
  layer.className = `zt-overlay zt-${kind}`

  const panel = document.createElement('section')
  panel.className = `zt-overlay__panel zt-${kind}__panel`
  panel.setAttribute('role', 'dialog')
  panel.tabIndex = -1

  const header = document.createElement('header')
  header.className = `zt-overlay__header zt-${kind}__header`
  const heading = document.createElement('div')
  heading.className = 'zt-overlay__heading'
  const title = document.createElement('h2')
  title.id = titleId
  const subtitle = document.createElement('p')
  heading.append(title, subtitle)
  const tools = document.createElement('div')
  tools.className = 'zt-overlay__tools'
  const zoom = makeButton('zt-overlay__tool zt-overlay__zoom', '全屏弹窗', 'maximize')
  zoom.insertAdjacentHTML('beforeend', iconMarkup('minimize'))
  const close = makeButton('zt-overlay__tool zt-overlay__close', '关闭弹窗', 'close')
  tools.append(zoom, close)
  header.append(heading, tools)

  const body = document.createElement('div')
  body.className = `zt-overlay__body zt-${kind}__body`

  const footer = document.createElement('footer')
  footer.className = `zt-overlay__footer zt-${kind}__footer`
  const cancel = makeButton('zt-overlay__button zt-overlay__button--cancel', '取消')
  const confirm = makeButton('zt-overlay__button zt-overlay__button--primary', '确定')
  const cancelLabel = document.createElement('span')
  const confirmLabel = document.createElement('span')
  cancelLabel.className = confirmLabel.className = 'zt-overlay__button-label'
  cancel.append(cancelLabel)
  confirm.append(confirmLabel)
  footer.append(cancel, confirm)

  const loading = document.createElement('div')
  loading.className = 'zt-overlay__loading'
  loading.setAttribute('role', 'status')
  loading.innerHTML = '<span class="zt-overlay__spinner" aria-hidden="true"></span><span class="zt-overlay__loading-text"></span>'

  panel.append(header, body, footer, loading)
  layer.append(panel)
  return { body, cancel, cancelLabel, close, confirm, confirmLabel, footer, header, layer, loading, panel, subtitle, title, tools, zoom }
}

export function createOverlay(kind, inputOptions = {}) {
  if (typeof document === 'undefined') throw new Error(`Zt${kind === 'dialog' ? 'Dialog' : 'Drawer'} requires a browser document`)

  const options = { ...(kind === 'dialog' ? DIALOG_DEFAULTS : BASE_DEFAULTS), ...inputOptions }
  const id = Symbol(`zt-${kind}`)
  const titleId = `zt-${kind}-title-${++overlaySequence}`
  const elements = createElements(kind, titleId)
  const dialogMotion = kind === 'dialog' ? createDialogMotion(elements.panel) : undefined
  const zIndex = enterLayer(id, options.zIndex)
  const index = controllers.length
  let active = true
  let destroying = false
  let guardPending = false
  let contentCleanup
  let media
  let narrow = false
  let showTimer
  let entranceFrame
  let resolveClosed

  const closed = new Promise(resolve => { resolveClosed = resolve })
  const controller = { id, elements }
  controllers.push(controller)

  const focusManager = createFocusManager({
    id,
    panel: () => elements.panel,
    enabled: () => options.focusTrap,
    autoFocus: () => options.autoFocus
  })

  function busy() {
    return Boolean(options.loading || options.confirmLoading || guardPending || destroying)
  }

  function controls() {
    return {
      close: instance.close,
      confirm,
      update: instance.update,
      setLoading: instance.setLoading,
      setConfirmLoading: instance.setConfirmLoading,
      focus: instance.focus,
      ...(kind === 'dialog' ? { toggleFullscreen: instance.toggleFullscreen } : {})
    }
  }

  function cleanContent() {
    if (!contentCleanup) return
    const cleanup = contentCleanup
    contentCleanup = undefined
    try {
      cleanup()
    } catch (error) {
      reportError(options, error)
    }
  }

  function mountContent() {
    cleanContent()
    elements.body.replaceChildren()

    try {
      if (Object.prototype.hasOwnProperty.call(options, 'render') && typeof options.render === 'function') {
        const cleanup = options.render(elements.body, controls())
        if (typeof cleanup === 'function') contentCleanup = cleanup
        return
      }
      if (Object.prototype.hasOwnProperty.call(options, 'html')) {
        elements.body.innerHTML = options.html == null ? '' : String(options.html)
        return
      }
      if (typeof Node !== 'undefined' && options.content instanceof Node) {
        const record = {
          node: options.content,
          parent: options.content.parentNode,
          nextSibling: options.content.nextSibling
        }
        elements.body.append(options.content)
        contentCleanup = () => restoreNode(record)
        return
      }
      if (options.content !== undefined && options.content !== null) {
        elements.body.textContent = String(options.content)
      }
    } catch (error) {
      reportError(options, error)
    }
  }

  function expanded() {
    return kind === 'dialog' && Boolean(options.fullscreen || narrow)
  }

  function renderState() {
    const isExpanded = expanded()
    const animateResize = dialogMotion && active && elements.layer.isConnected && elements.layer.classList.contains('zt-overlay--visible') &&
      (dialogMotion.active || elements.layer.classList.contains('zt-dialog--fullscreen') !== isExpanded) &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const previousBounds = animateResize ? dialogMotion.read() : undefined
    if (animateResize) elements.layer.classList.add('zt-overlay--settled')
    if (active) dialogMotion?.reset()
    elements.layer.style.zIndex = String(zIndex)
    elements.title.textContent = options.title || '详情'
    elements.title.title = elements.title.textContent
    elements.subtitle.textContent = options.subtitle || ''
    elements.subtitle.title = elements.subtitle.textContent
    elements.subtitle.hidden = !options.subtitle
    elements.header.hidden = !options.showHeader
    elements.close.hidden = !options.showClose
    elements.close.setAttribute('aria-label', options.closeLabel || `关闭${options.title || (kind === 'dialog' ? '弹窗' : '抽屉')}`)
    elements.close.title = elements.close.getAttribute('aria-label')
    elements.zoom.hidden = kind !== 'dialog' || !options.showZoom || narrow
    elements.zoom.classList.toggle('zt-overlay__zoom--expanded', isExpanded)
    elements.zoom.setAttribute('aria-label', isExpanded ? '还原弹窗' : '全屏弹窗')
    elements.zoom.title = elements.zoom.getAttribute('aria-label')
    elements.footer.hidden = !options.showFooter
    elements.cancel.hidden = !options.showCancelButton
    elements.cancelLabel.textContent = options.cancelText
    elements.cancel.setAttribute('aria-label', options.cancelText)
    elements.cancel.title = options.cancelText
    elements.confirm.replaceChildren()
    if (options.confirmLoading) {
      const spinner = document.createElement('span')
      spinner.className = 'zt-overlay__spinner'
      spinner.setAttribute('aria-hidden', 'true')
      elements.confirmLabel.textContent = '正在处理…'
      elements.confirm.append(spinner, elements.confirmLabel)
      elements.confirm.setAttribute('aria-label', '正在处理')
    } else {
      elements.confirmLabel.textContent = options.confirmText
      elements.confirm.append(elements.confirmLabel)
      elements.confirm.setAttribute('aria-label', options.confirmText)
    }
    elements.confirm.title = elements.confirm.getAttribute('aria-label')
    elements.close.disabled = busy()
    elements.zoom.disabled = busy()
    elements.cancel.disabled = busy()
    elements.confirm.disabled = busy() || options.confirmDisabled
    elements.panel.setAttribute('aria-busy', String(busy()))
    if (options.ariaLabel) {
      elements.panel.setAttribute('aria-label', options.ariaLabel)
      elements.panel.removeAttribute('aria-labelledby')
    } else {
      elements.panel.removeAttribute('aria-label')
      elements.panel.setAttribute('aria-labelledby', titleId)
    }
    elements.loading.hidden = !options.loading
    elements.loading.querySelector('.zt-overlay__loading-text').textContent = options.loadingText
    elements.body.classList.toggle('zt-overlay__body--custom-scroll', !options.bodyScroll)
    elements.body.style.padding = cssLength(options.bodyPadding) ?? ''

    if (kind === 'dialog') {
      elements.layer.classList.toggle('zt-dialog--fullscreen', isExpanded)
      elements.layer.classList.toggle('zt-dialog--top', options.top !== undefined && !isExpanded)
      elements.layer.style.paddingTop = !isExpanded && options.top !== undefined ? cssLength(options.top) : ''
      if (!dialogMotion.active) {
        elements.panel.style.width = isExpanded ? '' : cssLength(options.width) ?? ''
        elements.panel.style.height = isExpanded ? '' : cssLength(options.height) ?? ''
        elements.panel.style.maxHeight = isExpanded ? '' : cssLength(options.maxHeight) ?? ''
      }
      if (previousBounds) dialogMotion.play(previousBounds)
    } else {
      elements.layer.classList.toggle('zt-drawer--narrow', narrow)
      elements.panel.style.width = narrow ? '' : cssLength(options.width) ?? ''
    }
  }

  function updateNarrow() {
    narrow = media?.matches ?? false
    renderState()
  }

  function removeMedia() {
    if (!media) return
    if (media.removeEventListener) media.removeEventListener('change', updateNarrow)
    else media.removeListener(updateNarrow)
    media = undefined
  }

  function setupMedia() {
    removeMedia()
    if (options.fullscreenBelow > 0) {
      media = window.matchMedia(`(max-width: ${options.fullscreenBelow - 0.02}px)`)
      if (media.addEventListener) media.addEventListener('change', updateNarrow)
      else media.addListener(updateNarrow)
    }
    narrow = media?.matches ?? false
  }

  function invoke(name, ...args) {
    if (typeof options[name] !== 'function') return
    try {
      const result = options[name](...args)
      if (result?.catch) result.catch(error => reportError(options, error))
      return result
    } catch (error) {
      reportError(options, error)
    }
  }

  function finishClose(reason, value) {
    clearTimeout(showTimer)
    dialogMotion?.reset()
    cleanContent()
    focusManager.release()
    removeMedia()
    document.removeEventListener('keydown', keydown, true)
    leaveLayer(id)
    unlockBody(id)
    elements.layer.remove()
    const at = controllers.indexOf(controller)
    if (at !== -1) controllers.splice(at, 1)
    syncLayerStates()
    invoke('onHide', reason)
    resolveClosed({ reason, value })
  }

  function beginClose(reason, value) {
    if (destroying) return
    cancelAnimationFrame(entranceFrame)
    clearTimeout(showTimer)
    const closingBounds = dialogMotion?.active ? dialogMotion.read() : undefined
    dialogMotion?.reset()
    destroying = true
    active = false
    invoke('onClose', reason)
    if (reason === 'cancel') invoke('onCancel')
    renderState()
    if (closingBounds) dialogMotion.freeze(closingBounds)
    rememberExitPose(elements.panel)
    elements.layer.classList.add('zt-overlay--leaving')
    afterPanelExit(elements.layer, elements.panel, () => finishClose(reason, value))
  }

  const gate = createCloseGate({
    available: () => active && !options.loading && !options.confirmLoading,
    beforeClose: reason => options.beforeClose?.(reason),
    pending: value => {
      guardPending = value
      if (!destroying) renderState()
    },
    commit: beginClose,
    error: error => invoke('onCloseError', error)
  })

  function confirm() {
    if (busy() || options.confirmDisabled) return
    invoke('onConfirm', controls())
  }

  function keydown(event) {
    if (!active || !isTopLayer(id)) return
    if (event.key === 'Escape' && !event.isComposing) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (options.escClosable && !busy()) void instance.close('escape')
    }
  }

  const instance = {
    closed,
    close: (reason = 'api', value) => gate.request(reason, value),
    update(partial = {}) {
      if (!active || !partial || typeof partial !== 'object') return instance
      const replacesContent = ['content', 'html', 'render'].some(key => Object.prototype.hasOwnProperty.call(partial, key))
      if (replacesContent) {
        delete options.content
        delete options.html
        delete options.render
      }
      Object.assign(options, partial)
      if (Object.prototype.hasOwnProperty.call(partial, 'fullscreenBelow')) setupMedia()
      if (Object.prototype.hasOwnProperty.call(partial, 'lockScroll')) {
        if (options.lockScroll) lockBody(id)
        else unlockBody(id)
      }
      if (replacesContent) mountContent()
      renderState()
      return instance
    },
    setLoading(value, text) {
      options.loading = Boolean(value)
      if (text !== undefined) options.loadingText = String(text)
      renderState()
      return instance
    },
    setConfirmLoading(value) {
      options.confirmLoading = Boolean(value)
      renderState()
      return instance
    },
    focus() {
      focusManager.focus()
      return instance
    }
  }

  if (kind === 'dialog') {
    instance.toggleFullscreen = force => {
      if (!active) return instance
      options.fullscreen = typeof force === 'boolean' ? force : !options.fullscreen
      renderState()
      return instance
    }
  }

  elements.close.addEventListener('click', () => { void instance.close('close') })
  elements.cancel.addEventListener('click', () => { void instance.close('cancel') })
  elements.confirm.addEventListener('click', confirm)
  elements.zoom.addEventListener('click', () => instance.toggleFullscreen?.())
  let maskStart = false
  elements.layer.addEventListener('mousedown', event => { maskStart = event.target === elements.layer })
  elements.layer.addEventListener('click', event => {
    if (maskStart && event.target === elements.layer && options.maskClosable && isTopLayer(id) && !busy()) {
      void instance.close('mask')
    }
    maskStart = false
  })

  setupMedia()
  renderState()
  mountContent()
  document.body.append(elements.layer)
  if (options.lockScroll) lockBody(id)
  document.addEventListener('keydown', keydown, true)
  focusManager.activate()
  syncLayerStates()
  invoke('onOpen', controls())
  if (kind === 'dialog') {
    for (const path of elements.tools.querySelectorAll('.zt-icon path')) {
      path.style.setProperty('--zt-tool-stroke-length', String(path.getTotalLength() + 2))
    }
    // Commit the collapsed state even when automatic focus is disabled.
    elements.panel.getBoundingClientRect()
  }
  // Let the hidden pose paint before starting the panel and mask timelines.
  entranceFrame = requestAnimationFrame(() => {
    entranceFrame = requestAnimationFrame(() => {
      entranceFrame = undefined
      if (!active) return
      elements.layer.classList.add('zt-overlay--visible')
      showTimer = setTimeout(() => {
        elements.layer.classList.add('zt-overlay--settled')
        invoke('onShow', controls())
      }, Math.max(motionDuration(elements.panel, true), motionDuration(elements.panel)))
    })
  })

  return instance
}
