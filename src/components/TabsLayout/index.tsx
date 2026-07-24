/**
 * TabsLayout - 标签页布局组件
 * 基于Ant Design Tabs的简单实现
 */

import React, { useCallback, useMemo, useEffect, useRef } from 'react'
import { Tabs, Dropdown, Modal } from 'antd'
import { CloseOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useOutlet } from 'react-router-dom'
import type { TabsProps } from 'antd'
import { useTabsCache } from '../../hooks/useTabsCache'
import { usePageModified } from '../../hooks/usePageModified'
import { useRouteSync } from '../../hooks/useRouteSync'
import { TabItem } from '../../core/types'
import { logger } from '../../utils/logger'
import './TabsLayout.less'

export interface TabsLayoutProps {
  /** 标签页类型 */
  tabType?: 'line' | 'card' | 'editable-card'

  /** 是否隐藏添加按钮 */
  hideAdd?: boolean

  /** 自定义标签页渲染 */
  renderTabLabel?: (tab: TabItem) => React.ReactNode

  /** 标签页变化回调 */
  onTabChange?: (tabId: string) => void

  /** 标签页关闭回调 */
  onTabClose?: (tabId: string) => void

  /** 标签页编辑回调 */
  onTabEdit?: (targetKey: string, action: 'add' | 'remove') => void
}

