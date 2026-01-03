import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post } from '../../utils/request'
import { getDaysDiff } from '../../utils/date'
import './index.scss'

// UserInfo: { avatar1, avatar2, name1, name2, loveDate }

export default function My() {
  const [userInfo, setUserInfo] = useState({
    avatar1: 'https://via.placeholder.com/150',
    avatar2: 'https://via.placeholder.com/150',
    name1: '张三',
    name2: '李四',
    loveDate: '2025-10-11'
  })
  const [daysTogether, setDaysTogether] = useState(0)

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
      if (res && res.data) {
        setUserInfo(res.data)
      }
    } catch (error) {
      console.log('加载用户信息失败')
    }
  }

  const handleEditProfile = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('token')
          Taro.showToast({ title: '已退出', icon: 'success' })
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

      {/* 退出登录 */}
      <View className='logout-section'>
        <Button className='logout-btn' onClick={handleLogout}>
          退出登录
        </Button>
      </View>
    </View>
  )
}

