/**
 * 十六进制工具类
 * 提供十六进制与其他数据类型的转换功能
 */
class HexTools {
  /**
   * 字符串转十六进制
   * @param {string} str - 输入字符串
   * @returns {string} 十六进制字符串
   */
  static stringToHex(str) {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * 十六进制转字符串
   * @param {string} hex - 十六进制字符串
   * @returns {string} 转换后的字符串
   */
  static hexToString(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }

  /**
   * 数组转十六进制
   * @param {Array} arr - 数组
   * @returns {string} 十六进制字符串
   */
  static arrayToHex(arr) {
    let hex = '';
    for (let i = 0; i < arr.length; i++) {
      hex += arr[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  /**
   * 十六进制转数组
   * @param {string} hex - 十六进制字符串
   * @returns {Array} 转换后的数组
   */
  static hexToArray(hex) {
    const arr = [];
    for (let i = 0; i < hex.length; i += 2) {
      arr.push(parseInt(hex.substr(i, 2), 16));
    }
    return arr;
  }

  /**
   * 计算校验和
   * @param {string} hex - 十六进制字符串
   * @returns {string} 校验和的十六进制表示
   */
  static calculateChecksum(hex) {
    let sum = 0;
    for (let i = 0; i < hex.length; i += 2) {
      sum += parseInt(hex.substr(i, 2), 16);
    }
    return (sum & 0xFF).toString(16).padStart(2, '0');
  }
}

export default HexTools;