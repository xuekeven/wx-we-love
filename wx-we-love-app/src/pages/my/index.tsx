import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { post } from '../../utils/request'
import { getDaysDiff } from '../../utils/date'
import ProfileForm from '../../components/ProfileForm'
import PreviewBanner from '../../components/PreviewBanner'
import { PREVIEW } from '../../config/preview'
import { fetchUserInfo, getUserInfo, setUserInfoPartial, setPreviewMode, usePreviewMode } from '../../store/global'
import './index.scss'

// 展示用：当前用户 name1/avatar1，匹配对象 name2/avatar2（来自接口 current*/matched*）
const PREVIEW_USER_INFO = {
  avatar1: 'https://via.placeholder.com/150',
  avatar2: 'https://via.placeholder.com/150',
  name1: '张三',
  name2: '李四',
  loveDate: '2025-10-11'
}

export default function My() {
  const [userInfo, setUserInfo] = useState({
    ...PREVIEW_USER_INFO
  })
  const [daysTogether, setDaysTogether] = useState(0)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const isPreview = usePreviewMode()

  useEffect(() => {
    loadUserInfo()
  }, [])

  useDidShow(() => {
    loadUserInfo()
  })

  useEffect(() => {
    if (userInfo.loveDate) {
      setDaysTogether(getDaysDiff(userInfo.loveDate))
    }
  }, [userInfo])

  const loadUserInfo = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setPreviewMode(true)
        setUserInfo(PREVIEW_USER_INFO)
        return
      }
      setPreviewMode(false)
      let data = getUserInfo()
      if (!data) data = await fetchUserInfo()
      if (data) {
        setUserInfo({
          avatar1: data.currentAvatar || 'https://via.placeholder.com/150',
          avatar2: data.matchedAvatar || 'https://via.placeholder.com/150',
          name1: data.currentName || '张三',
          name2: data.matchedName || '李四',
          loveDate: data.loveDate || '2025-10-11'
        })
      }
    } catch (error) {
      console.log('加载用户信息失败', error)
    }
  }

  const handleEditProfile = () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      Taro.showModal({
        title: '登录后操作',
        content: '编辑资料需要先登录，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    setShowEditProfileModal(true)
  }

  const handleEditProfileSubmit = async (values: { name?: string; avatar?: string; loveDate?: string }) => {
    const initialLoveDate = userInfo.loveDate || ''
    const body: Record<string, string> = {}
    if (values.name !== undefined && values.name !== userInfo.name1) body.currentName = values.name
    if (values.avatar !== undefined && values.avatar !== userInfo.avatar1) body.currentAvatar = values.avatar
    if (values.loveDate !== undefined && values.loveDate !== initialLoveDate) body.loveDate = values.loveDate
    if (Object.keys(body).length === 0) {
      Taro.showToast({ title: '未修改任何内容', icon: 'none' })
      return
    }
    setIsSavingProfile(true)
    try {
      await post('/api/user/info', body)
      Taro.showToast({ title: '已保存', icon: 'success' })
      setShowEditProfileModal(false)
      const partial: Record<string, string> = {}
      if (body.loveDate !== undefined) partial.loveDate = body.loveDate
      if (body.currentName !== undefined) partial.currentName = body.currentName
      if (body.currentAvatar !== undefined) partial.currentAvatar = body.currentAvatar
      if (Object.keys(partial).length) setUserInfoPartial(partial)
      await loadUserInfo()
    } catch (e) {
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <View className='my-page'>
      {isPreview && (
        <PreviewBanner
          text={PREVIEW.my}
          buttonText={PREVIEW.loginButtonText}
          onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      )}
      {/* 顶部卡片 */}
      <View className='profile-card'>
        <View className='couple-avatars'>
          <View className='avatar-container'>
            <Image className='avatar' src={userInfo.avatar1} mode='aspectFill' />
            <Text className='name'>{userInfo.name1}</Text>
          </View>
          <View className='heart-icon'>
            <Text className='heart'>💕</Text>
          </View>
          <View className='avatar-container'>
            <Image className='avatar' src={userInfo.avatar2} mode='aspectFill' />
            <Text className='name'>{userInfo.name2}</Text>
          </View>
        </View>
        <View className='love-days'>
          <Text className='days-label'>在一起</Text>
          <Text className='days-number'>{daysTogether}</Text>
          <Text className='days-unit'>天</Text>
        </View>
      </View>

      {/* 功能列表 */}
      <View className='menu-section'>
        <View className='menu-item' onClick={handleEditProfile}>
          <View className='menu-item-left'>
            <Text className='menu-icon'>👤</Text>
            <Text className='menu-title'>编辑资料</Text>
          </View>
          <Text className='arrow'>›</Text>
        </View>

        <View className='menu-item'>
          <View className='menu-item-left'>
            <Text className='menu-icon'>🔔</Text>
            <Text className='menu-title'>消息提醒</Text>
          </View>
          <Text className='arrow'>›</Text>
        </View>

        <View className='menu-item'>
          <View className='menu-item-left'>
            <Text className='menu-icon'>ℹ️</Text>
            <Text className='menu-title'>关于我们</Text>
          </View>
          <Text className='arrow'>›</Text>
        </View>

        <View className='menu-item' onClick={() => Taro.navigateTo({ url: '/pages/my/setting/index' })}>
          <View className='menu-item-left'>
            <Text className='menu-icon'>⚙️</Text>
            <Text className='menu-title'>设置</Text>
          </View>
          <Text className='arrow'>›</Text>
        </View>
      </View>

      {/* 编辑资料弹层：姓名、头像、恋爱纪念日 */}
      <ProfileForm
        visible={showEditProfileModal}
        title='编辑资料'
        showName
        showAvatar
        showLoveDate
        initialName={userInfo.name1}
        initialAvatar={userInfo.avatar1}
        initialLoveDate={userInfo.loveDate || ''}
        submitButtonText='保存'
        showCancel
        onClose={() => setShowEditProfileModal(false)}
        loading={isSavingProfile}
        onSubmit={handleEditProfileSubmit}
      />
    </View>
  )
}
