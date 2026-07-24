import type { RouteRecord } from '../src/core/types'

export const demoRoutes: RouteRecord[] = [
  {
    path: '/',
    title: '首页',
    children: [
      { path: 'dashboard', title: '仪表板' },
      { path: 'users', title: '用户管理' },
      { path: 'users/:id', title: '用户详情' },
      { path: 'settings', title: '设置' },
      { path: 'reports', title: '报表' },
      { path: 'requirements', title: '需求介入' },
    ],
  },
]
