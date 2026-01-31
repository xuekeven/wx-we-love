import { View, Text, Button, Image, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { post, get } from '../../utils/request'
import config from '../../config'
import './index.scss'

// 判断是否为本地临时路径（选择微信头像/相册后得到），需要先上传再传 URL
const isLocalTempAvatar = (url) => {
  if (!url || typeof url !== 'string') return false
  const u = url.trim().toLowerCase()
  return u.startsWith('wxfile://') || u.startsWith('http://tmp/') || !u.startsWith('https://')
}

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
  const [pendingAuth, setPendingAuth] = useState(null)

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

          // 调用登录接口，传递 code、昵称、头像、uuid
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

          const { token, user } = loginResp.data

          // 已匹配过的账号：直接写入 token 和 userInfo，进入首页
          if (user && user.isMatched) {
            Taro.setStorageSync('token', token)
            Taro.setStorageSync('userInfo', user)
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

  // 根据微信官方文档：优先使用 open-type="chooseAvatar" 获取头像
  // https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/userProfile.html
  const handleChooseAvatar = (e) => {
    // 优先处理 chooseAvatar 回调
    if (e && e.detail && e.detail.avatarUrl) {
      setProfileAvatar(e.detail.avatarUrl)
      return
    }

    // 兼容：在不支持 chooseAvatar 的环境（或开发者工具）下，退回到手动选择图片
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

    if (!pendingAuth) {
      // 理论上不会发生，只是兜底保护
      Taro.showToast({ title: '登录状态异常，请重新登录', icon: 'none' })
      setShowProfileModal(false)
      setIsLoading(false)
      return
    }

    setIsSavingProfile(true)
    try {
      let avatarToSave = profileAvatar || ''
      if (avatarToSave && isLocalTempAvatar(avatarToSave)) {
        const uploadRes = await new Promise((resolve, reject) => {
          Taro.uploadFile({
            url: `${config.apiBaseUrl}/api/upload`,
            filePath: avatarToSave,
            name: 'file',
            header: {
              Authorization: pendingAuth ? `Bearer ${pendingAuth.token}` : ''
            },
            success: (res) => {
              if (res.statusCode === 200) {
                try {
                  const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
                  resolve(data)
                } catch (e) {
                  reject(new Error('解析上传结果失败'))
                }
              } else {
                const errData = typeof res.data === 'string' ? {} : (res.data || {})
                reject(new Error(errData?.message || '上传失败'))
              }
            },
            fail: (err) => reject(err)
          })
        })
        if (uploadRes?.success && uploadRes?.data?.url) {
          avatarToSave = uploadRes.data.url
        }
      }
      // 此时 token 尚未写入 storage，显式传入以便请求带 Authorization
      await post('/api/user/info', {
        currentName: profileName.trim(),
        currentAvatar: avatarToSave
      }, { token: pendingAuth.token })

      Taro.showToast({
        title: '资料已保存',
        icon: 'success',
        duration: 1500
      })

      setShowProfileModal(false)

      // 资料保存成功后，才真正写入 token 和 userInfo
      Taro.setStorageSync('token', pendingAuth.token)
      Taro.setStorageSync('userInfo', pendingAuth.user)
      setPendingAuth(null)

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
                type='nickname'
                value={profileName}
                onInput={(e) => setProfileName(e.detail.value)}
                maxlength={12}
              />
            </View>

            <View className='form-item'>
              <Text className='form-label'>头像</Text>
              <View className='avatar-row'>
                <Button
                  className='upload-avatar-btn'
                  openType='chooseAvatar'
                  onChooseAvatar={handleChooseAvatar}
                  size='mini'
                >
                  上传头像
                </Button>
                <Image
                  className='avatar-preview'
                  src={profileAvatar}
                  mode='aspectFill'
                />
              </View>
            </View>

            <View className='modal-actions'>
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
