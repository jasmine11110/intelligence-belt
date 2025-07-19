import { bluetoothStateManager } from '../lb-ble-common-state/bluetooth-state-manager';
import { CommonProtocolState } from '../lb-ble-common-state/state';
import HexTools from '../utils/hex-tools';

/**
 * 蓝牙协议管理器
 * 封装数据编码/解码和协议解析逻辑
 */
class BluetoothProtocolManager {
  constructor() {
    this.commandMap = new Map();
    this.responseHandlers = new Map();
    this.seq = 0;
  }

  /**
   * 注册协议命令
   * @param {string} command - 命令名称
   * @param {number} cmdCode - 命令代码
   * @param {Function} encoder - 编码器函数
   * @param {Function} decoder - 解码器函数
   */
  registerCommand(command, cmdCode, encoder, decoder) {
    this.commandMap.set(command, {
      cmdCode,
      encoder: encoder || this.defaultEncoder,
      decoder: decoder || this.defaultDecoder
    });
  }

  /**
   * 注册响应处理器
   * @param {number} cmdCode - 命令代码
   * @param {Function} handler - 响应处理函数
   */
  registerResponseHandler(cmdCode, handler) {
    if (typeof handler === 'function') {
      this.responseHandlers.set(cmdCode, handler);
    }
  }

  /**
   * 构建协议数据包
   * @param {string} command - 命令名称
   * @param {Object} data - 发送数据
   */
  buildPacket(command, data) {
    const cmdInfo = this.commandMap.get(command);
    if (!cmdInfo) {
      throw new Error(`未注册的命令: ${command}`);
    }

    const { cmdCode, encoder } = cmdInfo;
    const payload = encoder(data || {});
    const seq = this._nextSeq();

    // 构建协议帧 (示例格式: [SOF][LEN][SEQ][CMD][PAYLOAD][CHECKSUM][EOF])
    const frame = [
      0xAA, // SOF
      payload.length + 4, // LEN (SEQ+CMD+PAYLOAD)
      seq, // SEQ
      cmdCode, // CMD
      ...payload, // PAYLOAD
      this._calcChecksum([seq, cmdCode, ...payload]), // CHECKSUM
      0x55 // EOF
    ];

    return new Uint8Array(frame).buffer;
  }

  /**
   * 解析接收到的数据包
   * @param {ArrayBuffer} buffer - 接收到的原始数据
   */
  parsePacket(buffer) {
    try {
      const dataView = new DataView(buffer);
      let offset = 0;

      // 验证帧头
      if (dataView.getUint8(offset++) !== 0xAA) {
        throw new Error('无效的帧头');
      }

      // 解析长度、序列号和命令码
      const len = dataView.getUint8(offset++);
      const seq = dataView.getUint8(offset++);
      const cmdCode = dataView.getUint8(offset++);

      // 解析 payload
      const payload = [];
      for (let i = 0; i < len - 3; i++) {
        payload.push(dataView.getUint8(offset++));
      }

      // 验证校验和
      const checksum = dataView.getUint8(offset++);
      if (checksum !== this._calcChecksum([seq, cmdCode, ...payload])) {
        throw new Error('校验和不匹配');
      }

      // 验证帧尾
      if (dataView.getUint8(offset++) !== 0x55) {
        throw new Error('无效的帧尾');
      }

      // 查找命令并解码
      const command = Array.from(this.commandMap.entries())
        .find(([_, info]) => info.cmdCode === cmdCode)?.[0];

      const cmdInfo = this.commandMap.get(command) || {};
      const decodedData = cmdInfo.decoder ? cmdInfo.decoder(payload) : this.defaultDecoder(payload);

      // 更新状态并触发响应处理器
      const protocolState = command ? `RECEIVE_${command.toUpperCase()}` : CommonProtocolState.UNKNOWN;
      bluetoothStateManager.setState({
        protocolState,
        protocolData: decodedData
      });

      // 调用响应处理器
      this._invokeResponseHandler(cmdCode, decodedData);

      return {
        command,
        cmdCode,
        seq,
        data: decodedData
      };
    } catch (error) {
      bluetoothStateManager.setState({
        protocolState: CommonProtocolState.ERROR,
        error: { type: 'PROTOCOL', message: error.message }
      });
      throw error;
    }
  }

  /**
   * 调用响应处理器
   */
  _invokeResponseHandler(cmdCode, data) {
    const handler = this.responseHandlers.get(cmdCode);
    if (typeof handler === 'function') {
      try {
        handler(data);
      } catch (error) {
        console.error('响应处理器执行失败:', error);
      }
    }
  }

  /**
   * 生成下一个序列号
   */
  _nextSeq() {
    this.seq = (this.seq + 1) % 256;
    return this.seq;
  }

  /**
   * 计算校验和
   */
  _calcChecksum(data) {
    return data.reduce((sum, byte) => (sum + byte) % 256, 0);
  }

  /**
   * 默认编码器
   */
  defaultEncoder(data) {
    return Object.values(data || {}).map(v => typeof v === 'number' ? v : 0);
  }

  /**
   * 默认解码器
   */
  defaultDecoder(payload) {
    return {
      rawData: payload,
      hexString: HexTools.arrayToHex(payload)
    };
  }
}

export const bluetoothProtocolManager = new BluetoothProtocolManager();