/**
 * React Tabs Cache 库 - 主入口
 * 
 * 一个通用的 React 标签页缓存管理库
 * 包含标签页管理、页面状态缓存、修改状态跟踪和路由交互等功能
 */

// ========================
// 核心类型导出
// ========================
export type {
  // 基础类型
  TabId,
  RoutePattern,
  StorageKey,
  CleanupStrategyType,
  StorageBackendType,

  // 标签页相关
  TabItem,
  TabsManagerConfig,

  // 缓存相关
  StorageOptions,
  CleanupStrategy,
  CacheManagerConfig,

  // 状态相关
  PageModificationFlags,
  StateManagerConfig,

  // 路由相关
  RouteConfig,
  ParsedRoute,
  MatchedRoute,
  ParamExtractor,
  RouteRecord,
  AdaptedRoute,
  RouteAdapterOptions,
  RouteAdapter,
  TitleResolver,
  RouteMatcher,
  RouteScoreResolver,
  PathNormalizer,

  // 事件相关
  TabsChangeEvent,
  CacheChangeEvent,
  ModificationChangeEvent,

  // 错误相关
  ErrorCode,
  ITabsCacheError,

  // Hooks 相关
  UseTabsCacheOptions,
  UseTabsCacheReturn,
  UsePageModifiedReturn,
  UseRouteEnterCallbackReturn,
  CommonTabActionOptions,
  UseCommonTabActionReturn,

  // Context 相关
  ITabsContext,

  // 工具相关
  EventCallback,
  Unsubscribe,
  IEventBus,
} from '@core/types'

// ========================
// 工具导出
// ========================
export {
  logger,
  createLogger,
  enableLogs,
  disableLogs,
  isEnabled,
  type LogLevel,
} from '@utils/logger'

export {
  serializer,
  createSerializer,
  Serializer,
  SerializationError,
  DeserializationError,
  type SerializeOptions,
} from '@utils/serializer'

export {
  createEventBus,
  globalEventBus,
} from '@utils/eventBus'

export { createRouteAdapter } from './core/RouteAdapter'

export * from './hooks'
export * from './components'
export * from './context'

// ========================
// 版本信息
// ========================
export const VERSION = '0.1.0'

// ========================
// 库初始化函数
// ========================
export function initialize() {
  // 初始化逻辑
}

export default {
  VERSION,
  initialize,
}
