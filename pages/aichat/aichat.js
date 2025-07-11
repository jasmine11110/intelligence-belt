Page({
    data: {
        messages: [],
        inputValue: '',
        isLoading: false,
        scrollTop: 0
    },

    onLoad() {
        // 添加欢迎消息
        this.addMessage({
            type: 'ai',
            content: '您好！我是您的AI助手，有什么可以帮助您的吗？',
            timestamp: new Date().getTime()
        });
    },

    // 输入框内容变化
    onInputChange(e) {
        this.setData({
            inputValue: e.detail.value
        });
    },

    // 发送消息
    sendMessage() {
        const { inputValue, messages } = this.data;
        if (!inputValue.trim()) return;

        // 添加用户消息
        this.addMessage({
            type: 'user',
            content: inputValue,
            timestamp: new Date().getTime()
        });

        // 清空输入框
        this.setData({
            inputValue: '',
            isLoading: true
        });

        // 调用OfficeAI API
        this.callOfficeAI(inputValue);
    },

    // 调用OfficeAI API
    callOfficeAI(question) {
        // 根据问题内容进行智能回答
        this.setData({
            isLoading: true
        });

        setTimeout(() => {
            const answer = this.getSmartAnswer(question);
            this.addMessage({
                type: 'ai',
                content: answer,
                timestamp: new Date().getTime()
            });
            this.setData({
                isLoading: false
            });
        }, 1000);
    },

    // 根据问题获取智能回答
    getSmartAnswer(question) {
        const lowerQuestion = question.toLowerCase();
        
        // 蓝牙相关问题
        if (lowerQuestion.includes('蓝牙') || lowerQuestion.includes('连接') || lowerQuestion.includes('设备')) {
            if (lowerQuestion.includes('怎么') || lowerQuestion.includes('如何') || lowerQuestion.includes('方法')) {
                return '蓝牙连接方法：\n1. 确保手机蓝牙已开启\n2. 点击"连接蓝牙设备"按钮\n3. 等待自动连接成功\n4. 连接状态会显示在页面上';
            } else if (lowerQuestion.includes('断开') || lowerQuestion.includes('关闭')) {
                return '断开蓝牙连接：\n点击"断开连接"按钮即可断开当前蓝牙设备';
            } else if (lowerQuestion.includes('状态') || lowerQuestion.includes('连接状态')) {
                return '蓝牙连接状态说明：\n• 未连接：设备未连接\n• 连接中：正在尝试连接\n• 已连接：设备连接成功\n• 不可用：蓝牙功能不可用';
            } else {
                return '关于蓝牙连接，您可以：\n• 点击"连接蓝牙设备"进行连接\n• 点击"断开连接"断开设备\n• 查看页面上的连接状态';
            }
        }
        
        // 设备模式相关问题
        else if (lowerQuestion.includes('模式') || lowerQuestion.includes('舒适') || lowerQuestion.includes('性能') || lowerQuestion.includes('强劲')) {
            if (lowerQuestion.includes('舒适')) {
                return '舒适模式：\n适合日常使用，提供温和的按摩体验，适合长时间使用。';
            } else if (lowerQuestion.includes('性能')) {
                return '性能模式：\n提供中等强度的按摩效果，平衡舒适度和效果。';
            } else if (lowerQuestion.includes('强劲')) {
                return '强劲模式：\n提供最强按摩效果，适合需要深度放松的用户。';
            } else {
                return '设备支持三种模式：\n• 舒适模式：温和按摩\n• 性能模式：中等强度\n• 强劲模式：最强效果\n点击对应按钮即可切换模式';
            }
        }
        
        // 加热功能相关问题
        else if (lowerQuestion.includes('加热') || lowerQuestion.includes('温度')) {
            return '加热功能：\n• 点击"加热"按钮开启加热功能\n• 加热功能可以缓解肌肉疲劳\n• 建议配合按摩模式使用效果更佳';
        }
        
        // 压力值相关问题
        else if (lowerQuestion.includes('压力') || lowerQuestion.includes('压力值')) {
            return '压力值说明：\n• 实时显示设备检测到的压力数据\n• 单位为Kpa（千帕）\n• 帮助您了解按摩强度\n• 可根据压力值调整使用方式';
        }
        
        // 设备使用相关问题
        else if (lowerQuestion.includes('使用') || lowerQuestion.includes('操作') || lowerQuestion.includes('怎么用')) {
            return '设备使用指南：\n1. 连接蓝牙设备\n2. 选择按摩模式（舒适/性能/强劲）\n3. 可选择开启加热功能\n4. 观察压力值了解使用效果\n5. 使用完毕后断开连接';
        }
        
        // 故障排除相关问题
        else if (lowerQuestion.includes('问题') || lowerQuestion.includes('故障') || lowerQuestion.includes('不工作') || lowerQuestion.includes('连不上')) {
            return '常见问题解决：\n• 连接失败：检查蓝牙是否开启，设备是否在范围内\n• 无法控制：确认设备已连接，尝试重新连接\n• 无反应：检查设备电量，重启设备\n• 其他问题：请联系客服';
        }
        
        // 设备信息相关问题
        else if (lowerQuestion.includes('设备') || lowerQuestion.includes('产品') || lowerQuestion.includes('什么')) {
            return '设备信息：\n• 智能按摩设备\n• 支持蓝牙连接\n• 三种按摩模式\n• 加热功能\n• 压力检测功能\n• 适用于缓解疲劳和放松肌肉';
        }
        
        // 通用问候
        else if (lowerQuestion.includes('你好') || lowerQuestion.includes('hi') || lowerQuestion.includes('hello')) {
            return '您好！我是您的智能按摩设备助手，可以帮您解答关于设备使用、蓝牙连接、按摩模式等问题。请问有什么可以帮助您的吗？';
        }
        
        // 感谢
        else if (lowerQuestion.includes('谢谢') || lowerQuestion.includes('感谢')) {
            return '不客气！如果您在使用过程中遇到任何问题，随时可以询问我。祝您使用愉快！';
        }
        
        // 默认回答
        else {
            return '抱歉，我可能没有理解您的问题。您可以询问：\n• 如何连接蓝牙设备\n• 如何使用按摩模式\n• 设备功能介绍\n• 故障排除方法\n请问您需要了解哪方面的信息？';
        }
    },

    // 处理API错误
    handleAPIError(errorMsg) {
        this.addMessage({
            type: 'ai',
            content: `抱歉，AI服务暂时不可用：${errorMsg}`,
            timestamp: new Date().getTime()
        });
    },

    // 添加消息到列表
    addMessage(message) {
        const { messages } = this.data;
        messages.push(message);
        this.setData({
            messages: messages
        }, () => {
            // 滚动到底部
            this.scrollToBottom();
        });
    },

    // 滚动到底部
    scrollToBottom() {
        const query = wx.createSelectorQuery();
        query.select('.chat-container').boundingClientRect();
        query.exec((res) => {
            if (res[0]) {
                this.setData({
                    scrollTop: res[0].height
                });
            }
        });
    },

    // 返回上一页
    goBack() {
        wx.navigateBack();
    }
}); 