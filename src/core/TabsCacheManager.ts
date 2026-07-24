/**
 * TabsCacheManager - 标签页缓存管理器
 * 负责标签页的生命周期管理、缓存操作和状态跟踪
 */

import {
  TabItem,
  TabsManagerConfig,
  CacheChangeEvent,
  ModificationChangeEvent
} from '@core/types'
import { logger } from '@utils/logger'
import { globalEventBus } from '@utils/eventBus'
import { serializer } from '@utils/serializer'

export class TabsCacheManager {
  // 标签页存储
  private tabsMap: Map<string, TabItem> = new Map()
  private tabsOrder: string[] = []
  private activeTabId: string | null = null

  // 配置
  private config: Required<TabsManagerConfig>

  // 事件总线
  private eventBus: any

  // 修改状态跟踪
  private modificationFlags: Map<string, Map<string, boolean>> = new Map()

  constructor(config: TabsManagerConfig = {}, eventBus?: any) {
    this.config = {
      maxTabs: config.maxTabs ?? 20,
      maxCacheSize: config.maxCacheSize ?? 50,
      autoCleanupStrategy: config.autoCleanupStrategy ?? 'LRU',
      persistCacheOnClose: config.persistCacheOnClose ?? false,
      enableAutoSave: config.enableAutoSave ?? false,
      autoSaveInterval: config.autoSaveInterval ?? 5000,
      routeParamsSeparator: config.routeParamsSeparator ?? '?'
    }

    this.eventBus = eventBus || globalEventBus

    logger.info('TabsCacheManager initialized', {
      maxTabs: this.config.maxTabs,
      strategy: this.config.autoCleanupStrategy
    })
  }

  // ========================
  // 标签页管理 API
  // ========================

  /**
   * 添加标签页
   */
  addTab(tabConfig: Partial<TabItem>): TabItem {
    try {
      // 生成标签页ID
      const tabId = tabConfig.id || this.generateTabId(tabConfig)

      // 检查是否已存在
      if (this.tabsMap.has(tabId)) {
        logger.debug('Tab already exists, activating', { tabId })
        this.setActiveTab(tabId)
        return this.tabsMap.get(tabId)!
      }

      // 创建完整的标签页对象
      const tab: TabItem = {
        id: tabId,
        pathname: tabConfig.pathname || '/',
        title: tabConfig.title || 'Untitled',
        icon: tabConfig.icon,
        queryParams: tabConfig.queryParams || {},
        params: tabConfig.params || {},
        closable: tabConfig.closable !== false,
        pinned: tabConfig.pinned || false,
        metadata: tabConfig.metadata || {},
        cachedElement: tabConfig.cachedElement,  // 添加页面元素缓存
        stateSnapshot: tabConfig.stateSnapshot,  // 添加状态快照
        enableDOMCache: tabConfig.enableDOMCache, // 添加缓存开关
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        cacheSize: 0
      }

      // 检查容量限制
      if (this.tabsOrder.length >= this.config.maxTabs) {
        this.cleanupExcessTabs()
      }

      // 添加标签页
      this.tabsMap.set(tabId, tab)
      this.tabsOrder.push(tabId)

      // 发送事件
      this.eventBus.emit('tab:added', {
        tabId,
        previousTabId: null,
        timestamp: Date.now()
      })

      logger.info('Tab added', { tabId, pathname: tab.pathname })
      return tab

    } catch (error) {
      logger.error('Failed to add tab', error)
      throw error
    }
  }

  /**
   * 移除标签页
   */
  removeTab(tabId: string): boolean {
    try {
      const tab = this.tabsMap.get(tabId)
      if (!tab) {
        logger.warn('Tab not found for removal', { tabId })
        return false
      }

      // 不能移除固定的标签页
      if (tab.pinned) {
        logger.warn('Cannot remove pinned tab', { tabId })
        return false
      }

      // 移除标签页
      this.tabsMap.delete(tabId)
      this.tabsOrder = this.tabsOrder.filter(id => id !== tabId)

      // 清理相关状态
      this.clearTabState(tabId)

      // 处理活跃标签页变更
      if (this.activeTabId === tabId) {
        this.handleActiveTabRemoval()
      }

      // 发送事件
      this.eventBus.emit('tab:removed', {
        tabId,
        previousTabId: null,
        timestamp: Date.now()
      })

      logger.info('Tab removed', { tabId })
      return true

    } catch (error) {
      logger.error('Failed to remove tab', error)
      return false
    }
  }

