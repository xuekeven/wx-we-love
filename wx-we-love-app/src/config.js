// 环境配置
const ENV = 'development' // 'development' | 'production'

// ⚠️ 重要：微信小程序无法访问 localhost，必须使用本机IP地址
// 获取本机IP：
//   macOS/Linux: ifconfig | grep "inet " | grep -v 127.0.0.1
//   Windows: ipconfig (查找 IPv4 地址)
// 通常是 192.168.x.x 或 10.x.x.x
// 
// 如果使用微信开发者工具的模拟器，可以尝试使用 localhost
// 如果使用真机调试，必须使用本机IP地址
const LOCAL_IP = '192.168.3.11' // ⚠️ 请修改为你的本机IP地址（不要包含http://）

const config = {
  development: {
    // 开发环境：微信小程序使用本机IP，H5使用localhost
    apiBaseUrl: typeof window === 'undefined' && process.env.TARO_ENV === 'weapp'
      ? `http://${LOCAL_IP}:4000`  // 微信小程序：使用IP地址
      : 'http://localhost:4000'     // H5：使用localhost
  },
  production: {
    apiBaseUrl: 'http://39.102.122.22:4000'
  }
}

// 开发环境提示
if (ENV === 'development' && config.development.apiBaseUrl.includes('192.168')) {
  console.log('🌐 API地址:', config.development.apiBaseUrl)
  console.log('💡 提示：如果无法连接，请检查：')
  console.log('   1. 后端服务是否启动 (npm run dev)')
  console.log('   2. LOCAL_IP 是否正确 (src/config.js)')
  console.log('   3. 手机和电脑是否在同一WiFi')
}

export default config[ENV]

