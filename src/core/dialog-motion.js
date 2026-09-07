const STYLE_PROPERTIES = ['position', 'left', 'top', 'width', 'height', 'max-width', 'max-height', 'border-radius', 'transform', 'transition']

export function createDialogMotion(panel) {
  let savedStyles
  let timer
  let onEnd

  function read() {
    const { x, y, width, height } = panel.getBoundingClientRect()
    return { x, y, width, height, radius: getComputedStyle(panel).borderRadius }
  }

  function remember() {
    savedStyles = STYLE_PROPERTIES.map(property => [property, panel.style.getPropertyValue(property), panel.style.getPropertyPriority(property)])
  }

  function setBounds(bounds) {
    panel.style.left = `${bounds.x}px`
    panel.style.top = `${bounds.y}px`
    panel.style.width = `${bounds.width}px`
    panel.style.height = `${bounds.height}px`
    panel.style.borderRadius = bounds.radius
  }

  function reset() {
    clearTimeout(timer)
    panel.removeEventListener('transitionend', onEnd)
    window.removeEventListener('resize', reset)
    panel.classList.remove('zt-dialog__panel--resizing')
    if (!savedStyles) return
    for (const [property, value, priority] of savedStyles) {
      if (value) panel.style.setProperty(property, value, priority)
      else panel.style.removeProperty(property)
    }
    savedStyles = undefined
  }

  function freeze(bounds) {
    if (!savedStyles) remember()
    panel.style.transition = 'none'
    panel.style.transform = 'none'
    panel.style.position = 'fixed'
    panel.style.maxWidth = 'none'
    panel.style.maxHeight = 'none'
    setBounds(bounds)
    panel.classList.add('zt-dialog__panel--resizing')
  }

  function play(from) {
    remember()
    panel.style.transition = 'none'
    panel.style.transform = 'none'
    const to = read()
    if (['x', 'y', 'width', 'height'].every(key => Math.abs(from[key] - to[key]) < 0.5) && from.radius === to.radius) {
      reset()
      return
    }

    // Animate measured pixels, then restore the original auto/percentage layout.
    freeze(from)
    panel.getBoundingClientRect()
    panel.style.removeProperty('transition')
    setBounds(to)
    const duration = Math.max(0, ...getComputedStyle(panel).transitionDuration.split(',').map(value => (
      parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)
    )))
    if (duration === 0) {
      reset()
      return
    }
    onEnd = event => {
      if (event.target !== panel || !['width', 'height', 'left', 'top', 'border-top-left-radius'].includes(event.propertyName)) return
      const current = read()
      if (['x', 'y', 'width', 'height'].every(key => Math.abs(current[key] - to[key]) < 0.5)) reset()
    }
    panel.addEventListener('transitionend', onEnd)
    window.addEventListener('resize', reset)
    timer = setTimeout(reset, duration + 50)
  }

  return { read, reset, freeze, play, get active() { return Boolean(savedStyles) } }
}
