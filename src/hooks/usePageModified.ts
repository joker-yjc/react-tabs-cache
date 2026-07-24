/**
 * usePageModified - 页面修改状态管理Hook
 * 用于跟踪和管理页面的修改状态
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from 'antd'
import { useTabsCache, getSharedResources } from './useTabsCache'
import { globalEventBus } from '../utils/eventBus'

/**
 * usePageModified 返回值
 */
export interface UsePageModifiedReturn {
  registerModifyFlag: (key: string, value: boolean, tabId?: string) => void
  getModifyFlag: (key?: string, tabId?: string) => boolean | Record<string, boolean>
  clearModifyFlag: (key?: string | string[], tabId?: string) => void
  isModified: boolean
  modifiedKeys: string[]
  showConfirmDialog: (action: string) => Promise<boolean>
  onModifiedChange: (callback: (modified: boolean) => void) => () => void
}

export function usePageModified(tabId?: string): UsePageModifiedReturn {
  const { activeTabId } = useTabsCache()
  const { manager } = getSharedResources()
  const [version, setVersion] = useState(0)
  const resolvedTabId = tabId || activeTabId || ''

  useEffect(() => {
    const unsubscribe = globalEventBus.on('modification:changed', (event: any) => {
      if (!event?.tabId) return
      if (resolvedTabId && event.tabId !== resolvedTabId) return
      setVersion((prev) => prev + 1)
    })
    return unsubscribe
  }, [resolvedTabId])

  const registerModifyFlag = useCallback((key: string, value: boolean, targetTabId?: string) => {
    const currentTabId = targetTabId || resolvedTabId
    if (!currentTabId) return
    manager.registerPageModifyFlag(currentTabId, key, value)
  }, [manager, resolvedTabId])

  const getModifyFlag = useCallback((key?: string, targetTabId?: string) => {
    const currentTabId = targetTabId || resolvedTabId
    if (!currentTabId) return key ? false : {}
    return manager.getPageModifyFlag(currentTabId, key)
  }, [manager, resolvedTabId, version])

  const clearModifyFlag = useCallback((key?: string | string[], targetTabId?: string) => {
    const currentTabId = targetTabId || resolvedTabId
    if (!currentTabId) return
    if (typeof key === 'string') {
      manager.registerPageModifyFlag(currentTabId, key, false)
      return
    }
    if (Array.isArray(key)) {
      key.forEach((item) => manager.registerPageModifyFlag(currentTabId, item, false))
      return
    }
    const flags = manager.getPageModifyFlag(currentTabId) as Record<string, boolean>
    Object.keys(flags).forEach((item) => manager.registerPageModifyFlag(currentTabId, item, false))
  }, [manager, resolvedTabId])

  const isModified = useMemo(() => {
    if (!resolvedTabId) return false
    return manager.isPageModified(resolvedTabId)
  }, [manager, resolvedTabId, version])

  const modifiedKeys = useMemo(() => {
    if (!resolvedTabId) return []
    const flags = manager.getPageModifyFlag(resolvedTabId) as Record<string, boolean>
    return Object.keys(flags).filter((key) => flags[key])
  }, [manager, resolvedTabId, version])

  const showConfirmDialog = useCallback((action: string) => {
    return new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '确认要离开吗？',
        content: `当前页面存在未保存内容，继续${action}将丢失设置`,
        okText: '确认',
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
  }, [])

  const onModifiedChange = useCallback((callback: (modified: boolean) => void) => {
    const unsubscribe = globalEventBus.on('modification:changed', (event: any) => {
      if (!event?.tabId) return
      if (resolvedTabId && event.tabId !== resolvedTabId) return
      callback(event.modified)
    })
    return unsubscribe
  }, [resolvedTabId])

  return {
    registerModifyFlag,
    getModifyFlag,
    clearModifyFlag,
    isModified,
    modifiedKeys,
    showConfirmDialog,
    onModifiedChange,
  }
}
