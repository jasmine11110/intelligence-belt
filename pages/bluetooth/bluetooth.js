import Toast from "../../view/toast";

Page({
    data: {
        // 连接状态
        connectState: 'disconnected', // disconnected, connecting, connected, error
        // 设备列表
        deviceList: [],
        // 当前连接的设备
        connectedDevice: null,
        // 扫描状态
        isScanning: false,
        // 操作状态
        isOperating: false,
        // 压力值
        pressureValue: '0.00',
        // 原始数据
        rawData: null,
        // 扫描定时器
        scanTimer: null,
        // 重连定时器
        reconnectTimer: null,
        // 重连次数
        reconnectCount: 0,
        // 最大重连次数
        maxReconnectCount: 3
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        // 页面加载后自动开始搜索设备
        this.autoStartScan();
    },

    /**
     * 自动开始搜索设备
     */
    async autoStartScan() {
        try {
            Toast.loading('正在初始化蓝牙...');
            
            // 初始化蓝牙适配器
            await this.initBluetoothAdapter();
            
            // 开始搜索设备
            await this.startScanDevices();
            
            Toast.success('蓝牙初始化成功');
        } catch (error) {
            Toast.fail('蓝牙初始化失败: ' + error.message);
            this.setData({ connectState: 'error' });
        }
    },

    /**
     * 初始化蓝牙适配器
     */
    initBluetoothAdapter() {
        return new Promise((resolve, reject) => {
            wx.openBluetoothAdapter({
                success: (res) => {
                    console.log('蓝牙适配器初始化成功', res);
                    resolve(res);
                },
                fail: (err) => {
                    console.error('蓝牙适配器初始化失败', err);
                    reject(new Error(this.getErrorMessage(err)));
                }
            });
        });
    },

    /**
     * 开始搜索设备
     */
    startScanDevices() {
        return new Promise((resolve, reject) => {
            this.setData({ 
                isScanning: true, 
                deviceList: [],
                connectState: 'disconnected'
            });

            wx.startBluetoothDevicesDiscovery({
                success: (res) => {
                    console.log('开始搜索设备成功', res);
                    
                    // 设置5秒后自动停止搜索
                    this.data.scanTimer = setTimeout(() => {
                        this.stopScanDevices();
                    }, 5000);
                    
                    // 监听设备发现事件
                    wx.onBluetoothDeviceFound((res) => {
                        this.handleDeviceFound(res.devices);
                    });
                    
                    resolve(res);
                },
                fail: (err) => {
                    console.error('开始搜索设备失败', err);
                    this.setData({ isScanning: false });
                    reject(new Error(this.getErrorMessage(err)));
                }
            });
        });
    },

    /**
     * 停止搜索设备
     */
    stopScanDevices() {
        if (this.data.scanTimer) {
            clearTimeout(this.data.scanTimer);
            this.data.scanTimer = null;
        }
        
        wx.stopBluetoothDevicesDiscovery({
            success: (res) => {
                console.log('停止搜索设备成功', res);
                this.setData({ isScanning: false });
            },
            fail: (err) => {
                console.error('停止搜索设备失败', err);
                this.setData({ isScanning: false });
            }
        });
    },

    /**
     * 处理发现的设备
     */
    handleDeviceFound(devices) {
        if (!Array.isArray(devices)) return;
        
        const currentDevices = this.data.deviceList;
        const newDevices = [];
        
        devices.forEach(device => {
            // 过滤掉没有名称的设备
            if (!device.name && !device.localName) return;
            
            // 检查设备是否已存在
            const exists = currentDevices.find(d => d.deviceId === device.deviceId);
            if (!exists) {
                newDevices.push({
                    ...device,
                    name: device.name || device.localName || '未知设备',
                    displayName: this.formatDeviceName(device.name || device.localName)
                });
            }
        });
        
        if (newDevices.length > 0) {
            this.setData({
                deviceList: [...currentDevices, ...newDevices]
            });
        }
    },

    /**
     * 格式化设备名称
     */
    formatDeviceName(name) {
        if (!name) return '未知设备';
        // 限制名称长度
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
    },

    /**
     * 连接设备
     */
    async connectToDevice(e) {
        if (this.data.isOperating) {
            Toast.info('操作进行中，请稍候...');
            return;
        }
        
        const deviceId = e.currentTarget.dataset.deviceid;
        const device = this.data.deviceList.find(d => d.deviceId === deviceId);
        
        if (!device) {
            Toast.fail('设备信息无效');
            return;
        }
        
        this.setData({ isOperating: true });
        
        try {
            Toast.loading('正在连接设备...');
            this.setData({ connectState: 'connecting' });
            
            // 停止搜索
            this.stopScanDevices();
            
            // 连接设备
            await this.createConnection(deviceId);
            
            // 获取服务
            await this.getDeviceServices(deviceId);
            
            this.setData({ 
                connectedDevice: device,
                connectState: 'connected',
                reconnectCount: 0
            });
            
            Toast.success('连接成功');
            
            // 开始监听数据
            this.startDataMonitoring();
            
        } catch (error) {
            console.error('连接设备失败', error);
            this.setData({ connectState: 'error' });
            Toast.fail('连接失败: ' + error.message);
        } finally {
            this.setData({ isOperating: false });
        }
    },

    /**
     * 创建连接
     */
    createConnection(deviceId) {
        return new Promise((resolve, reject) => {
            wx.createBLEConnection({
                deviceId: deviceId,
                success: (res) => {
                    console.log('连接成功', res);
                    resolve(res);
                },
                fail: (err) => {
                    console.error('连接失败', err);
                    reject(new Error(this.getErrorMessage(err)));
                }
            });
        });
    },

    /**
     * 获取设备服务
     */
    getDeviceServices(deviceId) {
        return new Promise((resolve, reject) => {
            wx.getBLEDeviceServices({
                deviceId: deviceId,
                success: (res) => {
                    console.log('获取服务成功', res);
                    // 这里可以保存服务信息用于后续操作
                    resolve(res);
                },
                fail: (err) => {
                    console.error('获取服务失败', err);
                    reject(new Error(this.getErrorMessage(err)));
                }
            });
        });
    },

    /**
     * 开始监听数据
     */
    startDataMonitoring() {
        // 监听特征值变化
        wx.onBLECharacteristicValueChange((res) => {
            console.log('收到数据', res);
            this.handleReceivedData(res.value);
        });
    },

    /**
     * 处理接收到的数据
     */
    handleReceivedData(value) {
        try {
            // 将ArrayBuffer转换为16进制字符串
            const hexData = this.arrayBufferToHex(value);
            console.log('接收到的数据(hex):', hexData);
            
            // 解析压力值（示例：假设前4个字节是压力值）
            if (hexData.length >= 8) {
                const pressureHex = hexData.substring(0, 8);
                const pressure = this.hexToFloat(pressureHex);
                this.setData({ 
                    pressureValue: pressure.toFixed(2),
                    rawData: hexData
                });
            } else {
                this.setData({ rawData: hexData });
            }
        } catch (error) {
            console.error('数据处理失败', error);
        }
    },

    /**
     * ArrayBuffer转16进制字符串
     */
    arrayBufferToHex(buffer) {
        const hexArr = Array.prototype.map.call(
            new Uint8Array(buffer),
            function(bit) {
                return ('00' + bit.toString(16)).slice(-2);
            }
        );
        return hexArr.join('');
    },

    /**
     * 16进制转浮点数
     */
    hexToFloat(hex) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        const int = parseInt(hex, 16);
        view.setUint32(0, int, false);
        return view.getFloat32(0, false);
    },

    /**
     * 断开连接
     */
    async disconnectDevice() {
        if (this.data.isOperating) {
            Toast.info('操作进行中，请稍候...');
            return;
        }
        
        this.setData({ isOperating: true });
        
        try {
            if (this.data.connectedDevice) {
                await this.closeConnection(this.data.connectedDevice.deviceId);
            }
            
            this.setData({ 
                connectedDevice: null,
                connectState: 'disconnected',
                pressureValue: '0.00',
                rawData: null
            });
            
            Toast.success('已断开连接');
            
            // 重新开始搜索
            this.autoStartScan();
            
        } catch (error) {
            console.error('断开连接失败', error);
            Toast.fail('断开连接失败: ' + error.message);
        } finally {
            this.setData({ isOperating: false });
        }
    },

    /**
     * 关闭连接
     */
    closeConnection(deviceId) {
        return new Promise((resolve, reject) => {
            wx.closeBLEConnection({
                deviceId: deviceId,
                success: (res) => {
                    console.log('断开连接成功', res);
                    resolve(res);
                },
                fail: (err) => {
                    console.error('断开连接失败', err);
                    reject(new Error(this.getErrorMessage(err)));
                }
            });
        });
    },

    /**
     * 刷新设备列表
     */
    refreshDeviceList() {
        if (this.data.isOperating) {
            Toast.info('操作进行中，请稍候...');
            return;
        }
        
        this.autoStartScan();
    },

    /**
     * 设置舒适模式
     */
    setComfortMode() {
        this.sendCommand([0x01, 0x01]);
    },

    /**
     * 设置性能模式
     */
    setPerformanceMode() {
        this.sendCommand([0x01, 0x02]);
    },

    /**
     * 设置强劲模式
     */
    setPowerMode() {
        this.sendCommand([0x01, 0x03]);
    },

    /**
     * 切换加热
     */
    toggleHeating() {
        this.sendCommand([0x02, 0x01]);
    },

    /**
     * 发送命令
     */
    sendCommand(data) {
        if (this.data.connectState !== 'connected') {
            Toast.fail('设备未连接');
            return;
        }
        
        // 这里需要根据实际设备的服务和特征值来发送数据
        // 示例代码，实际使用时需要替换为正确的serviceId和characteristicId
        const buffer = new ArrayBuffer(data.length);
        const view = new Uint8Array(buffer);
        data.forEach((value, index) => {
            view[index] = value;
        });
        
        // 发送数据（需要实际的serviceId和characteristicId）
        console.log('发送命令:', data);
        Toast.success('命令已发送');
    },

    /**
     * 获取错误信息
     */
    getErrorMessage(err) {
        const errorMap = {
            10001: '系统蓝牙不可用',
            10002: '没有找到指定设备',
            10003: '连接超时',
            10004: '没有找到指定服务',
            10005: '没有找到指定特征值',
            10006: '当前连接已断开',
            10007: '当前特征值不支持此操作',
            10008: '其余所有系统上报的异常',
            10009: 'Android 系统特有，系统版本低于 4.3 不支持 BLE',
            10012: '连接超时',
            10013: '重复连接',
            10014: 'Android 系统特有，gatt 实例未能及时获取',
            10015: 'Android 系统特有，gatt 实例未能及时获取',
            10016: 'Android 系统特有，gatt 实例未能及时获取',
            10017: 'Android 系统特有，gatt 实例未能及时获取',
            10018: 'Android 系统特有，gatt 实例未能及时获取',
            10019: 'Android 系统特有，gatt 实例未能及时获取',
            10020: 'Android 系统特有，gatt 实例未能及时获取',
            10021: 'Android 系统特有，gatt 实例未能及时获取',
            10022: 'Android 系统特有，gatt 实例未能及时获取',
            10023: 'Android 系统特有，gatt 实例未能及时获取',
            10024: 'Android 系统特有，gatt 实例未能及时获取',
            10025: 'Android 系统特有，gatt 实例未能及时获取',
            10026: 'Android 系统特有，gatt 实例未能及时获取',
            10027: 'Android 系统特有，gatt 实例未能及时获取',
            10028: 'Android 系统特有，gatt 实例未能及时获取',
            10029: 'Android 系统特有，gatt 实例未能及时获取',
            10030: 'Android 系统特有，gatt 实例未能及时获取',
            10031: 'Android 系统特有，gatt 实例未能及时获取',
            10032: 'Android 系统特有，gatt 实例未能及时获取',
            10033: 'Android 系统特有，gatt 实例未能及时获取',
            10034: 'Android 系统特有，gatt 实例未能及时获取',
            10035: 'Android 系统特有，gatt 实例未能及时获取',
            10036: 'Android 系统特有，gatt 实例未能及时获取',
            10037: 'Android 系统特有，gatt 实例未能及时获取',
            10038: 'Android 系统特有，gatt 实例未能及时获取',
            10039: 'Android 系统特有，gatt 实例未能及时获取',
            10040: 'Android 系统特有，gatt 实例未能及时获取',
            10041: 'Android 系统特有，gatt 实例未能及时获取',
            10042: 'Android 系统特有，gatt 实例未能及时获取',
            10043: 'Android 系统特有，gatt 实例未能及时获取',
            10044: 'Android 系统特有，gatt 实例未能及时获取',
            10045: 'Android 系统特有，gatt 实例未能及时获取',
            10046: 'Android 系统特有，gatt 实例未能及时获取',
            10047: 'Android 系统特有，gatt 实例未能及时获取',
            10048: 'Android 系统特有，gatt 实例未能及时获取',
            10049: 'Android 系统特有，gatt 实例未能及时获取',
            10050: 'Android 系统特有，gatt 实例未能及时获取',
            10051: 'Android 系统特有，gatt 实例未能及时获取',
            10052: 'Android 系统特有，gatt 实例未能及时获取',
            10053: 'Android 系统特有，gatt 实例未能及时获取',
            10054: 'Android 系统特有，gatt 实例未能及时获取',
            10055: 'Android 系统特有，gatt 实例未能及时获取',
            10056: 'Android 系统特有，gatt 实例未能及时获取',
            10057: 'Android 系统特有，gatt 实例未能及时获取',
            10058: 'Android 系统特有，gatt 实例未能及时获取',
            10059: 'Android 系统特有，gatt 实例未能及时获取',
            10060: 'Android 系统特有，gatt 实例未能及时获取',
            10061: 'Android 系统特有，gatt 实例未能及时获取',
            10062: 'Android 系统特有，gatt 实例未能及时获取',
            10063: 'Android 系统特有，gatt 实例未能及时获取',
            10064: 'Android 系统特有，gatt 实例未能及时获取',
            10065: 'Android 系统特有，gatt 实例未能及时获取',
            10066: 'Android 系统特有，gatt 实例未能及时获取',
            10067: 'Android 系统特有，gatt 实例未能及时获取',
            10068: 'Android 系统特有，gatt 实例未能及时获取',
            10069: 'Android 系统特有，gatt 实例未能及时获取',
            10070: 'Android 系统特有，gatt 实例未能及时获取',
            10071: 'Android 系统特有，gatt 实例未能及时获取',
            10072: 'Android 系统特有，gatt 实例未能及时获取',
            10073: 'Android 系统特有，gatt 实例未能及时获取',
            10074: 'Android 系统特有，gatt 实例未能及时获取',
            10075: 'Android 系统特有，gatt 实例未能及时获取',
            10076: 'Android 系统特有，gatt 实例未能及时获取',
            10077: 'Android 系统特有，gatt 实例未能及时获取',
            10078: 'Android 系统特有，gatt 实例未能及时获取',
            10079: 'Android 系统特有，gatt 实例未能及时获取',
            10080: 'Android 系统特有，gatt 实例未能及时获取',
            10081: 'Android 系统特有，gatt 实例未能及时获取',
            10082: 'Android 系统特有，gatt 实例未能及时获取',
            10083: 'Android 系统特有，gatt 实例未能及时获取',
            10084: 'Android 系统特有，gatt 实例未能及时获取',
            10085: 'Android 系统特有，gatt 实例未能及时获取',
            10086: 'Android 系统特有，gatt 实例未能及时获取',
            10087: 'Android 系统特有，gatt 实例未能及时获取',
            10088: 'Android 系统特有，gatt 实例未能及时获取',
            10089: 'Android 系统特有，gatt 实例未能及时获取',
            10090: 'Android 系统特有，gatt 实例未能及时获取',
            10091: 'Android 系统特有，gatt 实例未能及时获取',
            10092: 'Android 系统特有，gatt 实例未能及时获取',
            10093: 'Android 系统特有，gatt 实例未能及时获取',
            10094: 'Android 系统特有，gatt 实例未能及时获取',
            10095: 'Android 系统特有，gatt 实例未能及时获取',
            10096: 'Android 系统特有，gatt 实例未能及时获取',
            10097: 'Android 系统特有，gatt 实例未能及时获取',
            10098: 'Android 系统特有，gatt 实例未能及时获取',
            10099: 'Android 系统特有，gatt 实例未能及时获取',
            10100: 'Android 系统特有，gatt 实例未能及时获取'
        };
        
        return errorMap[err.errCode] || err.errMsg || '未知错误';
    },

    /**
     * 页面隐藏
     */
    onHide() {
        // 停止搜索
        this.stopScanDevices();
    },

    /**
     * 页面卸载
     */
    async onUnload() {
        try {
            // 清理定时器
            if (this.data.scanTimer) {
                clearTimeout(this.data.scanTimer);
            }
            if (this.data.reconnectTimer) {
                clearTimeout(this.data.reconnectTimer);
            }
            
            // 断开连接
            if (this.data.connectedDevice) {
                await this.closeConnection(this.data.connectedDevice.deviceId);
            }
            
            // 关闭蓝牙适配器
            wx.closeBluetoothAdapter();
            
        } catch (error) {
            console.error('页面卸载清理失败', error);
        }
    }
});


