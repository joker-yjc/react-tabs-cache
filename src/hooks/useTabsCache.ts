import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { TabsCacheManager } from '../core/TabsCacheManager'
import { UseTabsCacheOptions, UseTabsCacheReturn, TabItem, ITabsCacheError } from '../core/types'
import { TabsCacheContext } from '../context/types'
import { StorageEngine, createStorageEngine } from '../storage'
import { globalEventBus } from '../utils/eventBus'

type SharedResources = {
  manager: TabsCacheManager
  storage: StorageEngine
}

let sharedResources: SharedResources | null = null

export const setSharedResources = (resources: SharedResources) => {
  sharedResources = resources
}

export const getSharedResources = (options: UseTabsCacheOptions = {}): SharedResources => {
  if (sharedResources) {
    return sharedResources
  }
  const managerOptions = { ...options }
  delete managerOptions.storageBackend
  delete managerOptions.autoSync
  delete managerOptions.syncInterval
  delete managerOptions.onError
  const { storageBackend = 'memory' } = options
  const manager = new TabsCacheManager(managerOptions)
  const storage = createStorageEngine(storageBackend)
  sharedResources = { manager, storage }
  return sharedResources
}

const TABS_STATE_KEY = 'tabs:state'
const CACHE_KEY_PREFIX = 'tabs:cache:'

type PersistedTab = Omit<TabItem, 'cachedElement' | 'stateSnapshot'>

/**
 * useTabsCache - 标签页缓存核心 Hook
 * 提供对标签页状态的读写操作，并自动同步到管理器与持久化存储
 */
