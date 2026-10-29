import { createFocusManager } from './core/focus-manager.js'
import { enterLayer, isTopLayer, leaveLayer, subscribeLayerChanges } from './core/layer-manager.js'
import { createLoadingContrast } from './core/loading-contrast.js'
import { lockBody, unlockBody } from './core/scroll-lock.js'

const DEFAULT_TEXT = '正在加载…'
const controllers = new Set()
let current

function syncLayerStates() {
  for (const controller of controllers) {
    const top = isTopLayer(controller.id)
    const wasUnderneath = controller.layer.classList.contains('zt-loading-layer--underneath')
    controller.layer.classList.toggle('zt-loading-layer--underneath', !top)
    controller.layer.setAttribute('aria-hidden', String(!top))
    if (top) controller.panel.setAttribute('aria-modal', 'true')
    else controller.panel.removeAttribute('aria-modal')
    if (top && wasUnderneath) requestAnimationFrame(controller.focus)
  }
}

subscribeLayerChanges(syncLayerStates)

function normalizeInput(input) {
  if (typeof input === 'string') return { text: input }
  return input && typeof input === 'object' ? input : {}
}

function open(input) {
  if (typeof document === 'undefined') throw new Error('ZtLoading requires a browser document')
  const incoming = normalizeInput(input)
  if (current && !current.closing) return current.instance.update(incoming)

  const focusedLoading = [...controllers].find(controller => controller.layer.contains(document.activeElement))
  // A replacement must return focus past any outgoing Loading that will be removed.
  const returnFocus = focusedLoading ? focusedLoading.returnFocus : document.activeElement
  const model = { text: DEFAULT_TEXT, ...incoming }
  const id = Symbol('zt-loading')
  const layer = document.createElement('div')
  layer.className = 'zt-loading-layer'
  const panel = document.createElement('section')
  panel.className = 'zt-loading'
  panel.setAttribute('role', 'dialog')
  panel.tabIndex = -1
  const indicator = document.createElement('div')
  indicator.className = 'zt-loading__indicator'
  indicator.setAttribute('aria-hidden', 'true')
  const spinner = document.createElement('span')
  spinner.className = 'zt-loading__spinner'
  const icon = document.createElement('span')
  icon.className = 'zt-loading__icon'
  indicator.append(spinner, icon)
  const text = document.createElement('p')
  text.className = 'zt-loading__text'
  text.setAttribute('role', 'status')
  text.setAttribute('aria-live', 'polite')
  text.setAttribute('aria-atomic', 'true')
  panel.append(indicator, text)
  layer.append(panel)

  let renderedIcon = Symbol('unrendered')
  let renderedMask = Symbol('unrendered')
  let enterFrame
  let closeTimer
  let removed = false
  let resolveClosed
  const closed = new Promise(resolve => { resolveClosed = resolve })
  const focus = createFocusManager({ id, panel: () => panel })
  const contrast = createLoadingContrast(layer)
  const controller = {
    id, layer, panel, returnFocus, closing: false, instance: undefined,
    focus() {
      if (!controller.closing && layer.isConnected && isTopLayer(id)) focus.focus()
    }
  }

  function render() {
    if (renderedMask !== model.maskColor) {
      renderedMask = model.maskColor
      layer.style.backgroundColor = typeof model.maskColor === 'string' ? model.maskColor : ''
    }
    contrast.refresh()
    text.textContent = model.text ?? DEFAULT_TEXT
    text.hidden = !text.textContent
    panel.setAttribute('aria-label', text.textContent || DEFAULT_TEXT)
    if (renderedIcon === model.icon) return
    renderedIcon = model.icon
    icon.textContent = ''
    if (typeof model.icon === 'string' && model.icon) {
      const image = document.createElement('img')
      image.src = model.icon
      image.alt = ''
      image.draggable = false
      image.addEventListener('error', () => image.remove(), { once: true })
      icon.append(image)
    } else if (model.icon?.nodeType === 1) {
      const copy = model.icon.cloneNode(true)
      // Icons are decorative: keep supplied DOM in place and out of the tab order.
      for (const element of [copy, ...copy.querySelectorAll('a, button, input, select, textarea, [tabindex]')]) {
        element.setAttribute('tabindex', '-1')
      }
      icon.append(copy)
    }
  }

  function keydown(event) {
    if (!isTopLayer(id) || event.key !== 'Escape') return
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  function finish() {
    if (removed) return
    removed = true
    cancelAnimationFrame(enterFrame)
    clearTimeout(closeTimer)
    contrast.destroy()
    layer.removeEventListener('transitionend', onTransitionEnd)
    document.removeEventListener('keydown', keydown, true)
    focus.release()
    controllers.delete(controller)
    leaveLayer(id)
    unlockBody(id)
    layer.remove()
    if (current === controller) current = undefined
    resolveClosed()
  }

  function onTransitionEnd(event) {
    if (event.target === layer && event.propertyName === 'opacity') finish()
  }

  const instance = {
    closed,
    update(partial) {
      if (controller.closing || removed) return instance
      const next = normalizeInput(partial)
      for (const key of ['text', 'icon', 'maskColor']) {
        if (Object.prototype.hasOwnProperty.call(next, key)) model[key] = next[key]
      }
      render()
      return instance
    },
    close() {
      if (controller.closing || removed) return closed
      controller.closing = true
      cancelAnimationFrame(enterFrame)
      if (!layer.classList.contains('zt-loading-layer--visible')) {
        finish()
        return closed
      }
      layer.classList.add('zt-loading-layer--leaving')
      const duration = Math.max(0, ...getComputedStyle(layer).transitionDuration.split(',').map(value => (
        parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)
      )))
      if (duration === 0) finish()
      else {
        layer.addEventListener('transitionend', onTransitionEnd)
        closeTimer = setTimeout(finish, duration + 50)
      }
      return closed
    }
  }

  controller.instance = instance
  render()
  layer.style.zIndex = String(enterLayer(id, Number.isFinite(model.zIndex) ? model.zIndex : 6000))
  controllers.add(controller)
  current = controller
  document.body.append(layer)
  contrast.refresh()
  lockBody(id)
  document.addEventListener('keydown', keydown, true)
  focus.activate(returnFocus)
  syncLayerStates()
  panel.getBoundingClientRect()
  enterFrame = requestAnimationFrame(() => {
    enterFrame = requestAnimationFrame(() => {
      enterFrame = undefined
      if (!controller.closing) layer.classList.add('zt-loading-layer--visible')
    })
  })
  return instance
}

export const ZtLoading = {
  open,
  close() { return current ? current.instance.close() : Promise.resolve() }
}
