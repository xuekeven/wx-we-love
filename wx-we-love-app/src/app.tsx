import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { get } from './utils/request'
import './app.scss'

function App(props) {
  useEffect(() => {
    // 检查登录状态
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = Taro.getStorageSync('token')
    const currentPages = Taro.getCurrentPages()
    const currentRoute = currentPages[currentPages.length - 1]?.route

    // 如果不在登录页面且没有token，跳转到登录页
    if (!token && currentRoute !== 'pages/login/index') {
      Taro.redirectTo({ url: '/pages/login/index' })
      return
    }

    // 如果有token，检查用户状态
    if (token) {
      try {
        const res = await get('/api/user/info')
        
        if (res && res.success && res.data) {
          // 如果未匹配且不在匹配页面，跳转到匹配页面
          if (!res.data.isMatched && currentRoute !== 'pages/match/index' && !currentRoute?.includes('login')) {
            // 排除tabBar页面，这些页面会自己处理
            const tabBarPages = ['pages/index/index', 'pages/moment/index', 'pages/my/index']
            if (!tabBarPages.includes(currentRoute)) {
              Taro.redirectTo({ url: '/pages/match/index' })
            }
          }
        } else {
          // token无效，清除并跳转登录
          Taro.removeStorageSync('token')
          if (currentRoute !== 'pages/login/index') {
            Taro.redirectTo({ url: '/pages/login/index' })
          }
        }
      } catch (error) {
        console.error('检查用户状态失败:', error)
        // 出错时清除token
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

