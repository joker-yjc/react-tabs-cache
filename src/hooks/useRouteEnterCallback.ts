import { useCallback, useEffect, useRef, useState } from 'react'
import { useTabsCache } from './useTabsCache'
import { globalEventBus } from '../utils/eventBus'

type Callback = () => void | Promise<void>

export function useRouteEnterCallback() {
  const { activeTabId } = useTabsCache()
  const callbacksRef = useRef<Map<string, Set<Callback>>>(new Map())
  const [isExecuting, setIsExecuting] = useState(false)
  const [lastExecutedAt, setLastExecutedAt] = useState<number | null>(null)

  /**
   * 注册进入路由的回调函数
   * @param callback 回调函数
   */
  const registerCallback = useCallback((callback: Callback) => {
    if (!activeTabId) return
    // 按 tabId 存储回调，确保不同页面的回调隔离
    const set = callbacksRef.current.get(activeTabId) || new Set<Callback>()
    set.add(callback)
    callbacksRef.current.set(activeTabId, set)
  }, [activeTabId])

  /**
   * 卸载进入路由的回调函数
   * @param callback 回调函数
   */
  const unregisterCallback = useCallback((callback: Callback) => {
    if (!activeTabId) return
    const set = callbacksRef.current.get(activeTabId)
    if (!set) return
    set.delete(callback)
  }, [activeTabId])

  /**
   * 通知外部执行状态变更
   */
  const notifyExecute = useCallback(() => {
    const listeners = callbacksRef.current.get('__listeners__')
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener()
        } catch (e) {
          console.error('Error in route enter callback listener:', e)
        }
      })
    }
  }, [])

  /**
   * 执行指定标签页的所有进入回调
   * @param targetTabId 目标标签页ID，默认使用当前活跃标签页
   */
  const executeCallbacks = useCallback(async (targetTabId?: string) => {
    const tabId = targetTabId || activeTabId
    if (!tabId) return

    // 检查是否有针对该 tabId 的回调
    const callbacksSet = callbacksRef.current.get(tabId)
    if (!callbacksSet || callbacksSet.size === 0) return

    const callbacks = Array.from(callbacksSet)
    setIsExecuting(true)

    try {
      // 顺序执行所有回调
      for (const cb of callbacks) {
        await cb()
      }
    } finally {
      setIsExecuting(false)
      setLastExecutedAt(Date.now())
      notifyExecute()
    }
  }, [activeTabId, notifyExecute])

  const onExecute = useCallback((callback: () => void) => {
    const handler = () => callback()
    const set = callbacksRef.current.get('__listeners__') || new Set<Callback>()
    set.add(handler)
    callbacksRef.current.set('__listeners__', set)
    return () => {
      set.delete(handler)
    }
  }, [])

  // 监听全局事件总线的激活事件
  useEffect(() => {
    const unsubscribe = globalEventBus.on('tab:activated', (event: any) => {
      // 只有当事件中的 tabId 存在时才触发
      if (event?.tabId) {
        executeCallbacks(event.tabId).catch((err) => {
          console.error('Failed to execute route enter callbacks:', err)
        })
      }
    })
    return unsubscribe
  }, [executeCallbacks])

  return {
    registerCallback,
    unregisterCallback,
    executeCallbacks,
    isExecuting,
    lastExecutedAt,
    onExecute,
  }
}
