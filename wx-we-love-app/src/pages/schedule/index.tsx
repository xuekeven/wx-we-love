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
      if (res && res.data) {
        setSchedules(res.data)
      }
    } catch (error) {
      console.log('加载日程失败')
    }
  }

  const handleAdd = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  const handleToggleStatus = async (id) => {
    try {
      const schedule = schedules.find(s => s.id === id)
      const newStatus = schedule?.status === 'pending' ? 'completed' : 'pending'
      await post(`/api/schedules/${id}/status`, { status: newStatus })
      setSchedules(schedules.map(s => s.id === id ? { ...s, status: newStatus } : s))
      Taro.showToast({ title: newStatus === 'completed' ? '已完成' : '取消完成', icon: 'success' })
    } catch (error) {
      console.log('更新状态失败')
    }
  }

  const handleDelete = async (id) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条日程吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await del(`/api/schedules/${id}`)
            setSchedules(schedules.filter(s => s.id !== id))
            Taro.showToast({ title: '删除成功', icon: 'success' })
          } catch (error) {
            console.log('删除失败')
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

