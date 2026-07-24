/**
 * 简化存储适配器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorage } from '../../../src/storage/MemoryStorage'
import { StorageEngine } from '../../../src/storage/StorageEngine'

describe('存储适配器', () => {
  describe('MemoryStorage', () => {
    let storage: MemoryStorage

    beforeEach(() => {
      storage = new MemoryStorage()
    })

    it('应该能够设置和获取值', async () => {
      const testData = { foo: 'bar', count: 42 }
      await storage.set('test-key', testData)

      const result = await storage.get('test-key')
      expect(result).toEqual(testData)
    })

    it('应该能够检查键是否存在', async () => {
      await storage.set('exists-key', 'value')

      expect(await storage.has('exists-key')).toBe(true)
      expect(await storage.has('non-exists-key')).toBe(false)
    })

    it('应该能够移除值', async () => {
      await storage.set('to-remove', 'value')
      expect(await storage.has('to-remove')).toBe(true)

      await storage.remove('to-remove')
      expect(await storage.has('to-remove')).toBe(false)
    })

    it('应该支持过期时间', async () => {
      await storage.set('expiring-key', 'value', { expiresIn: 100 })

      // 立即检查应该存在
      expect(await storage.has('expiring-key')).toBe(true)

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150))

      // 检查应该不存在
      expect(await storage.has('expiring-key')).toBe(false)
      expect(await storage.get('expiring-key')).toBeNull()
    })

    it('应该能够获取所有键', async () => {
      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')

      const keys = await storage.getKeys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
    })

    it('应该能够清空所有数据', async () => {
      await storage.set('key1', 'value1')
      await storage.set('key2', 'value2')

      expect(await storage.getKeys()).toHaveLength(2)

      await storage.clear()
      expect(await storage.getKeys()).toHaveLength(0)
    })

    it('应该能够获取存储统计信息', async () => {
      await storage.set('small', 'data')

      const stats = (storage as any).getStats()
      expect(stats.count).toBe(1)
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.utilization).toBeGreaterThan(0)
    })
  })

  describe('StorageEngine', () => {
    it('应该能够创建内存存储后端', () => {
      const engine = new StorageEngine('memory')
      expect(engine).toBeDefined()
    })

    it('应该能够创建localStorage后端（降级到内存）', () => {
      const engine = new StorageEngine('localStorage')
      expect(engine).toBeDefined()
    })

    it('应该能够导出和导入数据', async () => {
      const engine = new StorageEngine('memory')

      // 存储一些数据
      await engine.set('export1', 'data1')
      await engine.set('export2', 'data2')

      // 导出数据
      const exported = await engine.exportData()
      expect(exported).toHaveProperty('export1')
      expect(exported).toHaveProperty('export2')

      // 清空并导入
      await engine.clear()
      expect(await engine.getKeys()).toHaveLength(0)

      await engine.importData(exported)
      expect(await engine.get('export1')).toBe('data1')
      expect(await engine.get('export2')).toBe('data2')
    })
  })
})