interface AppConfig {
  apiBaseUrl: string
}

declare const API_BASE_URL: string

const apiBaseUrl = API_BASE_URL.replace(/\/$/, '')

const config: AppConfig = { apiBaseUrl }

export default config
