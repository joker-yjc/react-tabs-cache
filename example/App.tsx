import React, { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Space, Typography } from 'antd'
import { TabsLayout, createRouteAdapter, useRouteSync } from '../src'
import { demoRoutes } from './routes'

const { Title, Text } = Typography

const normalizePath = (input: string) => {
  let path = input.trim()
  if (!path.startsWith('/')) {
    path = `/${path}`
  }
  path = path.replace(/\/+/g, '/')
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1)
  }
  return path.toLowerCase()
}

const matchPath = (pathname: string, routePath: string) => {
  const normalizedPath = normalizePath(pathname)
  const normalizedRoute = normalizePath(routePath)
  const pathSegments = normalizedPath.split('/').filter(Boolean)
  const routeSegments = normalizedRoute.split('/').filter(Boolean)
  const params: Record<string, string> = {}

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index]
    const pathSegment = pathSegments[index]

    if (routeSegment === '*') {
      params.wildcard = pathSegments.slice(index).join('/')
      return { matched: true, params }
    }

    if (!pathSegment) {
      return { matched: false }
    }

    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = decodeURIComponent(pathSegment)
      continue
    }

    if (routeSegment !== pathSegment) {
      return { matched: false }
    }
  }

  if (pathSegments.length !== routeSegments.length) {
    return { matched: false }
  }

  return { matched: true, params }
}

const scoreRoute = (routePath: string) => {
  const segments = normalizePath(routePath).split('/').filter(Boolean)
  return segments.reduce((total, segment) => {
    if (segment === '*') return total
    if (segment.startsWith(':')) return total + 1
    return total + 10
  }, 0)
}

const navItems = [
  { key: 'dashboard', label: '仪表板', path: '/dashboard' },
  { key: 'users', label: '用户管理', path: '/users' },
  { key: 'settings', label: '设置', path: '/settings' },
  { key: 'reports', label: '报表', path: '/reports' },
  { key: 'requirements', label: '需求介入', path: '/requirements' },
]

const AppShell: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    console.log("app mounted")
    return () => {
      console.log("app unmounted")
    }
  }, [])
  const adapter = useMemo(() => {
    return createRouteAdapter(demoRoutes, {
      pathNormalizer: normalizePath,
      routeMatcher: matchPath,
      scoreResolver: scoreRoute,
      titleResolver: (record, pathname, params) => {
        if (record.title && params.id) {
          return `${record.title} ${params.id}`
        }
        return record.title || pathname
      },
    })
  }, [])

  useRouteSync({ routeAdapter: adapter, syncRouteParams: true })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>React Tabs Cache 示例</Title>
            <Text type="secondary">需求介入与功能验证</Text>
          </div>
          <Space wrap>
            {navItems.map((item) => (
              <Button
                key={item.key}
                type={location.pathname.startsWith(item.path) ? 'primary' : 'default'}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </Button>
            ))}
          </Space>
        </Space>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <TabsLayout>
        </TabsLayout>
      </div>
    </div>
  )
}

export default AppShell
