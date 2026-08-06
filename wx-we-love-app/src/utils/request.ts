import Taro from '@tarojs/taro'
import config from '../config'

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type RequestData = Record<string, unknown> | unknown[] | string | number | boolean | null

export interface RequestOptions<TBody extends RequestData = Record<string, unknown>> {
  url: string
  method?: HttpMethod
  data?: TBody
  header?: Record<string, string>
  token?: string
}

export class ApiError<T = unknown> extends Error {
  statusCode: number
  data?: ApiResponse<T>

  constructor(message: string, statusCode: number, data?: ApiResponse<T>) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.data = data
  }
}

interface NetworkError {
  errMsg?: string
}

function networkMessage(error: NetworkError): string {
  const detail = error.errMsg || ''
  if (detail.includes('timeout')) return '请求超时，请稍后重试'
  if (detail.includes('fail') || detail.includes('ERR_EMPTY_RESPONSE')) {
    return config.apiBaseUrl.includes('localhost')
      ? '无法连接服务器，请确认服务已启动并使用本机局域网地址'
      : '无法连接服务器，请检查网络和服务地址'
  }
  return '网络错误，请稍后重试'
}

export async function request<T = unknown, TBody extends RequestData = Record<string, unknown>>(
  options: RequestOptions<TBody>
): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data, header = {}, token: tokenOverride } = options
  const token = tokenOverride !== undefined ? tokenOverride : Taro.getStorageSync<string>('token')

  try {
    const response = await Taro.request<ApiResponse<T>>({
      url: `${config.apiBaseUrl}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...header
      },
      timeout: 10000
    })

    if (response.statusCode >= 200 && response.statusCode < 300) return response.data
    throw new ApiError(response.data?.message || '请求失败', response.statusCode, response.data)
  } catch (error) {
    if (error instanceof ApiError) throw error
    const message = networkMessage(error as NetworkError)
    if (process.env.NODE_ENV === 'development') {
      console.error('请求失败:', `${config.apiBaseUrl}${url}`, error)
    }
    Taro.showToast({ title: message, icon: 'none', duration: 2500 })
    throw error
  }
}

export const get = <T = any>(url: string, data: Record<string, unknown> = {}, options: Partial<RequestOptions> = {}) =>
  request<T>({ url, method: 'GET', data, ...options })

export const post = <T = any>(url: string, data: Record<string, unknown> = {}, options: Partial<RequestOptions> = {}) =>
  request<T>({ url, method: 'POST', data, ...options })

export const put = <T = any>(url: string, data: Record<string, unknown> = {}) =>
  request<T>({ url, method: 'PUT', data })

export const del = <T = any>(url: string, data: Record<string, unknown> = {}) =>
  request<T>({ url, method: 'DELETE', data })
