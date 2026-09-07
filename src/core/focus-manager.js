import { isTopLayer } from './layer-manager.js'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  'summary',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

function focusElement(element) {
  if (!element) return
  try {
    element.focus({ preventScroll: true })
  } catch {
    element.focus()
  }
}

export function createFocusManager({ id, panel, enabled = () => true, autoFocus = () => true }) {
  let previousFocus
  let active = false

  function focusable() {
    const root = panel()
    if (!root) return []
    return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(element => (
      element.tabIndex >= 0 &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden'
    ))
  }

  function focus() {
    const root = panel()
    const elements = focusable()
    const preferred = root?.querySelector('[autofocus]')
    focusElement(preferred && elements.includes(preferred) ? preferred : elements[0] || root)
  }

  function keydown(event) {
    if (!active || !isTopLayer(id) || !enabled() || event.key !== 'Tab') return
    const elements = focusable()
    const first = elements[0]
    const last = elements[elements.length - 1]
    const current = document.activeElement

    if (!first) {
      event.preventDefault()
      focus()
    } else if (event.shiftKey && (current === first || !elements.includes(current))) {
      event.preventDefault()
      focusElement(last)
    } else if (!event.shiftKey && (current === last || !elements.includes(current))) {
      event.preventDefault()
      focusElement(first)
    }
  }

  function focusin(event) {
    const root = panel()
    if (active && isTopLayer(id) && enabled() && root && !root.contains(event.target)) focus()
  }

  return {
    activate(returnFocus = document.activeElement) {
      if (active) return
      active = true
      previousFocus = returnFocus
      document.addEventListener('keydown', keydown, true)
      document.addEventListener('focusin', focusin, true)
      if (autoFocus()) requestAnimationFrame(focus)
    },
    focus,
    release() {
      if (!active) return
      active = false
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('focusin', focusin, true)
      const target = previousFocus
      previousFocus = undefined
      if (target?.isConnected) requestAnimationFrame(() => focusElement(target))
    }
  }
}
