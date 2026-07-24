/**
 * Serializer 工具 - 用于数据序列化和反序列化
 * 支持特殊类型的序列化（Date, Map, Set 等）
 */

import { logger } from './logger'

/**
 * 特殊类型的序列化标记
 */
interface SerializedSpecialType {
  __type: string
  value: any
}

/**
 * 检查值是否是特殊类型
 */
function isSpecialType(value: any): boolean {
  return (
    value instanceof Date ||
    value instanceof Map ||
    value instanceof Set ||
    value instanceof Error ||
    value instanceof RegExp
  )
}

/**
 * 序列化特殊类型
 */
function serializeSpecialType(value: any): SerializedSpecialType {
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() }
  }

  if (value instanceof Map) {
    return { __type: 'Map', value: Array.from(value.entries()) }
  }

  if (value instanceof Set) {
    return { __type: 'Set', value: Array.from(value) }
  }

  if (value instanceof Error) {
    return {
      __type: 'Error',
      value: {
        name: value.name,
        message: value.message,
        stack: value.stack,
      },
    }
  }

  if (value instanceof RegExp) {
    return {
      __type: 'RegExp',
      value: {
        pattern: value.source,
        flags: value.flags,
      },
    }
  }

  throw new Error(`Unsupported special type: ${typeof value}`)
}

/**
 * 反序列化特殊类型
 */
function deserializeSpecialType(obj: SerializedSpecialType): any {
  const { __type, value } = obj

  switch (__type) {
    case 'Date':
      return new Date(value)

    case 'Map':
      return new Map(value)

    case 'Set':
      return new Set(value)

    case 'Error': {
      const error = new Error(value.message)
      error.name = value.name
      error.stack = value.stack
      return error
    }

    case 'RegExp':
      return new RegExp(value.pattern, value.flags)

    default:
      return obj
  }
}

/**
 * 序列化配置
 */
export interface SerializeOptions {
  /** 最大深度 */
  maxDepth?: number

  /** 是否美化输出 */
  pretty?: boolean

  /** 是否包括原型方法 */
  includePrototype?: boolean
}

/**
 * Serializer 类
 */
export class Serializer {
  private pretty: boolean = false

  constructor(options: SerializeOptions = {}) {
    if (options.pretty) this.pretty = options.pretty
  }

  /**
   * 序列化数据为 JSON 字符串
   */
  serialize(data: any): string {
    try {
      const replacer = (_key: string, value: any) => {
        // 处理特殊类型
        if (isSpecialType(value)) {
          return serializeSpecialType(value)
        }

        // 处理函数（默认不序列化）
        if (typeof value === 'function') {
          return undefined
        }

        // 处理循环引用
        if (typeof value === 'object' && value !== null) {
          // 这里可以添加循环引用检测逻辑
        }

        return value
      }

      const result = JSON.stringify(data, replacer, this.pretty ? 2 : undefined)

      return result
    } catch (error) {
      logger.error('Serialization failed:', error)
      throw new SerializationError('Failed to serialize data', { cause: error })
    }
  }

  /**
   * 反序列化 JSON 字符串
   */
  deserialize(str: string): any {
    try {
      const result = JSON.parse(str, (_key: string, value: any) => {
        // 检查是否是特殊类型的序列化对象
        if (
          value &&
          typeof value === 'object' &&
          '__type' in value &&
          typeof value.__type === 'string'
        ) {
          return deserializeSpecialType(value)
        }

        return value
      })

      return result
    } catch (error) {
      logger.error('Deserialization failed:', error)
      throw new DeserializationError('Failed to deserialize data', { cause: error })
    }
  }

  /**
   * 计算数据的近似大小（字节）
   */
  getSize(data: any): number {
    try {
      const serialized = this.serialize(data)
      return new Blob([serialized]).size
    } catch (error) {
      logger.warn('Failed to calculate size:', error)
      return 0
    }
  }

  /**
   * 深度克隆数据
   */
  clone<T = any>(data: T): T {
    try {
      const serialized = this.serialize(data)
      return this.deserialize(serialized)
    } catch (error) {
      logger.warn('Deep clone failed, using shallow copy:', error)
      return { ...data } as T
    }
  }

  /**
   * 检查两个对象是否相等
   */
  isEqual(a: any, b: any): boolean {
    try {
      return this.serialize(a) === this.serialize(b)
    } catch (error) {
      logger.warn('Equality check failed:', error)
      return false
    }
  }

  /**
   * 合并两个对象
   */
  merge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    try {
      const result = this.clone(target)
      return Object.assign(result, source)
    } catch (error) {
      logger.warn('Merge failed:', error)
      return Object.assign({}, target, source)
    }
  }
}

/**
 * 序列化错误
 */
export class SerializationError extends Error {
  constructor(message: string, public readonly details?: { cause?: any }) {
    super(message)
    this.name = 'SerializationError'
    Object.setPrototypeOf(this, SerializationError.prototype)
  }
}

/**
 * 反序列化错误
 */
export class DeserializationError extends Error {
  constructor(message: string, public readonly details?: { cause?: any }) {
    super(message)
    this.name = 'DeserializationError'
    Object.setPrototypeOf(this, DeserializationError.prototype)
  }
}

/**
 * 创建全局 serializer 实例
 */
export const serializer = new Serializer({
  pretty: false,
})

/**
 * 创建自定义 Serializer
 */
export function createSerializer(options?: SerializeOptions): Serializer {
  return new Serializer(options)
}

export default serializer