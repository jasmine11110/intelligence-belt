import Toast from "../../view/toast";
import UI from './ui';
import {ConnectState} from "../../modules/bluetooth/lb-bluetooth-state-example";
import {getAppBLEProtocol} from "../../modules/bluetooth/lb-example-bluetooth-protocol";
import {getAppBLEManager} from "../../modules/bluetooth/lb-example-bluetooth-manager";

const app = getApp();
Page({

    /**
     * 页面的初始数据
     */
    data: {
        connectState: ConnectState.UNAVAILABLE,
        deviceList: [],
        assistantX: 0, // 初始x坐标设置为最左边
        assistantY: 500  // 初始y坐标（可根据屏幕高度调整）
    },

    onShow() {
        this.startBluetoothDevicesDiscovery();
    },

    startBluetoothDevicesDiscovery() {
        const that = this;
        wx.startBluetoothDevicesDiscovery({
            success(res) {
                wx.onBluetoothDeviceFound(function(devices) {
                    if (!devices.devices[0]) return;
                    const device = devices.devices[0];
                    const deviceList = that.data.deviceList;
                    const index = deviceList.findIndex(item => item.deviceId === device.deviceId);
                    if (index >= 0) {
                        deviceList[index] = device;
                    } else {
                        deviceList.push(device);
                    }
                    that.setData({ deviceList });
                });
            }
        });
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        this.ui = new UI(this);
        //监听蓝牙连接状态、订阅蓝牙协议接收事件
        //多次订阅只会在最新订阅的函数中生效。
        //建议在app.js中订阅，以实现全局的事件通知
        getAppBLEManager.setBLEListener({
            onConnectStateChanged: async (res) => {
                const {connectState} = res;
                console.log('蓝牙连接状态更新', res);
                this.ui.setState({state: connectState});
                switch (connectState) {
                    case ConnectState.CONNECTED:
                        //在连接成功后，紧接着设置灯光颜色和亮度
                        //发送协议，官方提醒并行调用多次会存在写失败的可能性，所以建议使用串行方式来发送
                        await getAppBLEProtocol.setColorLightAndBrightness({
                            brightness: 100,
                            red: 255,
                            green: 0,
                            blue: 0
                        });

                        break;
                    default:

                        break;
                }

            },

            /**
             * 接收到的蓝牙设备传给手机的有效数据，只包含你最关心的那一部分
             * protocolState和value具体的内容是在lb-example-bluetooth-protocol.js中定义的
             *
             * @param protocolState 蓝牙协议状态值，string类型，值是固定的几种，详情示例见：
             * @param value 传递的数据，对应lb-example-bluetooth-protocol.js中的{effectiveData}字段
             */
            onReceiveData: ({protocolState, value}) => {
                console.log('蓝牙协议接收到新的 protocolState:', protocolState, 'value:', value);
            }
        });

        //这里执行连接后，程序会按照你指定的规则（位于getAppBLEManager中的setFilter中指定的），自动连接到距离手机最近的蓝牙设备
        getAppBLEManager.connect();
    },

    /**
     * 断开连接
     * @param e
     * @returns {Promise<void>}
     */
    async disconnectDevice(e) {
        // closeAll() 会断开蓝牙连接、关闭适配器
        await getAppBLEManager.closeAll();
        this.setData({
            device: {}
        });
        setTimeout(Toast.success, 0, '已断开连接');
    },

    /**
     * 连接到最近的设备
     */
    connectHiBreathDevice() {
        getAppBLEManager.connect();
    },

    /**
     * 小助手按钮点击事件
     */
    onAssistantTap() {
        // 跳转到AI对话页面
        wx.navigateTo({
            url: '/pages/aichat/aichat'
        });
    },

    /**
     * 打开AI对话
     */
    openAIChat() {
        // 这里可以调用官方AI接口
        wx.showLoading({
            title: '正在连接AI...'
        });
        
        // 模拟AI对话功能
        setTimeout(() => {
            wx.hideLoading();
            wx.showModal({
                title: 'AI助手',
                content: '您好！我是您的AI助手，有什么可以帮助您的吗？',
                showCancel: true,
                cancelText: '关闭',
                confirmText: '开始对话',
                success: (res) => {
                    if (res.confirm) {
                        this.startAIConversation();
                    }
                }
            });
        }, 1000);
    },

    /**
     * 开始AI对话
     */
    startAIConversation() {
        wx.showModal({
            title: 'AI对话',
            content: '请输入您的问题：',
            editable: true,
            placeholderText: '例如：如何连接蓝牙设备？',
            success: (res) => {
                if (res.confirm && res.content) {
                    this.handleAIQuestion(res.content);
                }
            }
        });
    },

    /**
     * 处理AI问题
     */
    handleAIQuestion(question) {
        wx.showLoading({
            title: 'AI思考中...'
        });
        
        // 模拟AI回答
        setTimeout(() => {
            wx.hideLoading();
            let answer = '抱歉，我暂时无法回答这个问题。';
            
            if (question.includes('蓝牙') || question.includes('连接')) {
                answer = '蓝牙连接方法：1. 确保设备已开启蓝牙 2. 点击"连接蓝牙设备"按钮 3. 等待连接成功';
            } else if (question.includes('断开') || question.includes('关闭')) {
                answer = '断开连接：点击"断开连接"按钮即可断开当前蓝牙设备';
            } else if (question.includes('模式') || question.includes('舒适')) {
                answer = '设备支持三种模式：舒适、性能、强劲，点击对应按钮即可切换';
            }
            
            wx.showModal({
                title: 'AI回答',
                content: answer,
                showCancel: true,
                cancelText: '关闭',
                confirmText: '继续对话',
                success: (res) => {
                    if (res.confirm) {
                        this.startAIConversation();
                    }
                }
            });
        }, 1500);
    },

    /**
     * 小助手按钮拖动事件
     */
    onAssistantDrag(e) {
        const { x, y, source } = e.detail;
        // 实时吸附到边界，确保不会停在中间
        if (source === 'touch') {
            this.adsorbToEdge(x, y);
        } else if (source === 'friction' || source === 'out-of-bounds' || source === 'touch-out-of-bounds') {
            // 拖动结束
            this.adsorbToEdge(x, y);
        }
    },

    /**
     * 吸附到最近边缘
     */
    adsorbToEdge(x, y) {
        wx.getSystemInfo({
            success: (res) => {
                const screenWidth = res.windowWidth;
                const btnSize = 100 / 750 * screenWidth; // 100rpx转px
                // 自动吸附到最近的左右边界
                const left = x;
                const right = screenWidth - x - btnSize;
                let newX = x;
                if (left < right) newX = 0;
                else newX = screenWidth - btnSize;
                this.setData({
                    assistantX: newX,
                    assistantY: y // 保持y不变
                });
            }
        });
    },

    async onUnload() {
        await getAppBLEManager.closeAll();
    },
});