  /**
   * 设置活跃标签页
   */
  setActiveTab(tabId: string): boolean {
    try {
      const tab = this.tabsMap.get(tabId)
      if (!tab) {
        logger.warn('Tab not found for activation', { tabId })
        return false
      }

      const previousTabId = this.activeTabId

      // 如果已经是活跃状态，则不再触发激活逻辑，除非需要强制更新
      if (previousTabId === tabId) {
        logger.debug('Tab already active, skipping activation', { tabId })
        return true
      }

      // 更新活跃标签页
      this.activeTabId = tabId
      tab.lastAccessedAt = Date.now()

      // 发送事件
      this.eventBus.emit('tab:activated', {
        tabId,
        previousTabId,
        timestamp: Date.now()
      })

      logger.debug('Tab activated', { tabId, previousTabId })
      return true

    } catch (error) {
      logger.error('Failed to activate tab', error)
      return false
    }
  }

  /**
   * 更新标签页
   */
  updateTab(tabId: string, updates: Partial<TabItem>): boolean {
    try {
      const tab = this.tabsMap.get(tabId)
      if (!tab) {
        logger.warn('Tab not found for update', { tabId })
        return false
      }

      // 更新属性
      Object.assign(tab, updates)

      // 如果更新了pathname，可能需要重新排序
      if (updates.pathname) {
        this.reorderTab(tabId)
      }

      // 发送事件
      this.eventBus.emit('tab:updated', {
        tabId,
        previousTabId: null,
        timestamp: Date.now()
      })

      logger.debug('Tab updated', { tabId, updates })
      return true

    } catch (error) {
      logger.error('Failed to update tab', error)
      return false
    }
  }

  // ========================
  // 页面缓存 API
  // ========================

  /**
   * 缓存页面元素
   */
  cachePageElement(tabId: string, element: React.ReactNode): boolean {
    try {
      const tab = this.getTab(tabId)
      if (!tab) {
        logger.warn('Tab not found for caching element', { tabId })
        return false
      }

      // 更新缓存的页面元素
      tab.cachedElement = element

      // 计算大致的缓存大小
      tab.cacheSize = element ? 1024 : 0 // 简化计算

      logger.debug('Page element cached', { tabId })
      return true

    } catch (error) {
      logger.error('Failed to cache page element', error)
      return false
    }
  }

  /**
   * 获取缓存的页面元素
   */
  getCachedPageElement(tabId: string): React.ReactNode | null {
    try {
      const tab = this.getTab(tabId)
      return tab?.cachedElement || null

    } catch (error) {
      logger.error('Failed to get cached page element', error)
      return null
    }
  }

  /**
   * 清除页面元素缓存
   */
  clearPageElementCache(tabId: string): boolean {
    try {
      const tab = this.getTab(tabId)
      if (!tab) return false

      tab.cachedElement = null
      tab.cacheSize = 0

      logger.debug('Page element cache cleared', { tabId })
      return true

    } catch (error) {
      logger.error('Failed to clear page element cache', error)
      return false
    }
  }

  /**
   * 缓存页面状态快照
   */
  cachePageState(tabId: string, state: any): boolean {
    try {
      const tab = this.getTab(tabId)
      if (!tab) return false

      tab.stateSnapshot = state
      logger.debug('Page state cached', { tabId })
      return true

    } catch (error) {
      logger.error('Failed to cache page state', error)
      return false
    }
  }

  /**
   * 获取页面状态快照
   */
  getCachedPageState(tabId: string): any {
    try {
      const tab = this.getTab(tabId)
      return tab?.stateSnapshot || null

    } catch (error) {
      logger.error('Failed to get cached page state', error)
      return null
    }
  }

  // ========================
  // 查询 API
  // ========================

  /**
   * 获取所有标签页
   */
  getAllTabs(): TabItem[] {
    return this.tabsOrder
      .map(id => this.tabsMap.get(id)!)
      .filter(Boolean)
  }

  /**
   * 获取指定标签页
   */
  getTab(tabId: string): TabItem | null {
    return this.tabsMap.get(tabId) || null
  }

  /**
   * 根据路径名查找标签页
   */
  findTabByPathname(pathname: string): TabItem | null {
    for (const tab of this.getAllTabs()) {
      if (tab.pathname === pathname) {
        return tab
      }
    }
    return null
  }

  /**
   * 获取活跃标签页
   */
  getActiveTab(): TabItem | null {
    return this.activeTabId ? this.getTab(this.activeTabId) : null
  }

