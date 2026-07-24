/**
 * React Context 上下文定义
 * 提供全局的标签页缓存状态管理
 */

import React from 'react'
import { TabsCacheManager } from '../core/TabsCacheManager'
import { StorageEngine } from '../storage'

export interface TabsCacheContextValue {
  /** 标签页管理器实例 */
  manager: TabsCacheManager

  /** 存储引擎实例 */
  storage: StorageEngine

  /** 是否已初始化 */
  initialized: boolean

  /** 初始化函数 */
  initialize: () => Promise<void>

  /** 销毁函数 */
  destroy: () => void
}

// 创建上下文
export const TabsCacheContext = React.createContext<TabsCacheContextValue | null>(null)

// 默认值（用于开发环境）
export const defaultTabsCacheContext: TabsCacheContextValue = {
  manager: new TabsCacheManager(),
  storage: new StorageEngine('memory'),
  initialized: false,
  initialize: async () => { },
  destroy: () => { }
}

// Provider Props
export interface TabsCacheProviderProps {
  children: React.ReactNode
  /** 存储后端类型 */
  storageType?: 'memory' | 'custom'
  /** 存储配置 */
  storageOptions?: any
  /** 标签页管理器配置 */
  managerOptions?: any
}