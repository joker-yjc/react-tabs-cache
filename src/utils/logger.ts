/**
 * Logger 工具 - 基于 debug 库的轻量级日志工具
 * 支持不同的命名空间和环境变量控制
 */

import debug from 'debug'

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'

type LogFunction = (...args: any[]) => void

interface Logger {
  debug: LogFunction
  info: LogFunction
  warn: LogFunction
  error: LogFunction
  success: LogFunction
  extend: (namespace: string) => Logger
}

// 创建基础 logger
const createBaseLogger = (namespace: string): Logger => {
  const baseDebugger = debug(namespace)

  return {
    debug: baseDebugger.extend('debug'),
    info: baseDebugger.extend('info'),
    warn: baseDebugger.extend('warn'),
    error: baseDebugger.extend('error'),
    success: baseDebugger.extend('success'),
    extend: (subNamespace: string) => createBaseLogger(`${namespace}:${subNamespace}`)
  }
}

// 创建全局 logger 实例
export const logger = createBaseLogger('@jcyao/react-tabs-cache')

/**
 * 创建自定义命名空间的 Logger
 */
export function createLogger(namespace: string): Logger {
  return createBaseLogger(namespace)
}

/**
 * 设置日志启用状态
 */
export function enableLogs(pattern: string = '*'): void {
  debug.enable(pattern)
}

/**
 * 禁用所有日志
 */
export function disableLogs(): void {
  debug.disable()
}

/**
 * 检查某个命名空间是否启用
 */
export function isEnabled(namespace: string): boolean {
  return debug.enabled(namespace)
}

export type { Logger, LogLevel }
export default logger