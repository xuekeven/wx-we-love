import { View, Text, Button, Image, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { post, get } from '../../utils/request'
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
  const [wechatAvatar, setWechatAvatar] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

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

  // 步骤1：点击“微信授权登录”按钮，弹出微信官方手机号授权弹层
  const handleGetPhoneNumber = async (e) => {
    if (isLoading) return

    // 用户拒绝授权手机号
    if (!e.detail || e.detail.errMsg !== 'getPhoneNumber:ok') {
      Taro.showToast({
        title: '需要授权手机号才能继续',
        icon: 'none',
        duration: 2000
      })
      return
    }

    setIsLoading(true)

    try {
      const uuid = generateUUID()

      // 步骤2：获取微信用户基本信息（昵称、头像）
      const profileRes = await Taro.getUserProfile({
        desc: '用于完善用户资料'
      })
      const userInfo = profileRes.userInfo
      setWechatAvatar(userInfo.avatarUrl)
      setProfileAvatar(userInfo.avatarUrl || '')

      // 步骤3：获取登录 code
      const loginRes = await Taro.login()
      if (!loginRes.code) {
        Taro.showToast({
          title: '获取登录凭证失败',
          icon: 'none'
        })
        setIsLoading(false)
        return
      }

      // 步骤4：调用登录接口，传递 code、昵称、头像、uuid
      const loginResp = await post('/api/user/login', {
        code: loginRes.code,
        nickname: userInfo.nickName,
        avatar: userInfo.avatarUrl,
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

      // 保存token和用户信息
      Taro.setStorageSync('token', loginResp.data.token)
      Taro.setStorageSync('userInfo', loginResp.data.user)

      // 步骤5：调用绑定手机号接口（服务端解密 encryptedData + iv）
      try {
        await post('/api/user/bind-phone', {
          encryptedData: e.detail.encryptedData,
          iv: e.detail.iv
        })
      } catch (err) {
        console.error('绑定手机号失败:', err)
        // 失败不阻塞后续流程，只提示
        Taro.showToast({
          title: '手机号绑定失败，可稍后在“我的”页面重试',
          icon: 'none',
          duration: 2000
        })
      }

      // 步骤6：弹出自定义资料完善弹层（姓名 + 头像上传）
      setShowProfileModal(true)
    } catch (error) {
      console.error('登录流程失败:', error)
      Taro.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
      setIsLoading(false)
    }
  }

  const handleChooseAvatar = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          setProfileAvatar(res.tempFilePaths[0])
        }
      }
    })
  }

  const handleProfileSubmit = async () => {
    if (!profileName.trim()) {
      Taro.showToast({ title: '请填写姓名', icon: 'none' })
      return
    }

    setIsSavingProfile(true)
    try {
      const avatarToSave = profileAvatar || wechatAvatar || ''
      await post('/api/user/info', {
        name1: profileName.trim(),
        avatar1: avatarToSave
      })

      Taro.showToast({
        title: '资料已保存',
        icon: 'success',
        duration: 1500
      })

      setShowProfileModal(false)

      // 新用户默认未匹配，跳转到匹配页面
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/match/index' })
      }, 1500)
    } catch (error) {
      console.error('保存资料失败:', error)
      Taro.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    } finally {
      setIsSavingProfile(false)
      setIsLoading(false)
    }
  }

  const handleProfileSkip = () => {
    setShowProfileModal(false)
    setIsLoading(false)
    // 直接进入匹配页
    Taro.redirectTo({ url: '/pages/match/index' })
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
            <Text className='desc-tip'>登录时将获取您的手机号、昵称和头像</Text>
          </View>

          <Button
            className='wechat-login-btn'
            openType='getPhoneNumber'
            onGetPhoneNumber={handleGetPhoneNumber}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '微信授权登录'}
          </Button>

        </View>
      </View>

      {/* 资料完善弹层：姓名 + 头像上传 */}
      {showProfileModal && (
        <View className='profile-modal-mask'>
          <View className='profile-modal'>
            <Text className='modal-title'>完善你的资料</Text>
            <Text className='modal-subtitle'>填写姓名并选择头像，打造你们的专属空间</Text>

            <View className='form-item'>
              <Text className='form-label'>姓名</Text>
              <Input
                className='form-input'
                placeholder='请输入你的姓名'
                value={profileName}
                onInput={(e) => setProfileName(e.detail.value)}
                maxlength={12}
              />
            </View>

            <View className='form-item'>
              <Text className='form-label'>头像</Text>
              <View className='avatar-row'>
                <Image
                  className='avatar-preview'
                  src={profileAvatar || wechatAvatar}
                  mode='aspectFill'
                />
                <Button
                  className='upload-avatar-btn'
                  onClick={handleChooseAvatar}
                  size='mini'
                >
                  上传图片
                </Button>
              </View>
              <Text className='avatar-tip'>默认使用微信头像，你也可以重新上传一张喜欢的照片</Text>
            </View>

            <View className='modal-actions'>
              <Button
                className='modal-btn cancel'
                onClick={handleProfileSkip}
                disabled={isSavingProfile}
              >
                暂不完善
              </Button>
              <Button
                className='modal-btn confirm'
                onClick={handleProfileSubmit}
                loading={isSavingProfile}
                disabled={isSavingProfile}
              >
                保存并继续
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
