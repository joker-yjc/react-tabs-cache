/**
 * useRouteSync - 路由同步Hook
 * 监听路由变化并与标签页状态同步
 */

import { useEffect, useCallback } from 'react'
import { useTabsCache } from './useTabsCache'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { logger } from '../utils/logger'
import { createRouteAdapter } from '../core/RouteAdapter'
import { RouteAdapter, RouteAdapterOptions, RouteRecord } from '../core/types'

/**
 * 路由同步选项
 */
export interface UseRouteSyncOptions {
  /** 是否启用路由监听 */
  enabled?: boolean

  /** 路由变化时是否自动添加标签页 */
  autoAddTab?: boolean

  /** 路由变化时是否自动激活标签页 */
  autoActivateTab?: boolean

  /** 是否同步查询参数 */
  syncQueryParams?: boolean

  /** 是否同步路由参数 */
  syncRouteParams?: boolean

  /** 路由配置 */
  routes?: RouteRecord[]

  /** 路由适配器 */
  routeAdapter?: RouteAdapter

  /** 适配器选项 */
  routeAdapterOptions?: RouteAdapterOptions
}

/**
 * useRouteSync 返回值
 */
export interface UseRouteSyncReturn {
  /** 当前路由信息 */
  currentRoute: {
    pathname: string
    search: string
    hash: string
  } | null

  /** 手动同步路由到标签页 */
  syncRouteToTab: () => void

  /** 手动同步标签页到路由 */
  syncTabToRoute: (tabId: string) => void
}

/**
 * 路由同步Hook
 */
export function useRouteSync(options: UseRouteSyncOptions = {}): UseRouteSyncReturn {
  const {
    enabled = true,
    autoAddTab = true,
    autoActivateTab = true,
    syncQueryParams = true,
    syncRouteParams = true,
    routes,
    routeAdapter,
    routeAdapterOptions
  } = options

  const { addTab, setActiveTab, findTabByPathname, getTab } = useTabsCache()
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()

  // 当前路由信息用于对比与展示
  const currentRoute = {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash
  }

  // 解析查询参数用于保存到 Tab 元信息
  const parseQueryParams = useCallback((): Record<string, any> => {
    if (!syncQueryParams) return {}
    const params: Record<string, any> = {}
    const parsed = new URLSearchParams(location.search)
    parsed.forEach((value, key) => {
      params[key] = value
    })

    return params
  }, [location.search, syncQueryParams])

  // 解析路由参数用于保存到 Tab 元信息
  const parseRouteParams = useCallback((): Record<string, any> => {
    if (!syncRouteParams) return {}
    return { ...params }
  }, [params, syncRouteParams])

  // 优先使用外部传入的适配器，未传入时根据 routes 构建
  const adapter = routeAdapter || (routes ? createRouteAdapter(routes, routeAdapterOptions) : null)

  // 路由变化时创建或激活对应 Tab
  const syncRouteToTab = useCallback((): void => {
    if (!enabled) return

    try {
      const queryParams = parseQueryParams()
      const routeParams = parseRouteParams()
      const adaptedRoute = adapter?.match(location.pathname)
      const title = adaptedRoute?.title || location.pathname
      const paramsFromAdapter = adaptedRoute?.params || {}

      // 1. 查找现有的标签页，匹配逻辑通常基于 pathname
      let existingTab = findTabByPathname(location.pathname)

      if (!existingTab && autoAddTab) {
        // 2. 如果未找到且允许自动添加，则创建新的标签页
        addTab({
          pathname: location.pathname,
          title,
          queryParams,
          params: syncRouteParams ? { ...routeParams, ...paramsFromAdapter } : {},
          metadata: adaptedRoute
            ? {
              routePath: adaptedRoute.routePath,
              parentPathname: adaptedRoute.parentPathname,
              routeMeta: adaptedRoute.meta,
            }
            : undefined,
        })
        existingTab = findTabByPathname(location.pathname)

        logger.debug('New tab created from route', {
          pathname: location.pathname,
          tabId: existingTab?.id
        })
      }

      // 3. 激活标签页，保持 Tab 状态与 URL 同步
      if (existingTab && autoActivateTab) {
        setActiveTab(existingTab.id)
        logger.debug('Tab activated from route', {
          tabId: existingTab.id,
          pathname: location.pathname
        })
      }

    } catch (error) {
      logger.error('Failed to sync route to tab', error)
    }
  }, [
    enabled,
    location.pathname,
    autoAddTab,
    autoActivateTab,
    findTabByPathname,
    addTab,
    setActiveTab,
    parseQueryParams,
    parseRouteParams,
    adapter,
    syncRouteParams
  ])

  /**
   * 监听 URL 变化，自动同步到 Tab 状态
   */
  useEffect(() => {
    syncRouteToTab()
  }, [location.pathname, location.search, syncRouteToTab])

  /**
   * 手动同步标签页到路由（通常在切换 Tab 时调用）
   */
  const syncTabToRoute = useCallback((tabId: string): void => {
    if (!enabled) return

    try {
      const targetTab = getTab(tabId)
      if (!targetTab) return

      // 构建目标路由路径
      let targetPath = targetTab.pathname

      // 序列化并同步查询参数
      if (syncQueryParams && targetTab.queryParams) {
        const searchParams = new URLSearchParams()
        Object.entries(targetTab.queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value))
          }
        })
        const queryString = searchParams.toString()
        if (queryString) {
          targetPath += `?${queryString}`
        }
      }

      const currentPath = `${location.pathname}${location.search}`
      // 避免重复导航
      if (currentPath === targetPath) {
        return
      }

      logger.debug('Navigating to tab route', { targetPath })
      navigate(targetPath)
    } catch (error) {
      logger.error('Failed to sync tab to route', error)
    }
  }, [enabled, getTab, navigate, syncQueryParams, location.pathname, location.search])

  return {
    currentRoute,
    syncRouteToTab,
    syncTabToRoute
  }
}
