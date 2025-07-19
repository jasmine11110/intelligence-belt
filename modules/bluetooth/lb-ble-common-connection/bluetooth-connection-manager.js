import { bluetoothStateManager } from '../lb-ble-common-state/bluetooth-state-manager';
import { CommonConnectState } from '../lb-ble-common-state/state';
import { getBluetoothAdapterState, openBluetoothAdapter, closeBluetoothAdapter, startBluetoothDevicesDiscovery, stopBluetoothDevicesDiscovery, onBluetoothDeviceFound, createBLEConnection, closeBLEConnection, getBLEDeviceServices, getBLEDeviceCharacteristics, notifyBLECharacteristicValueChange } from './base/wx/apis';

/**
 * 蓝牙连接管理器
 * 封装蓝牙适配器操作、设备扫描和连接管理
 */
class BluetoothConnectionManager {
  constructor() {
    this.deviceId = '';
    this.serviceId = '';
    this.characteristicId = '';
    this.scanTimer = null;
    this.isScanning = false;
    this.deviceFoundCallback = null;
  }

  /**
   * 初始化蓝牙适配器
   */
  async initAdapter() {
    try {
      bluetoothStateManager.setState({
        connectState: CommonConnectState.INITIALIZING
      });

      const adapterState = await getBluetoothAdapterState();
      if (!adapterState.available) {
        await openBluetoothAdapter();
      }

      bluetoothStateManager.setState({
        connectState: CommonConnectState.AVAILABLE
      });
      return true;
    } catch (error) {
      bluetoothStateManager.setState({
        connectState: CommonConnectState.UNAVAILABLE,
        error: { type: 'INIT', message: error.errMsg, code: error.errCode }
      });
      throw error;
    }
  }

  /**
   * 开始扫描蓝牙设备
   * @param {Object} options - 扫描选项
   * @param {string[]} options.services - 要搜索的服务UUID
   * @param {number} options.scanDuration - 扫描持续时间(ms)
   * @param {Function} options.onDeviceFound - 设备发现回调
   */
  async startScan(options) {
    if (this.isScanning) return;

    const { services = [], scanDuration = 5000, onDeviceFound } = options;
    this.deviceFoundCallback = onDeviceFound;
    this.isScanning = true;

    bluetoothStateManager.setState({
      connectState: CommonConnectState.SCANNING
    });

    try {
      // 清除之前的扫描定时器
      if (this.scanTimer) clearTimeout(this.scanTimer);

      // 注册设备发现事件
      onBluetoothDeviceFound(devices => this._handleDeviceFound(devices));

      // 开始扫描
      await startBluetoothDevicesDiscovery({ services });

      // 设置扫描超时
      this.scanTimer = setTimeout(() => {
        this.stopScan();
      }, scanDuration);
    } catch (error) {
      bluetoothStateManager.setState({
        error: { type: 'SCAN', message: error.errMsg, code: error.errCode }
      });
      this.isScanning = false;
      throw error;
    }
  }

  /**
   * 停止扫描蓝牙设备
   */
  async stopScan() {
    if (!this.isScanning) return;

    try {
      await stopBluetoothDevicesDiscovery();
      this.isScanning = false;
      this.deviceFoundCallback = null;
      clearTimeout(this.scanTimer);

      bluetoothStateManager.setState({
        connectState: CommonConnectState.AVAILABLE
      });
    } catch (error) {
      console.warn('停止扫描失败:', error);
    }
  }

  /**
   * 处理发现的设备
   */
  _handleDeviceFound(devices) {
    if (typeof this.deviceFoundCallback === 'function') {
      this.deviceFoundCallback(devices);
    }
    bluetoothStateManager.setState({
      scannedDevices: devices
    }, true);
  }

  /**
   * 连接到蓝牙设备
   * @param {string} deviceId - 设备ID
   * @param {Object} serviceOptions - 服务和特征值配置
   */
  async connectDevice(deviceId, serviceOptions) {
    if (!deviceId) throw new Error('设备ID不能为空');

    bluetoothStateManager.setState({
      connectState: CommonConnectState.CONNECTING,
      deviceInfo: { deviceId }
    });

    try {
      // 停止扫描
      await this.stopScan();

      // 连接设备
      await createBLEConnection({ deviceId });

      // 获取服务和特征值
      const { serviceId, characteristicId } = await this._getServiceAndCharacteristic(deviceId, serviceOptions);
      this.deviceId = deviceId;
      this.serviceId = serviceId;
      this.characteristicId = characteristicId;

      // 开启notify
      await notifyBLECharacteristicValueChange({
        deviceId,
        serviceId,
        characteristicId,
        state: true
      });

      bluetoothStateManager.setState({
        connectState: CommonConnectState.CONNECTED,
        deviceInfo: { deviceId, serviceId, characteristicId }
      });

      return { deviceId, serviceId, characteristicId };
    } catch (error) {
      bluetoothStateManager.setState({
        connectState: CommonConnectState.DISCONNECTED,
        error: { type: 'CONNECT', message: error.errMsg, code: error.errCode }
      });
      throw error;
    }
  }

  /**
   * 获取服务和特征值
   */
  async _getServiceAndCharacteristic(deviceId, { targetServiceId, targetCharacteristicId }) {
    // 获取所有服务
    const { services } = await getBLEDeviceServices({ deviceId });
    const service = services.find(s => targetServiceId ? s.uuid === targetServiceId : true);
    if (!service) throw new Error('未找到目标服务');

    // 获取特征值
    const { characteristics } = await getBLEDeviceCharacteristics({
      deviceId,
      serviceId: service.uuid
    });

    const characteristic = targetCharacteristicId
      ? characteristics.find(c => c.uuid === targetCharacteristicId)
      : characteristics.find(c => c.properties.notify || c.properties.read);

    if (!characteristic) throw new Error('未找到目标特征值');

    return { serviceId: service.uuid, characteristicId: characteristic.uuid };
  }

  /**
   * 断开蓝牙连接
   */
  async disconnectDevice() {
    if (!this.deviceId) return;

    try {
      await closeBLEConnection({ deviceId: this.deviceId });
    } catch (error) {
      console.warn('断开连接失败:', error);
    } finally {
      this.deviceId = '';
      this.serviceId = '';
      this.characteristicId = '';

      bluetoothStateManager.setState({
        connectState: CommonConnectState.DISCONNECTED,
        deviceInfo: null
      });
    }
  }

  /**
   * 关闭蓝牙适配器
   */
  async closeAdapter() {
    await this.disconnectDevice();
    try {
      await closeBluetoothAdapter();
      bluetoothStateManager.setState({
        connectState: CommonConnectState.UNAVAILABLE
      });
    } catch (error) {
      console.warn('关闭适配器失败:', error);
    }
  }
}

export const bluetoothConnectionManager = new BluetoothConnectionManager();