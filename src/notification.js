import { createNoticeService } from './notice.js'

export const ZtNotification = createNoticeService({
  variant: 'notification',
  defaultDuration: 5200
})
