import { View, Text, Input, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post, del } from '../../utils/request'
import './index.scss'

// WishItem: { id, content, status: 'pending'|'completed', createdAt, completedAt? }

export default function Wishlist() {
  const [wishes, setWishes] = useState([])
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    loadWishes()
  }, [])

  const loadWishes = async () => {
    try {
      const res = await get('/api/wishlist')
      if (res && res.data) {
        setWishes(res.data)
      }
    } catch (error) {
      console.log('加载心愿清单失败')
    }
  }

  const handleAdd = async () => {
    if (!inputValue.trim()) {
      Taro.showToast({ title: '请输入心愿内容', icon: 'none' })
      return
    }

    try {
      const res = await post('/api/wishlist', { content: inputValue })
      if (res && res.data) {
        setWishes([res.data, ...wishes])
        setInputValue('')
        Taro.showToast({ title: '添加成功', icon: 'success' })
      }
    } catch (error) {
      console.log('添加失败')
    }
  }

  const handleToggleStatus = async (id) => {
    try {
      const wish = wishes.find(w => w.id === id)
      const newStatus = wish?.status === 'pending' ? 'completed' : 'pending'
      await post(`/api/wishlist/${id}/status`, { status: newStatus })
      setWishes(wishes.map(w => w.id === id ? { ...w, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined } : w))
      Taro.showToast({ title: newStatus === 'completed' ? '已完成' : '取消完成', icon: 'success' })
    } catch (error) {
      console.log('更新状态失败')
    }
  }

  const handleDelete = async (id) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个心愿吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await del(`/api/wishlist/${id}`)
            setWishes(wishes.filter(w => w.id !== id))
            Taro.showToast({ title: '删除成功', icon: 'success' })
          } catch (error) {
            console.log('删除失败')
          }
        }
      }
    })
  }

  return (
    <View className='wishlist-page'>
      <View className='page-header'>
        <Text className='page-title'>💝 心愿清单</Text>
        <Text className='page-subtitle'>记录我们想一起做的事</Text>
      </View>

      <View className='add-section'>
        <Input
          className='wish-input'
          placeholder='输入新心愿'
          placeholderClass='wish-input-placeholder'
          value={inputValue}
          onInput={(e) => setInputValue(e.detail.value)}
        />
        <Button className='add-btn' onClick={handleAdd}>添加</Button>
      </View>

      <ScrollView scrollY className='wish-list'>
        {wishes.map((wish) => (
          <View key={wish.id} className={`wish-item ${wish.status}`}>
            <View className='wish-content' onClick={() => handleToggleStatus(wish.id)}>
              <View className='checkbox'>
                {wish.status === 'completed' && <Text className='check-icon'>✓</Text>}
              </View>
              <Text className='wish-text'>{wish.content}</Text>
            </View>
            <View className='wish-actions'>
              <View className='delete-btn' onClick={() => handleDelete(wish.id)}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        ))}
        {wishes.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-icon'>✨</Text>
            <Text className='empty-text'>还没有心愿呢，快来添加吧～</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

