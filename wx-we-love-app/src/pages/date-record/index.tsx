import { View, Text, Button, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post, del } from '../../utils/request'
import { formatDate } from '../../utils/date'
import './index.scss'

// DateRecord: { id, title, date, location, description, photos: [], rating, createdAt }

export default function DateRecord() {
  const [records, setRecords] = useState([])

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    try {
      const res = await get('/api/date-records')
      if (res && res.data) {
        setRecords(res.data)
      }
    } catch (error) {
      console.log('加载约会记录失败')
    }
  }

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/date-record/add' })
  }

  const handleDelete = async (id) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条约会记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await del(`/api/date-records/${id}`)
            setRecords(records.filter(r => r.id !== id))
            Taro.showToast({ title: '删除成功', icon: 'success' })
          } catch (error) {
            console.log('删除失败')
          }
        }
      }
    })
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Text key={index} className='star'>{index < rating ? '⭐' : '☆'}</Text>
    ))
  }

  return (
    <View className='date-record-page'>
      <View className='page-header'>
        <Text className='page-title'>🌹 约会记录</Text>
        <Text className='page-subtitle'>记录每一个甜蜜瞬间</Text>
      </View>

      <Button className='add-btn' onClick={handleAdd}>
        <Text className='add-icon'>+</Text>
        <Text>新增约会</Text>
      </Button>

      <ScrollView scrollY className='record-list'>
        {records.map((record) => (
          <View key={record.id} className='record-item'>
            <View className='record-header'>
              <View className='record-info'>
                <Text className='record-title'>{record.title}</Text>
                <View className='record-meta'>
                  <Text className='record-date'>📅 {formatDate(new Date(record.date))}</Text>
                  <Text className='record-location'>📍 {record.location}</Text>
                </View>
              </View>
              <View className='record-rating'>
                {renderStars(record.rating)}
              </View>
            </View>
            
            {record.photos && record.photos.length > 0 && (
              <View className='record-photos'>
                {record.photos.map((photo, index) => (
                  <Image key={index} className='photo' src={photo} mode='aspectFill' />
                ))}
              </View>
            )}

            <Text className='record-description'>{record.description}</Text>

            <View className='record-actions'>
              <View className='delete-btn' onClick={() => handleDelete(record.id)}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        ))}

        {records.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-icon'>💕</Text>
            <Text className='empty-text'>还没有约会记录，快去创造美好回忆吧～</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

