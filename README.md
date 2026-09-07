# @ztechjs/zt-alert

面向浏览器的纯 JavaScript 反馈组件库，提供 Message、Notification、MessageBox、Dialog、Drawer 和 Loading。运行时零依赖，不要求 Vue、React 或 Web Components。

## 安装

```bash
npm install @ztechjs/zt-alert
```

```js
import {
  ZtMessage,
  ZtNotification,
  ZtMessageBox,
  ZtDialog,
  ZtDrawer,
  ZtLoading
} from '@ztechjs/zt-alert'
import '@ztechjs/zt-alert/style.css'
```

支持 Chrome 80+ 与 Safari 13+。模块可在 SSR 环境中导入，但打开浮层必须发生在浏览器中。

## Message

```js
ZtMessage.success('保存成功')
ZtMessage.error({ id: 'save', content: '保存失败', duration: 0 })
ZtMessage.close('save')
ZtMessage.clear()
```

Message 默认 3200ms 后关闭并位于顶部居中。`duration: 0` 表示常驻；相同 `id` 会更新原消息并重新计时。

消息从上方轻滑入场，关闭时上移淡出，其余消息平滑补位。四种状态图标均有描边动画；更新文字不会重播图标动画，切换状态时会绘制新图标。更新已有消息不会重新播放入场动画。

图标固定在内容区左上方，有标题或内容换行时不会随文字高度垂直居中；无标题的单行消息保持原有对齐效果。

## Notification

```js
ZtNotification.warning({
  title: '库存提醒',
  content: '库存数据尚未同步完成'
})
```

Notification 默认 5200ms 后关闭并在右上角独立堆叠。它拥有独立的 `close(id)` 与 `clear()`。

通知从右侧滑入，关闭时向右淡出；通知堆叠的补位、更新和关闭行为与 Message 一致。两者均遵循系统“减少动态效果”设置。

## MessageBox

```js
await ZtMessageBox('提示内容')
await ZtMessageBox('操作失败', '请稍后重试', 'error')

const confirmed = await ZtMessageBox.confirm({
  title: '确认删除？',
  text: '删除后无法恢复',
  icon: 'warning',
  dangerMode: true
})

const name = await ZtMessageBox.prompt({
  title: '请输入名称',
  content: {
    element: 'input',
    attributes: { placeholder: '名称', maxlength: 30 }
  }
})
```

保留加载态按钮：

```js
const action = await ZtMessageBox({
  title: '开始查询？',
  buttons: {
    cancel: true,
    confirm: { text: '查询', value: 'query', closeModal: false }
  }
})

if (action === 'query') {
  try {
    await loadData()
    ZtMessageBox.close()
  } catch {
    ZtMessageBox.stopLoading()
  }
}
```

还支持 `getState()`、`setDefaults(options)` 与 `setActionValue(value)`。

默认入场动画为放大、回缩、再回到正常大小，约 280ms；窗口开始回缩时，内置 `success`、`error`、`warning`、`info` 图标的圆形边框与内部符号同步开始描边绘制。边框画完后会用 220ms 渐淡至 35% 不透明度，内部符号保持原色。设置 `shake: false` 可关闭窗口回弹，此时图标立即开始绘制。系统开启“减少动态效果”时直接显示最终状态。

## Dialog

```js
const dialog = ZtDialog.open({
  title: '编辑报表',
  subtitle: '修改只对当前报表生效',
  width: 720,
  showFooter: true,
  confirmText: '保存',
  render(container, controls) {
    const input = document.createElement('input')
    input.autofocus = true
    input.placeholder = '报表名称'
    container.append(input)

    return () => input.remove()
  },
  async onConfirm(controls) {
    controls.setConfirmLoading(true)
    try {
      await saveReport()
      controls.close('api', { saved: true })
    } finally {
      controls.setConfirmLoading(false)
    }
  }
})

dialog.update({ title: '编辑报表（已修改）' })
dialog.setLoading(true, '正在读取…')
dialog.toggleFullscreen(true)

const result = await dialog.closed
// { reason: 'api', value: { saved: true } }
```

## Drawer

