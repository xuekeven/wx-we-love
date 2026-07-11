import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, del } from '../../utils/request'
import { formatDate } from '../../utils/date'
import PreviewBanner from '../../components/PreviewBanner'
import { PREVIEW } from '../../config/preview'
import { setPreviewMode, usePreviewMode } from '../../store/global'
import './index.scss'

// Anniversary: { id, title, date, type: 'birthday'|'anniversary'|'custom', isYearly, reminder, createdAt }

export default function Anniversary() {
  const [anniversaries, setAnniversaries] = useState([])
  const isPreview = usePreviewMode()

  useEffect(() => {
    loadAnniversaries()
  }, [])

  const loadAnniversaries = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setPreviewMode(true)
        setAnniversaries([
          { id: 'p1', title: '第一次见面', date: '2024-02-14', type: 'anniversary' },
          { id: 'p2', title: 'Ta的生日', date: '2024-05-20', type: 'birthday' },
          { id: 'p3', title: '旅行纪念', date: '2024-10-01', type: 'custom' }
        ])
        return
      }
      setPreviewMode(false)
      const res = await get('/api/anniversaries')
      if (res && res.success && res.data && Array.isArray(res.data)) {
        setAnniversaries(res.data)
      } else {
        console.log('加载纪念日失败', res?.message || '')
        setAnniversaries([])
      }
    } catch (error) {
      console.log('加载纪念日失败', error)
      setAnniversaries([])
    }
  }

  const handleAdd = () => {
    if (isPreview) {
      Taro.showModal({
        title: '登录后使用',
        content: '登录后可添加与管理纪念日，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  const handleDelete = async (id) => {
    if (isPreview) {
      Taro.showModal({
        title: '登录后使用',
        content: '登录后才可删除纪念日，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个纪念日吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const deleteRes = await del(`/api/anniversaries/${id}`)
            if (deleteRes && deleteRes.success) {
              setAnniversaries(anniversaries.filter(a => a.id !== id))
              Taro.showToast({ title: deleteRes.message || '删除成功', icon: 'success' })
            } else {
              Taro.showToast({ title: deleteRes?.message || '删除失败', icon: 'none' })
            }
          } catch (error) {
            Taro.showToast({ title: '删除失败，请重试', icon: 'none' })
          }
        }
      }
    })
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'birthday': return '🎂'
      case 'anniversary': return '💍'
      default: return '🎉'
    }
  }

  const getDaysUntil = (date) => {
    const target = new Date(date)
    const now = new Date()
    const diff = target.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <View className='anniversary-page'>
      {isPreview && (
        <PreviewBanner
          className='preview-banner-inset'
          text={PREVIEW.anniversary}
          buttonText={PREVIEW.loginButtonText}
          onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      )}
      <View className='page-header'>
        <Text className='page-title'>纪念日</Text>
        <Text className='page-subtitle'>铭记每一个重要时刻</Text>
      </View>

      <Button className='add-btn' onClick={handleAdd}>
        <Text className='add-icon'>+</Text>
        <Text>添加纪念日</Text>
      </Button>

      <ScrollView scrollY className='anniversary-list'>
        {anniversaries.map((item) => (
          <View key={item.id} className='anniversary-item'>
            <View className='item-icon'>
              <Text className='icon'>{getTypeIcon(item.type)}</Text>
            </View>
            <View className='item-content'>
              <Text className='item-title'>{item.title}</Text>
              <Text className='item-date'>{formatDate(new Date(item.date))}</Text>
              <View className='item-countdown'>
                <Text className='countdown-text'>
                  {getDaysUntil(item.date) > 0 
                    ? `还有 ${getDaysUntil(item.date)} 天`
                    : getDaysUntil(item.date) === 0 
                    ? '就是今天！' 
                    : '已过去'}
                </Text>
              </View>
            </View>
            <View className='item-actions'>
              <View className='delete-btn' onClick={() => handleDelete(item.id)}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        ))}

        {anniversaries.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-icon'>🎊</Text>
            <Text className='empty-text'>还没有纪念日，快来添加吧～</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
