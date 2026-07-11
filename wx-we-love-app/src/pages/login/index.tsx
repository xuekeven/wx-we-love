import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { post } from '../../utils/request'
import { fetchUserInfo, getUserInfo, clearUserData, setPreviewMode } from '../../store/global'
import ProfileForm from '../../components/ProfileForm'
import './index.scss'

// 生成16位随机UUID（包含数字和大小写字母）
const generateUUID = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let uuid = ''
  for (let i = 0; i < 16; i++) {
    const idx = Math.floor(Math.random() * chars.length)
    uuid += chars[idx]
  }
  return uuid
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  // 用于暂存登录返回的 token 和 user，只有资料保存后才真正写入本地
  const [pendingAuth, setPendingAuth] = useState<{ token: string; user: any } | null>(null)

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
      let data = getUserInfo()
      if (!data) data = await fetchUserInfo()
      if (data) {
        if (data.isMatched) {
          Taro.switchTab({ url: '/pages/index/index' })
        } else {
          Taro.redirectTo({ url: '/pages/match/index' })
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
      if (error.statusCode === 401 || error.statusCode === 404) {
        Taro.removeStorageSync('token')
        setPreviewMode(false)
      }
    }
  }

  // 步骤1：点击“微信授权登录”按钮，弹出微信官方【头像昵称授权】弹层（getUserProfile）
  const handleWechatLogin = () => {
    if (isLoading) return

    // 注意：getUserProfile 必须直接在点击事件中调用，才能弹出官方授权弹层
    Taro.getUserProfile({
      desc: '用于完善用户资料',
      success: async (profileRes) => {
        setIsLoading(true)
        try {
          const uuid = generateUUID()
          const userInfo = profileRes.userInfo

          // 把微信昵称和头像作为默认值带入资料弹层
          setProfileName(userInfo.nickName || '')
          setProfileAvatar(userInfo.avatarUrl || '')

          // 获取登录 code
          const loginRes = await Taro.login()
          if (!loginRes.code) {
            Taro.showToast({
              title: '获取登录凭证失败',
              icon: 'none'
            })
            setIsLoading(false)
            return
          }

          // 调用登录接口，仅传递 code 和 uuid
          const loginResp = await post('/api/user/login', {
            code: loginRes.code,
            uuid
          })

          if (!loginResp || !loginResp.success || !loginResp.data) {
            Taro.showToast({
              title: loginResp?.message || '登录失败',
              icon: 'none'
            })
            setIsLoading(false)
            return
          }

          const { token, user } = loginResp.data

          // 已匹配过的账号：直接写入 token 和 userInfo，进入首页
          if (user && user.isMatched) {
            clearUserData()
            Taro.setStorageSync('token', token)
            Taro.setStorageSync('userInfo', user)
            setPreviewMode(false)
            await fetchUserInfo(true)
            Taro.showToast({ title: '登录成功', icon: 'success', duration: 1200 })
            setTimeout(() => {
              Taro.switchTab({ url: '/pages/index/index' })
            }, 1200)
            setIsLoading(false)
            return
          }

          // 未匹配：暂存 token 和 user，等资料完善后再写入本地，并进入资料完善弹层
          setPendingAuth({ token, user })
          setShowProfileModal(true)
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
          title: '需要授权头像昵称才能登录',
          icon: 'none',
          duration: 2000
        })
      }
    })
  }

  const handleProfileSubmit = async (values: { name?: string; avatar?: string }) => {
    if (!pendingAuth) {
      Taro.showToast({ title: '登录状态异常，请重新登录', icon: 'none' })
      setShowProfileModal(false)
      return
    }
    await post('/api/user/info', {
      currentName: values.name,
      currentAvatar: values.avatar
    }, { token: pendingAuth.token })
    Taro.showToast({ title: '资料已保存', icon: 'success', duration: 1500 })
    setShowProfileModal(false)
    clearUserData()
    Taro.setStorageSync('token', pendingAuth.token)
    Taro.setStorageSync('userInfo', pendingAuth.user)
    setPreviewMode(false)
    setPendingAuth(null)
    setTimeout(() => {
      Taro.redirectTo({ url: '/pages/match/index' })
    }, 1500)
  }

  return (
    <View className='login-page'>
      <View className='login-container'>
        <View className='login-header'>
          <Text className='login-title'>💕 欢迎来到恋爱空间</Text>
          <Text className='login-subtitle'>记录你们的美好时光</Text>
        </View>

        <View className='login-content'>
          <Button
            className='wechat-login-btn'
            onClick={handleWechatLogin}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '微信授权登录'}
          </Button>
          <Button
            className='skip-login-btn'
            onClick={() => {
              setPreviewMode(true)
              Taro.switchTab({ url: '/pages/index/index' })
            }}
          >
            返回浏览
          </Button>
        </View>
      </View>

      {/* 完善资料弹层：姓名 + 头像（登录后未匹配时） */}
      <ProfileForm
        visible={showProfileModal}
        title='完善你的资料'
        subtitle='填写姓名并选择头像，打造你们的专属空间'
        showName
        showAvatar
        initialName={profileName}
        initialAvatar={profileAvatar}
        submitButtonText='保存并继续'
        loading={isSavingProfile}
        token={pendingAuth?.token}
        onSubmit={async (values) => {
          setIsSavingProfile(true)
          try {
            await handleProfileSubmit(values)
          } catch (error) {
            console.error('保存资料失败:', error)
            Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
          } finally {
            setIsSavingProfile(false)
          }
        }}
      />
    </View>
  )
}
