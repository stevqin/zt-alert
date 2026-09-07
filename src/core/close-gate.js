export function createCloseGate(options) {
  let epoch = 0
  let isPending = false

  return {
    async request(reason, value) {
      if (isPending || !options.available()) return false

      const version = ++epoch
      isPending = true
      options.pending(true)

      try {
        const accepted = await options.beforeClose?.(reason)
        if (accepted === false || version !== epoch || !options.available()) return false
        options.commit(reason, value)
        return true
      } catch (error) {
        if (version === epoch) options.error(error)
        return false
      } finally {
        if (version === epoch) {
          isPending = false
          options.pending(false)
        }
      }
    },
    reset() {
      epoch += 1
      isPending = false
      options.pending(false)
    }
  }
}
