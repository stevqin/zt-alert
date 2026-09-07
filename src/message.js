import { createNoticeService } from './notice.js'

export const ZtMessage = createNoticeService({
  variant: 'message',
  defaultDuration: 3200
})
