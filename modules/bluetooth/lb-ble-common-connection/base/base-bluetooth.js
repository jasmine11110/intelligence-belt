import AbstractBlueTooth from "./abstract-bluetooth";
import {getStorageSync, removeStorageSync, setStorageSync} from "./wx/apis";
import {CommonConnectState} from "../../lb-ble-common-state/state";


function* entries(obj) {
    for (let key of Object.keys(obj)) {
        yield [key, obj[key]];
    }
}

export default class BaseBlueTooth extends AbstractBlueTooth {
    constructor() {
        super();
        // 初始化回调为空函数，彻底兜底
        this._onConnectStateChanged = () => {};
        this._onReceiveData = () => {};
        this._deviceId = this.getConnectedDeviceId();
        this._serviceId = '';
        this._characteristicId = '';
        this._latestConnectState = {value: CommonConnectState.UNAVAILABLE};
        this._latestProtocolObj = {protocolState: '', value: {}};
        this._onBLEConnectionStateChangeListener = null;
    }

    /**
     * 在连接前，一定要先设置BLE监听
     *
     * @param onConnectStateChanged onConnectStateChanged中的参数包括{connectState:''}
     * @param onReceiveData onReceiveData中的参数包括了 {protocolState:'',value:{}}
     */
    setBLEListener({onConnectStateChanged, onReceiveData}) {
        try {
            this._onConnectStateChanged = typeof onConnectStateChanged === 'function' ? onConnectStateChanged : () => {};
            this._onReceiveData = typeof onReceiveData === 'function' ? onReceiveData : () => {};
            // 全局兜底
            this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
            this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
        } catch (e) {
            this._onConnectStateChanged = () => {};
            this._onReceiveData = () => {};
        }
    }

    /**
     * 子类重写，用于监听蓝牙连接状态事件
     */
    setDefaultOnBLEConnectionStateChangeListener() {

    }

    set latestConnectState({value, filter = false}) {
        // 全局兜底
        this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
        if (this._latestConnectState.value !== value) {
            if (!filter && typeof this._onConnectStateChanged === 'function') {
                try {
                    this._onConnectStateChanged({connectState: value});
                } catch (e) {
                    // 全局兜底
                    this._onConnectStateChanged = () => {};
                }
            }
            this._latestConnectState.value = value;
        }
    }

    get latestConnectState() {
        return this._latestConnectState;
    }

    set latestProtocolInfo({protocolState, value}) {
        // 全局兜底
        this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
        if (this._latestProtocolObj.protocolState !== protocolState) {
            if (typeof this._onReceiveData === 'function') {
                try {
                    this._onReceiveData({protocolState, value});
                } catch (e) {
                    this._onReceiveData = () => {};
                }
            }
        } else {
            const {value: latestValue} = this._latestProtocolObj;
            if (Object.getOwnPropertyNames(latestValue) === Object.getOwnPropertyNames(value)) {
                for (let [key, item] of Object.entries(latestValue)) {
                    if (item !== value[key]) {
                        if (typeof this._onReceiveData === 'function') {
                            try {
                                this._onReceiveData({protocolState, value});
                            } catch (e) {
                                this._onReceiveData = () => {};
                            }
                        } else {
                            this._onReceiveData = () => {};
                        }
                        return;
                    }
                }
            }
            if (typeof this._onReceiveData === 'function') {
                try {
                    this._onReceiveData({protocolState, value});
                } catch (e) {
                    this._onReceiveData = () => {};
                }
            } else {
                this._onReceiveData = () => {};
            }
        }
    }

