import { ZtDialog, ZtDrawer, ZtLoading, ZtMessage, ZtMessageBox, ZtNotification } from '../src/index.js'

function reportForm(container) {
  container.innerHTML = `
    <form class="demo-form">
      <label>报表名称<input autofocus name="name" value="秋季商品进销存"></label>
      <label>更新频率<select name="frequency"><option>每日</option><option>每周</option><option>每月</option></select></label>
      <div class="demo-form__summary">
        <div class="demo-metric">数据源<strong>12</strong></div>
        <div class="demo-metric">订阅人<strong>38</strong></div>
      </div>
    </form>`
}

function filterForm(container) {
  container.innerHTML = `
    <form class="demo-form">
      <label>品牌<select autofocus><option>全部品牌</option><option>IMM</option><option>FIONACHEN</option></select></label>
      <label>季节<select><option>2026 秋</option><option>2026 冬</option></select></label>
      <label>最低库存<input type="number" value="20"></label>
    </form>`
}

function boxOptions(options) {
  return {
    shake: document.getElementById('box-shake').checked,
    closeOnClickOutside: document.getElementById('box-mask-close').checked,
    closeOnEsc: document.getElementById('box-esc-close').checked,
    ...options
  }
}

function showBoxResult(value) {
  document.getElementById('box-result').textContent = JSON.stringify(value, null, 2) ?? 'undefined'
}

async function previewBox(options, method = 'alert') {
  const value = await ZtMessageBox[method](boxOptions(options))
  showBoxResult(value)
  return value
}

const boxStatuses = [
  { icon: 'success', title: '数据准备完成', text: '可以开始生成报表' },
  { icon: 'warning', title: '部分数据待确认', text: '有 3 个数据源尚未完成校验，请检查后再发布。' },
  { icon: 'error', title: '数据同步失败', text: '销售数据源连接超时，请稍后重试。' },
  { icon: 'info', title: '数据更新通知', text: '今晚 22:00 更新销售数据集，预计用时 10 分钟。' }
]

function previewNoticeStack(service, variant) {
  const notices = [
    { status: 'info', title: '同步任务', content: '正在同步销售数据', duration: 3600 },
    { status: 'warning', title: '数据校验', content: '有 3 项数据需要确认', duration: 1800 },
    { status: 'success', title: '库存更新', content: '库存数据已更新完成', duration: 5200 }
  ]
  for (const [index, notice] of notices.entries()) {
    service.open({ ...notice, id: `demo-${variant}-${index}`, title: variant === 'notification' ? notice.title : undefined })
  }
}

async function previewLoading(options, next) {
  const loading = ZtLoading.open(options)
  try {
    if (next) {
      await new Promise(resolve => setTimeout(resolve, 800))
      loading.update(next)
    }
    await new Promise(resolve => setTimeout(resolve, 1800))
  } finally {
    await loading.close()
  }
}

