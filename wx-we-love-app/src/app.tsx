import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { fetchUserInfo, clearUserData } from './store/global'
import './app.scss'

function App(props) {
  useEffect(() => {
    checkAuth()
    Taro.onAppShow(() => {
      checkAuth()
    })
  }, [])

  const checkAuth = async () => {
    const token = Taro.getStorageSync('token')
    const currentPages = Taro.getCurrentPages()
    const currentRoute = currentPages[currentPages.length - 1]?.route

    if (!token) {
      if (currentRoute !== 'pages/login/index' && currentRoute !== 'pages/match/index') {
        Taro.redirectTo({ url: '/pages/login/index' })
      }
      return
    }

    try {
      const data = await fetchUserInfo()
      if (data) {
        if (data.isMatched) {
          if (currentRoute === 'pages/login/index' || currentRoute === 'pages/match/index') {
            Taro.switchTab({ url: '/pages/index/index' })
          }
        } else {
          if (currentRoute !== 'pages/match/index' && !currentRoute?.includes('login')) {
            const tabBarPages = ['pages/index/index', 'pages/moment/index', 'pages/my/index']
            if (!tabBarPages.includes(currentRoute)) {
              Taro.redirectTo({ url: '/pages/match/index' })
            }
          }
        }
      }
    } catch (error) {
      console.error('检查用户状态失败:', error)
      if (error.statusCode === 401 || error.statusCode === 404) {
        Taro.removeStorageSync('token')
        clearUserData()
        if (currentRoute !== 'pages/login/index') {
          Taro.redirectTo({ url: '/pages/login/index' })
        }
      } else if (error.message && (error.message.includes('未登录') || error.message.includes('Token无效'))) {
        Taro.removeStorageSync('token')
        clearUserData()
        if (currentRoute !== 'pages/login/index') {
          Taro.redirectTo({ url: '/pages/login/index' })
        }
      }
    }
  }

  return props.children
}

export default App

