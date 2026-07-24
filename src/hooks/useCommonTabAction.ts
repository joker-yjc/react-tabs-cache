import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouteEnterCallback } from './useRouteEnterCallback'

export interface CommonTabActionOptions {
  tableRef?: React.RefObject<any>
  autoRefresh?: boolean
  resetPageOnRefresh?: boolean
  showMessage?: boolean
}

export function useCommonTabAction(options: CommonTabActionOptions = {}) {
  const { tableRef, autoRefresh = false, resetPageOnRefresh = false } = options
  const { registerCallback, unregisterCallback } = useRouteEnterCallback()
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh)
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    if (resetPageOnRefresh && tableRef?.current?.reset) {
      tableRef.current.reset()
    }
    if (tableRef?.current?.reload) {
      await tableRef.current.reload()
    }
    setLastRefreshAt(Date.now())
    setRefreshing(false)
  }, [tableRef, resetPageOnRefresh])

  const resetAndRefresh = useCallback(async () => {
    if (tableRef?.current?.reset) {
      tableRef.current.reset()
    }
    await refresh()
  }, [refresh, tableRef])

  const refreshAfter = useCallback(async (action: () => Promise<void>) => {
    await action()
    await refresh()
  }, [refresh])

  const startAutoRefresh = useCallback((interval: number) => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current)
    }
    autoRefreshTimerRef.current = setInterval(() => {
      refresh().catch(() => undefined)
    }, interval)
  }, [refresh])

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current)
      autoRefreshTimerRef.current = null
    }
  }, [])

  const enableAutoRefresh = useCallback((interval: number) => {
    startAutoRefresh(interval)
    setAutoRefreshEnabled(true)
  }, [startAutoRefresh])

  const disableAutoRefresh = useCallback(() => {
    stopAutoRefresh()
    setAutoRefreshEnabled(false)
  }, [stopAutoRefresh])

  useEffect(() => {
    registerCallback(refresh)
    return () => unregisterCallback(refresh)
  }, [registerCallback, unregisterCallback, refresh])

  useEffect(() => {
    if (autoRefresh) {
      startAutoRefresh(30000)
    } else {
      stopAutoRefresh()
    }
    return () => stopAutoRefresh()
  }, [autoRefresh, startAutoRefresh, stopAutoRefresh])

  return useMemo(() => ({
    refresh,
    resetAndRefresh,
    refreshAfter,
    refreshing,
    lastRefreshAt,
    enableAutoRefresh,
    disableAutoRefresh,
    autoRefreshEnabled,
  }), [
    refresh,
    resetAndRefresh,
    refreshAfter,
    refreshing,
    lastRefreshAt,
    enableAutoRefresh,
    disableAutoRefresh,
    autoRefreshEnabled,
  ])
}
