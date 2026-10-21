import { createFocusManager } from './core/focus-manager.js'
import { enterLayer, isTopLayer, leaveLayer, subscribeLayerChanges } from './core/layer-manager.js'
import { lockBody, unlockBody } from './core/scroll-lock.js'
import { afterPanelExit, rememberExitPose } from './core/panel-motion.js'

const BUILTIN_ICONS = new Set(['success', 'warning', 'error', 'info'])
const DEFAULTS = {
  title: '',
  text: '',
  buttons: true,
  closeOnClickOutside: true,
  closeOnEsc: true,
  dangerMode: false,
  shake: true,
  timer: 0
}

let defaults = { ...DEFAULTS }
let current
const controllers = new Set()

function syncLayerStates() {
  for (const controller of controllers) {
    const top = isTopLayer(controller.id)
    controller.elements.layer.setAttribute('aria-hidden', top ? 'false' : 'true')
    if (top) controller.elements.box.setAttribute('aria-modal', 'true')
    else controller.elements.box.removeAttribute('aria-modal')
  }
}

subscribeLayerChanges(syncLayerStates)

function iconMarkup(icon) {
  const paths = {
    success: '<path d="m6 12 4 4 8-9"/>',
    error: '<path d="m7 7 10 10"/><path d="M17 7 7 17"/>',
    warning: '<path d="M12 6v8"/><path d="M12 18h.01"/>',
    info: '<path d="M12 10v8"/><path d="M12 6h.01"/>'
  }
  const viewBox = '3 3 18 18'
  return `<svg class="zt-box__icon-frame" viewBox="0 0 58 58" aria-hidden="true"><path d="M29 .5a28.5 28.5 0 1 1 0 57a28.5 28.5 0 1 1 0-57Z"/></svg><svg viewBox="${viewBox}" aria-hidden="true">${paths[icon]}</svg>`
}

function optionFromParams(params) {
  const first = params[0]
  if (typeof Node !== 'undefined' && first instanceof Node) return { content: first }
  if (typeof first === 'object' && first !== null) return { ...first }
  return {
    title: first == null ? '' : String(first),
    text: params[1] == null ? '' : String(params[1]),
    icon: params[2]
  }
}

function buttonDefaults(namespace) {
  if (namespace === 'cancel') return { text: '取消', value: null }
  if (namespace === 'confirm') return { text: '确定', value: true }
  return { text: namespace, value: namespace }
}

function normalizeButton(namespace, input, dangerMode) {
  if (input === false || input?.visible === false) return undefined
  const base = buttonDefaults(namespace)
  const options = typeof input === 'string'
    ? { text: input }
    : typeof input === 'object' && input !== null
      ? input
      : {}
  return {
    namespace,
    text: options.text ?? base.text,
    value: Object.prototype.hasOwnProperty.call(options, 'value') ? options.value : base.value,
    closeModal: options.closeModal !== false,
    className: Array.isArray(options.className)
      ? options.className
      : options.className ? String(options.className).split(/\s+/) : [],
    danger: namespace === 'confirm' && dangerMode
  }
}

function normalizeButtons(options) {
  let input = options.buttons
  if (input === false) return []
  if (input === true || input === undefined) return [normalizeButton('confirm', true, options.dangerMode)]
  if (typeof input === 'string') return [normalizeButton('confirm', input, options.dangerMode)]
  if (Array.isArray(input)) {
    return input.map((item, index) => {
      const namespace = input.length > 1 && index === 0 ? 'cancel' : 'confirm'
      return normalizeButton(namespace, item, options.dangerMode)
    }).filter(Boolean)
  }
  return Object.entries(input).map(([namespace, button]) => (
    normalizeButton(namespace, button, options.dangerMode)
  )).filter(Boolean)
}

function createContent(source) {
  if (!source) return undefined
  if (typeof Node !== 'undefined' && source instanceof Node) return { element: source }
  if (typeof source === 'string') {
    const element = source === 'input' ? document.createElement('input') : document.createElement('div')
    if (source !== 'input') element.textContent = source
    return { element }
  }

  const element = typeof source.element === 'string'
    ? document.createElement(source.element)
    : source.element
  for (const [name, value] of Object.entries(source.attributes || {})) {
    if (name in element) element[name] = value
    else element.setAttribute(name, String(value))
  }
  return { element }
}

