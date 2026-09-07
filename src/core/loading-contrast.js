function luminance(channels) {
  const linear = Array.from(channels).slice(0, 3).map(value => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function contrast(first, second) {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

const DARK = { color: '#334155', luminance: luminance([51, 65, 85]) }
const LIGHT = { color: '#f8fafc', luminance: luminance([248, 250, 252]) }

export function createLoadingContrast(layer) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  canvas.hidden = true
  canvas.style.display = 'none'
  canvas.style.backgroundColor = 'Canvas'
  canvas.setAttribute('aria-hidden', 'true')
  layer.append(canvas)
  const context = canvas.getContext('2d')
  const backgrounds = [document.documentElement, document.body, layer]
  const transitions = new Map(backgrounds.map(element => [element, new Set()]))
  const transitionEvents = ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel']
  let frame
  let disposed = false

  function refresh() {
    if (disposed || !layer.isConnected || !context) return
    // Let the browser parse CSS colors and composite translucent fills over the page.
    canvas.style.colorScheme = getComputedStyle(document.documentElement).colorScheme
    context.fillStyle = '#fff'
    context.fillRect(0, 0, 1, 1)
    context.fillStyle = getComputedStyle(canvas).backgroundColor
    context.fillRect(0, 0, 1, 1)
    for (const element of backgrounds) {
      context.fillStyle = getComputedStyle(element).backgroundColor
      context.fillRect(0, 0, 1, 1)
    }
    const background = luminance(context.getImageData(0, 0, 1, 1).data)
    const color = contrast(background, LIGHT.luminance) > contrast(background, DARK.luminance)
      ? LIGHT.color : DARK.color
    if (layer.style.getPropertyValue('--zt-loading-text-color') !== color) {
      layer.style.setProperty('--zt-loading-text-color', color)
    }
  }

  function schedule() {
    if (disposed || frame !== undefined) return
    frame = requestAnimationFrame(() => {
      frame = undefined
      refresh()
      if ([...transitions.values()].some(properties => properties.size > 0)) schedule()
    })
  }

  function onTransition(event) {
    if (event.target !== event.currentTarget || !['background-color', 'color'].includes(event.propertyName)) return
    const properties = transitions.get(event.target)
    if (event.type === 'transitionend' || event.type === 'transitioncancel') properties.delete(event.propertyName)
    else properties.add(event.propertyName)
    schedule()
  }

  const observer = new MutationObserver(schedule)
  for (const element of backgrounds) {
    observer.observe(element, { attributes: true, attributeFilter: ['class', 'style'] })
    for (const name of transitionEvents) element.addEventListener(name, onTransition)
  }
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
  colorScheme.addListener(schedule)
  window.addEventListener('resize', schedule)

  return {
    refresh,
    destroy() {
      disposed = true
      observer.disconnect()
      cancelAnimationFrame(frame)
      for (const element of backgrounds) {
        for (const name of transitionEvents) element.removeEventListener(name, onTransition)
      }
      canvas.remove()
      colorScheme.removeListener(schedule)
      window.removeEventListener('resize', schedule)
    }
  }
}
