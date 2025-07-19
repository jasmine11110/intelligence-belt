import {LBlueToothManager} from "./lb-ble-common-connection/index";
import {getAppBLEProtocol} from "./lb-example-bluetooth-protocol";
import Toast from '../../view/toast';

/**
 * 蓝牙连接方式管理类
 * 初始化蓝牙连接时需筛选的设备，重写蓝牙连接规则
 */
// 用函数返回单例对象，避免直接new class导致的this丢失问题
let bleManagerInstance = null;
export function getAppBLEManager() {
    if (!bleManagerInstance) {
        bleManagerInstance = new class extends LBlueToothManager {
    constructor() {
        super();
        super.setFilter({
                    services: ['0000FFF0-0000-1000-8000-00805F9B34FB'],
            targetServiceArray: [{
                        serviceId: '0000FFF0-0000-1000-8000-00805F9B34FB',
                        writeCharacteristicId: '0000FFF1-0000-1000-8000-00805F9B34FB',
                        notifyCharacteristicId: '0000FFF2-0000-1000-8000-00805F9B34FB',
                        readCharacteristicId: '0000FFF2-0000-1000-8000-00805F9B34FB',
            }],
                    targetDeviceName: 'LLP_BLE',
                    scanInterval: 350
        });
        super.initBLEProtocol({bleProtocol: getAppBLEProtocol});
                this._autoReconnect = true;
                this._reconnectCount = 0;
                this._maxReconnect = 3;
                this._lastTargetDevice = null;
    }

    /**
     * 获取本机蓝牙适配器状态
     * @returns {Promise<*>} 返回值见小程序官网 wx.getBluetoothAdapterState
     */
    async getBLEAdapterState() {
        return await super.getBLEAdapterState();
    }

    /**
     * 获取最新的蓝牙连接状态
     * @returns {*}
     */
    getBLELatestConnectState() {
        return super.getBLELatestConnectState();
    }

            // 重构：连接到指定设备，支持自动重连
    async connectToSpecificDevice(device) {
                if (!device || !device.deviceId) {
                    if (typeof Toast === 'function' || (Toast && Toast.fail)) {
                        Toast.fail('设备信息不完整，无法连接');
                    }
                    return;
                }
                // 防止重复连接
                if (this._connecting) {
                    if (typeof Toast === 'function' || (Toast && Toast.info)) {
                        Toast.info('正在连接中，请稍候...');
                    }
                    return;
                }
                this._connecting = true;
                this._lastTargetDevice = device;
                this._reconnectCount = 0;
                try {
                    await this._tryConnect(device);
                    if (typeof Toast === 'function' || (Toast && Toast.success)) {
                        Toast.success('连接成功');
                    }
                } catch (err) {
                    if (typeof Toast === 'function' || (Toast && Toast.fail)) {
                        Toast.fail('连接失败: ' + (err && (err.errMsg || err.errCode || err.message)));
                    }
                    try { console.error('连接失败详细信息:', err); } catch (e) {}
                    // 全局兜底
                    this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
                    this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
                } finally {
                    this._connecting = false;
                    // 全局兜底
                    this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
                    this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
                }
            }

            // 内部递归重连逻辑
            async _tryConnect(device) {
                try {
        await super.stopBlueToothDevicesDiscovery();
                } catch (e) {}
                try {
        await this.createBLEConnection({deviceId: device.deviceId});
                    this.latestConnectState = {value: 'connected'};
                    this._reconnectCount = 0;
                } catch (err) {
                    this.latestConnectState = {value: 'failed'};
                    // 全局兜底
                    this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
                    this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
                    if (this._autoReconnect && this._reconnectCount < this._maxReconnect && this._isLLPBLEDevice(device)) {
                        this._reconnectCount++;
                        if (typeof Toast === 'function' || (Toast && Toast.info)) {
                            Toast.info('连接失败，正在自动重连(' + this._reconnectCount + ')...');
                        }
                        await new Promise(res => setTimeout(res, 1000));
                        try {
                            return await this._tryConnect(device);
                        } catch (e) {
                            // 捕获递归重连中的异常，防止 undefined.call
                            if (typeof Toast === 'function' || (Toast && Toast.fail)) {
                                Toast.fail('自动重连异常: ' + (e && (e.errMsg || e.errCode || e.message)));
                            }
                            // 全局兜底
                            this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
                            this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
                            throw e;
                        }
                    } else {
                        throw err;
                    }
                } finally {
                    // 全局兜底
                    this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
                    this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
                }
            }

            // 判断是否为 LLP_BLE 设备
            _isLLPBLEDevice(device) {
                return (device.name && device.name.includes('LLP_BLE')) || (device.localName && device.localName.includes('LLP_BLE'));
            }

            // 监听连接断开，自动重连
            setBLEListener({onConnectStateChanged, onReceiveData}) {
                // 兜底：如果未传回调，自动赋值为空函数
                if (!onConnectStateChanged) onConnectStateChanged = () => {};
                if (!onReceiveData) onReceiveData = () => {};
                // 绑定 this，防止回调丢失上下文
                this._onConnectStateChanged = typeof onConnectStateChanged === 'function' ? onConnectStateChanged.bind(this) : () => {};
                this._onReceiveData = typeof onReceiveData === 'function' ? onReceiveData.bind(this) : () => {};
                // 全局兜底
                this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
                this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
                super.setBLEListener({
                    onConnectStateChanged: (res) => {
                        try {
                            if (typeof onConnectStateChanged === 'function') onConnectStateChanged(res);
                        } catch (e) {
                            console.error('onConnectStateChanged 回调异常', e, onConnectStateChanged);
                        }
                        if (this._autoReconnect && res.connectState === 'disconnected' && this._lastTargetDevice && this._isLLPBLEDevice(this._lastTargetDevice)) {
                            if (this._reconnectCount < this._maxReconnect) {
                                if (typeof Toast === 'function' || (Toast && Toast.info)) {
                                    Toast.info('连接断开，自动重连...');
                                }
                                this._reconnectCount++;
                                try {
                                    this._tryConnect(this._lastTargetDevice);
                                } catch (e) {
                                    if (typeof Toast === 'function' || (Toast && Toast.fail)) {
                                        Toast.fail('自动重连异常: ' + (e && (e.errMsg || e.errCode || e.message)));
                                    }
                                }
                            }
                        }
                        // 全局兜底
                        this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
                        this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
                    },
                    onReceiveData: (data) => {
                        try {
                            if (typeof onReceiveData === 'function') onReceiveData(data);
                        } catch (e) {
                            console.error('onReceiveData 回调异常', e, onReceiveData);
                        }
                        // 全局兜底
                        this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
                        this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
                    }
                });
    }

    // 页面卸载时清理回调，防止异步回调触发已销毁对象
    onUnload() {
        // 回调赋值为空函数，防止异步链路触发 undefined.call
        this._onConnectStateChanged = () => {};
        this._onReceiveData = () => {};
        // 解绑所有 BLE 事件监听，防止内存泄漏和回调触发已销毁页面
        if (typeof wx !== 'undefined') {
            wx.offBLEConnectionStateChange && wx.offBLEConnectionStateChange();
            wx.offBLECharacteristicValueChange && wx.offBLECharacteristicValueChange();
            wx.offBluetoothDeviceFound && wx.offBluetoothDeviceFound();
        }
    }

    /**
     * 创建BLE连接
     */
    async createBLEConnection({deviceId}) {
        return new Promise((resolve, reject) => {
            wx.createBLEConnection({
                deviceId,
                success: resolve,
                fail: reject
            });
        });
    }

    /**
     * 停止蓝牙扫描
     */
    async stopBlueToothDevicesDiscovery() {
        return super.stopBlueToothDevicesDiscovery();
    }
}();
    }
    return bleManagerInstance;
}
