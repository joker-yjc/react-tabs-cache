/**
 * React Tabs Cache - 核心类型定义
 * 这个文件包含了整个库的所有核心类型和接口定义
 */

// ========================
// 基础类型别名
// ========================

export type TabId = string
export type RoutePattern = string
export type StorageKey = string

export type CleanupStrategyType = 'LRU' | 'FIFO' | 'SIZE' | 'CUSTOM'
export type StorageBackendType = 'memory' | 'localStorage' | 'indexedDB' | 'custom'

// ========================
// 标签页相关类型
// ========================

/**
 * 标签页数据模型
 */
export interface TabItem {
  /** 唯一标识 */
  id: string

  /** 路由路径 */
  pathname: string

  /** 标签标题 */
  title: string

  /** 标签图标（React组件） */
  icon?: React.ReactNode

  /** 查询参数 */
  queryParams?: Record<string, any>

  /** 动态路由参数 */
  params?: Record<string, any>

  /** 是否可关闭 */
  closable?: boolean

  /** 是否固定（固定的标签不会被清理） */
  pinned?: boolean

  /** 自定义元数据 */
  metadata?: Record<string, any>

  /** 缓存的页面元素（真正的Keep-Alive实现） */
  cachedElement?: React.ReactNode

  /** 页面状态快照 */
  stateSnapshot?: any

  /** 是否启用DOM缓存 */
  enableDOMCache?: boolean

  /** 创建时间戳 */
  createdAt: number

  /** 最后访问时间 */
  lastAccessedAt: number

  /** 缓存大小(字节) */
  cacheSize?: number
}

/**
 * TabsManager 的配置选项
 */
export interface TabsManagerConfig {
  /** 最大标签页数（默认20） */
  maxTabs?: number

  /** 最大缓存大小(MB)（默认50） */
  maxCacheSize?: number

  /** 自动清理策略（默认LRU） */
  autoCleanupStrategy?: CleanupStrategyType

  /** 关闭时是否持久化 */
  persistCacheOnClose?: boolean

  /** 启用自动保存 */
  enableAutoSave?: boolean

  /** 自动保存间隔(ms)（默认5000） */
  autoSaveInterval?: number

  /** 路由参数分隔符 */
  routeParamsSeparator?: string
}

// ========================
// 缓存相关类型
// ========================

/**
 * 存储选项
 */
export interface StorageOptions {
  /** 过期时间(ms) */
  expiresIn?: number

  /** 是否压缩 */
  compress?: boolean

  /** 是否加密 */
  encrypted?: boolean

  /** 版本号（用于迁移） */
  version?: string

  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * 清理策略配置
 */
export interface CleanupStrategy {
  type: CleanupStrategyType

  /** 目标清理大小(字节) */
  targetSize?: number

  /** 是否保留固定的标签 */
  preservePinned?: boolean

  /** 自定义清理逻辑 */
  customLogic?: (tabs: TabItem[], strategy: CleanupStrategy) => string[]
}

/**
 * 缓存管理器配置
 */
export interface CacheManagerConfig {
  /** 存储后端类型 */
  storageBackend?: StorageBackendType

  /** 最大总缓存大小(MB)（默认50） */
  maxCacheSize?: number

  /** 单个标签页的最大缓存大小(MB)（默认10） */
  maxSingleCacheSize?: number

  /** 清理策略 */
  cleanupStrategy?: CleanupStrategy

  /** 版本号(用于迁移) */
  version?: string

  /** 启用自动压缩 */
  enableCompression?: boolean
}

// ========================
// 状态管理相关类型
// ========================

/**
 * 页面修改标记集合
 */
export interface PageModificationFlags {
  [key: string]: boolean
}

/**
 * 状态管理器配置
 */
export interface StateManagerConfig {
  /** 自动清理过期标记 */
  autoCleanup?: boolean

  /** 自动清理间隔(ms) */
  autoCleanupInterval?: number
}

// ========================
// 路由相关类型
// ========================

/**
 * 路由参数提取器
 */
export type ParamExtractor = (pathname: string) => Record<string, any>

/**
 * 路由管理器配置
 */
export interface RouteConfig {
  /** 基础路径 */
  basePath?: string

  /** 启用动态参数识别 */
  enableDynamicParams?: boolean

  /** 启用查询参数识别 */
  enableQueryParams?: boolean

  /** 自定义参数提取器 */
  paramExtractors?: Record<string, ParamExtractor>