  /**
   * 获取活跃标签页ID
   */
  getActiveTabId(): string | null {
    return this.activeTabId
  }

  /**
   * 获取标签页索引
   */
  getTabIndex(tabId: string): number {
    return this.tabsOrder.indexOf(tabId)
  }

  // ========================
  // 高级操作 API
  // ========================

  /**
   * 关闭其他标签页
   */
  closeOtherTabs(keepTabId: string): void {
    const tabsToClose = this.tabsOrder.filter(id =>
      id !== keepTabId && !this.tabsMap.get(id)?.pinned
    )

    tabsToClose.forEach(tabId => this.removeTab(tabId))

    logger.info('Closed other tabs', { keepTabId, closedCount: tabsToClose.length })
  }

  /**
   * 关闭所有标签页
   */
  closeAllTabs(excludePinned: boolean = true): void {
    const tabsToClose = excludePinned
      ? this.tabsOrder.filter(id => !this.tabsMap.get(id)?.pinned)
      : [...this.tabsOrder]

    tabsToClose.forEach(tabId => this.removeTab(tabId))

    logger.info('Closed all tabs', {
      excludePinned,
      closedCount: tabsToClose.length
    })
  }

  /**
   * 固定标签页
   */
  pinTab(tabId: string): boolean {
    return this.updateTab(tabId, { pinned: true })
  }

  /**
   * 取消固定标签页
   */
  unpinTab(tabId: string): boolean {
    return this.updateTab(tabId, { pinned: false })
  }

