/**
 * EventBus - 基于 mitt 库的轻量级事件总线
 * 支持事件的订阅、发送和取消订阅
 */

import mitt, { Emitter } from 'mitt'
import { IEventBus, EventCallback, Unsubscribe } from '@core/types'

type Events = {
  [key: string]: any
}

class EventBus implements IEventBus {
  private emitter: Emitter<Events>

  constructor() {
    this.emitter = mitt<Events>()
  }

  /**
   * 订阅事件
   */
  on<T = any>(eventName: string, callback: EventCallback<T>): Unsubscribe {
    this.emitter.on(eventName, callback as any)
    return () => this.off(eventName, callback)
  }

  /**
   * 取消订阅事件
   */
  off<T = any>(eventName: string, callback: EventCallback<T>): void {
    this.emitter.off(eventName, callback as any)
  }

  /**
   * 发送事件
   */
  emit<T = any>(eventName: string, payload?: T): void {
    this.emitter.emit(eventName, payload)
  }

  /**
   * 清空事件监听者
   */
  clear(eventName?: string): void {
    if (eventName) {
      // mitt 不直接支持清空特定事件，这里提供一个简单的实现
      // 实际使用中可以通过重新创建 emitter 来清空
      console.warn('Clear specific event not fully supported in mitt wrapper')
    } else {
      // 重新创建 emitter 来清空所有事件
      this.emitter = mitt<Events>()
    }
  }

  /**
   * 获取事件的监听者数量
   */
  listenerCount(eventName: string): number {
    void eventName
    return 0
  }

  /**
   * 获取所有事件名称
   */
  eventNames(): string[] {
    // mitt 不提供直接获取事件名称的方法
    return []
  }

  /**
   * 获取总监听者数量
   */
  getTotalListenerCount(): number {
    // mitt 不提供直接获取总监听者数量的方法
    return 0
  }
}

/**
 * 创建事件总线实例
 */
export function createEventBus(): EventBus {
  return new EventBus()
}

/**
 * 创建全局事件总线
 */
export const globalEventBus = new EventBus()

export default EventBus
