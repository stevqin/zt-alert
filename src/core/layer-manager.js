const layers = []
const listeners = new Set()
let currentZIndex = 999

function notify() {
  for (const listener of listeners) listener()
}

export function enterLayer(id, minimum = 1000) {
  const existing = layers.find(layer => layer.id === id)
  if (existing) return existing.zIndex

  currentZIndex = Math.max(minimum, currentZIndex + 1)
  layers.push({ id, zIndex: currentZIndex })
  notify()
  return currentZIndex
}

export function leaveLayer(id) {
  const index = layers.findIndex(layer => layer.id === id)
  if (index !== -1) {
    layers.splice(index, 1)
    notify()
  }
}

export function getTopLayer() {
  return layers[layers.length - 1]?.id
}

export function isTopLayer(id) {
  return getTopLayer() === id
}

export function subscribeLayerChanges(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
