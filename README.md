# @ztechjs/zt-alert

**简体中文（主文档）** · [English](./README.en.md)

轻量、零运行时依赖的浏览器反馈组件库，提供消息提示、通知、确认框、对话框、抽屉和全屏加载。基于原生 JavaScript 与 CSS，使用命令式 API，无需注册组件或预先放置容器，可用于原生页面，也可集成到 Vue、React 等应用。

统一的圆角面板、柔和阴影、半透明背景、弹性动效与状态图标，让轻提示、操作确认和复杂业务浮层保持一致的视觉体验。提供 TypeScript 类型声明，支持桌面端与移动端。

[更新日志](./CHANGELOG.md) · [演示页源码](./demo/) · [类型定义](./types/index.d.ts) · [MIT 许可证](./LICENSE)

## 组件与使用场景

| 组件 | 展示与交互 | 典型场景 |
| --- | --- | --- |
| `ZtMessage` | 顶部居中轻提示，多条堆叠，自动关闭 | 保存成功、表单校验、操作结果、网络错误 |
| `ZtNotification` | 右上角通知卡片，支持标题与长内容，独立堆叠 | 导出完成、任务结果、库存预警、系统通知 |
| `ZtMessageBox` | 居中提示框，支持状态图标、确认、输入和多按钮 | 删除确认、风险提示、名称输入、异步操作确认 |
| `ZtDialog` | 可定制内容的对话框，支持全屏、底部操作与局部加载 | 编辑表单、报表预览、复杂业务操作 |
| `ZtDrawer` | 从右侧滑入的抽屉，保留当前页面上下文 | 筛选条件、记录详情、侧栏编辑 |
| `ZtLoading` | 全屏加载遮罩，可更新文字、图标与遮罩颜色 | 页面初始化、报表生成、批量处理 |

## 演示与视觉效果

在项目目录启动交互演示：

```bash
npm install
npm run dev
```