export function useTabsCache(options: UseTabsCacheOptions = {}): UseTabsCacheReturn {
  const context = useContext(TabsCacheContext)
  // 优先从 Context 获取，否则初始化共享资源（用于单例模式或非 Context 场景）
  const { manager, storage } = context ? { manager: context.manager, storage: context.storage } : getSharedResources(options)
  const { autoSync = false, syncInterval = 10000, onError } = options

  const [tabs, setTabs] = useState<TabItem[]>(() => manager.getAllTabs())
  const [activeTabId, setActiveTabId] = useState<string>(() => manager.getActiveTabId() || '')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<ITabsCacheError | null>(null)
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * 同步管理器内部状态到 React State
   */
  const syncFromManager = useCallback(() => {
    setTabs(manager.getAllTabs())
    setActiveTabId(manager.getActiveTabId() || '')
  }, [manager])

  /**
   * 持久化标签页状态到存储引擎
   * 排除无法序列化的 cachedElement 和 stateSnapshot
   */
  const persistTabsState = useCallback(async () => {
    const persistedTabs: PersistedTab[] = manager.getAllTabs().map((tab) => {
      const rest = { ...tab }
      // 移除不可序列化的属性
      delete rest.cachedElement
      delete rest.stateSnapshot
      const cleanedMetadata = rest.metadata ? { ...rest.metadata } : undefined
      if (cleanedMetadata) {
        delete cleanedMetadata._cachedData
        delete cleanedMetadata._cacheTimestamp
      }
      return {
        ...rest,
        metadata: cleanedMetadata,
      }
    })
    await storage.set(TABS_STATE_KEY, {
      tabs: persistedTabs,
      activeTabId: manager.getActiveTabId() || null,
    })
  }, [manager, storage])

  /**
   * 统一错误处理
   */
  const handleError = useCallback((err: unknown) => {
    const normalized = err as ITabsCacheError
    setError(normalized)
    onError?.(normalized)
  }, [onError])

  // 初始化：从存储中恢复标签页状态
  useEffect(() => {
    let active = true
    const init = async () => {
      setLoading(true)
      try {
        if (manager.getAllTabs().length === 0) {
          const storedState = await storage.get(TABS_STATE_KEY)
          if (storedState?.tabs?.length) {
            storedState.tabs.forEach((tab: PersistedTab) => {
              manager.addTab(tab)
            })
            if (storedState.activeTabId) {
              manager.setActiveTab(storedState.activeTabId)
            }
          }
        }
      } catch (err) {
        handleError(err)
      } finally {
        if (active) {
          syncFromManager()
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      active = false
    }
  }, [manager, storage, syncFromManager, handleError])

  // 监听管理器发出的全局事件，自动同步 UI 状态
  useEffect(() => {
    const update = () => {
      syncFromManager()
      persistTabsState().catch(handleError)
    }
    const unsubAdded = globalEventBus.on('tab:added', update)
    const unsubRemoved = globalEventBus.on('tab:removed', update)
    const unsubActivated = globalEventBus.on('tab:activated', update)
    const unsubUpdated = globalEventBus.on('tab:updated', update)
    const unsubEmptied = globalEventBus.on('tabs:emptied', update)
    return () => {
      unsubAdded()
      unsubRemoved()
      unsubActivated()
      unsubUpdated()
      unsubEmptied()
    }
  }, [syncFromManager, persistTabsState, handleError])

  // 自动同步定时器逻辑
  useEffect(() => {
    if (!autoSync) {
      return
    }
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current)
    }
    syncTimerRef.current = setInterval(() => {
      persistTabsState().catch(handleError)
    }, syncInterval)
    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
        syncTimerRef.current = null
      }
    }
  }, [autoSync, syncInterval, persistTabsState, handleError])

  /**
   * 添加并激活一个新标签页
   */
  const addTab = useCallback((tab: Partial<TabItem>): void => {
    try {
      const added = manager.addTab(tab)
      manager.setActiveTab(added.id)
      syncFromManager()
      persistTabsState().catch(handleError)
    } catch (err) {
      handleError(err)
    }
  }, [manager, syncFromManager, persistTabsState, handleError])

  /**
   * 关闭指定标签页并清理缓存
   */
  const removeTab = useCallback((tabId: string): void => {
    try {
      manager.removeTab(tabId)
      storage.remove(`${CACHE_KEY_PREFIX}${tabId}`).catch(handleError)
      syncFromManager()
      persistTabsState().catch(handleError)
    } catch (err) {
      handleError(err)
    }
  }, [manager, storage, syncFromManager, persistTabsState, handleError])

  /**
   * 更新标签页信息（如标题、路径等）
   */
  const updateTab = useCallback((tabId: string, updates: Partial<TabItem>): void => {
    try {
      manager.updateTab(tabId, updates)
      syncFromManager()
      persistTabsState().catch(handleError)
    } catch (err) {
      handleError(err)
    }
  }, [manager, syncFromManager, persistTabsState, handleError])

  /**
   * 切换当前活跃标签页
   */
  const setActiveTab = useCallback((tabId: string): void => {
    try {
      manager.setActiveTab(tabId)
      syncFromManager()
      persistTabsState().catch(handleError)
    } catch (err) {
      handleError(err)
    }
  }, [manager, syncFromManager, persistTabsState, handleError])

  const closeOtherTabs = useCallback((tabId: string): void => {
    manager.closeOtherTabs(tabId)
    syncFromManager()
    persistTabsState().catch(handleError)
  }, [manager, syncFromManager, persistTabsState, handleError])

  const closeAllTabs = useCallback((excludePinned: boolean = true): void => {
    manager.closeAllTabs(excludePinned)
    syncFromManager()
    persistTabsState().catch(handleError)
  }, [manager, syncFromManager, persistTabsState, handleError])

  const pinTab = useCallback((tabId: string): void => {
    manager.pinTab(tabId)
    syncFromManager()
    persistTabsState().catch(handleError)
  }, [manager, syncFromManager, persistTabsState, handleError])

  const unpinTab = useCallback((tabId: string): void => {
    manager.unpinTab(tabId)
    syncFromManager()
    persistTabsState().catch(handleError)
  }, [manager, syncFromManager, persistTabsState, handleError])

  const reorderTabs = useCallback((fromIndex: number, toIndex: number): void => {
    manager.reorderTabs(fromIndex, toIndex)
    syncFromManager()
    persistTabsState().catch(handleError)
  }, [manager, syncFromManager, persistTabsState, handleError])

  const getTab = useCallback((tabId: string): TabItem | null => manager.getTab(tabId), [manager])
  const findTabByPathname = useCallback((pathname: string): TabItem | null => manager.findTabByPathname(pathname), [manager])
  const findTabsByRoute = useCallback((route: string): TabItem[] => {
    return manager.getAllTabs().filter((tab) => tab.pathname.startsWith(route))
  }, [manager])
  const getTabIndex = useCallback((tabId: string): number => manager.getTabIndex(tabId), [manager])

  const saveCache = useCallback(async (tabId: string, data: any): Promise<void> => {
    try {
      await manager.saveCache(tabId, data)
      await storage.set(`${CACHE_KEY_PREFIX}${tabId}`, data)
    } catch (err) {
      handleError(err)
    }
  }, [manager, storage, handleError])

  const loadCache = useCallback(async (tabId: string): Promise<any> => {
    try {
      const stored = await storage.get(`${CACHE_KEY_PREFIX}${tabId}`)
      if (stored !== null && stored !== undefined) {
        await manager.saveCache(tabId, stored)
        return stored
      }
      return manager.loadCache(tabId)
    } catch (err) {
      handleError(err)
      return null
    }
  }, [manager, storage, handleError])

  const removeCache = useCallback(async (tabId: string): Promise<void> => {
    try {
      await manager.removeCache(tabId)
      await storage.remove(`${CACHE_KEY_PREFIX}${tabId}`)
    } catch (err) {
      handleError(err)
    }
  }, [manager, storage, handleError])

  const clearCache = useCallback(async (): Promise<void> => {
    try {
      const keys = await storage.getKeys()
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX))
      await Promise.all(cacheKeys.map((key) => storage.remove(key)))
      await Promise.all(manager.getAllTabs().map((tab) => manager.removeCache(tab.id)))
    } catch (err) {
      handleError(err)
    }
  }, [storage, manager, handleError])

  const getCacheSize = useCallback(async (tabId: string): Promise<number> => {
    return manager.getTab(tabId)?.cacheSize || 0
  }, [manager])

  const getTotalCacheSize = useCallback(async (): Promise<number> => {
    return manager.getAllTabs().reduce((total, tab) => total + (tab.cacheSize || 0), 0)
  }, [manager])

  const activeTab = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTabId) || null
  }, [tabs, activeTabId])

  return {
    tabs,
    activeTab,
    activeTabId,
    addTab,
    removeTab,
    updateTab,
    setActiveTab,
    closeOtherTabs,
    closeAllTabs,
    pinTab,
    unpinTab,
    reorderTabs,
    getTab,
    findTabByPathname,
    findTabsByRoute,
    getTabIndex,
    saveCache,
    loadCache,
    removeCache,
    clearCache,
    getCacheSize,
    getTotalCacheSize,
    loading,
    error,
  }
}
