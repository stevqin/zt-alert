import { createOverlay } from './core/overlay.js'

export const ZtDrawer = {
  open(options) {
    return createOverlay('drawer', options)
  }
}
