/**
 * TabsCacheManager 基础测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TabsCacheManager } from '../../../src/core/TabsCacheManager'

// 简单测试，不使用复杂的logger配置
describe('TabsCacheManager', () => {
  let manager: TabsCacheManager

  beforeEach(() => {
    manager = new TabsCacheManager({
      maxTabs: 5,
      autoCleanupStrategy: 'LRU'
    })
  })

  describe('标签页管理', () => {
    it('应该能够添加标签页', () => {
      const tab = manager.addTab({
        pathname: '/test',
        title: 'Test Tab'
      })

      expect(tab.id).toBeDefined()
      expect(tab.pathname).toBe('/test')
      expect(tab.title).toBe('Test Tab')
      expect(manager.getAllTabs()).toHaveLength(1)
    })

    it('应该能够设置活跃标签页', () => {
      const tab1 = manager.addTab({ pathname: '/tab1' })
      const tab2 = manager.addTab({ pathname: '/tab2' })

      expect(manager.getActiveTabId()).toBe(tab2.id)

      manager.setActiveTab(tab1.id)
      expect(manager.getActiveTabId()).toBe(tab1.id)
    })

    it('应该能够移除标签页', () => {
      const tab = manager.addTab({ pathname: '/test' })
      expect(manager.getAllTabs()).toHaveLength(1)

      const result = manager.removeTab(tab.id)
      expect(result).toBe(true)
      expect(manager.getAllTabs()).toHaveLength(0)
    })

    it('不应该移除固定的标签页', () => {
      const tab = manager.addTab({
        pathname: '/pinned',
        pinned: true
      })

      const result = manager.removeTab(tab.id)
      expect(result).toBe(false)
      expect(manager.getAllTabs()).toHaveLength(1)
    })

    it('应该能够更新标签页', () => {
      const tab = manager.addTab({ pathname: '/test' })
      const result = manager.updateTab(tab.id, { title: 'Updated Title' })

      expect(result).toBe(true)
      expect(manager.getTab(tab.id)?.title).toBe('Updated Title')
    })
  })

  describe('查询功能', () => {
    it('应该能够根据路径名查找标签页', () => {
      manager.addTab({ pathname: '/test1' })
      manager.addTab({ pathname: '/test2' })

      const foundTab = manager.findTabByPathname('/test1')
      expect(foundTab).toBeDefined()
      expect(foundTab?.pathname).toBe('/test1')
    })

    it('应该返回所有标签页的正确顺序', () => {
      const tab1 = manager.addTab({ pathname: '/tab1' })
      const tab2 = manager.addTab({ pathname: '/tab2' })
      const tab3 = manager.addTab({ pathname: '/tab3' })

      const tabs = manager.getAllTabs()
      expect(tabs).toHaveLength(3)
      expect(tabs[0].id).toBe(tab1.id)
      expect(tabs[1].id).toBe(tab2.id)
      expect(tabs[2].id).toBe(tab3.id)
    })
  })

  describe('高级操作', () => {
    it('应该能够关闭其他标签页', () => {
      const keepTab = manager.addTab({ pathname: '/keep' })
      manager.addTab({ pathname: '/close1' })
      manager.addTab({ pathname: '/close2' })

      manager.closeOtherTabs(keepTab.id)
      expect(manager.getAllTabs()).toHaveLength(1)
      expect(manager.getActiveTabId()).toBe(keepTab.id)
    })

    it('应该能够固定和取消固定标签页', () => {
      const tab = manager.addTab({ pathname: '/test' })

      manager.pinTab(tab.id)
      expect(manager.getTab(tab.id)?.pinned).toBe(true)

      manager.unpinTab(tab.id)
      expect(manager.getTab(tab.id)?.pinned).toBe(false)
    })
  })

  describe('缓存管理', () => {
    it('应该能够保存和加载缓存', async () => {
      const tab = manager.addTab({ pathname: '/test' })
      const testData = { foo: 'bar', count: 42 }

      await manager.saveCache(tab.id, testData)
      const loadedData = await manager.loadCache(tab.id)

      expect(loadedData).toEqual(testData)
    })

    it('应该能够移除缓存', async () => {
      const tab = manager.addTab({ pathname: '/test' })
      const testData = { foo: 'bar' }

      await manager.saveCache(tab.id, testData)
      await manager.removeCache(tab.id)

      const loadedData = await manager.loadCache(tab.id)
      expect(loadedData).toBeNull()
    })
  })

  describe('状态管理', () => {
    it('应该能够注册和检查修改标记', () => {
      const tab = manager.addTab({ pathname: '/test' })

      manager.registerPageModifyFlag(tab.id, 'form', true)
      expect(manager.isPageModified(tab.id)).toBe(true)
      expect(manager.getPageModifyFlag(tab.id, 'form')).toBe(true)
    })

    it('应该能够清除修改标记', () => {
      const tab = manager.addTab({ pathname: '/test' })

      manager.registerPageModifyFlag(tab.id, 'form', true)
      manager.registerPageModifyFlag(tab.id, 'editor', true)

      expect(manager.isPageModified(tab.id)).toBe(true)

      manager.registerPageModifyFlag(tab.id, 'form', false)
      expect(manager.isPageModified(tab.id)).toBe(true) // editor still modified

      manager.registerPageModifyFlag(tab.id, 'editor', false)
      expect(manager.isPageModified(tab.id)).toBe(false)
    })
  })

  describe('容量管理', () => {
    it('应该在超出最大标签页数时清理旧标签页', () => {
      // 添加超过限制的标签页
      for (let i = 0; i < 7; i++) {
        manager.addTab({
          pathname: `/tab${i}`,
          title: `Tab ${i}`
        })
      }

      // 应该只保留最新的5个（maxTabs = 5）
      expect(manager.getAllTabs()).toHaveLength(5)
    })
  })
})