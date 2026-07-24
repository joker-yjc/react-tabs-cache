/**
 * TabsCacheProvider - 标签页缓存上下文提供者
 * 负责初始化和管理标签页缓存的核心服务
 */

import React, { useState, useEffect, useCallback } from 'react'
import { TabsCacheManager } from '../core/TabsCacheManager'
import { StorageEngine } from '../storage'
import { TabsCacheContext, TabsCacheProviderProps, TabsCacheContextValue } from './types'
import { logger } from '../utils/logger'
import { setSharedResources } from '../hooks/useTabsCache'

export const TabsCacheProvider: React.FC<TabsCacheProviderProps> = ({
  children,
  storageType = 'memory',
  storageOptions,
  managerOptions
}) => {
  const [manager] = useState(() => new TabsCacheManager(managerOptions))
  const [storage] = useState(() => new StorageEngine(storageType, storageOptions))

  // 初始化函数
  const initialize = useCallback(async (): Promise<void> => {
    try {
      logger.info('Initializing TabsCacheProvider', {
        storageType,
        managerOptions,
        storageOptions
      })

      // 初始化存储引擎
      // 这里可以添加存储引擎的初始化逻辑

      setSharedResources({ manager, storage })
      logger.info('TabsCacheProvider initialized successfully')

    } catch (error) {
      logger.error('Failed to initialize TabsCacheProvider', error)
      throw error
    }
  }, [manager, storage, storageType, managerOptions, storageOptions])

  // 销毁函数
  const destroy = useCallback((): void => {
    try {
      logger.info('Destroying TabsCacheProvider')

      // 销毁管理器和存储引擎
      manager.destroy()
      storage.destroy()

      logger.info('TabsCacheProvider destroyed successfully')

    } catch (error) {
      logger.error('Failed to destroy TabsCacheProvider', error)
    }
  }, [manager, storage])

  // 组件挂载时初始化
  useEffect(() => {
    initialize()

    // 组件卸载时清理
    return () => {
      destroy()
    }
  }, [initialize, destroy])

  // 上下文值
  const contextValue: TabsCacheContextValue = {
    manager,
    storage,
    initialized: true,
    initialize,
    destroy
  }

  return (
    <TabsCacheContext.Provider value={contextValue}>
      {children}
    </TabsCacheContext.Provider>
  )
}

TabsCacheProvider.displayName = 'TabsCacheProvider'
