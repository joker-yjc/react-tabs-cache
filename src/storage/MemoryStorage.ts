/**
 * 内存存储适配器
 * 用于开发和测试环境的内存存储实现
 */

import { IStorage, StorageOptions } from './types'
import { logger } from '@utils/logger'
import { serializer } from '@utils/serializer'

interface MemoryItem {
  value: any
  timestamp: number
  expiresAt?: number
  options?: StorageOptions
}

export class MemoryStorage implements IStorage {
  private store: Map<string, MemoryItem> = new Map()
  private maxSize: number = 50 * 1024 * 1024 // 50MB 默认限制

  constructor(maxSize?: number) {
    if (maxSize) this.maxSize = maxSize
    logger.info('MemoryStorage initialized', { maxSize: this.maxSize })
  }

  async get(key: string): Promise<any> {
    try {
      const item = this.store.get(key)

      if (!item) {
        return null
      }

      // 检查是否过期
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.remove(key)
        return null
      }

      logger.debug('MemoryStorage get', { key })
      return item.value

    } catch (error) {
      logger.error('MemoryStorage get failed', error)
      throw error
    }
  }

  async set(key: string, value: any, options?: StorageOptions): Promise<void> {
    try {
      // 检查大小限制
      const serialized = serializer.serialize(value)
      const size = new Blob([serialized]).size

      if (size > this.maxSize) {
        throw new Error(`Storage size ${size} exceeds limit ${this.maxSize}`)
      }

      const item: MemoryItem = {
        value,
        timestamp: Date.now(),
        options
      }

      // 设置过期时间
      if (options?.expiresIn) {
        item.expiresAt = Date.now() + options.expiresIn
      }

      this.store.set(key, item)
      logger.debug('MemoryStorage set', { key, size })

    } catch (error) {
      logger.error('MemoryStorage set failed', error)
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.store.delete(key)
      logger.debug('MemoryStorage remove', { key })
    } catch (error) {
      logger.error('MemoryStorage remove failed', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      this.store.clear()
      logger.info('MemoryStorage cleared')
    } catch (error) {
      logger.error('MemoryStorage clear failed', error)
      throw error
    }
  }

  async getSize(): Promise<number> {
    try {
      let totalSize = 0
      for (const [, item] of this.store.entries()) {
        const serialized = serializer.serialize(item)
        totalSize += new Blob([serialized]).size
      }
      return totalSize
    } catch (error) {
      logger.error('MemoryStorage getSize failed', error)
      return 0
    }
  }

  async getKeys(): Promise<string[]> {
    try {
      // 过滤掉已过期的键
      const now = Date.now()
      const validKeys: string[] = []

      for (const [key, item] of this.store.entries()) {
        if (!item.expiresAt || item.expiresAt > now) {
          validKeys.push(key)
        } else {
          // 清理过期项
          this.store.delete(key)
        }
      }

      return validKeys
    } catch (error) {
      logger.error('MemoryStorage getKeys failed', error)
      return []
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const item = this.store.get(key)
      if (!item) return false

      // 检查是否过期
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.remove(key)
        return false
      }

      return true
    } catch (error) {
      logger.error('MemoryStorage has failed', error)
      return false
    }
  }

  /**
   * 获取存储统计信息
   */
  getStats(): {
    count: number
    size: number
    maxSize: number
    utilization: number
  } {
    const count = this.store.size
    const size = this.getSizeSync()
    const utilization = size / this.maxSize

    return {
      count,
      size,
      maxSize: this.maxSize,
      utilization
    }
  }

  /**
   * 同步获取大小（内部使用）
   */
  private getSizeSync(): number {
    try {
      let totalSize = 0
      for (const item of this.store.values()) {
        const serialized = serializer.serialize(item)
        totalSize += new Blob([serialized]).size
      }
      return totalSize
    } catch {
      return 0
    }
  }

  /**
   * 清理过期项
   */
  async cleanupExpired(): Promise<number> {
    try {
      const now = Date.now()
      let cleanedCount = 0

      for (const [key, item] of this.store.entries()) {
        if (item.expiresAt && item.expiresAt <= now) {
          this.store.delete(key)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        logger.info('MemoryStorage expired items cleaned', { count: cleanedCount })
      }

      return cleanedCount
    } catch (error) {
      logger.error('MemoryStorage cleanupExpired failed', error)
      return 0
    }
  }
}

export function createMemoryStorage(maxSize?: number): MemoryStorage {
  return new MemoryStorage(maxSize)
}

export default MemoryStorage