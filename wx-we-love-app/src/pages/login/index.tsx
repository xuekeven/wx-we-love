import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { post, get } from '../../utils/request'
import './index.scss'

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)

  // 检查是否已登录且已匹配
  useEffect(() => {
    checkLoginStatus()
  }, [])

  const checkLoginStatus = async () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      return // 没有token，停留在登录页
    }

    try {
      const res = await get('/api/user/info')
      if (res && res.success && res.data) {
        // 如果已匹配，直接跳转到首页
        if (res.data.isMatched) {
          Taro.switchTab({ url: '/pages/index/index' })
        } else {
          // 如果未匹配，跳转到匹配页
          Taro.redirectTo({ url: '/pages/match/index' })
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
      // 如果token无效，清除token，停留在登录页
      if (error.statusCode === 401 || error.statusCode === 404) {
        Taro.removeStorageSync('token')
      }
    }
  }

  // 微信授权登录
  const handleWechatLogin = () => {
    // 注意：getUserProfile 必须在用户点击事件的同步上下文中直接调用
    // 不能先调用异步函数再调用 getUserProfile
    
    // 1. 先获取用户信息（必须在用户点击时同步调用）
    Taro.getUserProfile({
      desc: '用于完善用户资料',
      success: async (profileRes) => {
        setIsLoading(true)
        
        try {
          const userInfo = profileRes.userInfo

          // 2. 获取微信登录 code
          const loginRes = await Taro.login()
          if (!loginRes.code) {
            Taro.showToast({
              title: '获取登录凭证失败',
              icon: 'none'
            })
            setIsLoading(false)
            return
          }

          // 3. 调用登录接口，传递 code 和用户信息
          const res = await post('/api/user/login', {
            code: loginRes.code,
            nickname: userInfo.nickName,
            avatar: userInfo.avatarUrl
          })

          if (res && res.success && res.data) {
            // 保存token和用户信息
            Taro.setStorageSync('token', res.data.token)
            Taro.setStorageSync('userInfo', res.data.user)

            Taro.showToast({
              title: '登录成功',
              icon: 'success',
              duration: 1500
            })

            setTimeout(() => {
              // 检查是否已匹配
              if (res.data.user.isMatched) {
                // 已匹配，跳转到首页
                Taro.switchTab({ url: '/pages/index/index' })
              } else {
                // 未匹配，跳转到匹配页面
                Taro.redirectTo({ url: '/pages/match/index' })
              }
            }, 1500)
          } else {
            Taro.showToast({
              title: res?.message || '登录失败',
              icon: 'none'
            })
            setIsLoading(false)
          }
        } catch (error) {
          console.error('登录失败:', error)
          Taro.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          })
          setIsLoading(false)
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err)
        Taro.showToast({
          title: '需要授权才能登录',
          icon: 'none',
          duration: 2000
        })
        setIsLoading(false)
      }
    })
  }

  return (
    <View className='login-page'>
      <View className='login-container'>
        <View className='login-header'>
          <Text className='login-title'>💕 欢迎来到恋爱空间</Text>
          <Text className='login-subtitle'>记录你们的美好时光</Text>
        </View>

        <View className='login-content'>

          <View className='login-desc'>
            <Text className='desc-text'>使用微信账号登录</Text>
            <Text className='desc-tip'>登录后将使用您的微信昵称和头像</Text>
          </View>

          <Button
            className='wechat-login-btn'
            onClick={handleWechatLogin}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '微信授权登录'}
          </Button>

        </View>
      </View>
    </View>
  )
}