function renderBox(model, controller) {
  const layer = document.createElement('div')
  layer.className = 'zt-box-layer'
  layer.style.zIndex = String(controller.zIndex)

  const box = document.createElement('section')
  box.className = `zt-box${model.shake ? ' zt-box--shake' : ''}${model.dangerMode ? ' zt-box--danger' : ''}${model.className ? ` ${model.className}` : ''}`
  box.setAttribute('role', 'dialog')
  box.setAttribute('aria-modal', 'true')
  box.setAttribute('aria-busy', 'false')
  box.tabIndex = -1

  if (model.icon) {
    const icon = document.createElement('div')
    const kind = BUILTIN_ICONS.has(model.icon) ? model.icon : 'custom'
    icon.className = `zt-box__icon zt-box__icon--${kind}`
    if (kind === 'custom') {
      const image = document.createElement('img')
      image.src = model.icon
      image.alt = ''
      icon.append(image)
    } else {
      icon.innerHTML = iconMarkup(kind)
    }
    box.append(icon)
  }

  const copy = document.createElement('div')
  copy.className = 'zt-box__copy'
  const title = document.createElement('h2')
  title.id = `zt-box-title-${controller.sequence}`
  title.textContent = model.title || '提示'
  copy.append(title)
  box.setAttribute('aria-labelledby', title.id)
  if (model.text) {
    const text = document.createElement('p')
    text.textContent = model.text
    copy.append(text)
  }
  box.append(copy)

  const content = createContent(model.content)
  if (content?.element) {
    const wrapper = document.createElement('div')
    wrapper.className = 'zt-box__content'
    if (content.element instanceof HTMLInputElement) content.element.classList.add('zt-box__input')
    wrapper.append(content.element)
    box.append(wrapper)
    controller.input = content.element instanceof HTMLInputElement ? content.element : undefined
  }

  const actions = document.createElement('div')
  actions.className = 'zt-box__actions'
  for (const action of model.buttons) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = [
      'zt-box__button',
      action.namespace === 'confirm' ? 'zt-box__button--primary' : '',
      action.danger ? 'zt-box__button--danger' : '',
      ...action.className
    ].filter(Boolean).join(' ')
    button.textContent = action.text
    button.dataset.ztAction = action.namespace
    button.addEventListener('click', () => controller.choose(action.namespace))
    actions.append(button)
  }
  if (model.buttons.length) box.append(actions)

  layer.append(box)
  document.body.append(layer)
  // Normalize stroke lengths so short marks and outlines share the drawing timeline.
  for (const stroke of box.querySelectorAll('.zt-box__icon svg path, .zt-box__icon svg circle')) {
    stroke.style.setProperty('--zt-box-stroke-length', Math.ceil(stroke.getTotalLength()) + 2)
    stroke.classList.add('zt-box__icon-stroke')
  }
  requestAnimationFrame(() => layer.classList.add('zt-box-layer--visible'))
  return { actions, box, layer }
}

let boxSequence = 0

