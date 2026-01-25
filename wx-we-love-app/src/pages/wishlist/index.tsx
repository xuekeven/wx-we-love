import { View, Text, Input, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post, put, del } from '../../utils/request'
import './index.scss'

// WishItem: { id, content, status: 'pending'|'completed', createdAt, completedAt? }

export default function Wishlist() {
  const [wishes, setWishes] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')

  useEffect(() => {
    loadWishes()
  }, [])

  const loadWishes = async () => {
    try {
      const res = await get('/api/wishlist')
      if (res && res.success && res.data && Array.isArray(res.data)) {
        setWishes(res.data)
      } else {
        console.log('加载心愿清单失败', res?.message || '')
        setWishes([])
      }
    } catch (error) {
      console.log('加载心愿清单失败', error)
      setWishes([])
    }
  }

  const handleAdd = async () => {
    if (!inputValue.trim()) {
      Taro.showToast({ title: '请输入心愿内容', icon: 'none' })
      return
    }

    try {
      const res = await post('/api/wishlist', { content: inputValue })
      if (res && res.success && res.data) {
        setWishes([res.data, ...wishes])
        setInputValue('')
        Taro.showToast({ title: res.message || '添加成功', icon: 'success' })
      } else {
        Taro.showToast({ title: res?.message || '添加失败', icon: 'none' })
      }
    } catch (error) {
      Taro.showToast({ title: '添加失败，请重试', icon: 'none' })
    }
  }

  const handleToggleStatus = async (id) => {
    try {
      const wish = wishes.find(w => w.id === id)
      const newStatus = wish?.status === 'pending' ? 'completed' : 'pending'
      const res = await post(`/api/wishlist/${id}/status`, { status: newStatus })
      if (res && res.success && res.data) {
        setWishes(wishes.map(w => w.id === id ? res.data : w))
        Taro.showToast({ title: res.message || (newStatus === 'completed' ? '已完成' : '取消完成'), icon: 'success' })
      } else {
        Taro.showToast({ title: res?.message || '更新失败', icon: 'none' })
      }
    } catch (error) {
      Taro.showToast({ title: '更新状态失败，请重试', icon: 'none' })
    }
  }

  const handleEdit = (wish) => {
    setEditingId(wish.id)
    setEditingValue(wish.content)
  }

  const handleSaveEdit = async (id) => {
    if (!editingValue.trim()) {
      Taro.showToast({ title: '心愿内容不能为空', icon: 'none' })
      return
    }

    try {
      const res = await put(`/api/wishlist/${id}`, { content: editingValue.trim() })
      if (res && res.success && res.data) {
        setWishes(wishes.map(w => w.id === id ? res.data : w))
        setEditingId(null)
        setEditingValue('')
        Taro.showToast({ title: res.message || '编辑成功', icon: 'success' })
      } else {
        Taro.showToast({ title: res?.message || '编辑失败', icon: 'none' })
      }
    } catch (error) {
      Taro.showToast({ title: '编辑失败，请重试', icon: 'none' })
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingValue('')
  }

  const handleDelete = async (id) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个心愿吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const deleteRes = await del(`/api/wishlist/${id}`)
            if (deleteRes && deleteRes.success) {
              setWishes(wishes.filter(w => w.id !== id))
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
            {editingId === wish.id ? (
              // 编辑模式
              <View className='wish-edit-mode'>
                <Input
                  className='wish-edit-input'
                  value={editingValue}
                  onInput={(e) => setEditingValue(e.detail.value)}
                  placeholder='输入心愿内容'
                  autoFocus
                />
                <View className='wish-edit-actions'>
                  <View className='edit-cancel-btn' onClick={handleCancelEdit}>
                    <Text>取消</Text>
                  </View>
                  <View className='edit-save-btn' onClick={() => handleSaveEdit(wish.id)}>
                    <Text>保存</Text>
                  </View>
                </View>
              </View>
            ) : (
              // 显示模式
              <>
                <View className='wish-content' onClick={() => handleToggleStatus(wish.id)}>
                  <View className='checkbox'>
                    {wish.status === 'completed' && <Text className='check-icon'>✓</Text>}
                  </View>
                  <Text className='wish-text'>{wish.content}</Text>
                </View>
                <View className='wish-actions'>
                  <View className='edit-btn' onClick={() => handleEdit(wish)}>
                    <Text>编辑</Text>
                  </View>
                  <View className='delete-btn' onClick={() => handleDelete(wish.id)}>
                    <Text>删除</Text>
                  </View>
                </View>
              </>
            )}
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