浏览器打开 [http://127.0.0.1:4179/demo/](http://127.0.0.1:4179/demo/)。演示页直接使用项目源码，修改后刷新即可查看。

| 演示区域 | 可体验的效果 |
| --- | --- |
| Message | 成功、警告、错误、信息四种状态；常驻消息更新；堆叠与关闭补位；有无标题及长短内容 |
| Notification | 系统通知、导出完成、库存提醒、同步异常；多通知堆叠；标题和内容组合 |
| MessageBox | 四种状态图标、无图标、自定义图片；普通与危险确认；名称输入；异步加载；定时关闭；无按钮提示；自定义内容与多按钮返回值 |
| Dialog / Drawer | 对话框与抽屉、正文加载、嵌套浮层；Dialog 全屏切换；窄屏下全屏展示 |
| Loading | 默认圆环、自定义图标、加载文案更新、深浅遮罩及遮罩动态切换 |

### 动效与排版

- **轻提示与通知**：Message 从上方进入，Notification 从右侧进入，约 440ms 的弹性滑入配合状态图标描边。关闭时先轻收，再沿进入方向淡出，完整退场后其余卡片平滑补位。
- **消息更新**：相同 ID 更新内容并重新计时，不重复播放入场动画；仅修改文字不重播图标描边，切换状态时绘制新图标。退出中的消息可通过相同 ID 恢复显示。
- **提示框与对话框**：MessageBox 和普通 Dialog 使用约 560ms 的果冻弹跳，位移中伴随拉伸、挤压与逐渐收敛的回弹；关闭时先缩小，再下落淡出。遮罩独立淡入淡出。
- **状态图标**：MessageBox 的内置图标在窗口首次回缩时同步描边，圆形边框绘制后渐淡，内部符号保持清晰；也可使用自定义图片或省略图标。
- **抽屉与全屏**：Drawer 使用幅度较小的侧向弹性，约 480ms 滑入、330ms 滑出；全屏 Dialog 使用轻量淡入淡出，全屏切换衔接面板尺寸变化。
- **内容排版**：支持单行、多行和带标题的提示，长内容自然换行，图标保持顶部对齐；Dialog 与 Drawer 默认仅正文滚动，标题栏和操作栏保持可见。
- **减少动态效果**：遵循系统 `prefers-reduced-motion` 设置。MessageBox 还可通过 `shake: false` 使用轻量过渡。

## 安装与快速开始

```bash
npm install @ztechjs/zt-alert
```

在应用入口引入样式，按需导入 API：

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

ZtMessage.success('保存成功')

ZtNotification.info({
  title: '报表已更新',
  content: '最新销售与库存数据已同步完成。'
})

const confirmed = await ZtMessageBox.confirm('确定删除这条记录？')
if (confirmed) {
  ZtMessage.success('已确认删除')
}
```

发布格式为 ESM，JavaScript、CSS 和类型声明独立提供。也可以将构建后的 `dist/index.js` 与 `dist/style.css` 放到静态站点，通过 `<script type="module">` 和 `<link rel="stylesheet">` 引入；不提供全局变量或 UMD 版本。

构建目标为 Chrome 80+、Safari 13+。模块可在 SSR 环境导入，打开组件需在浏览器 DOM 就绪后执行，例如 Vue 的 `onMounted` 或 React 的 `useEffect`、事件处理函数中。

## Message 与 Notification

两者共享调用方式和选项，分别管理自己的消息队列。Message 默认顶部居中，3200ms 后关闭；Notification 默认右上角，5200ms 后关闭。适合无需中断当前操作的反馈。

```js
ZtMessage.success('保存成功')
ZtMessage.error('保存失败，请稍后重试')
ZtMessage.warning('请先选择一条记录')
ZtMessage.info('数据正在后台同步')

ZtNotification.success({
  title: '导出完成',
  content: '销售明细已生成，可前往下载中心查看。'
})
```

### 常驻、更新与关闭

```js
const id = ZtMessage.info({
  id: 'report-export',
  content: '正在生成报表…',
  duration: 0,
  closable: false
})

ZtMessage.success({
  id,
  content: '报表已生成',
  duration: 3200
})

ZtMessage.close(id)
ZtMessage.clear()
ZtNotification.clear()
```

相同 ID 只在同一服务内复用。更新时应传入需要保留的标题、内容、时长和关闭按钮配置。`clear()` 仅清空对应服务，并保留退场动画。

| 选项 | 类型 | 默认值与说明 |
| --- | --- | --- |
| `id` | `string \| number` | 自动生成；相同 ID 更新已有消息 |
| `content` | `string \| number` | 消息内容，按纯文本显示 |
| `title` | `string` | 可选标题 |
| `status` | `'success' \| 'error' \| 'warning' \| 'info'` | `open()` 默认使用 `info`；快捷方法指定对应状态 |
| `duration` | `number` | Message 为 `3200`，Notification 为 `5200`，单位 ms；`0` 表示常驻 |
| `closable` | `boolean` | `true`，是否显示关闭按钮 |

`open(input)`、`success(input)`、`error(input)`、`warning(input)` 和 `info(input)` 均返回消息 ID；`input` 可以是文字、数字或选项对象。通过 `close(id)` 关闭单条，通过 `clear()` 清空当前服务。

## MessageBox：提示、确认与输入

适合需要用户关注或明确选择的短流程。返回 Promise，可直接结合 `async / await` 使用。同一时间保留一个活动 MessageBox，打开新提示框会关闭旧提示框，旧 Promise 尚未完成时返回 `null`。

### 提示与危险操作确认

```js
await ZtMessageBox('操作完成')
await ZtMessageBox('操作失败', '请检查网络后重试', 'error')
await ZtMessageBox.alert({
  title: '保存成功',
  text: '新的展示配置已生效。',
  icon: 'success'
})

const confirmed = await ZtMessageBox.confirm({
  title: '确认删除？',
  text: '删除后无法恢复，请确认后继续。',
  icon: 'warning',
  dangerMode: true,
  closeOnClickOutside: false
})

if (confirmed) {
  await deleteRecord()
}
```

`alert()` 默认显示确定按钮；`confirm()` 默认显示取消和确定按钮，返回布尔值。普通调用返回所选按钮的值，默认确定为 `true`、取消为 `null`；遮罩、Esc、定时关闭或 `close()` 关闭均返回 `null`。

### 输入名称

```js
const name = await ZtMessageBox.prompt({
  title: '新建报表',
  text: '请输入报表名称',
  content: {
    element: 'input',
    attributes: { placeholder: '报表名称', maxlength: 30 }
  }
})

if (name !== null && name.trim()) {
  await createReport(name.trim())
}
```

默认输入框可使用 `prompt('请输入名称')`。确认后返回输入字符串，取消返回 `null`；业务校验由调用方完成。

### 多按钮选择

```js
const action = await ZtMessageBox({
  title: '选择导出范围',
  text: '请选择需要导出的数据。',
  buttons: {
    cancel: '取消',
    current: { text: '当前页', value: 'current' },
    confirm: { text: '全部数据', value: 'all' }
  }
})

if (action === 'current' || action === 'all') {
  await exportData(action)
}
```

### 异步按钮加载

按钮设置 `closeModal: false` 后，点击会返回操作值，提示框保持打开并显示按钮加载状态，防止重复提交。

```js
const action = await ZtMessageBox({
  title: '开始同步？',
  text: '同步完成前请稍候。',
  buttons: {
    cancel: true,
    confirm: { text: '同步', value: 'sync', closeModal: false }
  }
})

if (action === 'sync') {
  try {
    await syncData()
    ZtMessageBox.close()
    ZtMessage.success('同步完成')
  } catch {
    ZtMessageBox.stopLoading()
    ZtMessage.error('同步失败，请关闭提示框后重试')
  }
}
```

每次调用的 Promise 只完成一次。`stopLoading()` 恢复按钮交互，不会创建新的等待结果；需要重新执行异步流程时，应关闭并重新打开提示框。

### 选项与辅助方法

| 选项 | 说明 |
| --- | --- |
| `title` / `text` | 标题与说明文字，按纯文本显示 |
| `icon` | `success`、`error`、`warning`、`info`，或自定义图片地址；省略时无图标 |
| `buttons` | 默认 `true`；支持布尔值、文字、按钮数组或命名按钮对象；`false` 隐藏全部按钮 |
| `button` | 单个确定按钮的简写；同时传入 `buttons` 时以 `buttons` 为准 |
| `content` | 文字、DOM Node 或 `{ element, attributes }`；字符串 `'input'` 创建输入框 |
| `className` | 提示框自定义 CSS 类 |
| `dangerMode` | 默认 `false`；启用危险色确定按钮 |
| `closeOnClickOutside` / `closeOnEsc` | 默认均为 `true` |
| `shake` | 默认 `true`；是否启用弹性窗口动效 |
| `timer` | 默认 `0`，不自动关闭；大于 `0` 时按 ms 定时关闭 |

按钮对象支持 `visible`、`text`、`value`、`className`、`closeModal`，其中 `visible` 与 `closeModal` 默认开启。

- `ZtMessageBox.close()`：关闭当前提示框。
- `ZtMessageBox.stopLoading()`：结束按钮加载状态。
- `ZtMessageBox.getState()`：读取 `isOpen`、各按钮的值与加载状态，以及定时配置。
- `ZtMessageBox.setDefaults(options)`：设置后续提示框的默认选项。
- `ZtMessageBox.setActionValue(value)`：传字符串更新确定按钮返回值，或传 `{ 按钮名: 值 }` 更新多个按钮。

## Dialog：业务对话框

适合编辑表单、详情预览和需要自定义内容的业务流程。支持标题、副标题、头部关闭和全屏工具、底部操作区、正文加载、确认按钮加载，以及内容挂载与清理。

```js
const dialog = ZtDialog.open({
  title: '编辑报表',
  subtitle: '配置报表名称与展示内容',
  width: 720,
  bodyPadding: 24,
  showZoom: true,
  showFooter: true,
  confirmText: '保存',
  render(container) {
    const input = document.createElement('input')
    input.autofocus = true
    input.placeholder = '报表名称'
    container.append(input)

    return () => input.remove()
  },
  async onConfirm(controls) {
    controls.setConfirmLoading(true)
    let saved = false
    try {
      await saveReport()
      saved = true
    } catch {
      ZtMessage.error('保存失败，请稍后重试')
    } finally {
      controls.setConfirmLoading(false)
    }
    if (saved) {
      await controls.close('api', { saved: true })
    }
  }
})

const result = await dialog.closed
if (result.value?.saved) {
  ZtMessage.success('报表已保存')
}
```

确认按钮触发 `onConfirm`，由业务完成保存后主动关闭。`loading` 或 `confirmLoading` 开启期间会阻止关闭，包括调用 `close()`；应先结束加载，再关闭窗口。

```js
dialog.update({ title: '编辑报表（草稿）', confirmDisabled: false })
dialog.setLoading(true, '正在读取报表…')
dialog.setLoading(false)
dialog.setConfirmLoading(true)
dialog.setConfirmLoading(false)
dialog.toggleFullscreen(true)
dialog.focus()
```

## Drawer：侧边抽屉

固定从右侧进入，适合查看详情、编辑记录或调整筛选条件。与 Dialog 共用内容挂载、异步关闭校验、底部按钮和加载能力。

```js
const drawer = ZtDrawer.open({
  title: '筛选条件',
  subtitle: '应用后刷新当前报表',
  width: 480,
  bodyPadding: 24,
  content: '请选择品牌、季节与渠道。',
  showFooter: true,
  confirmText: '应用筛选',
  onConfirm(controls) {
    applyFilters()
    void controls.close('api', { applied: true })
  }
})

const result = await drawer.closed
```

### 关闭前校验

Dialog 与 Drawer 的所有关闭入口都会执行 `beforeClose(reason)`，可用于检查未保存的修改、确认放弃操作等场景。支持同步或异步返回；返回 `false` 或抛出错误会保持打开，等待期间阻止重复关闭。

```js
ZtDrawer.open({
  title: '编辑记录',
  content: editorElement,
  beforeClose: async reason => {
    if (reason === 'api' || !hasUnsavedChanges()) return true
    return ZtMessageBox.confirm({
      title: '放弃未保存的修改？',
      icon: 'warning',
      dangerMode: true
    })
  },
  onCloseError(error) {
    ZtMessage.error(error.message || '暂时无法关闭，请稍后重试')
  }
})
```

`reason` 为 `close`（关闭按钮）、`cancel`（取消按钮）、`mask`（遮罩）、`escape`（Esc）或 `api`（默认命令关闭）。

`await instance.close(reason, value)` 返回是否接受关闭请求，不等待完整退场；`await instance.closed` 等待退场、内容清理和焦点恢复完成，返回 `{ reason, value }`。

### 内容挂载

Dialog 与 Drawer 支持以下内容形式，同时提供时优先级为 `render` → `html` → `content`：

| 方式 | 适用场景与行为 |
| --- | --- |
| `content: string \| number` | 普通说明，使用 `textContent`，不解析 HTML |
| `content: Node` | 挂载已有 DOM，临时移动节点，关闭或替换内容后尽量还原原位置 |
| `render(container, controls)` | 构建原生 DOM 或挂载框架视图，可返回清理函数；关闭或替换内容时执行清理 |
| `html: string` | 展示可信 HTML，使用 `innerHTML`；外部输入需先消毒 |

`update()` 传入 `content`、`html` 或 `render` 时会替换原内容配置并清理旧内容。Vue 或 React 视图可在 `render` 中挂载，将对应卸载操作作为清理函数返回。

### Dialog 与 Drawer 配置

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `title` / `subtitle` | `''` / `''` | 标题与副标题 |
| `width` | `640` | 数字按 px 处理，也支持 CSS 长度字符串 |
| `fullscreenBelow` | `768` | 视口宽度低于此值时占满屏幕；`0` 关闭自动全屏 |
| `showHeader` / `showClose` | `true` / `true` | 是否显示头部和关闭按钮 |
| `showFooter` / `showCancelButton` | `false` / `true` | 是否显示底部操作栏和取消按钮 |
| `confirmText` / `cancelText` | `'确定'` / `'取消'` | 操作按钮文字 |
| `confirmDisabled` | `false` | 禁用确认按钮 |
| `loading` / `loadingText` | `false` / `'正在加载…'` | 面板加载状态及文案 |
| `confirmLoading` | `false` | 确认按钮加载状态 |
| `maskClosable` / `escClosable` | `false` / `true` | 是否允许点击遮罩或按 Esc 关闭 |
| `bodyPadding` | `0` | 正文内边距，支持数字或 CSS 长度字符串 |
| `bodyScroll` | `true` | 正文由组件滚动；设为 `false` 时由自定义内容管理 |
| `lockScroll` | `true` | 锁定页面背景滚动 |
| `focusTrap` / `autoFocus` | `true` / `true` | 焦点循环与打开时自动聚焦 |
| `zIndex` | `1000` | 浮层最低层级，实际层级由共享管理器分配 |
| `ariaLabel` / `closeLabel` | 自动生成 | 自定义可访问名称及关闭按钮名称 |
| `beforeClose` | — | 关闭前校验，可返回 Promise |

Dialog 额外支持 `height`、`maxHeight`（默认 `'88%'`）、`top`、`showZoom`（默认 `false`）与 `fullscreen`（默认 `false`）。Drawer 不提供全屏切换工具，通过窄屏断点自动铺满视口。

生命周期与错误回调：

| 回调 | 调用时机 |
| --- | --- |
| `onOpen(controls)` | 挂载并初始化后 |
| `onShow(controls)` | 入场完成后 |
| `onConfirm(controls)` | 点击确认按钮或调用 `controls.confirm()` |
| `onCancel()` | 取消关闭请求被接受时 |
| `onClose(reason)` | 开始关闭时 |
| `onHide(reason)` | 退场、内容清理与移除完成后 |
| `onCloseError(error)` | 关闭前校验抛出错误时 |
| `onError(error)` | 内容挂载、清理或生命周期回调发生错误时 |

实例提供 `update()`、`setLoading()`、`setConfirmLoading()`、`focus()`、`close()` 和 `closed`；Dialog 额外提供 `toggleFullscreen(force?)`。`render`、`onOpen`、`onShow`、`onConfirm` 获得对应控制方法，可在内容内部操作当前浮层。

## Loading：全屏加载反馈

适合需要暂时阻止页面操作的整体任务。默认展示旋转圆环和“正在加载…”文字，也可传入品牌图片或 DOM 图标。

```js
const loading = ZtLoading.open({
  icon: '/icons/logo.svg',
  text: '正在读取数据…',
  maskColor: 'rgba(20, 24, 32, 0.65)'
})

try {
  const data = await loadData()
  loading.update({ text: '正在生成报表…' })
  await generateReport(data)
} finally {
  await loading.close()
}
```

也可使用 `ZtLoading.open('正在加载…')`，或通过 `ZtLoading.close()` 关闭当前实例。

| 选项 | 默认值与说明 |
| --- | --- |
| `text` | `'正在加载…'`，按纯文本显示；空字符串隐藏文字 |
| `icon` | 默认旋转圆环；支持图片地址或 DOM Element；`null` 恢复默认图标 |
| `maskColor` | `rgba(20, 24, 32, 0.2)`；支持 CSS 颜色与透明度；`null` 恢复 CSS 主题色 |
| `zIndex` | 最低 `6000`，在首次打开时配置 |

- **动态更新**：`loading.update({ text, icon, maskColor })` 或 `loading.update('新文案')` 更新当前内容，不重播入场动画。DOM 图标使用副本，不移动原节点。
- **文字对比度**：根据遮罩与 `html` / `body` 纯色背景叠加后的亮度，在深灰和柔白中选择更清晰的文字颜色；页面主题、遮罩及系统深浅主题变化时重新计算。背景图片、渐变、视频及局部内容不参与采样，这类页面可选用不透明度较高的遮罩。
- **交互与关闭**：全屏加载会锁定滚动和键盘焦点，不自动关闭，也不响应 Esc 或遮罩点击。`close()` 和 `closed` 均可等待完整退场。
- **实例复用**：已有活动 Loading 时，再次 `open()` 会更新并返回同一实例；并发任务应由调用方汇总完成后关闭，不内置请求计数。已关闭实例不会影响后来打开的新实例。

## 嵌套浮层与键盘操作

Dialog、Drawer、MessageBox 和 Loading 共享层级、焦点和滚动锁管理，适合“抽屉编辑 → 确认放弃修改”等嵌套流程。

- 最上层交互浮层处理 Esc，避免一次按键连续关闭多层。
- 默认将键盘焦点留在当前浮层中，支持 Tab / Shift+Tab 循环；关闭后恢复此前焦点。
- 多层浮层并存时，页面滚动锁保持到相关浮层全部释放；退场期间继续保持焦点和滚动管理。
- 面板提供 ARIA 对话框语义与名称，消息与加载状态提供辅助技术可读取的状态信息。

## 主题定制

在组件样式之后覆盖 CSS 变量，即可调整品牌色、字体、圆角、阴影和加载遮罩：

```css
:root {
  --zt-font: "PingFang SC", "Microsoft YaHei", sans-serif;
  --zt-ink: #202020;
  --zt-muted: #626262;
  --zt-accent: #245edb;
  --zt-accent-ink: #244c9e;
  --zt-accent-soft: #f0f5ff;
  --zt-success: #1f8657;
  --zt-warning: #a96b13;
  --zt-error: #bd3f3b;
  --zt-radius: 16px;
  --zt-shadow: 0 12px 34px rgba(28, 37, 49, 0.15);
  --zt-loading-mask: rgba(20, 24, 32, 0.2);
}
```

浮层挂载到 `document.body`，主题变量应定义在 `:root`、`html` 或 `body` 等可被浮层继承的位置。

## 开发与验证

本地开发需要 Node.js 18+。在项目目录执行：

```bash
npm install
npx playwright install chromium webkit
npm run dev
```

另开终端执行验证或构建：

```bash
npm run test:unit
npm run test:types
npm run test:browser
npm run test:webkit
npm run build
npm pack --dry-run
```

`npm test` 包含单元测试、类型检查和 Chromium 浏览器测试；`npm run test:all` 额外运行 WebKit 测试。`npm run build` 生成 `dist/index.js` 与 `dist/style.css`，npm 包包含构建产物、类型声明、中英文 README、更新日志和许可证。

## License

[MIT](./LICENSE)