function openMessageBox(params) {
  if (typeof document === 'undefined') return Promise.reject(new Error('ZtMessageBox requires a browser document'))
  if (current) current.destroy(null, true)

  const incoming = optionFromParams(params)
  const options = { ...defaults, ...incoming }
  if (Object.prototype.hasOwnProperty.call(incoming, 'button') && !Object.prototype.hasOwnProperty.call(incoming, 'buttons')) {
    options.buttons = typeof incoming.button === 'object' && incoming.button !== null
      ? { confirm: incoming.button }
      : incoming.button
  }
  const model = { ...options, buttons: normalizeButtons(options) }
  const id = Symbol('zt-message-box')
  let resolvePromise
  let settled = false
  let closing = false
  let timer

  const controller = {
    id,
    input: undefined,
    loading: false,
    model,
    sequence: ++boxSequence,
    zIndex: enterLayer(id, 5100),
    elements: undefined,
    focus: undefined,
    resolve(value) {
      if (settled) return
      settled = true
      resolvePromise(value)
    },
    setLoading(value, namespace) {
      controller.loading = Boolean(value)
      const { box, actions } = controller.elements
      box.setAttribute('aria-busy', String(controller.loading))
      for (const button of actions.querySelectorAll('button')) {
        button.disabled = controller.loading
        const action = model.buttons.find(item => item.namespace === button.dataset.ztAction)
        button.replaceChildren()
        if (controller.loading && button.dataset.ztAction === namespace) {
          const spinner = document.createElement('span')
          spinner.className = 'zt-box__spinner'
          spinner.setAttribute('aria-hidden', 'true')
          button.append(spinner)
        }
        button.append(document.createTextNode(action.text))
      }
    },
    choose(namespace) {
      if (controller.loading || closing) return
      const action = model.buttons.find(item => item.namespace === namespace)
      if (!action) return
      const value = namespace === 'confirm' && controller.input ? controller.input.value : action.value
      if (!action.closeModal) {
        controller.setLoading(true, namespace)
        controller.resolve(value)
        return
      }
      controller.destroy(value)
    },
    destroy(value, immediate = false) {
      if (closing) return
      closing = true
      clearTimeout(timer)
      rememberExitPose(controller.elements.box)
      controller.elements.layer.classList.add('zt-box-layer--leaving')
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        document.removeEventListener('keydown', controller.escape, true)
        controller.focus.release()
        leaveLayer(id)
        unlockBody(id)
        controller.elements.layer.remove()
        controllers.delete(controller)
        controller.resolve(value)
        if (current === controller) current = undefined
      }
      if (immediate) {
        finish()
        return
      }
      afterPanelExit(controller.elements.layer, controller.elements.box, finish)
    }
  }

  const promise = new Promise(resolve => { resolvePromise = resolve })
  controller.elements = renderBox(model, controller)
  controller.elements.layer.classList.toggle('zt-box-layer--steady', !model.shake)
  controller.focus = createFocusManager({ id, panel: () => controller.elements.box })
  controllers.add(controller)
  current = controller
  lockBody(id)
  controller.focus.activate()

  let maskStart = false
  controller.elements.layer.addEventListener('mousedown', event => { maskStart = event.target === controller.elements.layer })
  controller.elements.layer.addEventListener('click', event => {
    if (maskStart && event.target === controller.elements.layer && model.closeOnClickOutside && !controller.loading && isTopLayer(id)) {
      controller.destroy(null)
    }
    maskStart = false
  })
  controller.escape = function escape(event) {
    if (!closing && !controller.loading && isTopLayer(id) && model.closeOnEsc && event.key === 'Escape' && !event.isComposing) {
      event.preventDefault()
      event.stopImmediatePropagation()
      controller.destroy(null)
    }
  }
  document.addEventListener('keydown', controller.escape, true)
  syncLayerStates()
  if (model.timer > 0) timer = setTimeout(() => controller.destroy(null), model.timer)

  return promise
}

const call = (...params) => openMessageBox(params)

call.alert = input => call(typeof input === 'string' ? { title: input } : { ...input })
call.confirm = async input => {
  const options = typeof input === 'string' ? { title: input } : { ...input }
  const value = await call({ ...options, buttons: options.buttons ?? ['取消', '确定'] })
  return Boolean(value)
}
call.prompt = async input => {
  const options = typeof input === 'string' ? { title: input } : { ...input }
  const value = await call({
    ...options,
    content: options.content ?? 'input',
    buttons: options.buttons ?? ['取消', '确定']
  })
  return value === null ? null : String(value)
}
call.close = () => current?.destroy(null)
call.getState = () => ({
  isOpen: Boolean(current),
  actions: Object.fromEntries((current?.model.buttons || []).map(action => [action.namespace, {
    value: action.value,
    closeModal: action.closeModal,
    loading: Boolean(current?.loading)
  }])),
  timer: current?.model.timer || 0
})
call.setActionValue = options => {
  if (!current) return
  const updates = typeof options === 'string' ? { confirm: options } : options
  for (const action of current.model.buttons) {
    if (Object.prototype.hasOwnProperty.call(updates, action.namespace)) action.value = updates[action.namespace]
  }
}
call.stopLoading = () => current?.setLoading(false)
call.setDefaults = options => { defaults = { ...defaults, ...options } }

export const ZtMessageBox = call
