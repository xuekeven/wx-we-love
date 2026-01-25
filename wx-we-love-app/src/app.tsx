import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { get } from './utils/request'
import './app.scss'

function App(props) {
  useEffect(() => {
    // 检查登录状态
    checkAuth()

    // 监听小程序显示事件（包括从后台进入前台、重新打开等）
    Taro.onAppShow(() => {
      checkAuth()
    })
  }, [])

  const checkAuth = async () => {
    const token = Taro.getStorageSync('token')
    const currentPages = Taro.getCurrentPages()
    const currentRoute = currentPages[currentPages.length - 1]?.route

    // 如果不在登录页面且没有token，跳转到登录页
    if (!token) {
      // 排除登录页面和匹配页面（匹配页面可能也需要token，但先允许访问）
      if (currentRoute !== 'pages/login/index' && currentRoute !== 'pages/match/index') {
        Taro.redirectTo({ url: '/pages/login/index' })
      }
      return
    }

    // 如果有token，检查用户状态
    try {
      const res = await get('/api/user/info')
      
      if (res && res.success && res.data) {
        // 如果已匹配，确保不在登录页或匹配页
        if (res.data.isMatched) {
          if (currentRoute === 'pages/login/index' || currentRoute === 'pages/match/index') {
            Taro.switchTab({ url: '/pages/index/index' })
          }
        } else {
          // 如果未匹配且不在匹配页面，跳转到匹配页面
          if (currentRoute !== 'pages/match/index' && !currentRoute?.includes('login')) {
            // 排除tabBar页面，这些页面会自己处理
            const tabBarPages = ['pages/index/index', 'pages/moment/index', 'pages/my/index']
            if (!tabBarPages.includes(currentRoute)) {
              Taro.redirectTo({ url: '/pages/match/index' })
            }
          }
        }
      } else {
        // token无效（401或404），清除并跳转登录
        // 只有明确的认证失败才清除token，网络错误不清除
        if (res && (res.statusCode === 401 || res.statusCode === 404)) {
          Taro.removeStorageSync('token')
          if (currentRoute !== 'pages/login/index') {
            Taro.redirectTo({ url: '/pages/login/index' })
          }
        }
      }
    } catch (error) {
      console.error('检查用户状态失败:', error)
      // 网络错误不清除token，可能是临时网络问题
      // 只有明确的认证错误（401/404）才清除token
      if (error.statusCode === 401 || error.statusCode === 404) {
        Taro.removeStorageSync('token')
        if (currentRoute !== 'pages/login/index') {
          Taro.redirectTo({ url: '/pages/login/index' })
        }
      } else if (error.message && (error.message.includes('未登录') || error.message.includes('Token无效'))) {
        // 如果错误消息明确表示认证失败，也清除token
        Taro.removeStorageSync('token')
        if (currentRoute !== 'pages/login/index') {
          Taro.redirectTo({ url: '/pages/login/index' })
        }
      }
    }
  }

  return props.children
}

export default App