```js
const drawer = ZtDrawer.open({
  title: '筛选条件',
  width: 640,
  bodyPadding: 24,
  content: '原生文本内容',
  beforeClose: async reason => reason === 'api' || confirmDiscard()
})

await drawer.close('api')
```

Drawer 首版固定从右侧进入。Dialog 与 Drawer 默认在 768px 以下全屏，只有正文滚动，并共享层级、焦点陷阱和 body 滚动锁。

## Loading

```js
const loading = ZtLoading.open({
  icon: '/icons/logo.svg',
  text: '正在加载报表…'
})

try {
  const data = await loadData()
  loading.update({ text: '正在生成报表…' })
  await generateReport(data)
} finally {
  await loading.close()
}
```

也可以使用 `ZtLoading.open('正在加载…')`，省略图标时显示默认旋转圆环。

- `icon` 支持图片地址或 DOM Element；DOM 图标会被复制，不会移走原节点。`icon: null` 可恢复默认图标。
- `text` 是纯文本，不解析 HTML。实例的 `update({ icon, text })` 可更新图标和文字，不会重播入场动画。
- `maskColor` 可传 CSS 颜色（包含透明度），也支持通过 `update({ maskColor })` 动态修改；传 `null` 恢复 CSS 主题色。默认遮罩为 `rgba(20, 24, 32, 0.2)`，可用 `--zt-loading-mask` 覆盖。
- 文字会在深灰与柔白之间自动选择对比度较高的颜色，计算遮罩与 `html` / `body` 纯色背景叠加后的亮度；页面主题的 class / style、遮罩颜色及系统深浅主题变化时会重新计算。不采样背景图片、视频、渐变或局部内容；这类页面建议使用较高不透明度的遮罩。
- Loading 是全屏遮罩，会锁定滚动和键盘焦点，不会自动消失，也不会被 Esc 或点击遮罩关闭。
- 同一时间复用一个活动 Loading，再次调用 `open()` 会更新并返回同一实例。它适合共享的全局加载状态，不对并发请求计数；独立任务应由调用方汇总后统一关闭。
- `await loading.close()` 或 `await ZtLoading.close()` 会等待退场完成。`loading.closed` 同样可等待完全关闭；已关闭实例的更新或关闭不会影响后续新实例。
- 可在首次 `open()` 时传入 `zIndex`；默认最小层级为 `6000`，与其他浮层统一管理。

## 内容输入

- `content: string | number` 使用 `textContent`，不会解析 HTML。
- `content: Node` 会临时移动节点，并在关闭后尽量还原到原位置。
- `render(container, controls)` 可挂载复杂原生 DOM，并返回清理函数。
- `html` 会直接写入 `innerHTML`，只允许传入可信或已消毒的内容。不要把用户输入直接传给 `html`。

## Dialog 与 Drawer 选项

常用选项包括 `title`、`subtitle`、`width`、`showHeader`、`showClose`、`showFooter`、`showCancelButton`、`confirmText`、`cancelText`、`loading`、`confirmLoading`、`maskClosable`、`escClosable`、`beforeClose`、`bodyPadding`、`bodyScroll`、`lockScroll`、`focusTrap`、`autoFocus`、`fullscreenBelow` 与 `zIndex`。

关闭原因是 `close | cancel | mask | escape | api`。所有关闭入口都经过 `beforeClose`；返回 `false` 或抛出错误时保持打开。内置确认按钮不会自动关闭，业务保存成功后调用 `controls.close()`。

## 主题

```css
:root {
  --zt-accent: #245edb;
  --zt-accent-ink: #244c9e;
  --zt-success: #1f8657;
  --zt-warning: #a96b13;
  --zt-error: #bd3f3b;
  --zt-radius: 16px;
}
```

组件支持 `prefers-reduced-motion`、键盘焦点循环、焦点恢复与 ARIA 对话框语义。交互弹窗支持 Esc 关闭，Loading 仅通过命令关闭。

## 开发

```bash
npm install
npx playwright install chromium webkit
npm run dev
npm test
npm run test:webkit
npm run build
npm pack --dry-run
```

演示页地址为 `http://127.0.0.1:4179/demo/`。

## License

MIT
