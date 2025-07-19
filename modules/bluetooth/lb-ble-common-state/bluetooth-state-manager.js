import { CommonConnectState } from './state';

/**
 * 蓝牙状态管理器 - 实现观察者模式
 * 统一管理蓝牙连接状态、设备信息和错误状态
 */
class BluetoothStateManager {
  constructor() {
    this.state = {
      connectState: CommonConnectState.UNAVAILABLE,
      deviceInfo: null,
      error: null,
      protocolState: null,
      protocolData: null
    };
    this.observers = new Set();
  }

  /**
   * 获取当前状态
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 更新状态并通知观察者
   * @param {Object} newState - 新状态对象
   * @param {boolean} [forceNotify=false] - 是否强制通知，即使状态未变化
   */
  setState(newState, forceNotify = false) {
    const oldState = this.getState();
    this.state = { ...this.state, ...newState };

    // 状态变化或强制通知时触发观察者
    if (forceNotify || !this._isStateEqual(oldState, this.state)) {
      this._notifyObservers();
    }
  }

  /**
   * 注册观察者
   * @param {Function} observer - 观察者函数
   * @returns {Function} 取消订阅函数
   */
  subscribe(observer) {
    if (typeof observer !== 'function') {
      throw new Error('Observer must be a function');
    }

    this.observers.add(observer);
    // 立即通知当前状态
    observer(this.getState());

    return () => this.observers.delete(observer);
  }

  /**
   * 重置状态
   */
  reset() {
    this.setState({
      connectState: CommonConnectState.UNAVAILABLE,
      deviceInfo: null,
      error: null,
      protocolState: null,
      protocolData: null
    }, true);
  }

  /**
   * 检查两个状态对象是否相等
   */
  _isStateEqual(oldState, newState) {
    return JSON.stringify(oldState) === JSON.stringify(newState);
  }

  /**
   * 通知所有观察者
   */
  _notifyObservers() {
    const currentState = this.getState();
    this.observers.forEach(observer => {
      try {
        observer(currentState);
      } catch (e) {
        console.error('Observer error:', e);
      }
    });
  }
}

// 单例模式导出
export const bluetoothStateManager = new BluetoothStateManager();