  /**
   * 重新排序标签页
   */
  reorderTabs(fromIndex: number, toIndex: number): boolean {
    try {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= this.tabsOrder.length ||
        toIndex >= this.tabsOrder.length
      ) {
        logger.warn('Invalid reorder indices', { fromIndex, toIndex })
        return false
      }

      const [movedTab] = this.tabsOrder.splice(fromIndex, 1)
      this.tabsOrder.splice(toIndex, 0, movedTab)

      logger.debug('Tabs reordered', { fromIndex, toIndex })
      return true

    } catch (error) {
      logger.error('Failed to reorder tabs', error)
      return false
    }
  }

  // ========================
  // 缓存管理 API
  // ========================

  /**
   * 保存缓存
   */
  async saveCache(tabId: string, data: any): Promise<void> {
    try {
      const tab = this.getTab(tabId)
      if (!tab) {
        throw new Error(`Tab ${tabId} not found`)
      }

      // 序列化数据
      const serialized = serializer.serialize(data)
      const size = new Blob([serialized]).size

      // 更新标签页缓存信息
      tab.cacheSize = size
      tab.metadata = {
        ...tab.metadata,
        _cachedData: data,
        _cacheTimestamp: Date.now()
      }

      // 发送事件
      this.eventBus.emit('cache:saved', {
        tabId,
        size,
        timestamp: Date.now()
      } as CacheChangeEvent)

      logger.debug('Cache saved', { tabId, size })

    } catch (error) {
      logger.error('Failed to save cache', error)
      throw error
    }
  }

  /**
   * 加载缓存
   */
  async loadCache(tabId: string): Promise<any> {
    try {
      const tab = this.getTab(tabId)
      if (!tab) {
        return null
      }

      const cachedData = tab.metadata?._cachedData
      if (cachedData) {
        // 发送事件
        this.eventBus.emit('cache:loaded', {
          tabId,
          size: tab.cacheSize || 0,
          timestamp: Date.now()
        } as CacheChangeEvent)

        logger.debug('Cache loaded', { tabId })
        return cachedData
      }

      return null

    } catch (error) {
      logger.error('Failed to load cache', error)
      return null
    }
  }

  /**
   * 移除缓存
   */
  async removeCache(tabId: string): Promise<void> {
    try {
      const tab = this.getTab(tabId)
      if (tab) {
        tab.cacheSize = 0
        delete tab.metadata?._cachedData
        delete tab.metadata?._cacheTimestamp

        // 发送事件
        this.eventBus.emit('cache:removed', {
          tabId,
          size: 0,
          timestamp: Date.now()
        } as CacheChangeEvent)

        logger.debug('Cache removed', { tabId })
      }

    } catch (error) {
      logger.error('Failed to remove cache', error)
      throw error
    }
  }

  // ========================
  // 状态管理 API
  // ========================

  /**
   * 注册修改标记
   */
  registerPageModifyFlag(tabId: string, key: string, value: boolean): void {
    if (!this.modificationFlags.has(tabId)) {
      this.modificationFlags.set(tabId, new Map())
    }

    const tabFlags = this.modificationFlags.get(tabId)!
    const oldValue = tabFlags.get(key)

    if (oldValue !== value) {
      if (value) {
        tabFlags.set(key, true)
      } else {
        tabFlags.delete(key)
      }

      // 发送事件
      this.eventBus.emit('modification:changed', {
        tabId,
        modified: tabFlags.size > 0,
        key,
        timestamp: Date.now()
      } as ModificationChangeEvent)

      logger.debug('Modification flag updated', { tabId, key, value })
    }
  }

  /**
   * 检查是否修改
   */
  isPageModified(tabId: string): boolean {
    const tabFlags = this.modificationFlags.get(tabId)
    return tabFlags ? tabFlags.size > 0 : false
  }

  /**
   * 获取修改标记
   */
  getPageModifyFlag(tabId: string, key?: string): boolean | Record<string, boolean> {
    const tabFlags = this.modificationFlags.get(tabId)

    if (!tabFlags) return key ? false : {}

    if (key) {
      return tabFlags.has(key)
    }

    return Object.fromEntries(tabFlags)
  }

  // ========================
  // 私有辅助方法
  // ========================

  /**
   * 生成标签页ID
   */
  private generateTabId(tabConfig: Partial<TabItem>): string {
    const baseId = tabConfig.pathname || 'untitled'
    const params = tabConfig.params ? JSON.stringify(tabConfig.params) : ''
    const queryParams = tabConfig.queryParams ? JSON.stringify(tabConfig.queryParams) : ''

    return `${baseId}${params}${queryParams}`.replace(/[^\w-]/g, '_')
  }

  /**
   * 清理超出容量的标签页
   */
  private cleanupExcessTabs(): void {
    const unpinnedTabs = this.tabsOrder
      .filter(id => !this.tabsMap.get(id)?.pinned)
      .map(id => this.tabsMap.get(id)!)

    const excessCount = unpinnedTabs.length - (this.config.maxTabs - 1)

    if (excessCount > 0) {
      // 根据策略选择要移除的标签页
      const tabsToRemove = this.selectTabsForRemoval(unpinnedTabs, excessCount)

      tabsToRemove.forEach(tab => {
        this.removeTab(tab.id)
      })

      logger.info('Excess tabs cleaned up', {
        removedCount: tabsToRemove.length,
        strategy: this.config.autoCleanupStrategy
      })
    }
  }

  /**
   * 根据策略选择要移除的标签页
   */
  private selectTabsForRemoval(tabs: TabItem[], count: number): TabItem[] {
    switch (this.config.autoCleanupStrategy) {
      case 'LRU':
        return tabs
          .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)
          .slice(0, count)

      case 'FIFO':
        return tabs
          .sort((a, b) => a.createdAt - b.createdAt)
          .slice(0, count)

      default:
        return tabs.slice(0, count)
    }
  }

  /**
   * 处理活跃标签页移除
   */
  private handleActiveTabRemoval(): void {
    if (this.tabsOrder.length === 0) {
      this.activeTabId = null
      this.eventBus.emit('tabs:emptied', {})
      return
    }

    // 激活相邻的标签页
    const currentIndex = this.tabsOrder.indexOf(this.activeTabId!)
    const newIndex = Math.min(currentIndex, this.tabsOrder.length - 1)
    const newActiveTabId = this.tabsOrder[newIndex]

    this.setActiveTab(newActiveTabId)
  }

  /**
   * 重新排序单个标签页
   */
  private reorderTab(tabId: string): void {
    const currentIndex = this.tabsOrder.indexOf(tabId)
    if (currentIndex !== -1) {
      // 简单实现：将标签页移到末尾
      this.tabsOrder.splice(currentIndex, 1)
      this.tabsOrder.push(tabId)
    }
  }

  /**
   * 清理标签页相关状态
   */
  private clearTabState(tabId: string): void {
    this.modificationFlags.delete(tabId)
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.tabsMap.clear()
    this.tabsOrder = []
    this.activeTabId = null
    this.modificationFlags.clear()

    logger.info('TabsCacheManager destroyed')
  }
}

/**
 * 创建 TabsCacheManager 实例
 */
export function createTabsCacheManager(config?: TabsManagerConfig): TabsCacheManager {
  return new TabsCacheManager(config)
}

export default TabsCacheManager