  /** 重定向映射 */
  redirectMap?: Record<string, string>
}

/**
 * 解析后的路由信息
 */
export interface ParsedRoute {
  pathname: string
  search: string
  params: Record<string, any>
  queryParams: Record<string, any>
  matched: boolean
}

/**
 * 匹配的路由
 */
export interface MatchedRoute {
  pattern: string
  params: Record<string, any>
  component?: React.ComponentType
}

export interface RouteRecord {
  path: string
  name?: string
  title?: string
  parentPathname?: string
  hideInMenu?: boolean
  meta?: Record<string, unknown>
  children?: RouteRecord[]
}

export type TitleResolver = (record: RouteRecord, pathname: string, params: Record<string, string>) => string
export type RouteMatchResult = { matched: boolean; params?: Record<string, string> }
export type RouteMatcher = (pathname: string, routePath: string, record: RouteRecord) => RouteMatchResult
export type RouteScoreResolver = (routePath: string, record: RouteRecord) => number
export type PathNormalizer = (pathname: string) => string

export interface AdaptedRoute {
  title: string
  pathname: string
  routePath: string
  parentPathname?: string
  meta?: Record<string, unknown>
  params: Record<string, string>
}

export interface RouteAdapterOptions {
  basePath?: string
  strict?: boolean
  titleResolver?: TitleResolver
  routeMatcher?: RouteMatcher
  scoreResolver?: RouteScoreResolver
  pathNormalizer?: PathNormalizer
}

export interface RouteAdapter {
  match: (pathname: string) => AdaptedRoute | null
}

// ========================
// 事件相关类型
// ========================

/**
 * 事件回调函数
 */
export type EventCallback<T = any> = (payload?: T) => void

/**
 * 取消订阅函数
 */
export type Unsubscribe = () => void

/**
 * 事件总线接口
 */
export interface IEventBus {
  on<T = any>(eventName: string, callback: EventCallback<T>): Unsubscribe
  off<T = any>(eventName: string, callback: EventCallback<T>): void
  emit<T = any>(eventName: string, payload?: T): void
  clear(eventName?: string): void
}

/**
 * 标签页变更事件
 */
export interface TabsChangeEvent {
  tabId: string
  previousTabId: string | null
  timestamp: number
}

/**
 * 缓存变更事件
 */
export interface CacheChangeEvent {
  tabId: string
  action: 'save' | 'load' | 'clear' | 'remove'
  size: number
  timestamp: number
}

/**
 * 修改状态变更事件
 */
export interface ModificationChangeEvent {
  tabId: string
  modified: boolean
  key?: string
  timestamp: number
}

// ========================
// 错误相关类型
// ========================

/**
 * 错误码枚举
 */
export type ErrorCode =
  | 'CACHE_SAVE_FAILED'
  | 'CACHE_LOAD_FAILED'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_REMOVE_FAILED'
  | 'STORAGE_CLEAR_FAILED'

/**
 * TabsCache错误接口
 */
export interface ITabsCacheError extends Error {
  code: ErrorCode
  tabId?: string
  timestamp: number
  cause?: any
}

// ========================
// Hooks 相关类型
// ========================

/**
 * useTabsCache Hook 配置选项
 */
export interface UseTabsCacheOptions extends TabsManagerConfig {
  storageBackend?: StorageBackendType
  autoSync?: boolean
  syncInterval?: number
  onError?: (error: ITabsCacheError) => void
}

/**
 * useTabsCache Hook 返回值
 */
export interface UseTabsCacheReturn {
  // 数据
  tabs: TabItem[]
  activeTab: TabItem | null
  activeTabId: string

  // 基础操作
  addTab: (tab: Partial<TabItem>) => void
  removeTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<TabItem>) => void
  setActiveTab: (tabId: string) => void

  // 高级操作
  closeOtherTabs: (tabId: string) => void
  closeAllTabs: (excludePinned?: boolean) => void
  pinTab: (tabId: string) => void
  unpinTab: (tabId: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void

  // 查询操作
  getTab: (tabId: string) => TabItem | null
  findTabByPathname: (pathname: string) => TabItem | null
  findTabsByRoute: (route: string) => TabItem[]
  getTabIndex: (tabId: string) => number

  // 缓存操作
  saveCache: (tabId: string, data: any) => Promise<void>
  loadCache: (tabId: string) => Promise<any>
  removeCache: (tabId: string) => Promise<void>
  clearCache: () => Promise<void>
  getCacheSize: (tabId: string) => Promise<number>
  getTotalCacheSize: () => Promise<number>

  // 生命周期
  loading: boolean
  error: ITabsCacheError | null
}

/**
 * usePageModified Hook 返回值
 */
export interface UsePageModifiedReturn {
  // 标记操作
  registerModifyFlag: (key: string, value: boolean, tabId?: string) => void
  getModifyFlag: (key?: string, tabId?: string) => boolean | Record<string, boolean>
  clearModifyFlag: (key?: string | string[], tabId?: string) => void

  // 状态查询
  isModified: boolean
  modifiedKeys: string[]

  // 提醒对话框
  showConfirmDialog: (action: string) => Promise<boolean>

  // 监听
  onModifiedChange: (callback: (modified: boolean) => void) => () => void
}

/**
 * useRouteEnterCallback Hook 返回值
 */
export interface UseRouteEnterCallbackReturn {
  // 回调注册
  registerCallback: (callback: () => void | Promise<void>) => void
  unregisterCallback: (callback: () => void | Promise<void>) => void

  // 手动执行
  executeCallbacks: () => Promise<void>

  // 状态
  isExecuting: boolean
  lastExecutedAt: number | null

  // 监听
  onExecute: (callback: () => void) => () => void
}

/**
 * CommonTabAction 配置选项
 */
export interface CommonTabActionOptions {
  tableRef?: React.RefObject<any>
  autoRefresh?: boolean
  resetPageOnRefresh?: boolean
  showMessage?: boolean
}

/**
 * useCommonTabAction Hook 返回值
 */
export interface UseCommonTabActionReturn {
  // 刷新操作
  refresh: () => Promise<void>
  resetAndRefresh: () => Promise<void>

  // 批量操作后刷新
  refreshAfter: (action: () => Promise<void>) => Promise<void>

  // 状态
  refreshing: boolean
  lastRefreshAt: number | null

  // 自动刷新
  enableAutoRefresh: (interval: number) => void
  disableAutoRefresh: () => void
  autoRefreshEnabled: boolean
}

// ========================
// Context 相关类型
// ========================

/**
 * TabsContext 接口
 */
export interface ITabsContext {
  // 管理器实例
  tabsManager: any // 实际类型将在实现时定义
  cacheManager: any
  stateManager: any
  routeManager: any

  // 操作接口
  addTab: (tab: TabItem) => void
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void

  // 状态修改
  registerPageModifyFlag: (tabId: string, key: string, value: boolean) => void
  getPageModifyFlag: (tabId: string) => boolean

  // 事件系统
  emit: (eventName: string, payload: any) => void
  on: (eventName: string, callback: (payload: any) => void) => void
}
