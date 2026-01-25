import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post, del } from '../../utils/request'
import { formatDate, formatTime } from '../../utils/date'
import './index.scss'

// Schedule: { id, title, date, time, location?, description?, status: 'pending'|'completed'|'cancelled', createdAt }

export default function Schedule() {
  const [schedules, setSchedules] = useState([])

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      const res = await get('/api/schedules')
      if (res && res.success && res.data && Array.isArray(res.data)) {
        setSchedules(res.data)
      } else {
        console.log('加载日程失败', res?.message || '')
        setSchedules([])
      }
    } catch (error) {
      console.log('加载日程失败', error)
      setSchedules([])
    }
  }

  const handleAdd = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  const handleToggleStatus = async (id) => {
    try {
      const schedule = schedules.find(s => s.id === id)
      const newStatus = schedule?.status === 'pending' ? 'completed' : 'pending'
      const res = await post(`/api/schedules/${id}/status`, { status: newStatus })
      if (res && res.success && res.data) {
        setSchedules(schedules.map(s => s.id === id ? res.data : s))
        Taro.showToast({ title: res.message || (newStatus === 'completed' ? '已完成' : '取消完成'), icon: 'success' })
      } else {
        Taro.showToast({ title: res?.message || '更新失败', icon: 'none' })
      }
    } catch (error) {
      Taro.showToast({ title: '更新状态失败，请重试', icon: 'none' })
    }
  }

  const handleDelete = async (id) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条日程吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const deleteRes = await del(`/api/schedules/${id}`)
            if (deleteRes && deleteRes.success) {
              setSchedules(schedules.filter(s => s.id !== id))
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

  return (
    <View className='schedule-page'>
      <View className='page-header'>
        <Text className='page-title'>📅 日程</Text>
        <Text className='page-subtitle'>规划我们的未来时光</Text>
      </View>

      <Button className='add-btn' onClick={handleAdd}>
        <Text className='add-icon'>+</Text>
        <Text>添加日程</Text>
      </Button>

      <ScrollView scrollY className='schedule-list'>
        {schedules.map((schedule) => (
          <View key={schedule.id} className={`schedule-item ${schedule.status}`}>
            <View className='schedule-main' onClick={() => handleToggleStatus(schedule.id)}>
              <View className='checkbox'>
                {schedule.status === 'completed' && <Text className='check-icon'>✓</Text>}
              </View>
              <View className='schedule-info'>
                <Text className='schedule-title'>{schedule.title}</Text>
                <View className='schedule-meta'>
                  <Text className='schedule-time'>
                    🕐 {formatDate(new Date(schedule.date))} {schedule.time}
                  </Text>
                  {schedule.location && (
                    <Text className='schedule-location'>📍 {schedule.location}</Text>
                  )}
                </View>
                {schedule.description && (
                  <Text className='schedule-description'>{schedule.description}</Text>
                )}
              </View>
            </View>
            <View className='schedule-actions'>
              <View className='delete-btn' onClick={() => handleDelete(schedule.id)}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        ))}

        {schedules.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-icon'>📆</Text>
            <Text className='empty-text'>还没有日程安排，快来添加吧～</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

