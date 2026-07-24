/**
 * 存储适配器接口定义
 * 定义所有存储后端必须实现的接口
 */

export interface IStorage {
  /**
   * 获取存储值
   */
  get(key: string): Promise<any>

  /**
   * 设置存储值
   */
  set(key: string, value: any, options?: StorageOptions): Promise<void>

  /**
   * 移除存储值
   */
  remove(key: string): Promise<void>

  /**
   * 清空所有存储
   */
  clear(): Promise<void>

  /**
   * 获取存储大小
   */
  getSize(): Promise<number>

  /**
   * 获取所有键
   */
  getKeys(): Promise<string[]>

  /**
   * 检查键是否存在
   */
  has(key: string): Promise<boolean>
}

export interface StorageOptions {
  /** 过期时间（毫秒） */
  expiresIn?: number

  /** 是否压缩 */
  compress?: boolean

  /** 是否加密 */
  encrypted?: boolean

  /** 版本号 */
  version?: string

  /** 元数据 */
  metadata?: Record<string, any>
}

export type StorageBackendType = 'memory' | 'localStorage' | 'indexedDB' | 'custom'