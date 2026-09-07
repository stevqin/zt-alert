export type NoticeStatus = 'success' | 'error' | 'warning' | 'info'
export type NoticeId = string | number
export type NoticeContent = string | number

export interface NoticeOptions {
  id?: NoticeId
  title?: string
  content: NoticeContent
  status?: NoticeStatus
  duration?: number
  closable?: boolean
}

export type NoticeInput = NoticeContent | NoticeOptions
export type NoticeShortcutInput = NoticeContent | Omit<NoticeOptions, 'status'>

export interface ZtNoticeApi {
  open(input: NoticeInput): NoticeId
  success(input: NoticeShortcutInput): NoticeId
  error(input: NoticeShortcutInput): NoticeId
  warning(input: NoticeShortcutInput): NoticeId
  info(input: NoticeShortcutInput): NoticeId
  close(id: NoticeId): void
  clear(): void
}

export interface MessageBoxButtonOptions {
  visible?: boolean
  text?: string
  value?: unknown
  className?: string | string[]
  closeModal?: boolean
}

export type MessageBoxButtonList = Record<string, MessageBoxButtonOptions | boolean | string>
export type MessageBoxButtons = boolean | string | Array<string | boolean> | MessageBoxButtonList

export interface MessageBoxContentOptions {
  element: string | Node
  attributes?: Record<string, unknown>
}

export interface MessageBoxOptions {
  title?: string
  text?: string
  icon?: NoticeStatus | string
  buttons?: MessageBoxButtons
  button?: string | boolean | MessageBoxButtonOptions
  content?: string | Node | MessageBoxContentOptions
  className?: string
  closeOnClickOutside?: boolean
  closeOnEsc?: boolean
  dangerMode?: boolean
  shake?: boolean
  timer?: number
}

export interface MessageBoxPublicState {
  isOpen: boolean
  actions: Record<string, { value: unknown; closeModal: boolean; loading: boolean }>
  timer: number
}

export interface MessageBoxApi {
  (title?: string): Promise<unknown>
  (title: string, text: string, icon?: NoticeStatus): Promise<unknown>
  (options: MessageBoxOptions): Promise<unknown>
  alert(options?: string | MessageBoxOptions): Promise<unknown>
  confirm(options?: string | MessageBoxOptions): Promise<boolean>
  prompt(options?: string | MessageBoxOptions): Promise<string | null>
  close(): void
  getState(): MessageBoxPublicState
  setDefaults(options: Partial<MessageBoxOptions>): void
  setActionValue(options: string | Record<string, unknown>): void
  stopLoading(): void
}

export type OverlayCloseReason = 'close' | 'cancel' | 'mask' | 'escape' | 'api'
export type OverlayLength = number | string
export interface OverlayClosedResult<T = unknown> { reason: OverlayCloseReason; value: T | undefined }

export interface OverlayControls<T = unknown> {
  close(reason?: OverlayCloseReason, value?: T): Promise<boolean>
  confirm(): void
  update(options: Partial<BaseOverlayOptions<T>>): OverlayInstance<T>
  setLoading(loading: boolean, text?: string): OverlayInstance<T>
  setConfirmLoading(loading: boolean): OverlayInstance<T>
  focus(): OverlayInstance<T>
  toggleFullscreen?(force?: boolean): DialogInstance<T>
}

export interface BaseOverlayOptions<T = unknown> {
  title?: string
  subtitle?: string
  content?: string | number | Node
  html?: string
  render?: (container: HTMLElement, controls: OverlayControls<T>) => void | (() => void)
  ariaLabel?: string
  closeLabel?: string
  width?: OverlayLength
  fullscreenBelow?: number
  showHeader?: boolean
  showClose?: boolean
  showFooter?: boolean
  showCancelButton?: boolean
  confirmText?: string
  cancelText?: string
  confirmDisabled?: boolean
  loading?: boolean
  loadingText?: string
  confirmLoading?: boolean
  maskClosable?: boolean
  escClosable?: boolean
  lockScroll?: boolean
  focusTrap?: boolean
  autoFocus?: boolean
  bodyScroll?: boolean
  bodyPadding?: OverlayLength
  zIndex?: number
  beforeClose?: (reason: OverlayCloseReason) => boolean | void | Promise<boolean | void>
  onOpen?: (controls: OverlayControls<T>) => void
  onShow?: (controls: OverlayControls<T>) => void
  onConfirm?: (controls: OverlayControls<T>) => void | Promise<void>
  onCancel?: () => void
  onClose?: (reason: OverlayCloseReason) => void
  onHide?: (reason: OverlayCloseReason) => void
  onCloseError?: (error: unknown) => void
  onError?: (error: unknown) => void
}

export interface DialogOptions<T = unknown> extends BaseOverlayOptions<T> {
  height?: OverlayLength
  maxHeight?: OverlayLength
  top?: OverlayLength
  showZoom?: boolean
  fullscreen?: boolean
}

export interface DrawerOptions<T = unknown> extends BaseOverlayOptions<T> {}

export interface OverlayInstance<T = unknown> {
  readonly closed: Promise<OverlayClosedResult<T>>
  close(reason?: OverlayCloseReason, value?: T): Promise<boolean>
  update(options: Partial<BaseOverlayOptions<T>>): this
  setLoading(loading: boolean, text?: string): this
  setConfirmLoading(loading: boolean): this
  focus(): this
}

export interface DialogInstance<T = unknown> extends OverlayInstance<T> {
  update(options: Partial<DialogOptions<T>>): this
  toggleFullscreen(force?: boolean): this
}

export interface DrawerInstance<T = unknown> extends OverlayInstance<T> {
  update(options: Partial<DrawerOptions<T>>): this
}

export interface LoadingOptions {
  text?: string
  icon?: string | Element | null
  maskColor?: string | null
  zIndex?: number
}

export interface LoadingInstance {
  readonly closed: Promise<void>
  update(options: Pick<LoadingOptions, 'text' | 'icon' | 'maskColor'> | string): this
  close(): Promise<void>
}

export const ZtMessage: ZtNoticeApi
export const ZtNotification: ZtNoticeApi
export const ZtMessageBox: MessageBoxApi
export const ZtDialog: { open<T = unknown>(options?: DialogOptions<T>): DialogInstance<T> }
export const ZtDrawer: { open<T = unknown>(options?: DrawerOptions<T>): DrawerInstance<T> }
export const ZtLoading: {
  open(options?: LoadingOptions | string): LoadingInstance
  close(): Promise<void>
}
