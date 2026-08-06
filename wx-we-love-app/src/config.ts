interface AppConfig {
  apiBaseUrl: string
}

const productionBaseUrl = 'https://www.kaitool.top/welove'
const configuredBaseUrl = process.env.TARO_APP_API_BASE_URL?.trim()
const apiBaseUrl = (configuredBaseUrl || productionBaseUrl).replace(/\/$/, '')

if (!/^https:\/\//i.test(apiBaseUrl) && process.env.NODE_ENV === 'production') {
  throw new Error('TARO_APP_API_BASE_URL must use HTTPS in production')
}

const config: AppConfig = { apiBaseUrl }

export default config
