import Taro from '@tarojs/taro'
import config from '../config'

// API地址配置
const API_BASE_URL = config.apiBaseUrl

// RequestOptions: { url, method?, data?, header? }

export const request = async (options) => {
  const { url, method = 'GET', data, header = {} } = options

  try {
    const token = Taro.getStorageSync('token')
    
    const res = await Taro.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...header
      }
    })

    if (res.statusCode === 200) {
      return res.data
    } else {
      Taro.showToast({
        title: res.data.message || '请求失败',
        icon: 'none'
      })
      throw new Error(res.data.message || '请求失败')
    }
  } catch (error) {
    Taro.showToast({
      title: '网络错误',
      icon: 'none'
    })
    throw error
  }
}

export const get = (url, data = {}) => {
  return request({ url, method: 'GET', data })
}

export const post = (url, data = {}) => {
  return request({ url, method: 'POST', data })
}

export const put = (url, data = {}) => {
  return request({ url, method: 'PUT', data })
}

export const del = (url, data = {}) => {
  return request({ url, method: 'DELETE', data })
}

