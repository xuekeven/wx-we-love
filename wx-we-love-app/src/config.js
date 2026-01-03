// 环境配置
const ENV = 'development' // 'development' | 'production'

const config = {
  development: {
    apiBaseUrl: 'http://localhost:4000'
  },
  production: {
    apiBaseUrl: 'http://39.102.122.22:4000'
  }
}

export default config[ENV]

