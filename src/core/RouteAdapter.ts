import { RouteAdapter, RouteAdapterOptions, RouteRecord, AdaptedRoute } from './types'

type CompiledRoute = {
  record: RouteRecord
  fullPath: string
  score: number
  regex: RegExp
  paramNames: string[]
}

const normalizePath = (path: string) => {
  if (!path) return '/'
  const withSlash = path.startsWith('/') ? path : `/${path}`
  return withSlash.replace(/\/+/g, '/')
}

const joinPath = (parent: string, child: string) => {
  if (!child) return normalizePath(parent)
  if (child.startsWith('/')) return normalizePath(child)
  return normalizePath(`${parent}/${child}`)
}

const buildTitle = (record: RouteRecord, pathname: string) => {
  if (record.name) return record.name
  if (record.title) return record.title
  const parts = pathname.split('/').filter(Boolean)
  return parts[parts.length - 1] || pathname
}

const compilePattern = (pattern: string) => {
  const paramNames: string[] = []
  const escaped = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1))
        return '([^/]+)'
      }
      if (segment === '*') {
        paramNames.push('wildcard')
        return '(.*)'
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  const regex = new RegExp(`^${escaped}$`)
  return { regex, paramNames }
}

const buildRoutes = (
  routes: RouteRecord[],
  parentPath: string,
  basePath: string,
  scoreResolver?: RouteAdapterOptions['scoreResolver']
): CompiledRoute[] => {
  const result: CompiledRoute[] = []
  routes.forEach((route) => {
    const fullPath = joinPath(basePath ? joinPath(basePath, parentPath) : parentPath, route.path || '')
    const compiled = compilePattern(fullPath)
    const score = scoreResolver ? scoreResolver(fullPath, route) : fullPath.split('/').filter(Boolean).length
    result.push({
      record: route,
      fullPath,
      score,
      regex: compiled.regex,
      paramNames: compiled.paramNames,
    })
    if (route.children && route.children.length) {
      result.push(...buildRoutes(route.children, fullPath, '', scoreResolver))
    }
  })
  return result
}

export const createRouteAdapter = (
  routes: RouteRecord[],
  options: RouteAdapterOptions = {}
): RouteAdapter => {
  const { basePath = '', strict = true, titleResolver, routeMatcher, scoreResolver, pathNormalizer } = options
  const compiledRoutes = buildRoutes(routes, '', basePath, scoreResolver).sort((a, b) => b.score - a.score)
  const normalize = pathNormalizer || normalizePath

  const match = (pathname: string): AdaptedRoute | null => {
    const normalizedPath = normalize(pathname)
    for (const route of compiledRoutes) {
      let params: Record<string, string> = {}
      if (routeMatcher) {
        const result = routeMatcher(normalizedPath, route.fullPath, route.record)
        if (!result.matched) continue
        params = result.params || {}
      } else {
        const matchResult = route.regex.exec(normalizedPath)
        if (!matchResult) continue
        route.paramNames.forEach((name, index) => {
          params[name] = matchResult[index + 1]
        })
      }
      const title = titleResolver
        ? titleResolver(route.record, normalizedPath, params)
        : buildTitle(route.record, normalizedPath)
      return {
        title,
        pathname: normalizedPath,
        routePath: route.fullPath,
        parentPathname: route.record.parentPathname,
        meta: route.record.meta,
        params,
      }
    }
    if (!strict) {
      return {
        title: normalizedPath,
        pathname: normalizedPath,
        routePath: normalizedPath,
        params: {},
      }
    }
    return null
  }

  return {
    match,
  }
}
