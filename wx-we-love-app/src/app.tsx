import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { fetchUserInfo, clearUserData, setPreviewMode } from './store/global'
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
      // 未登录时保留当前页面，由各页面展示浏览态；小程序默认从首页进入。
      setPreviewMode(true)
      return
    }

    try {
      setPreviewMode(false)
      const data = await fetchUserInfo()
      if (data) {
        if (data.isMatched) {
          if (currentRoute === 'pages/login/index' || currentRoute === 'pages/match/index') {
            Taro.switchTab({ url: '/pages/index/index' })
          }
        } else {
          if (currentRoute !== 'pages/match/index' && !currentRoute?.includes('login')) {
            const tabBarPages = ['pages/index/index', 'pages/moment/index', 'pages/my/index']
            if (currentRoute && !tabBarPages.includes(currentRoute)) {
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
        setPreviewMode(true)
        if (currentRoute !== 'pages/index/index') {
          Taro.switchTab({ url: '/pages/index/index' })
        }
      } else if (error.message && (error.message.includes('未登录') || error.message.includes('Token无效'))) {
        Taro.removeStorageSync('token')
        clearUserData()
        setPreviewMode(true)
        if (currentRoute !== 'pages/index/index') {
          Taro.switchTab({ url: '/pages/index/index' })
        }
      }
    }
  }

  return props.children
}

export default App