const actions = {
  loading: () => previewLoading({ text: '正在读取报表…' }),
  'loading-dark': () => previewLoading({ text: '正在读取报表…', maskColor: 'rgba(20, 24, 32, 0.76)' }),
  'loading-light': () => previewLoading({ text: '正在读取报表…', maskColor: 'rgba(241, 245, 249, 0.86)' }),
  'loading-mask-update': () => previewLoading(
    { text: '正在读取数据…', maskColor: 'rgba(241, 245, 249, 0.86)' },
    { text: '正在生成报表…', maskColor: 'rgba(20, 24, 32, 0.76)' }
  ),
  'loading-custom': () => previewLoading({ icon: '/demo/assets/zt-mark.svg', text: '正在同步库存数据…' }),
  'loading-update': () => previewLoading(
    { text: '正在读取数据…' },
    { icon: '/demo/assets/zt-mark.svg', text: '正在生成报表…' }
  ),
  'message-success': () => ZtMessage.success('报表保存成功'),
  'message-warning': () => ZtMessage.warning('仍有 3 项数据待确认'),
  'message-error': () => ZtMessage.error('同步失败，请检查数据源'),
  'message-info': () => ZtMessage.info('新一批销售数据已就绪'),
  'message-no-title-short': () => ZtMessage.info({ id: 'demo-message-no-title-short', content: '筛选条件已更新' }),
  'message-title-short': () => ZtMessage.success({ id: 'demo-message-title-short', title: '保存成功', content: '报表已更新' }),
  'message-no-title-long': () => ZtMessage.warning({
    id: 'demo-message-no-title-long',
    content: '当前报表包含销售、库存和商品档案三个数据源，其中部分门店的库存记录尚未完成同步。请核对品牌、季节、渠道及统计日期，确认异常记录已经处理后再继续发布，避免订阅人看到不完整的分析结果。',
    duration: 0
  }),
  'message-title-long': () => ZtMessage.error({
    id: 'demo-message-title-long',
    title: '报表发布失败',
    content: '销售数据源连接超时，本次发布未完成。你编辑的筛选条件和展示配置仍保留在草稿中，请检查数据源状态及网络连接，待同步任务恢复后重新执行校验。校验通过后可再次发布，无需重新填写报表内容。',
    duration: 0
  }),
  'message-update': () => {
    ZtMessage.info({ id: 'sync', content: '正在同步库存数据…', duration: 0 })
    setTimeout(() => ZtMessage.success({ id: 'sync', content: '库存数据已同步', duration: 3200 }), 900)
  },
  'message-clear': () => ZtMessage.clear(),
  'message-stack': () => previewNoticeStack(ZtMessage, 'message'),
  'notification-info': () => ZtNotification.info({ title: '系统通知', content: '今晚 22:00 更新销售数据集' }),
  'notification-success': () => ZtNotification.success({ title: '导出完成', content: '本月销售报表已生成' }),
  'notification-warning': () => ZtNotification.warning({ title: '库存提醒', content: '12 个 SPU 已进入长尾库存范围' }),
  'notification-error': () => ZtNotification.error({ title: '同步异常', content: '经销库存源连接失败' }),
  'notification-no-title-short': () => ZtNotification.info({ id: 'demo-notification-no-title-short', content: '收到一条新的订阅通知' }),
  'notification-title-short': () => ZtNotification.success({ id: 'demo-notification-title-short', title: '导出完成', content: '报表文件已生成' }),
  'notification-no-title-long': () => ZtNotification.warning({
    id: 'demo-notification-no-title-long',
    content: '本次库存分析发现多个商品的周转天数超过预警阈值，涉及不同品牌、季节和渠道。请前往库存明细核对可售数量、在途数量及最近销售记录，结合门店实际需求安排调拨，处理完成后重新刷新报表确认最新结果。',
    duration: 0
  }),
  'notification-title-long': () => ZtNotification.error({
    id: 'demo-notification-title-long',
    title: '销售与库存数据同步异常',
    content: '夜间同步任务未能读取全部经销库存数据，部分数据源返回了连接超时。系统保留了上一次成功同步的结果，当前报表可能暂时缺少最新变化。请检查异常数据源，恢复连接后重新发起同步，并在任务完成后通知相关订阅人。',
    duration: 0
  }),
  'notification-clear': () => ZtNotification.clear(),
  'notification-stack': () => previewNoticeStack(ZtNotification, 'notification'),
  'box-alert': () => previewBox(boxStatuses[0]),
  'box-warning': () => previewBox(boxStatuses[1]),
  'box-error': () => previewBox(boxStatuses[2]),
  'box-info': () => previewBox(boxStatuses[3]),
  'box-no-icon': () => previewBox({ title: '报表已保存', text: '下次打开时将恢复当前的筛选条件。' }),
  'box-custom-icon': () => previewBox({ title: '欢迎回来', text: '你的工作台已准备就绪。', icon: '/demo/assets/zt-mark.svg' }),
  'box-sequence': async () => {
    for (const [index, status] of boxStatuses.entries()) {
      const result = await previewBox({
        ...status,
        buttons: {
          cancel: '结束预览',
          confirm: { text: index === boxStatuses.length - 1 ? '完成' : '下一个', value: 'next' }
        }
      })
      if (result !== 'next') return
    }
    showBoxResult('已查看全部状态图标')
  },
  'box-normal-confirm': () => previewBox({ title: '发布报表？', text: '发布后，订阅人即可查看最新数据。', icon: 'info' }, 'confirm'),
  'box-confirm': async () => {
    const confirmed = await previewBox({ title: '确认删除报表？', text: '删除后无法恢复', icon: 'warning', dangerMode: true }, 'confirm')
    if (confirmed) ZtMessage.success('报表已删除')
  },
  'box-prompt': async () => {
    const name = await previewBox({ title: '新建数据集', icon: 'info', content: { element: 'input', attributes: { placeholder: '数据集名称', maxlength: 30 } } }, 'prompt')
    if (name) ZtMessage.success(`已创建“${name}”`)
  },
  'box-async': async () => {
    const action = await previewBox({ title: '开始刷新数据？', text: '将同步全部销售与库存数据源。', icon: 'info', buttons: { cancel: true, confirm: { text: '刷新', value: 'refresh', closeModal: false } } })
    if (action === 'refresh') {
      await new Promise(resolve => setTimeout(resolve, 1200))
      ZtMessageBox.close()
      showBoxResult({ action, status: 'refreshed' })
      ZtMessage.success('数据刷新完成')
    }
  },
  'box-timer': () => previewBox({ title: '草稿已保存', text: '窗口将在 2 秒后关闭。', icon: 'success', timer: 2000 }),
  'box-no-buttons': () => previewBox({ title: '同步完成', text: '所有数据源均为最新状态。', icon: 'success', buttons: false, timer: 1800 }),
  'box-content': () => {
    const content = document.createElement('div')
    content.className = 'demo-box-content'
    content.innerHTML = '<h3>销售数据集</h3><dl><dt>覆盖品牌</dt><dd>IMM / FIONACHEN</dd><dt>数据源</dt><dd>12 个</dd><dt>订阅人</dt><dd>38 人</dd><dt>更新频率</dt><dd>每日</dd></dl>'
    return previewBox({ title: '发布内容预览', icon: 'info', content })
  },
  'box-long-text': () => previewBox({
    title: '发布前检查',
    icon: 'warning',
    text: '数据完整性\n请确认销售、库存和商品档案已同步至最新批次，异常记录已处理。\n\n权限范围\n报表将向当前订阅人开放，门店仅能查看授权范围内的数据。\n\n更新计划\n销售数据每晚更新，库存数据按日汇总；历史数据修订会在下一次同步后生效。\n\n筛选条件\n品牌、季节、渠道和区域筛选将随报表一起保存。\n\n订阅通知\n发布完成后，订阅人将在工作台收到更新通知。'
  }),
  'box-buttons': () => previewBox({
    title: '如何处理当前报表？',
    text: '可以保存为草稿，或直接发布给订阅人。',
    icon: 'info',
    buttons: { cancel: '取消', draft: { text: '保存草稿', value: 'draft' }, confirm: { text: '立即发布', value: 'publish' } }
  }),
  'box-custom-button': () => previewBox({
    title: '报表生成完成',
    icon: 'success',
    className: 'demo-box--compact',
    button: { text: '查看报表', value: 'open-report', className: 'demo-box-action--report' }
  }),
  dialog: () => ZtDialog.open({
    title: '编辑报表',
    subtitle: '修改只对当前报表生效',
    width: 680,
    showFooter: true,
    showZoom: true,
    confirmText: '保存',
    render: reportForm,
    async onConfirm(controls) {
      controls.setConfirmLoading(true)
      await new Promise(resolve => setTimeout(resolve, 700))
      controls.close('api', { saved: true })
      ZtMessage.success('报表保存成功')
    }
  }),
  'dialog-loading': () => {
    const dialog = ZtDialog.open({ title: '报表详情', width: 720, loading: true, loadingText: '正在读取数据…' })
    setTimeout(() => dialog.update({ loading: false, html: '<div class="demo-form"><div class="demo-metric">本月销售额<strong>¥ 8,420,600</strong></div></div>' }), 1000)
  },
  drawer: () => ZtDrawer.open({
    title: '筛选条件',
    subtitle: '销售与库存分析',
    width: 520,
    showFooter: true,
    confirmText: '应用筛选',
    render: filterForm,
    onConfirm(controls) { controls.close('api'); ZtMessage.success('筛选条件已应用') }
  }),
  nested: () => ZtDrawer.open({
    title: '任务详情',
    width: 560,
    showFooter: true,
    render: reportForm,
    onConfirm() {
      ZtDialog.open({
        title: '确认提交？',
        content: '任务提交后将进入审批流程。',
        bodyPadding: 24,
        showFooter: true,
        onConfirm(controls) { controls.close('api'); ZtMessage.success('任务已提交') }
      })
    }
  })
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]')
  if (!button) return
  actions[button.dataset.action]?.()
})
