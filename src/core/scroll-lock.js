const locks = new Set()
let savedStyles

export function lockBody(id) {
  if (typeof document === 'undefined' || locks.has(id)) return
  if (locks.size === 0) {
    const body = document.body
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
    savedStyles = {
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      paddingRight: body.style.paddingRight
    }
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }
  }
  locks.add(id)
}

export function unlockBody(id) {
  if (typeof document === 'undefined' || !locks.delete(id) || locks.size > 0 || !savedStyles) return
  document.body.style.overflow = savedStyles.overflow
  document.body.style.overscrollBehavior = savedStyles.overscrollBehavior
  document.body.style.paddingRight = savedStyles.paddingRight
  savedStyles = undefined
}
