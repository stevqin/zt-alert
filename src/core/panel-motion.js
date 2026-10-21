const milliseconds = value => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000) || 0

export function motionDuration(element, animation = false) {
  const style = getComputedStyle(element)
  const durations = (animation ? style.animationDuration : style.transitionDuration).split(',').map(milliseconds)
  const delays = (animation ? style.animationDelay : style.transitionDelay).split(',').map(milliseconds)
  return Math.max(0, ...durations.map((duration, index) => duration + delays[index % delays.length]))
}

export function rememberExitPose(panel) {
  const transform = getComputedStyle(panel).transform
  panel.style.setProperty('--zt-exit-transform', transform === 'none' ? 'scale(1)' : transform)
}

// A mask or a child button may finish first. Only the panel's own exit
// animation can remove an animated window; the timeout covers cancelled CSS.
export function afterPanelExit(layer, panel, complete) {
  const animated = getComputedStyle(panel).animationName !== 'none' && motionDuration(panel, true) > 0
  const duration = Math.max(motionDuration(layer), motionDuration(panel), animated ? motionDuration(panel, true) : 0)
  let timer
  let finished = false
  function finish() {
    if (finished) return
    finished = true
    clearTimeout(timer)
    panel.removeEventListener('animationend', onAnimationEnd)
    layer.removeEventListener('transitionend', onTransitionEnd)
    complete()
  }
  function onAnimationEnd(event) {
    if (event.target === panel && /-exit$/.test(event.animationName)) finish()
  }
  function onTransitionEnd(event) {
    if (!animated && event.target === layer && event.propertyName === 'opacity') finish()
  }
  if (duration === 0) return finish()
  panel.addEventListener('animationend', onAnimationEnd)
  layer.addEventListener('transitionend', onTransitionEnd)
  timer = setTimeout(finish, duration + 50)
}