const TabsLayout: React.FC<TabsLayoutProps> = ({
  tabType = 'editable-card',
  hideAdd = true,
  renderTabLabel,
  onTabChange,
  onTabClose,
  onTabEdit
}) => {
  // 获取当前路由对应的组件实例 (相当于之前的 children)
  // 这是模仿 Huazhu BMS 的做法，直接通过 useOutlet 获取当前活跃路由的 React 元素
  const outlet = useOutlet()

  // 缓存每个路由对应的组件实例
  const {
    tabs,
    activeTabId,
    activeTab,
    removeTab,
    updateTab,
    setActiveTab,
    closeOtherTabs,
    closeAllTabs
  } = useTabsCache()

  const {
    getModifyFlag,
    clearModifyFlag
  } = usePageModified(activeTabId)

  const { syncTabToRoute } = useRouteSync()

  const lastCachedKeyRef = useRef<string | null>(null)

  // 核心 KeepAlive 逻辑：
  // 监听当前活跃 Tab 和路由内容的变化
  useEffect(() => {
    // 如果没有活跃 Tab 或者没有路由内容，则跳过
    if (!activeTabId || !outlet) return

    // 如果当前 Tab 已经有了 cachedElement，我们通常不希望轻易覆盖它
    // 除非是特定的场景（比如参数变化导致的重新渲染）。
    // 在我们的场景中，为了保持表单状态，如果 cachedElement 已存在，我们跳过更新。
    // 这保证了 Tab 渲染的是最初捕获到的那个带有 React Fiber 关联的 Element 实例。
    if (activeTab?.cachedElement) {
      logger.debug('Tab already cached, skipping update to preserve state', { tabId: activeTabId })
      return
    }

    const cacheKey = `${activeTabId}:${activeTab?.pathname || ''}`
    if (lastCachedKeyRef.current === cacheKey) return
    lastCachedKeyRef.current = cacheKey

    logger.debug('Capturing outlet element for cache', { tabId: activeTabId })
    // 将从 useOutlet 获取到的元素存入 Tab 状态中
    updateTab(activeTabId, { cachedElement: outlet })
  }, [activeTabId, activeTab?.pathname, updateTab, activeTab?.cachedElement, outlet])

  // 获取Modal实例
  const [modal, contextHolder] = Modal.useModal()

  // 处理未保存数据的关闭操作
  const handleCloseWithValidation = useCallback((
    callback: () => void,
    tabId?: string
  ): void => {
    const isModified = getModifyFlag() as Record<string, boolean>
    const modifiedKeys = Object.keys(isModified).filter((key) => isModified[key])

    // 检查是否有未保存的修改
    const hasUnsavedChanges = tabId
      ? modifiedKeys.some(key => key !== tabId)
      : modifiedKeys.length > 0

    if (hasUnsavedChanges) {
      modal.confirm({
        title: tabId ? '关闭其他页面' : '关闭所有页面',
        icon: <ExclamationCircleOutlined style={{ color: '#1677ff' }} />,
        content: '关闭的页面存在未保存的内容，继续关闭将丢失设置',
        okText: '确认',
        cancelText: '取消',
        onOk: () => {
          callback()
          if (tabId) {
            modifiedKeys.filter(key => key !== tabId).forEach((key) => clearModifyFlag(key))
          } else {
            clearModifyFlag()
          }
        }
      })
    } else {
      callback()
    }
  }, [modal, getModifyFlag, clearModifyFlag, activeTabId])

  // 关闭单个标签页（带验证）
  const closeTabWithValidation = useCallback((
    needValidate: boolean = true,
    targetTabId: string = activeTabId
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      // 修正：getModifyFlag 第一个参数是 key，第二个是 tabId。
      // 这里我们要获取指定 tabId 下的所有修改标记，所以 key 传 undefined
      const flags = getModifyFlag(undefined, targetTabId) as Record<string, boolean>
      const isTabModified = Object.values(flags).some(value => value)

      if (isTabModified && needValidate) {
        modal.confirm({
          title: '确认要离开吗？',
          icon: <ExclamationCircleOutlined style={{ color: '#1677ff' }} />,
          content: '您未保存当前操作，继续离开将丢失设置内容',
          okText: '确认',
          cancelText: '取消',
          onOk: () => {
            removeTab(targetTabId)
            clearModifyFlag(undefined, targetTabId)
            onTabClose?.(targetTabId)
            resolve(true)
          }
        })
      } else {
        removeTab(targetTabId)
        onTabClose?.(targetTabId)
        resolve(true)
      }
    })
  }, [modal, removeTab, clearModifyFlag, getModifyFlag, onTabClose, activeTabId])

  // 生成标签页配置项 (包含 children)
  const tabItems: TabsProps['items'] = useMemo(() => {
    return tabs.map((tab) => {
      // 右键菜单项
      const dropdownItems = [
        {
          key: 'close-other',
          label: (
            <span
              onClick={(e) => {
                e.stopPropagation()
                handleCloseWithValidation(() => {
                  closeOtherTabs(tab.id)
                }, tab.id)
              }}
            >
              关闭其他
            </span>
          )
        },
        {
          key: 'close-all',
          label: (
            <span
              onClick={(e) => {
                e.stopPropagation()
                handleCloseWithValidation(() => {
                  closeAllTabs()
                })
              }}
            >
              关闭所有
            </span>
          )
        }
      ]

      const isActive = tab.id === activeTabId
      // 核心 KeepAlive 逻辑：
      // 1. 优先使用 cachedElement (已缓存的快照)
      // 2. 如果没有缓存且是当前页，使用 outlet (首次从 React Router 获取的元素)
      let content = tab.cachedElement
      if (!content && isActive) {
        logger.debug('Using outlet for active tab content', { tabId: tab.id })
        content = outlet
      }

      return {
        key: tab.id,
        label: renderTabLabel ? renderTabLabel(tab) : (
          <span className="tabs-layout-tab-label">
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span className="tab-title">{tab.title}</span>
          </span>
        ),
        // 直接将内容传给 Antd Tabs，利用其 destroyOnHidden: false 特性保持 DOM
        children: (
          <div className="tab-content-wrapper" style={{ height: '100%', overflow: 'auto' }}>
            {content || (
              <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                页面加载中...
              </div>
            )}
          </div>
        ),
        closeIcon: (
          <Dropdown menu={{ items: dropdownItems }} arrow>
            <CloseOutlined />
          </Dropdown>
        ),
        closable: tabs.length > 1, // 至少保留一个标签页
        destroyOnHidden: false // 关键：禁止销毁非激活 Tab 的 DOM
      }
    })
  }, [tabs, renderTabLabel, handleCloseWithValidation, closeOtherTabs, closeAllTabs, activeTabId, outlet])

  // 标签页切换处理
  // 用户点击 Tab 时驱动路由切换，避免 Tab 与 URL 脱节
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId)
    syncTabToRoute(tabId)
    onTabChange?.(tabId)
  }, [setActiveTab, syncTabToRoute, onTabChange])

  // 标签页编辑处理
  const handleTabEdit = useCallback((
    targetKey: string | React.MouseEvent | React.KeyboardEvent,
    action: 'add' | 'remove'
  ) => {
    if (action === 'remove' && typeof targetKey === 'string') {
      closeTabWithValidation(true, targetKey)
      onTabEdit?.(targetKey, action)
    } else if (action === 'add') {
      onTabEdit?.('', action)
    }
  }, [closeTabWithValidation, onTabEdit])

  return (
    <div className="tabs-layout-container">
      <Tabs
        hideAdd={hideAdd}
        type={tabType}
        items={tabItems}
        activeKey={activeTabId}
        onChange={handleTabChange}
        onEdit={handleTabEdit}
        // 顶层保证不销毁隐藏面板，仅通过样式隐藏（display: none）
        destroyOnHidden={false}
        className="tabs-layout-tabs"
      />
      {contextHolder}
    </div>
  )
}

TabsLayout.displayName = 'TabsLayout'

export default TabsLayout
