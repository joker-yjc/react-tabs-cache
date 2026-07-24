/**
 * 存储引擎 - 统一的存储管理器
 * 提供存储后端的抽象层和统一接口
 */

import { IStorage, StorageBackendType, StorageOptions } from './types'
import { MemoryStorage } from './MemoryStorage'
import { logger } from '@utils/logger'

export class StorageEngine {
  private backend: IStorage
  private backendType: StorageBackendType
  private cleanupInterval?: NodeJS.Timeout

  constructor(backendType: StorageBackendType = 'memory', options?: StorageEngineOptions) {
    this.backendType = backendType
    this.backend = this.createBackend(backendType, options)

    // 启动自动清理
    if (options?.autoCleanup) {
      this.startAutoCleanup(options.cleanupInterval || 30000)
    }

    logger.info('StorageEngine initialized', {
      backend: backendType,
      autoCleanup: options?.autoCleanup
    })
  }

  private createBackend(type: StorageBackendType, options?: StorageEngineOptions): IStorage {
    switch (type) {
      case 'memory':
        return new MemoryStorage(options?.maxSize)

      case 'localStorage':
        throw new Error('LocalStorage backend is not supported')

      case 'indexedDB':
        throw new Error('IndexedDB backend not implemented yet')

      case 'custom':
        if (!options?.customBackend) {
          throw new Error('Custom backend must be provided')
        }
        return options.customBackend

      default:
        throw new Error(`Unknown storage backend: ${type}`)
    }
  }

  async get(key: string): Promise<any> {
    return this.backend.get(key)
  }

  async set(key: string, value: any, options?: StorageOptions): Promise<void> {
    return this.backend.set(key, value, options)
  }

  async remove(key: string): Promise<void> {
    return this.backend.remove(key)
  }

  async clear(): Promise<void> {
    return this.backend.clear()
  }

  async getSize(): Promise<number> {
    return this.backend.getSize()
  }

  async getKeys(): Promise<string[]> {
    return this.backend.getKeys()
  }

  async has(key: string): Promise<boolean> {
    return this.backend.has(key)
  }

  /**
   * 获取后端统计信息
   */
  getStats(): any {
    if ('getStats' in this.backend) {
      return (this.backend as any).getStats()
    }
    return {
      backend: this.backendType
    }
  }

  /**
   * 清理过期项
   */
  async cleanupExpired(): Promise<number> {
    if ('cleanupExpired' in this.backend) {
      return (this.backend as any).cleanupExpired()
    }
    return 0
  }

  /**
   * 切换存储后端
   */
  async switchBackend(newType: StorageBackendType, options?: StorageEngineOptions): Promise<void> {
    try {
      // 保存当前数据
      const currentData = await this.exportData()

      // 创建新后端
      const newBackend = this.createBackend(newType, options)

      // 切换
      this.backend = newBackend
      this.backendType = newType

      // 恢复数据
      await this.importData(currentData)

      logger.info('Storage backend switched', {
        from: this.backendType,
        to: newType
      })

    } catch (error) {
      logger.error('Failed to switch storage backend', error)
      throw error
    }
  }

  /**
   * 导出所有数据
   */
  async exportData(): Promise<Record<string, any>> {
    try {
      const keys = await this.getKeys()
      const data: Record<string, any> = {}

      for (const key of keys) {
        data[key] = await this.get(key)
      }

      return data
    } catch (error) {
      logger.error('Failed to export data', error)
      throw error
    }
  }

  /**
   * 导入数据
   */
  async importData(data: Record<string, any>): Promise<void> {
    try {
      for (const [key, value] of Object.entries(data)) {
        await this.set(key, value)
      }
    } catch (error) {
      logger.error('Failed to import data', error)
      throw error
    }
  }

  /**
   * 启动自动清理
   */
  private startAutoCleanup(interval: number): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const cleaned = await this.cleanupExpired()
        if (cleaned > 0) {
          logger.debug('Auto cleanup completed', { cleaned })
        }
      } catch (error) {
        logger.error('Auto cleanup failed', error)
      }
    }, interval)
  }

  /**
   * 停止自动清理
   */
  private stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  /**
   * 销毁存储引擎
   */
  destroy(): void {
    this.stopAutoCleanup()
    logger.info('StorageEngine destroyed')
  }
}

export interface StorageEngineOptions {
  /** 最大存储大小（字节） */
  maxSize?: number

  /** LocalStorage 前缀 */
  prefix?: string

  /** 自定义后端实例 */
  customBackend?: IStorage

  /** 是否启用自动清理 */
  autoCleanup?: boolean

  /** 自动清理间隔（毫秒） */
  cleanupInterval?: number
}

export function createStorageEngine(
  backendType?: StorageBackendType,
  options?: StorageEngineOptions
): StorageEngine {
  return new StorageEngine(backendType, options)
}

export default StorageEngine