    async createBLEConnection({deviceId}) {
        try {
            try {
                await super.stopBlueToothDevicesDiscovery();
            } catch (e) {}
            this.setDefaultOnBLEConnectionStateChangeListener();
            // 全局兜底
            this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
            // 优化：连接成功后自动获取服务和特征值，自动开启notify监听
            const {serviceId, characteristicId} = await super.createBLEConnection({
                deviceId,
                valueChangeListener: typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {}
            });
            this._serviceId = serviceId;
            this._characteristicId = characteristicId;
            this.setDeviceId({deviceId});
            // 获取所有服务和特征值，判断是否支持notify
            try {
                const {services} = await super.getBLEDeviceServices({deviceId});
                for (const service of services) {
                    try {
                        const {characteristics} = await super.getBLEDeviceCharacteristics({deviceId, serviceId: service.uuid});
                        characteristics.forEach(char => {
                            if (char.properties && char.properties.notify) {
                                // 自动开启notify监听
                                super.notifyBLECharacteristicValueChange({
                                    deviceId,
                                    serviceId: service.uuid,
                                    characteristicId: char.uuid,
                                    state: true
                                }).catch(err => {
                                    console.warn('notify监听开启失败', err);
                                });
                            }
                        });
                    } catch (e) {
                        console.warn('获取特征值失败', e);
                    }
                }
            } catch (e) {
                console.warn('获取服务失败', e);
            }
            return {isConnected: true};
        } catch (error) {
            // 全局兜底
            this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
            this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
            switch (error.errCode) {
                case -1:
                    console.log('已连接上，无需重新连接');
                    await super.stopBlueToothDevicesDiscovery();
                    return {isConnected: true};
                case 10000:
                case 10001:
                    this.latestConnectState = {value: CommonConnectState.UNAVAILABLE};
                    super.resetAllBLEFlag();
                    return await Promise.reject(error);
                case 10003:
                case 10012:
                    console.warn('连接不上', error);
                    console.warn('准备开始重新扫描连接');
                    await this.startBlueToothDevicesDiscovery();
                    return {isConnected: false, filter: true};
                case 10004:
                    await super.closeBLEConnection({deviceId});
                    return await this.createBLEConnection({deviceId});
                default:
                    console.warn('连接失败，重新连接', error);
                    return await this.createBLEConnection({deviceId});
            }
        } finally {
            // 全局兜底
            this._onConnectStateChanged = typeof this._onConnectStateChanged === 'function' ? this._onConnectStateChanged : () => {};
            this._onReceiveData = typeof this._onReceiveData === 'function' ? this._onReceiveData : () => {};
        }
    }

    async sendData({buffer}) {
        try {
            return await super.sendData({
            buffer,
            deviceId: this._deviceId,
            serviceId: this._serviceId,
            characteristicId: this._characteristicId
        });
        } catch (e) {
            console.error('[sendData] 发送数据异常', e, {buffer});
            throw e;
        }
    }

    async closeCurrentBLEConnection() {
        const {value} = this.latestConnectState;
        console.log('closeCurrentBLEConnection前，连接状态', value);
        // 优化：断开时关闭notify、解绑监听、清空设备信息
        try {
            if (this._serviceId && this._characteristicId) {
                try {
                    await super.notifyBLECharacteristicValueChange({
                        deviceId: this._deviceId,
                        serviceId: this._serviceId,
                        characteristicId: this._characteristicId,
                        state: false
                    });
                    console.log('已关闭notify监听');
                } catch (e) {
                    console.warn('关闭notify监听失败', e);
                }
            }
        } catch (e) {}
        if (typeof this._onBLEConnectionStateChangeListener === 'function') {
        this._onBLEConnectionStateChangeListener = null;
        }
        // 解绑所有全局事件监听
        wx.offBluetoothDeviceFound && wx.offBluetoothDeviceFound();
        wx.offBLEConnectionStateChange && wx.offBLEConnectionStateChange();
        wx.offBluetoothAdapterStateChange && wx.offBluetoothAdapterStateChange();
        // 清空设备信息
        this._deviceId = '';
        this._serviceId = '';
        this._characteristicId = '';
        this._latestConnectState = {value: CommonConnectState.UNAVAILABLE};
        this._latestProtocolObj = {protocolState: '', value: {}};
        switch (value) {
            case CommonConnectState.CONNECTED:
                return super.closeBLEConnection({deviceId: this._deviceId});
            case CommonConnectState.CONNECTING:
                return this.stopBlueToothDevicesDiscovery();
        }
        return Promise.resolve();
    }

    /**
     * 获取连接过的设备id
     * @returns {string|*}
     */
    getConnectedDeviceId() {
        if (!this._deviceId) {
            this._deviceId = getStorageSync('lb_ble_$deviceId') ?? '';
        }
        return this._deviceId;
    }

    async setDeviceId({deviceId}) {
        try {
            setStorageSync('lb_ble_$deviceId', this._deviceId = deviceId);
        } catch (e) {
            console.error('[setDeviceId] 存储设备ID异常', e, {deviceId});
            try {
            setStorageSync('lb_ble_$deviceId', this._deviceId = deviceId);
            console.log('setDeviceMacAddress()重新存储成功');
            } catch (ee) {
                console.error('[setDeviceId] 重新存储设备ID仍然失败', ee, {deviceId});
            }
        }
    }

    /**
     * 清除上一次连接的蓝牙设备
     * 这会导致断开目前连接的蓝牙设备
     * @returns {*|Promise<any>}
     */
    async clearConnectedBLE() {
        await this.closeCurrentBLEConnection();
        await super.closeAdapter();
        removeStorageSync('lb_ble_$deviceId');
        this._deviceId = '';
        this._serviceId = '';
        this._characteristicId = '';
        return Promise.resolve();
    }
}
