import { createOverlay } from './core/overlay.js'

export const ZtDialog = {
  open(options) {
    return createOverlay('dialog', options)
  }
}
