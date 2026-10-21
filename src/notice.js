import { motionDuration, rememberExitPose } from './core/panel-motion.js'

const STATUS_NAMES = new Set(['success', 'error', 'warning', 'info'])
let noticeSequence = 0

function iconMarkup(status) {
  const paths = {
    success: '<path d="m5 12 4 4L19 6"/>',
    error: '<path d="m7 7 10 10"/><path d="M17 7 7 17"/>',
    warning: '<path d="M12 6v8"/><path d="M12 18h.01"/>',
    info: '<path d="M12 10v8"/><path d="M12 6h.01"/>'
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[status]}</svg>`
}

function prepareIcon(icon) {
  for (const stroke of icon.querySelectorAll('path, circle')) {
    stroke.style.setProperty('--zt-notice-stroke-length', Math.ceil(stroke.getTotalLength()) + 2)
    stroke.classList.add('zt-notice__icon-stroke')
  }
}

function closeMarkup() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>'
}

function normalizeInput(input, status, defaultDuration) {
  const options = typeof input === 'object' && input !== null
    ? { ...input }
    : { content: input }
  return {
    ...options,
    content: options.content ?? '',
    status: STATUS_NAMES.has(status || options.status) ? status || options.status : 'info',
    duration: Number.isFinite(options.duration) && options.duration >= 0
      ? options.duration
      : defaultDuration,
    closable: options.closable !== false
  }
}

export function createNoticeService({ variant, defaultDuration }) {
  const items = new Map()
  let host

  function ensureHost() {
    if (host?.isConnected) return host
    host = document.createElement('div')
    host.className = `zt-${variant}-stack`
    host.setAttribute('aria-live', 'polite')
    host.setAttribute('aria-relevant', 'additions text')
    document.body.append(host)
    return host
  }

  function schedule(item) {
    if (item.timer) clearTimeout(item.timer)
    item.timer = undefined
    if (item.options.duration > 0) {
      item.timer = setTimeout(() => close(item.id), item.options.duration)
    }
  }

  function cancelRemoval(item) {
    clearTimeout(item.removalTimer)
    item.removalTimer = undefined
    if (item.onExit) item.element.removeEventListener('animationend', item.onExit)
    item.onExit = undefined
  }

  function settleEntrance(item) {
    clearTimeout(item.enterTimer)
    item.enterTimer = undefined
    if (item.onEnter) item.element.removeEventListener('animationend', item.onEnter)
    item.onEnter = undefined
    item.motion = ''
    item.element.classList.remove('zt-notice--entering', 'zt-notice--reviving')
  }

  function watchEntrance(item, name) {
    const duration = motionDuration(item.element, true)
    if (duration === 0) {
      settleEntrance(item)
      return
    }
    item.onEnter = event => {
      if (event.target === item.element && event.animationName === name) settleEntrance(item)
    }
    item.element.addEventListener('animationend', item.onEnter)
    item.enterTimer = setTimeout(() => settleEntrance(item), duration + 50)
  }

  function relayout(change) {
    const positions = new Map([...items.values()].map(item => [item, item.slot.getBoundingClientRect().top]))
    change()
    const remaining = [...items.values()]
    for (const item of remaining) {
      item.slot.style.transition = 'none'
      item.slot.style.transform = 'none'
    }
    const offsets = remaining.map(item => ({ item, offset: positions.get(item) - item.slot.getBoundingClientRect().top }))
    for (const { item, offset } of offsets) {
      if (Number.isFinite(offset) && Math.abs(offset) > 0.5) item.slot.style.transform = `translateY(${offset}px)`
    }
    // Preserve the current visual positions before easing into the new layout.
    if (remaining.length) void host.offsetHeight
    for (const item of remaining) {
      item.slot.style.transition = ''
      item.slot.style.transform = ''
    }
  }

  function render(item) {
    const { element, options } = item
    element.className = `zt-notice zt-notice--${options.status} zt-notice--${variant}${item.visible ? ' zt-notice--visible' : ''}${item.motion ? ` zt-notice--${item.motion}` : ''}`
    element.setAttribute('role', options.status === 'error' ? 'alert' : 'status')
    element.dataset.ztId = String(item.id)
    if (item.iconStatus !== options.status) {
      const icon = element.querySelector('.zt-notice__icon')
      icon.innerHTML = iconMarkup(options.status)
      item.iconStatus = options.status
      if (element.isConnected) prepareIcon(icon)
    }

    const body = element.querySelector('.zt-notice__body')
    body.replaceChildren()
    if (options.title) {
      const title = document.createElement('strong')
      title.className = 'zt-notice__title'
      title.textContent = String(options.title)
      body.append(title)
    }
    const content = document.createElement('span')
    content.className = 'zt-notice__content'
    content.textContent = String(options.content)
    body.append(content)

    element.querySelector('.zt-notice__close').hidden = !options.closable
  }

  function createItem(id, options) {
    const slot = document.createElement('div')
    slot.className = 'zt-notice-slot'
    const element = document.createElement('div')
    element.innerHTML = [
      '<span class="zt-notice__icon"></span>',
      '<span class="zt-notice__body"></span>',
      `<button class="zt-notice__close" type="button" aria-label="关闭">${closeMarkup()}</button>`
    ].join('')
    const item = { element, slot, id, options, iconStatus: undefined, timer: undefined, closing: false, visible: false, motion: '', enterTimer: undefined, onEnter: undefined, frame: undefined, removalTimer: undefined, onExit: undefined }
    element.querySelector('.zt-notice__close').addEventListener('click', () => close(id))
    render(item)
    slot.append(element)
    ensureHost().append(slot)
    prepareIcon(element.querySelector('.zt-notice__icon'))
    // Commit the hidden starting frame so insertion cannot skip the entrance transition.
    void element.offsetHeight
    item.frame = requestAnimationFrame(() => {
      item.frame = undefined
      if (items.get(id) !== item || item.closing) return
      item.visible = true
      item.motion = 'entering'
      element.classList.add('zt-notice--visible', 'zt-notice--entering')
      watchEntrance(item, 'zt-notice-enter')
    })
    return item
  }

  function openWithStatus(input, status) {
    const options = normalizeInput(input, status, defaultDuration)
    const id = options.id ?? `zt-${variant}-${++noticeSequence}`
    const existing = items.get(id)
    if (existing) {
      const reviving = existing.closing
      if (reviving) {
        const style = getComputedStyle(existing.element)
        existing.element.style.setProperty('--zt-notice-revive-transform', style.transform === 'none' ? 'scale(1)' : style.transform)
        existing.element.style.setProperty('--zt-notice-revive-opacity', style.opacity)
        settleEntrance(existing)
        existing.motion = 'reviving'
      }
      cancelRemoval(existing)
      existing.closing = false
      relayout(() => {
        existing.options = options
        render(existing)
      })
      if (reviving) watchEntrance(existing, 'zt-notice-revive')
      schedule(existing)
      return id
    }

    const item = createItem(id, options)
    items.set(id, item)
    schedule(item)
    return id
  }

  function close(id) {
    const item = items.get(id)
    if (!item || item.closing) return
    item.closing = true
    if (item.timer) clearTimeout(item.timer)
    if (item.frame !== undefined) cancelAnimationFrame(item.frame)
    item.frame = undefined
    const remove = () => {
      if (items.get(id) !== item || !item.closing) return
      cancelRemoval(item)
      settleEntrance(item)
      relayout(() => {
        items.delete(id)
        item.slot.remove()
      })
      if (items.size === 0) {
        host.remove()
        host = undefined
      }
    }
    if (!item.visible) {
      remove()
      return
    }
    rememberExitPose(item.element)
    item.element.style.setProperty('--zt-notice-exit-opacity', getComputedStyle(item.element).opacity)
    settleEntrance(item)
    item.element.classList.add('zt-notice--leaving')
    const duration = motionDuration(item.element, true)
    if (duration === 0) {
      remove()
      return
    }
    item.onExit = event => {
      if (event.target === item.element && event.animationName === 'zt-notice-exit') remove()
    }
    item.element.addEventListener('animationend', item.onExit)
    item.removalTimer = setTimeout(remove, duration + 50)
  }

  return {
    open: input => openWithStatus(input),
    success: input => openWithStatus(input, 'success'),
    error: input => openWithStatus(input, 'error'),
    warning: input => openWithStatus(input, 'warning'),
    info: input => openWithStatus(input, 'info'),
    close,
    clear() {
      for (const id of [...items.keys()]) close(id)
    }
  }
}
