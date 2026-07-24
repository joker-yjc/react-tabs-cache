import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import 'antd/dist/reset.css'
import AppShell from './App'
import { TabsCacheProvider } from '../src'
import {
  DashboardPage,
  UsersPage,
  UserDetailPage,
  SettingsPage,
  ReportsPage,
  RequirementIntakePage,
} from './pages'

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <TabsCacheProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:id" element={<UserDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="requirements" element={<RequirementIntakePage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TabsCacheProvider>
  )
}
