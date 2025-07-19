export default class Toast {

    static success(title, duration) {
        wx.showToast({
            title: title,
            icon: 'success',
            duration: !!duration ? duration : 2000,
        })
    }

    static warn(title, duration) {
        wx.showToast({
            title: title,
            duration: !!duration ? duration : 2000,
            image: '/images/loading_fail.png'
        })
    }

    static showLoading(text) {
        wx.showLoading({
            title: text || '请稍后...',
            mask: true
        })
    }

    static hiddenLoading() {
        wx.hideLoading();
    }

    static hiddenToast() {
        wx.hideToast();
    }

    // 新增：loading方法兼容
    static loading(title, duration) {
        wx.showToast({
            title: title || '加载中...',
            icon: 'loading',
            duration: !!duration ? duration : 2000,
            mask: true
        });
    }

    // 新增：fail方法
    static fail(title, duration) {
        wx.showToast({
            title: title || '操作失败',
            icon: 'none',
            duration: !!duration ? duration : 2000
        });
    }

    // 新增：info方法
    static info(title, duration) {
        wx.showToast({
            title: title || '提示',
            icon: 'none',
            duration: !!duration ? duration : 2000
        });
    }
}
