import Toast from "../../view/toast";

Page({
  data: {
    isLoggingIn: false
  },

  handleLogin() {
    if (this.data.isLoggingIn) {
      return;
    }
    
    this.setData({ isLoggingIn: true });
    
    // 检查蓝牙权限
    this.checkBluetoothPermission()
      .then(() => {
        // 登录成功，跳转到蓝牙页面
        wx.navigateTo({
          url: '/pages/bluetooth/bluetooth'
        });
      })
      .catch((error) => {
        Toast.fail('登录失败: ' + error.message);
      })
      .finally(() => {
        this.setData({ isLoggingIn: false });
      });
  },

  // 检查蓝牙权限
  async checkBluetoothPermission() {
    return new Promise((resolve, reject) => {
      // 检查蓝牙适配器状态
      wx.getBluetoothAdapterState({
        success: (res) => {
          if (res.available) {
            resolve();
          } else {
            reject(new Error('蓝牙不可用，请检查蓝牙是否开启'));
          }
        },
        fail: (err) => {
          // 如果获取状态失败，尝试打开蓝牙适配器
          wx.openBluetoothAdapter({
            success: () => {
              resolve();
            },
            fail: (openErr) => {
              reject(new Error('无法打开蓝牙适配器，请检查权限设置'));
            }
          });
        }
      });
    });
  }
})