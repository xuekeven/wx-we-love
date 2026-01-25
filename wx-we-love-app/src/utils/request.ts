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
      },
      timeout: 10000 // 10秒超时
    })

    if (res.statusCode === 200) {
      return res.data
    } else {
      const errorMsg = res.data?.message || '请求失败'
      const error = new Error(errorMsg)
      // 添加statusCode到错误对象，方便调用方判断
      error.statusCode = res.statusCode
      error.data = res.data
      // 401和404不显示toast，由调用方处理
      if (res.statusCode !== 401 && res.statusCode !== 404) {
        Taro.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        })
      }
      throw error
    }
  } catch (error) {
    console.error('请求错误:', error)
    console.error('请求URL:', `${API_BASE_URL}${url}`)
    
    // 根据错误类型显示不同的提示
    let errorMsg = '网络错误'
    
    if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        errorMsg = '请求超时，请稍后重试'
      } else if (error.errMsg.includes('ERR_EMPTY_RESPONSE') || error.errMsg.includes('fail')) {
        // 检查是否是localhost问题
        if (API_BASE_URL.includes('localhost')) {
          errorMsg = '无法连接服务器\n请检查：\n1. 后端服务是否启动\n2. 是否使用本机IP地址（微信小程序无法访问localhost）'
        } else {
          errorMsg = '无法连接服务器\n请检查：\n1. 后端服务是否启动\n2. API地址是否正确\n3. 网络连接是否正常'
        }
      } else if (error.errMsg.includes('404')) {
        errorMsg = '接口不存在，请检查API地址'
      } else if (error.errMsg.includes('500')) {
        errorMsg = '服务器错误，请稍后重试'
      } else {
        errorMsg = `网络错误：${error.errMsg}`
      }
    }
    
    // 显示详细错误信息（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.error('API地址:', API_BASE_URL)
      console.error('完整URL:', `${API_BASE_URL}${url}`)
    }
    
    Taro.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 3000
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

