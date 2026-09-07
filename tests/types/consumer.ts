import {
  ZtDialog,
  ZtDrawer,
  ZtLoading,
  ZtMessage,
  ZtMessageBox,
  ZtNotification,
  type OverlayCloseReason
} from '@ztechjs/zt-alert'

ZtMessage.success({ id: 'save', content: '保存成功', duration: 3200 })
ZtNotification.warning({ title: '库存提醒', content: '库存不足' })

const loading = ZtLoading.open({ icon: '/loading.svg', text: '正在加载报表', maskColor: 'rgba(20, 24, 32, 0.7)' })
loading.update({ text: '正在处理数据' }).update({ icon: document.createElement('img') })
loading.update({ maskColor: '#f1f5f9' }).update({ maskColor: null })
const loadingClosed: Promise<void> = loading.closed
const loadingClose: Promise<void> = loading.close()
const closeCurrentLoading: Promise<void> = ZtLoading.close()
ZtLoading.open('正在加载')
// @ts-expect-error Text must be a string, not HTML or a DOM node.
ZtLoading.open({ text: document.createElement('div') })
// @ts-expect-error Icons are image URLs or DOM elements.
ZtLoading.open({ icon: 42 })
// @ts-expect-error Mask colors must be CSS color strings.
ZtLoading.open({ maskColor: 42 })
void loadingClosed
void loadingClose
void closeCurrentLoading

const confirmed: Promise<boolean> = ZtMessageBox.confirm({
  title: '确认删除？',
  icon: 'warning',
  dangerMode: true
})

const dialog = ZtDialog.open<{ saved: boolean }>({
  title: '编辑报表',
  showFooter: true,
  render(container, controls) {
    container.textContent = '表单'
    controls.setLoading(false)
  },
  onConfirm(controls) {
    void controls.close('api', { saved: true })
  }
})

dialog.update({ width: 720 }).toggleFullscreen(true).focus()
const dialogResult: Promise<{ reason: OverlayCloseReason; value: { saved: boolean } | undefined }> = dialog.closed

const drawer = ZtDrawer.open<string>({ title: '筛选条件', width: '40vw' })
drawer.setConfirmLoading(true).update({ confirmText: '应用' })
const drawerResult: Promise<{ reason: OverlayCloseReason; value: string | undefined }> = drawer.closed

void confirmed
void dialogResult
void drawerResult
