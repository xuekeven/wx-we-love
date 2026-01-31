import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post } from '../../utils/request'
import { getDaysDiff } from '../../utils/date'
import './index.scss'

// 展示用：当前用户 name1/avatar1，匹配对象 name2/avatar2（来自接口 current*/matched*）

export default function My() {
  const [userInfo, setUserInfo] = useState({
    avatar1: 'https://via.placeholder.com/150',
    avatar2: 'https://via.placeholder.com/150',
    name1: '张三',
    name2: '李四',
    loveDate: '2025-10-11'
  })
  const [daysTogether, setDaysTogether] = useState(0)
  const [isMatched, setIsMatched] = useState(false)
  const [isUnmatching, setIsUnmatching] = useState(false)

  useEffect(() => {
    loadUserInfo()
  }, [])

  useEffect(() => {
    if (userInfo.loveDate) {
      setDaysTogether(getDaysDiff(userInfo.loveDate))
    }
  }, [userInfo])

  const loadUserInfo = async () => {
    try {
      const res = await get('/api/user/info')
      if (res && res.success && res.data) {
        const userData = res.data
        setIsMatched(userData.isMatched || false)
        setUserInfo({
          avatar1: userData.currentAvatar || 'https://via.placeholder.com/150',
          avatar2: userData.matchedAvatar || 'https://via.placeholder.com/150',
          name1: userData.currentName || '张三',
          name2: userData.matchedName || '李四',
          loveDate: userData.loveDate || '2025-10-11'
        })
      } else {
        console.log('加载用户信息失败', res?.message || '')
      }
    } catch (error) {
      console.log('加载用户信息失败', error)
    }
  }

  const handleEditProfile = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  const handleUnmatch = () => {
    Taro.showModal({
      title: '确认解绑',
      content: '解绑后需要重新匹配才能使用所有功能，确定要解绑吗？',
      confirmText: '确认解绑',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          setIsUnmatching(true)
          try {
            const unmatchRes = await post('/api/user/unmatch', {})
            if (unmatchRes && unmatchRes.success) {
              Taro.showToast({
                title: '解绑成功',
                icon: 'success',
                duration: 2000
              })
              
              // 重新加载用户信息
              await loadUserInfo()
              
              // 跳转到匹配页面
              setTimeout(() => {
                Taro.redirectTo({ url: '/pages/match/index' })
              }, 2000)
            } else {
              Taro.showToast({
                title: unmatchRes?.message || '解绑失败',
                icon: 'none'
              })
              setIsUnmatching(false)
            }
          } catch (error) {
            console.error('解绑失败:', error)
            Taro.showToast({
              title: '解绑失败，请重试',
              icon: 'none'
            })
            setIsUnmatching(false)
          }
        }
      }
    })
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('token')
          Taro.removeStorageSync('userInfo')
          Taro.showToast({ title: '已退出', icon: 'success' })
          setTimeout(() => {
            Taro.redirectTo({ url: '/pages/login/index' })
          }, 1500)
        }
      }
    })
  }

  return (
    <View className='my-page'>
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
            <Text className='menu-icon'>🎨</Text>
            <Text className='menu-title'>主题设置</Text>
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
      </View>

      {/* 解绑匹配 */}
      {isMatched && (
        <View className='unmatch-section'>
          <Button 
            className='unmatch-btn' 
            onClick={handleUnmatch}
            loading={isUnmatching}
            disabled={isUnmatching}
          >
            {isUnmatching ? '解绑中...' : '解绑匹配'}
          </Button>
        </View>
      )}

      {/* 退出登录 */}
      <View className='logout-section'>
        <Button className='logout-btn' onClick={handleLogout}>
          退出登录
        </Button>
      </View>
    </View>
  )
}

